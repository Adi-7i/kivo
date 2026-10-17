"""SQL used by the additive v2 migration; no changes to retained v1 records."""

SQL = """
CREATE OR REPLACE FUNCTION kivo_guard_fund_row() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE owner_id bigint; source_amount bigint;
BEGIN
    IF TG_TABLE_NAME='funds_fundingbatch' THEN
        IF NOT EXISTS (SELECT 1 FROM ledger_event WHERE id=NEW.source_id AND user_id=NEW.user_id
            AND kind IN ('opening','receipt','borrow')) THEN
            RAISE EXCEPTION 'Invalid funding source' USING ERRCODE='23514'; END IF;
    ELSIF TG_TABLE_NAME='funds_allocationrun' THEN
        IF (NEW.trigger_event_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM ledger_event WHERE id=NEW.trigger_event_id AND user_id=NEW.user_id))
            OR (NEW.previous_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM funds_allocationrun WHERE id=NEW.previous_id AND user_id=NEW.user_id)) THEN
            RAISE EXCEPTION 'Cross-owner attribution run' USING ERRCODE='23514'; END IF;
    ELSE
        SELECT user_id INTO STRICT owner_id FROM funds_allocationrun WHERE id=NEW.run_id;
        IF TG_TABLE_NAME<>'funds_allocationgap' THEN
            SELECT e.amount_paise INTO source_amount FROM funds_fundingbatch b JOIN ledger_event e ON e.id=b.source_id
                WHERE b.id=NEW.batch_id AND b.user_id=owner_id;
            IF source_amount IS NULL THEN RAISE EXCEPTION 'Cross-owner source attribution' USING ERRCODE='23514'; END IF;
        END IF;
        IF TG_TABLE_NAME='funds_batchcapacity' THEN
            IF NEW.original_paise<>source_amount OR (NEW.exhausted_on IS NOT NULL AND EXISTS (
                SELECT 1 FROM funds_allocationrun WHERE id=NEW.run_id AND status<>'complete')) THEN
                RAISE EXCEPTION 'Invalid capacity or incomplete exhaustion' USING ERRCODE='23514'; END IF;
        ELSIF TG_TABLE_NAME='funds_claimposition' THEN
            IF NOT EXISTS (SELECT 1 FROM sharing_claim WHERE id=NEW.claim_id AND user_id=owner_id AND direction='receivable') THEN
                RAISE EXCEPTION 'Invalid receivable source position' USING ERRCODE='23514'; END IF;
        ELSIF TG_TABLE_NAME='funds_allocation' THEN
            IF NEW.claim_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sharing_claim WHERE id=NEW.claim_id AND user_id=owner_id) THEN
                RAISE EXCEPTION 'Cross-owner allocation claim' USING ERRCODE='23514'; END IF;
            IF NEW.expense_event_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM ledger_event WHERE id=NEW.expense_event_id AND user_id=owner_id
                AND kind IN ('expense','shared_paid','shared_due')) THEN
                RAISE EXCEPTION 'Invalid recognized expense reference' USING ERRCODE='23514'; END IF;
            IF NOT EXISTS (SELECT 1 FROM ledger_event e WHERE e.id=NEW.event_id AND e.user_id=owner_id
                AND NEW.amount_paise<=e.amount_paise AND (
                (NEW.kind='expense' AND e.kind IN ('expense','shared_paid') AND NEW.from_account_id=e.account_id
                    AND NEW.to_account_id IS NULL AND NEW.claim_id IS NULL AND (NEW.expense_event_id IS NULL OR NEW.expense_event_id=e.id))
                OR (NEW.kind='expense' AND e.kind='repay_out' AND NEW.from_account_id=e.account_id AND NEW.to_account_id IS NULL
                    AND EXISTS (SELECT 1 FROM ledger_posting p JOIN sharing_claim c ON c.id=p.claim_id JOIN ledger_event x ON x.id=c.source_event_id
                        WHERE p.event_id=e.id AND c.id=NEW.claim_id AND x.kind='shared_due' AND x.id=NEW.expense_event_id))
                OR (NEW.kind='transfer' AND e.kind='transfer' AND NEW.from_account_id=e.account_id AND NEW.to_account_id=e.destination_id
                    AND NEW.claim_id IS NULL AND NEW.expense_event_id IS NULL)
                OR (NEW.kind='refund' AND e.kind='refund' AND NEW.from_account_id IS NULL AND NEW.to_account_id=e.account_id
                    AND NEW.claim_id IS NULL AND (NEW.expense_event_id IS NULL OR NEW.expense_event_id=e.original_expense_id))
                OR (NEW.kind='advance' AND e.kind IN ('lend','shared_paid') AND NEW.from_account_id=e.account_id AND NEW.to_account_id IS NULL
                    AND NEW.expense_event_id IS NULL AND EXISTS (SELECT 1 FROM sharing_claim c WHERE c.id=NEW.claim_id
                        AND c.source_event_id=e.id AND c.direction='receivable'))
                OR (NEW.kind='recover' AND e.kind='repay_in' AND NEW.from_account_id IS NULL AND NEW.to_account_id=e.account_id
                    AND NEW.expense_event_id IS NULL AND EXISTS (SELECT 1 FROM ledger_posting p WHERE p.event_id=e.id AND p.claim_id=NEW.claim_id))
                OR (NEW.kind='principal' AND e.kind='repay_out' AND NEW.from_account_id=e.account_id AND NEW.to_account_id IS NULL
                    AND NEW.expense_event_id IS NULL AND EXISTS (SELECT 1 FROM ledger_posting p JOIN sharing_claim c ON c.id=p.claim_id
                        JOIN ledger_event x ON x.id=c.source_event_id WHERE p.event_id=e.id AND c.id=NEW.claim_id AND x.kind='borrow'))
                )) THEN RAISE EXCEPTION 'Invalid allocation financial reference' USING ERRCODE='23514'; END IF;
        ELSE
            IF NOT EXISTS (SELECT 1 FROM ledger_account WHERE id=NEW.account_id AND user_id=owner_id) THEN
                RAISE EXCEPTION 'Cross-owner attribution account' USING ERRCODE='23514'; END IF;
            IF TG_TABLE_NAME='funds_allocationgap' AND NEW.event_id IS NOT NULL AND NOT EXISTS (
                SELECT 1 FROM ledger_event WHERE id=NEW.event_id AND user_id=owner_id) THEN
                RAISE EXCEPTION 'Cross-owner gap' USING ERRCODE='23514'; END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION kivo_verify_fund_run() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target bigint; run_status text;
BEGIN
    IF TG_TABLE_NAME='funds_allocationrun' THEN target:=NEW.id; ELSE target:=NEW.run_id; END IF;
    SELECT status INTO STRICT run_status FROM funds_allocationrun WHERE id=target;
    IF EXISTS (SELECT 1 FROM funds_batchcapacity c WHERE c.run_id=target AND (
        c.remaining_paise<>COALESCE((SELECT sum(p.amount_paise) FROM funds_fundposition p WHERE p.run_id=target AND p.batch_id=c.batch_id),0)
            +COALESCE((SELECT sum(p.amount_paise) FROM funds_claimposition p WHERE p.run_id=target AND p.batch_id=c.batch_id),0)
        OR c.allocated_paise<>COALESCE((SELECT sum(CASE WHEN a.kind IN ('expense','principal') THEN a.amount_paise
            WHEN a.kind='refund' THEN -a.amount_paise ELSE 0 END) FROM funds_allocation a WHERE a.run_id=target AND a.batch_id=c.batch_id),0)
    )) OR EXISTS (SELECT 1 FROM (
        SELECT batch_id FROM funds_fundposition WHERE run_id=target UNION ALL
        SELECT batch_id FROM funds_claimposition WHERE run_id=target UNION ALL
        SELECT batch_id FROM funds_allocation WHERE run_id=target
    ) p WHERE NOT EXISTS (SELECT 1 FROM funds_batchcapacity c WHERE c.run_id=target AND c.batch_id=p.batch_id)) THEN
        RAISE EXCEPTION 'Attribution capacity does not reconcile' USING ERRCODE='23514'; END IF;
    IF EXISTS (SELECT a.event_id FROM funds_allocation a JOIN ledger_event e ON e.id=a.event_id WHERE a.run_id=target
        GROUP BY a.event_id,e.amount_paise HAVING sum(a.amount_paise)>e.amount_paise
            OR (run_status='complete' AND sum(a.amount_paise)<>e.amount_paise)) THEN
        RAISE EXCEPTION 'Attribution event overflow or incomplete allocation' USING ERRCODE='23514'; END IF;
    IF EXISTS (
        SELECT 1 FROM (
            SELECT batch_id,claim_id,sum(CASE kind WHEN 'advance' THEN amount_paise ELSE -amount_paise END) AS amount
                FROM funds_allocation WHERE run_id=target AND kind IN ('advance','recover') GROUP BY batch_id,claim_id
        ) a FULL JOIN (SELECT batch_id,claim_id,amount_paise AS amount FROM funds_claimposition WHERE run_id=target) p
        USING(batch_id,claim_id) WHERE COALESCE(a.amount,0)<>COALESCE(p.amount,0)
    ) THEN RAISE EXCEPTION 'Receivable custody does not reconcile' USING ERRCODE='23514'; END IF;
    IF (run_status='complete' AND EXISTS (SELECT 1 FROM funds_allocationgap WHERE run_id=target))
        OR (run_status='incomplete' AND NOT EXISTS (SELECT 1 FROM funds_allocationgap WHERE run_id=target)) THEN
        RAISE EXCEPTION 'Attribution status disagrees with gaps' USING ERRCODE='23514'; END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER fund_immutable BEFORE UPDATE OR DELETE ON funds_claimposition
    FOR EACH ROW EXECUTE FUNCTION kivo_reject_journal_mutation();
CREATE TRIGGER fund_owner_guard BEFORE INSERT ON funds_claimposition
    FOR EACH ROW EXECUTE FUNCTION kivo_guard_fund_row();
CREATE CONSTRAINT TRIGGER fund_run_reconciles AFTER INSERT ON funds_claimposition
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION kivo_verify_fund_run();
ALTER TABLE funds_claimposition ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE funds_claimposition FROM PUBLIC;
REVOKE ALL ON SEQUENCE funds_claimposition_id_seq FROM PUBLIC;
DO $$ DECLARE client_role text;
BEGIN
    FOREACH client_role IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=client_role) THEN
            EXECUTE format('REVOKE ALL ON TABLE funds_claimposition FROM %I',client_role);
            EXECUTE format('REVOKE ALL ON SEQUENCE funds_claimposition_id_seq FROM %I',client_role);
        END IF;
    END LOOP;
END;
$$;
"""
