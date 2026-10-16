"""Do not resolve gap-only record fields while validating a position row."""

from django.db import migrations

SQL = """
CREATE OR REPLACE FUNCTION kivo_guard_fund_row() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE owner_id bigint; source_amount bigint;
BEGIN
    IF TG_TABLE_NAME = 'funds_fundingbatch' THEN
        IF NOT EXISTS (SELECT 1 FROM ledger_event WHERE id=NEW.source_id AND user_id=NEW.user_id
            AND kind IN ('opening','receipt')) THEN
            RAISE EXCEPTION 'Invalid funding source ownership or operation' USING ERRCODE='23514';
        END IF;
    ELSIF TG_TABLE_NAME = 'funds_allocationrun' THEN
        IF (NEW.trigger_event_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM ledger_event
                WHERE id=NEW.trigger_event_id AND user_id=NEW.user_id))
            OR (NEW.previous_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM funds_allocationrun
                WHERE id=NEW.previous_id AND user_id=NEW.user_id)) THEN
            RAISE EXCEPTION 'Cross-owner attribution run' USING ERRCODE='23514';
        END IF;
    ELSE
        SELECT user_id INTO STRICT owner_id FROM funds_allocationrun WHERE id=NEW.run_id;
        IF TG_TABLE_NAME <> 'funds_allocationgap' THEN
            SELECT e.amount_paise INTO source_amount FROM funds_fundingbatch b
                JOIN ledger_event e ON e.id=b.source_id WHERE b.id=NEW.batch_id AND b.user_id=owner_id;
            IF source_amount IS NULL THEN
                RAISE EXCEPTION 'Cross-owner source attribution' USING ERRCODE='23514';
            END IF;
        END IF;
        IF TG_TABLE_NAME = 'funds_batchcapacity' THEN
            IF NEW.original_paise <> source_amount OR (NEW.exhausted_on IS NOT NULL AND EXISTS (
                SELECT 1 FROM funds_allocationrun WHERE id=NEW.run_id AND status <> 'complete')) THEN
                RAISE EXCEPTION 'Invalid capacity or incomplete exhaustion claim' USING ERRCODE='23514';
            END IF;
        ELSIF TG_TABLE_NAME = 'funds_allocation' THEN
            IF NOT EXISTS (SELECT 1 FROM ledger_event e WHERE e.id=NEW.event_id AND e.user_id=owner_id
                AND e.kind=NEW.kind AND NEW.amount_paise<=e.amount_paise AND (
                    (NEW.kind='expense' AND NEW.from_account_id=e.account_id AND NEW.to_account_id IS NULL)
                    OR (NEW.kind='transfer' AND NEW.from_account_id=e.account_id AND NEW.to_account_id=e.destination_id)
                    OR (NEW.kind='refund' AND NEW.from_account_id IS NULL AND NEW.to_account_id=e.account_id)
                )) THEN
                RAISE EXCEPTION 'Invalid source allocation financial reference' USING ERRCODE='23514';
            END IF;
        ELSE
            IF NOT EXISTS (SELECT 1 FROM ledger_account WHERE id=NEW.account_id AND user_id=owner_id) THEN
                RAISE EXCEPTION 'Cross-owner attribution account' USING ERRCODE='23514';
            END IF;
            IF TG_TABLE_NAME='funds_allocationgap' THEN
                IF NEW.event_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM ledger_event
                    WHERE id=NEW.event_id AND user_id=owner_id) THEN
                    RAISE EXCEPTION 'Cross-owner attribution gap' USING ERRCODE='23514';
                END IF;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;
"""


class Migration(migrations.Migration):
    dependencies = [("funds", "0002_attribution_guards")]
    operations = [migrations.RunSQL(SQL)]
