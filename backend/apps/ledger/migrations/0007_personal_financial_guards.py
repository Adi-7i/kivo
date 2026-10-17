"""Extend journal semantics without rewriting applied two-leg history."""

from django.db import migrations

SQL = """
CREATE FUNCTION kivo_expected_postings(target bigint)
RETURNS TABLE(book text, account_id uuid, claim_id uuid, amount_paise bigint)
LANGUAGE sql STABLE AS $$
WITH e AS (SELECT * FROM ledger_event WHERE id=target)
SELECT 'liquid', e.account_id, NULL::uuid,
    CASE WHEN e.kind IN ('opening','receipt','refund','borrow','repay_in')
        THEN e.amount_paise ELSE -e.amount_paise END FROM e
    WHERE e.kind NOT IN ('shared_due','reversal')
UNION ALL
SELECT 'liquid', e.destination_id, NULL::uuid, e.amount_paise FROM e WHERE e.kind='transfer'
UNION ALL
SELECT CASE e.kind WHEN 'opening' THEN 'equity' WHEN 'receipt' THEN 'external' ELSE 'expense' END,
    NULL::uuid, NULL::uuid, CASE WHEN e.kind IN ('expense') THEN e.amount_paise ELSE -e.amount_paise END
    FROM e WHERE e.kind IN ('opening','receipt','expense','refund')
UNION ALL
SELECT c.direction, NULL::uuid, c.id, CASE WHEN e.kind='lend' THEN e.amount_paise ELSE -e.amount_paise END
    FROM e JOIN sharing_claim c ON c.source_event_id=e.id WHERE e.kind IN ('lend','borrow')
UNION ALL
SELECT c.direction, NULL::uuid, c.id, CASE WHEN e.kind='repay_in' THEN -e.amount_paise ELSE e.amount_paise END
    FROM e JOIN ledger_posting p ON p.event_id=e.id AND p.claim_id IS NOT NULL
    JOIN sharing_claim c ON c.id=p.claim_id WHERE e.kind IN ('repay_in','repay_out')
UNION ALL
SELECT 'expense', NULL::uuid, NULL::uuid, s.amount_paise FROM e
    JOIN sharing_sharedbill b ON b.event_id=e.id JOIN sharing_billshare s ON s.bill_id=b.id
    WHERE e.kind IN ('shared_paid','shared_due') AND s.contact_id IS NULL AND s.amount_paise>0
UNION ALL
SELECT 'receivable', NULL::uuid, s.claim_id, s.amount_paise FROM e
    JOIN sharing_sharedbill b ON b.event_id=e.id JOIN sharing_billshare s ON s.bill_id=b.id
    WHERE e.kind='shared_paid' AND s.contact_id IS NOT NULL AND s.amount_paise>0
UNION ALL
SELECT 'payable', NULL::uuid, s.claim_id, -s.amount_paise FROM e
    JOIN sharing_sharedbill b ON b.event_id=e.id JOIN sharing_billshare s ON s.bill_id=b.id
    WHERE e.kind='shared_due' AND s.contact_id IS NULL AND s.amount_paise>0
UNION ALL
SELECT p.book, p.account_id, p.claim_id, -p.amount_paise FROM e
    JOIN ledger_posting p ON p.event_id=e.reverses_id WHERE e.kind='reversal';
$$;

CREATE OR REPLACE FUNCTION kivo_verify_event() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE e ledger_event%ROWTYPE; target bigint;
BEGIN
    IF TG_TABLE_NAME='ledger_event' THEN target:=NEW.id;
    ELSIF TG_TABLE_NAME='sharing_claim' THEN target:=NEW.source_event_id;
    ELSIF TG_TABLE_NAME='sharing_billshare' THEN SELECT event_id INTO STRICT target FROM sharing_sharedbill WHERE id=NEW.bill_id;
    ELSE target:=NEW.event_id; END IF;
    SELECT * INTO STRICT e FROM ledger_event WHERE id=target;
    IF (e.account_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM ledger_account
            WHERE id=e.account_id AND user_id=e.user_id AND opened_on<=e.effective_date))
        OR (e.destination_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM ledger_account
            WHERE id=e.destination_id AND user_id=e.user_id AND opened_on<=e.effective_date))
        OR (e.category_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM ledger_category WHERE id=e.category_id AND user_id=e.user_id))
        OR (e.root_event_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM ledger_event WHERE id=e.root_event_id AND user_id=e.user_id AND kind=e.kind))
        OR (e.supersedes_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM ledger_event x WHERE x.id=e.supersedes_id
            AND x.user_id=e.user_id AND x.kind=e.kind AND EXISTS (SELECT 1 FROM ledger_event v WHERE v.reverses_id=x.id)))
        OR EXISTS (SELECT 1 FROM ledger_posting p JOIN ledger_account a ON a.id=p.account_id WHERE p.event_id=e.id AND a.user_id<>e.user_id)
    THEN RAISE EXCEPTION 'Cross-owner or invalid financial reference' USING ERRCODE='23514'; END IF;
    IF e.kind='reversal' THEN
        IF NOT EXISTS (SELECT 1 FROM ledger_event x WHERE x.id=e.reverses_id AND x.user_id=e.user_id
            AND x.kind<>'reversal' AND x.amount_paise=e.amount_paise AND x.effective_date=e.effective_date
            AND x.account_id IS NOT DISTINCT FROM e.account_id)
        THEN RAISE EXCEPTION 'Invalid reversal reference' USING ERRCODE='23514'; END IF;
    ELSIF e.kind='refund' THEN
        IF NOT EXISTS (SELECT 1 FROM ledger_event x WHERE x.id=e.original_expense_id AND x.user_id=e.user_id
            AND x.kind='expense' AND x.effective_date<=e.effective_date)
        THEN RAISE EXCEPTION 'Invalid refund reference' USING ERRCODE='23514'; END IF;
    ELSIF e.kind IN ('lend','borrow') THEN
        IF (SELECT count(*) FROM sharing_claim WHERE source_event_id=e.id)<>1 OR NOT EXISTS (
            SELECT 1 FROM sharing_claim c WHERE c.source_event_id=e.id AND c.contact_id=e.contact_id
            AND c.direction=CASE WHEN e.kind='lend' THEN 'receivable' ELSE 'payable' END)
        THEN RAISE EXCEPTION 'Invalid lending claim origin' USING ERRCODE='23514'; END IF;
    ELSIF e.kind IN ('repay_in','repay_out') THEN
        IF (SELECT count(*) FROM ledger_posting WHERE event_id=e.id AND claim_id IS NOT NULL)<>1
            OR NOT EXISTS (SELECT 1 FROM ledger_posting p JOIN sharing_claim c ON c.id=p.claim_id
                JOIN ledger_event x ON x.id=c.source_event_id WHERE p.event_id=e.id AND c.user_id=e.user_id
                AND c.contact_id=e.contact_id AND x.effective_date<=e.effective_date
                AND c.direction=CASE WHEN e.kind='repay_in' THEN 'receivable' ELSE 'payable' END)
        THEN RAISE EXCEPTION 'Invalid settlement claim' USING ERRCODE='23514'; END IF;
    ELSIF e.kind IN ('shared_paid','shared_due') THEN
        IF NOT EXISTS (SELECT 1 FROM sharing_sharedbill b JOIN sharing_billshare s ON s.bill_id=b.id
            WHERE b.event_id=e.id GROUP BY b.id HAVING sum(s.amount_paise)=e.amount_paise
                AND count(*) FILTER (WHERE s.contact_id IS NULL)=1 AND count(*)<=100)
        OR EXISTS (SELECT 1 FROM sharing_sharedbill b WHERE b.event_id=e.id AND b.payer_id IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM sharing_billshare s WHERE s.bill_id=b.id AND s.contact_id=b.payer_id))
        OR EXISTS (SELECT 1 FROM sharing_sharedbill b JOIN sharing_billshare s ON s.bill_id=b.id WHERE b.event_id=e.id AND (
            CASE WHEN s.amount_paise>0 AND ((e.kind='shared_paid' AND s.contact_id IS NOT NULL)
                OR (e.kind='shared_due' AND s.contact_id IS NULL)) THEN
                s.claim_id IS NULL OR NOT EXISTS (SELECT 1 FROM sharing_claim c WHERE c.id=s.claim_id
                    AND c.source_event_id=e.id AND c.contact_id=COALESCE(s.contact_id,b.payer_id)
                    AND c.direction=CASE WHEN e.kind='shared_paid' THEN 'receivable' ELSE 'payable' END)
            ELSE s.claim_id IS NOT NULL END))
        OR EXISTS (SELECT 1 FROM sharing_claim c WHERE c.source_event_id=e.id AND NOT EXISTS (
            SELECT 1 FROM sharing_billshare s JOIN sharing_sharedbill b ON b.id=s.bill_id
            WHERE s.claim_id=c.id AND b.event_id=e.id))
        THEN RAISE EXCEPTION 'Shared bill shares or claims do not conserve the bill' USING ERRCODE='23514'; END IF;
    END IF;
    IF EXISTS (
        (SELECT book,account_id,claim_id,amount_paise FROM ledger_posting WHERE event_id=e.id
         EXCEPT ALL SELECT * FROM kivo_expected_postings(e.id))
        UNION ALL
        (SELECT * FROM kivo_expected_postings(e.id) EXCEPT ALL
         SELECT book,account_id,claim_id,amount_paise FROM ledger_posting WHERE event_id=e.id)
    ) OR COALESCE((SELECT sum(amount_paise) FROM ledger_posting WHERE event_id=e.id),0)<>0 THEN
        RAISE EXCEPTION 'Journal legs do not match balanced financial semantics' USING ERRCODE='23514';
    END IF;
    RETURN NULL;
END;
$$;

CREATE FUNCTION kivo_verify_claim_history() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE owner_id bigint;
BEGIN
    IF TG_TABLE_NAME='sharing_claim' THEN owner_id:=NEW.user_id;
    ELSE SELECT user_id INTO STRICT owner_id FROM ledger_event WHERE id=NEW.event_id;
    END IF;
    IF EXISTS (
        SELECT 1 FROM (
            SELECT sum(CASE p.book WHEN 'receivable' THEN p.amount_paise ELSE -p.amount_paise END)
                OVER (PARTITION BY p.claim_id ORDER BY e.effective_date,COALESCE(e.root_event_id,e.id),e.id,p.id) AS outstanding
            FROM ledger_posting p JOIN ledger_event e ON e.id=p.event_id
            WHERE e.user_id=owner_id AND p.claim_id IS NOT NULL AND e.kind<>'reversal'
                AND NOT EXISTS (SELECT 1 FROM ledger_event v WHERE v.reverses_id=e.id)
        ) balances WHERE outstanding<0
    ) OR EXISTS (SELECT 1 FROM ledger_posting p JOIN ledger_event e ON e.id=p.event_id
        JOIN sharing_claim c ON c.id=p.claim_id WHERE e.user_id=owner_id AND e.kind IN ('repay_in','repay_out')
        AND NOT EXISTS (SELECT 1 FROM ledger_event v WHERE v.reverses_id=e.id)
        AND EXISTS (SELECT 1 FROM ledger_event v WHERE v.reverses_id=c.source_event_id)) THEN
        RAISE EXCEPTION 'Settlement exceeds or precedes an active claim' USING ERRCODE='23514';
    END IF;
    RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER claim_history_reconciles AFTER INSERT ON ledger_posting
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION kivo_verify_claim_history();
CREATE CONSTRAINT TRIGGER claim_history_reconciles AFTER INSERT ON sharing_claim
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION kivo_verify_claim_history();
CREATE CONSTRAINT TRIGGER claim_origin_reconciles AFTER INSERT ON sharing_claim
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION kivo_verify_event();
CREATE CONSTRAINT TRIGGER shared_bill_reconciles AFTER INSERT ON sharing_sharedbill
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION kivo_verify_event();
CREATE CONSTRAINT TRIGGER shared_bill_reconciles AFTER INSERT ON sharing_billshare
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION kivo_verify_event();
"""


class Migration(migrations.Migration):
    dependencies = [("ledger", "0006_remove_event_event_valid_kind_and_more")]
    operations = [migrations.RunSQL(SQL)]
