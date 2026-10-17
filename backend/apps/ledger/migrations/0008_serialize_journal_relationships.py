"""Serialize raw journal insertion as well as the authorized service writes."""

from django.db import migrations

SQL = """
CREATE OR REPLACE FUNCTION kivo_guard_journal_relationship() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE owner_id bigint;
BEGIN
    IF TG_TABLE_NAME='ledger_event' THEN
        owner_id:=NEW.user_id;
        PERFORM 1 FROM users WHERE id=owner_id FOR UPDATE;
        IF NEW.contact_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sharing_contact WHERE id=NEW.contact_id AND user_id=owner_id) THEN
            RAISE EXCEPTION 'Cross-owner journal contact' USING ERRCODE='23514'; END IF;
        IF EXISTS (SELECT 1 FROM ledger_account WHERE id IN (NEW.account_id,NEW.destination_id) AND archived) THEN
            RAISE EXCEPTION 'Archived account cannot receive a new event' USING ERRCODE='23514'; END IF;
    ELSE
        SELECT user_id INTO STRICT owner_id FROM ledger_event WHERE id=NEW.event_id;
        PERFORM 1 FROM users WHERE id=owner_id FOR UPDATE;
        IF NEW.claim_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sharing_claim c
            WHERE c.id=NEW.claim_id AND c.user_id=owner_id AND c.direction=NEW.book) THEN
            RAISE EXCEPTION 'Invalid journal claim ownership or book' USING ERRCODE='23514'; END IF;
    END IF;
    RETURN NEW;
END;
$$;
"""


class Migration(migrations.Migration):
    dependencies = [("ledger", "0007_personal_financial_guards")]
    operations = [migrations.RunSQL(SQL)]
