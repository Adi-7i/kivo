"""Isolate polymorphic trigger record access in a forward-only repair."""

from django.db import migrations

from ._v2_guards import SQL as V2_SQL

OLD = """IF TG_TABLE_NAME='funds_allocationgap' AND NEW.event_id IS NOT NULL AND NOT EXISTS (
                SELECT 1 FROM ledger_event WHERE id=NEW.event_id AND user_id=owner_id) THEN
                RAISE EXCEPTION 'Cross-owner gap' USING ERRCODE='23514'; END IF;"""
NEW = """IF TG_TABLE_NAME='funds_allocationgap' THEN
                IF NEW.event_id IS NOT NULL AND NOT EXISTS (
                    SELECT 1 FROM ledger_event WHERE id=NEW.event_id AND user_id=owner_id) THEN
                    RAISE EXCEPTION 'Cross-owner gap' USING ERRCODE='23514';
                END IF;
            END IF;"""
GUARD_SQL = V2_SQL.split("CREATE OR REPLACE FUNCTION kivo_verify_fund_run", 1)[0]
assert GUARD_SQL.count(OLD) == 1


class Migration(migrations.Migration):
    dependencies = [("funds", "0004_claimposition_and_more")]
    operations = [migrations.RunSQL(GUARD_SQL.replace(OLD, NEW))]
