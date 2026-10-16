"""Private, immutable and internally reconciled source attribution snapshots."""

from django.db import migrations

SQL = """
CREATE FUNCTION kivo_guard_fund_row() RETURNS trigger LANGUAGE plpgsql AS $$
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
            IF TG_TABLE_NAME='funds_allocationgap' AND NEW.event_id IS NOT NULL
                AND NOT EXISTS (SELECT 1 FROM ledger_event WHERE id=NEW.event_id AND user_id=owner_id) THEN
                RAISE EXCEPTION 'Cross-owner attribution gap' USING ERRCODE='23514';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE FUNCTION kivo_verify_fund_run() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target_id bigint; run_status text;
BEGIN
    IF TG_TABLE_NAME='funds_allocationrun' THEN target_id:=NEW.id; ELSE target_id:=NEW.run_id; END IF;
    SELECT status INTO STRICT run_status FROM funds_allocationrun WHERE id=target_id;
    IF EXISTS (SELECT 1 FROM funds_batchcapacity c WHERE c.run_id=target_id AND (
        c.remaining_paise <> COALESCE((SELECT sum(p.amount_paise) FROM funds_fundposition p
            WHERE p.run_id=target_id AND p.batch_id=c.batch_id),0)
        OR c.allocated_paise <> COALESCE((SELECT sum(CASE a.kind WHEN 'expense' THEN a.amount_paise
            WHEN 'refund' THEN -a.amount_paise ELSE 0 END) FROM funds_allocation a
            WHERE a.run_id=target_id AND a.batch_id=c.batch_id),0)
    )) OR EXISTS (SELECT 1 FROM funds_fundposition p WHERE p.run_id=target_id AND NOT EXISTS (
        SELECT 1 FROM funds_batchcapacity c WHERE c.run_id=target_id AND c.batch_id=p.batch_id))
    OR EXISTS (SELECT 1 FROM funds_allocation a WHERE a.run_id=target_id AND NOT EXISTS (
        SELECT 1 FROM funds_batchcapacity c WHERE c.run_id=target_id AND c.batch_id=a.batch_id)) THEN
        RAISE EXCEPTION 'Attribution capacity does not reconcile' USING ERRCODE='23514';
    END IF;
    IF EXISTS (SELECT a.event_id FROM funds_allocation a JOIN ledger_event e ON e.id=a.event_id
        WHERE a.run_id=target_id GROUP BY a.event_id,e.amount_paise
        HAVING sum(a.amount_paise)>e.amount_paise OR (run_status='complete' AND sum(a.amount_paise)<>e.amount_paise)) THEN
        RAISE EXCEPTION 'Attribution event overflow or incomplete allocation' USING ERRCODE='23514';
    END IF;
    IF (run_status='complete' AND EXISTS (SELECT 1 FROM funds_allocationgap WHERE run_id=target_id))
        OR (run_status='incomplete' AND NOT EXISTS (SELECT 1 FROM funds_allocationgap WHERE run_id=target_id)) THEN
        RAISE EXCEPTION 'Attribution status disagrees with its explicit gaps' USING ERRCODE='23514';
    END IF;
    RETURN NULL;
END;
$$;

DO $$
DECLARE table_name text; client_role text; sequence_row record;
BEGIN
    FOREACH table_name IN ARRAY ARRAY['funds_fundingbatch','funds_allocationrun','funds_batchcapacity',
        'funds_fundposition','funds_allocation','funds_allocationgap'] LOOP
        EXECUTE format('CREATE TRIGGER fund_immutable BEFORE UPDATE OR DELETE ON %I
            FOR EACH ROW EXECUTE FUNCTION kivo_reject_journal_mutation()', table_name);
        EXECUTE format('CREATE TRIGGER fund_owner_guard BEFORE INSERT ON %I
            FOR EACH ROW EXECUTE FUNCTION kivo_guard_fund_row()', table_name);
        IF table_name <> 'funds_fundingbatch' THEN
            EXECUTE format('CREATE CONSTRAINT TRIGGER fund_run_reconciles AFTER INSERT ON %I
                DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION kivo_verify_fund_run()', table_name);
        END IF;
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
        EXECUTE format('REVOKE ALL ON TABLE %I FROM PUBLIC', table_name);
        FOREACH client_role IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=client_role) THEN
                EXECUTE format('REVOKE ALL ON TABLE %I FROM %I', table_name, client_role);
            END IF;
        END LOOP;
    END LOOP;
    FOR sequence_row IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname='public' AND c.relkind='S' AND c.relname LIKE 'funds_%' LOOP
        EXECUTE format('REVOKE ALL ON SEQUENCE %I FROM PUBLIC', sequence_row.relname);
        FOREACH client_role IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=client_role) THEN
                EXECUTE format('REVOKE ALL ON SEQUENCE %I FROM %I', sequence_row.relname, client_role);
            END IF;
        END LOOP;
    END LOOP;
END;
$$;
"""


class Migration(migrations.Migration):
    dependencies = [("funds", "0001_initial"), ("ledger", "0003_django_table_privacy")]
    operations = [migrations.RunSQL(SQL)]
