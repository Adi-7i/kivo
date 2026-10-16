"""Verify real PostgreSQL privileges, not mocked Supabase API behavior."""

from __future__ import annotations

import pytest
from django.db import connection


@pytest.mark.integration
@pytest.mark.django_db
def test_django_tables_are_private_from_supabase_client_roles() -> None:
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT c.relname, c.relrowsecurity,
                has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'),
                has_table_privilege('authenticated', c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'),
                has_table_privilege('service_role', c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
            FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
            WHERE n.nspname='public' AND c.relkind='r'
                AND (c.relname LIKE 'ledger_%%' OR c.relname LIKE 'funds_%%' OR c.relname IN ('users', 'django_session'))
        """)
        rows = cursor.fetchall()
    assert len(rows) >= 13
    assert all(
        rls and not anon and not authenticated and not service
        for _, rls, anon, authenticated, service in rows
    )
