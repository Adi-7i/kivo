"""Explicit backend-role grants for an approval-gated, rollback-only rehearsal."""

from __future__ import annotations

import re

READ_ONLY = {
    "auth_permission",
    "auth_group_permissions",
    "auth_group",
    "django_content_type",
    "users_groups",
    "users_user_permissions",
    "django_migrations",
}
MUTABLE = {
    "ledger_account",
    "ledger_category",
    "sharing_contact",
    "reports_budget",
    "django_session",
}
FUNCTIONS = (
    "kivo_audit_budget()",
    "kivo_expected_postings(bigint)",
    "kivo_guard_budget()",
    "kivo_guard_fund_row()",
    "kivo_guard_journal_relationship()",
    "kivo_guard_owned_metadata()",
    "kivo_guard_relationship()",
    "kivo_reject_journal_mutation()",
    "kivo_reserve_change_active(uuid,bigint)",
    "kivo_verify_claim_history()",
    "kivo_verify_event()",
    "kivo_verify_fund_run()",
    "kivo_verify_rent()",
)
APPEND_ONLY = {
    "django_admin_log",
    "ledger_event",
    "ledger_posting",
    "ledger_writereceipt",
    "funds_fundingbatch",
    "funds_allocationrun",
    "funds_batchcapacity",
    "funds_fundposition",
    "funds_claimposition",
    "funds_allocation",
    "funds_allocationgap",
    "sharing_metadatachange",
    "sharing_claim",
    "sharing_sharedbill",
    "sharing_billshare",
    "sharing_rentshare",
    "sharing_rentobligation",
    "sharing_obligationchange",
    "sharing_rentpayment",
    "sharing_rentreserve",
    "sharing_reservechange",
    "reports_budgetchange",
}


def identifier(value: str) -> str:
    if not re.fullmatch(r"[a-z_][a-z0-9_]{0,62}", value):
        raise ValueError("Use a lowercase PostgreSQL identifier of at most 63 characters.")
    return f'"{value}"'


def role_statements(
    *, role: str, administrator: str, database: str, tables: list[str], sequences: list[str]
) -> list[str]:
    """No execution, LOGIN, password, ownership transfer, table deletion or defaults."""
    if not role.startswith("kivo_") or len(role) > 48 or role in {administrator, "kivo_admin"}:
        raise ValueError("A new distinct kivo_ runtime/probe role is required.")
    if set(tables) - (READ_ONLY | MUTABLE | APPEND_ONLY | {"users", "sharing_rentplan"}):
        raise ValueError("New table privileges require explicit review.")
    principal = identifier(role)
    statements = [
        f"CREATE ROLE {principal} NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS",
        f"GRANT {principal} TO {identifier(administrator)} WITH INHERIT FALSE, SET TRUE",
        f"GRANT CONNECT ON DATABASE {identifier(database)} TO {principal}",
        f"GRANT USAGE ON SCHEMA public TO {principal}",
    ]
    for name in sorted(tables):
        table = f"public.{identifier(name)}"
        statements.append(f"GRANT SELECT ON {table} TO {principal}")
        statements.append(
            f"CREATE POLICY {principal} ON {table} FOR SELECT TO {principal} USING (true)"
        )
        if name not in READ_ONLY:
            statements.append(f"GRANT INSERT ON {table} TO {principal}")
            check = "NOT is_staff AND NOT is_superuser" if name == "users" else "true"
            statements.append(
                f'CREATE POLICY "{role}_insert" ON {table} FOR INSERT TO {principal} WITH CHECK ({check})'
            )
        update = (
            "UPDATE"
            if name in MUTABLE
            else "UPDATE (password, last_login)"
            if name == "users"
            else "UPDATE (active)"
            if name == "sharing_rentplan"
            else None
        )
        if update:
            statements.append(f"GRANT {update} ON {table} TO {principal}")
            statements.append(
                f'CREATE POLICY "{role}_update" ON {table} FOR UPDATE TO {principal} USING (true) WITH CHECK (true)'
            )
        if name == "django_session":
            statements.append(f"GRANT DELETE ON {table} TO {principal}")
            statements.append(
                f'CREATE POLICY "{role}_delete" ON {table} FOR DELETE TO {principal} USING (true)'
            )
    for name in sorted(sequences):
        statements.append(f"GRANT USAGE ON SEQUENCE public.{identifier(name)} TO {principal}")
    for signature in FUNCTIONS:
        statements.append(
            f"REVOKE EXECUTE ON FUNCTION public.{signature} FROM PUBLIC, anon, authenticated, service_role"
        )
    for signature in ("kivo_expected_postings(bigint)", "kivo_reserve_change_active(uuid,bigint)"):
        statements.append(f"GRANT EXECUTE ON FUNCTION public.{signature} TO {principal}")
    return statements
