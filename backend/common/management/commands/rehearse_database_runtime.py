"""Approval-gated role rehearsal on an existing isolated PostgreSQL test database."""

from __future__ import annotations

import io
import json
import secrets
from datetime import date
from typing import Any
from uuid import uuid4

from django.apps import apps
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError, CommandParser
from django.db import DatabaseError, connection, transaction

from common.runtime_role import identifier, role_statements


class Command(BaseCommand):
    help = (
        "Rehearse a NOLOGIN runtime role and real API/SQL permissions, then roll everything back."
    )

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("--test-database", required=True)
        parser.add_argument("--role", default="kivo_runtime_probe")
        parser.add_argument("--execute-rollback-only", action="store_true")

    def handle(self, *args: Any, **options: Any) -> None:
        target = options["test_database"]
        original = connection.settings_dict["NAME"]
        if (
            not options["execute_rollback_only"]
            or not target.startswith("test_")
            or target == original
            or connection.in_atomic_block
            or connection.settings_dict["ENGINE"] != "django.db.backends.postgresql"
            or not connection.settings_dict["HOST"]
        ):
            raise CommandError(
                "Explicit approval/flag and a distinct remote test_ database are required."
            )
        role = options["role"]
        identifier(role)
        tables = sorted(
            {model._meta.db_table for model in apps.get_models(include_auto_created=True)}
            | {"django_migrations"}
        )
        result: dict[str, Any] = {"database": target, "role": role}
        connection.close()
        connection.settings_dict["NAME"] = target
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT current_database(),current_user")
                actual, administrator = cursor.fetchone()
                if actual != target:
                    raise CommandError(
                        "Connected database identity does not match approved target."
                    )
                cursor.execute("SELECT EXISTS(SELECT 1 FROM pg_roles WHERE rolname=%s)", [role])
                if cursor.fetchone()[0]:
                    raise CommandError(
                        "Probe role already exists; refusing to modify an existing role."
                    )
                cursor.execute(
                    "SELECT EXISTS(SELECT 1 FROM django_migrations WHERE app='users' AND name='0003_case_insensitive_email')"
                )
                if not cursor.fetchone()[0]:
                    raise CommandError(
                        "The isolated target must already have the reviewed email migration."
                    )
                cursor.execute(
                    """
                    SELECT s.relname FROM pg_class s JOIN pg_depend d ON d.objid=s.oid
                    JOIN pg_class t ON t.oid=d.refobjid JOIN pg_namespace n ON n.oid=t.relnamespace
                    WHERE s.relkind='S' AND d.deptype IN ('a','i')
                      AND n.nspname='public' AND t.relname=ANY(%s)
                """,
                    [tables],
                )
                sequences = [row[0] for row in cursor.fetchall()]
            statements = role_statements(
                role=role,
                administrator=administrator,
                database=target,
                tables=tables,
                sequences=sequences,
            )
            try:
                with transaction.atomic():
                    with connection.cursor() as cursor:
                        for statement in statements:
                            cursor.execute(statement)
                        cursor.execute(f"SET LOCAL ROLE {identifier(role)}")
                    self.probe_workflows(result)
                    audit = io.StringIO()
                    call_command("audit_database_security", stdout=audit)
                    result["security_audit"] = audit.getvalue().splitlines()
                    with connection.cursor() as cursor:
                        cursor.execute("SET CONSTRAINTS ALL IMMEDIATE")
                    result["deferred_constraints"] = "PASS"
                    transaction.set_rollback(True)
            finally:
                with connection.cursor() as cursor:
                    cursor.execute(
                        "SELECT NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname=%s)", [role]
                    )
                    result["probe_role_absent_after_rollback"] = cursor.fetchone()[0]
                if not result["probe_role_absent_after_rollback"]:
                    raise CommandError("Probe role unexpectedly remains; stop for operator review.")
        finally:
            connection.close()
            connection.settings_dict["NAME"] = original
            self.stdout.write(json.dumps(result, sort_keys=True))

    def probe_workflows(self, result: dict[str, Any]) -> None:
        # Test client orchestrates real middleware/services/PostgreSQL on this
        # single transaction. This is not a socket/deployment/concurrency test.
        from apps.ledger.models import Account
        from apps.users.models import User
        from rest_framework.test import APIClient

        client = APIClient(enforce_csrf_checks=True)
        count = 0

        def request(path: str, data: dict[str, Any] | None = None, status: int = 200) -> Any:
            nonlocal count
            if data is None:
                response = client.get(path)
            else:
                token = client.cookies.get("csrftoken")
                response = client.post(
                    path,
                    data,
                    format="json",
                    HTTP_X_CSRFTOKEN=token.value if token else "",
                    HTTP_IDEMPOTENCY_KEY=f"probe-{count}",
                )
            count += 1
            if response.status_code != status:
                raise CommandError(
                    f"Role workflow failed: {path}, expected {status}, observed {response.status_code}."
                )
            if getattr(response, "streaming", False):
                try:
                    return b"".join(response.streaming_content)
                finally:
                    response.close()
            return response.json() if status != 204 else None

        request("/api/v1/auth/csrf/")
        credentials = {
            "email": f"probe-{uuid4().hex}@example.com",
            "password": secrets.token_urlsafe(32),
        }
        user = request("/api/v1/auth/register/", credentials, 201)
        request("/api/v1/auth/login/", credentials)
        request("/api/v1/auth/me/")
        account = request(
            "/api/v1/accounts/",
            {
                "name": "Probe Cash",
                "kind": "cash",
                "opened_on": "2025-01-01",
                "opening_balance": "1000.00",
            },
            201,
        )
        category = request("/api/v1/categories/", {"name": "Probe Rent"}, 201)
        contact = request(
            "/api/v1/contacts/", {"display_name": "Probe Friend", "is_roommate": True}, 201
        )
        base = {"account": account["id"], "effective_date": "2025-10-16", "title": "Rehearsal"}
        for kind, amount in (("lend", "100.00"), ("borrow", "50.00")):
            loan = request(
                "/api/v1/loans/",
                {**base, "kind": kind, "amount": amount, "contact": contact["id"]},
                201,
            )
            request(
                "/api/v1/settlements/", {**base, "claim": loan["claims"][0], "amount": amount}, 201
            )
        bill = request(
            "/api/v1/shared-bills/",
            {
                **base,
                "amount": "60.00",
                "category": category["id"],
                "split_method": "equal",
                "participants": [{"contact": None}, {"contact": contact["id"]}],
            },
            201,
        )
        request(
            "/api/v1/settlements/", {**base, "claim": bill["claims"][0], "amount": "30.00"}, 201
        )
        plan = request(
            "/api/v1/rent/plans/",
            {
                "title": "Probe Rent",
                "payee": "Landlord",
                "start_date": "2025-10-01",
                "due_day": None,
                "amount": "100.00",
                "category": category["id"],
            },
            201,
        )
        request(f"/api/v1/rent/plans/{plan['id']}/generate/", {"through": "2025-10-31"}, 201)
        obligation = request(f"/api/v1/rent/plans/{plan['id']}/obligations/")["results"][0]
        request(
            "/api/v1/rent/reserves/",
            {
                "obligation": obligation["id"],
                "label": "Probe",
                "amount": "100.00",
                "reason": "Rehearsal",
            },
            201,
        )
        payment = request(
            f"/api/v1/rent/obligations/{obligation['id']}/payments/",
            {"payer": contact["id"], "amount": "100.00", "effective_date": "2025-10-16"},
            201,
        )
        # The financial payment representation provides the linked event; select
        # its payable directly for the same synthetic owner, never infer by title.
        from apps.sharing.models import Claim

        claim = Claim.objects.get(
            user_id=user["id"], source_event__public_id=payment["event"]["id"], direction="payable"
        )
        for amount in ("40.00", "60.00"):
            request("/api/v1/settlements/", {**base, "claim": str(claim.pk), "amount": amount}, 201)
        request(
            "/api/v1/budgets/",
            {
                "name": "Probe",
                "period_type": "monthly",
                "period_start": "2025-10-01",
                "period_end": "2025-10-31",
                "limit": "500.00",
            },
            201,
        )
        summary = request("/api/v1/accounts/summary/")
        if summary["liquid_balance"] != "870.00" or summary["personal_expense"] != "130.00":
            raise CommandError("Restricted-role ledger reconciliation failed.")
        for path in (
            "dashboard/?period=all",
            "reports/summary/?period=all",
            "funds/summary/",
            "reports/funds/",
            "reports/export/?period=all",
        ):
            request("/api/v1/" + path)
        foreign_user = User.objects.create_user(email=f"foreign-{uuid4().hex}@example.com")
        foreign_account = Account.objects.create(
            user=foreign_user, name="Foreign", kind="cash", opened_on=date(2025, 1, 1)
        )
        request(f"/api/v1/accounts/{foreign_account.pk}/", status=404)
        for sql in (
            "UPDATE users SET is_staff=true WHERE false",
            "DELETE FROM ledger_posting WHERE false",
            "INSERT INTO django_migrations(app,name,applied) VALUES ('probe','forbidden',now())",
            "CREATE TABLE public.kivo_probe_forbidden(id integer)",
        ):
            try:
                with transaction.atomic(), connection.cursor() as cursor:
                    cursor.execute(sql)
            except DatabaseError as exc:
                if getattr(exc.__cause__, "sqlstate", None) != "42501":
                    raise CommandError(
                        "Negative permission check failed for an unexpected reason."
                    ) from None
            else:
                raise CommandError("A forbidden runtime privilege was accepted.")
        request("/api/v1/auth/logout/", {}, 204)
        request("/api/v1/auth/me/", status=401)
        result["api_checks"] = count
        result["forbidden_privileges_rejected"] = 4
