"""PostgreSQL defense in depth: append-only journals and commit-time balancing."""

from django.db import migrations

SQL = """
CREATE FUNCTION kivo_reject_journal_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'Posted financial history is immutable; append a reversal'
        USING ERRCODE = '23514';
END;
$$;

CREATE TRIGGER event_immutable BEFORE UPDATE OR DELETE ON ledger_event
FOR EACH ROW EXECUTE FUNCTION kivo_reject_journal_mutation();
CREATE TRIGGER posting_immutable BEFORE UPDATE OR DELETE ON ledger_posting
FOR EACH ROW EXECUTE FUNCTION kivo_reject_journal_mutation();
CREATE TRIGGER write_receipt_immutable BEFORE UPDATE OR DELETE ON ledger_writereceipt
FOR EACH ROW EXECUTE FUNCTION kivo_reject_journal_mutation();

CREATE FUNCTION kivo_guard_owned_metadata() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN
        RAISE EXCEPTION 'Financial ownership is immutable' USING ERRCODE = '23514';
    END IF;
    IF TG_TABLE_NAME = 'ledger_account' THEN
        IF TG_OP = 'UPDATE' AND (NEW.kind IS DISTINCT FROM OLD.kind
            OR NEW.opened_on IS DISTINCT FROM OLD.opened_on) THEN
            RAISE EXCEPTION 'Account kind and opening date are immutable' USING ERRCODE = '23514';
        END IF;
    ELSE
        IF NEW.parent_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM ledger_category p WHERE p.id = NEW.parent_id
                AND p.user_id = NEW.user_id AND p.parent_id IS NULL AND p.id <> NEW.id
        ) THEN
            RAISE EXCEPTION 'Invalid category parent ownership or depth' USING ERRCODE = '23514';
        END IF;
        IF NEW.parent_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM ledger_category c WHERE c.parent_id = NEW.id
        ) THEN
            RAISE EXCEPTION 'A parent category cannot become a subcategory' USING ERRCODE = '23514';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER account_metadata_guard BEFORE UPDATE ON ledger_account
FOR EACH ROW EXECUTE FUNCTION kivo_guard_owned_metadata();
CREATE TRIGGER category_metadata_guard BEFORE INSERT OR UPDATE ON ledger_category
FOR EACH ROW EXECUTE FUNCTION kivo_guard_owned_metadata();

CREATE FUNCTION kivo_verify_event() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    e ledger_event%ROWTYPE;
    target_id bigint;
    leg_count bigint;
    leg_total numeric;
    matching_count bigint;
    expected_book text;
    direction integer;
BEGIN
    IF TG_TABLE_NAME = 'ledger_event' THEN
        target_id := NEW.id;
    ELSE
        target_id := NEW.event_id;
    END IF;
    SELECT * INTO STRICT e FROM ledger_event WHERE id = target_id;
    SELECT count(*), sum(amount_paise), count(*) FILTER (WHERE abs(amount_paise) = e.amount_paise)
        INTO leg_count, leg_total, matching_count FROM ledger_posting WHERE event_id = e.id;
    IF leg_count <> 2 OR leg_total <> 0 OR matching_count <> 2 THEN
        RAISE EXCEPTION 'Financial event must have exactly two equal balanced legs' USING ERRCODE = '23514';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM ledger_account WHERE id = e.account_id AND user_id = e.user_id)
        OR EXISTS (SELECT 1 FROM ledger_posting p JOIN ledger_account a ON a.id = p.account_id
            WHERE p.event_id = e.id AND a.user_id <> e.user_id)
        OR (e.destination_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM ledger_account WHERE id = e.destination_id AND user_id = e.user_id))
        OR (e.category_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM ledger_category WHERE id = e.category_id AND user_id = e.user_id))
        OR (e.root_event_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM ledger_event WHERE id = e.root_event_id AND user_id = e.user_id))
        OR (e.supersedes_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM ledger_event WHERE id = e.supersedes_id AND user_id = e.user_id AND kind = e.kind))
    THEN
        RAISE EXCEPTION 'Cross-owner financial reference' USING ERRCODE = '23514';
    END IF;
    IF e.kind = 'reversal' THEN
        IF NOT EXISTS (SELECT 1 FROM ledger_event WHERE id = e.reverses_id
            AND user_id = e.user_id AND kind <> 'reversal' AND amount_paise = e.amount_paise
            AND effective_date = e.effective_date AND account_id = e.account_id)
            OR EXISTS (
                (SELECT book, account_id, amount_paise FROM ledger_posting WHERE event_id = e.id)
                EXCEPT ALL
                (SELECT book, account_id, -amount_paise FROM ledger_posting WHERE event_id = e.reverses_id)
            ) THEN
            RAISE EXCEPTION 'Invalid reversal legs or reference' USING ERRCODE = '23514';
        END IF;
    ELSE
        IF e.kind = 'refund' AND NOT EXISTS (SELECT 1 FROM ledger_event
            WHERE id = e.original_expense_id AND user_id = e.user_id AND kind = 'expense'
                AND effective_date <= e.effective_date) THEN
            RAISE EXCEPTION 'Invalid refund reference' USING ERRCODE = '23514';
        END IF;
        direction := CASE WHEN e.kind IN ('opening', 'receipt', 'refund') THEN 1 ELSE -1 END;
        IF NOT EXISTS (SELECT 1 FROM ledger_posting WHERE event_id = e.id
            AND book = 'liquid' AND account_id = e.account_id AND amount_paise = direction * e.amount_paise) THEN
            RAISE EXCEPTION 'Invalid liquid financial effect' USING ERRCODE = '23514';
        END IF;
        IF e.kind = 'transfer' THEN
            IF NOT EXISTS (SELECT 1 FROM ledger_posting WHERE event_id = e.id
                AND book = 'liquid' AND account_id = e.destination_id AND amount_paise = e.amount_paise) THEN
                RAISE EXCEPTION 'Invalid destination financial effect' USING ERRCODE = '23514';
            END IF;
        ELSE
            expected_book := CASE e.kind WHEN 'opening' THEN 'equity' WHEN 'receipt' THEN 'external' ELSE 'expense' END;
            IF NOT EXISTS (SELECT 1 FROM ledger_posting WHERE event_id = e.id
                AND book = expected_book AND account_id IS NULL AND amount_paise = -direction * e.amount_paise) THEN
                RAISE EXCEPTION 'Invalid nominal financial effect' USING ERRCODE = '23514';
            END IF;
        END IF;
    END IF;
    RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER event_balanced AFTER INSERT ON ledger_event
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION kivo_verify_event();
CREATE CONSTRAINT TRIGGER posting_balanced AFTER INSERT ON ledger_posting
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION kivo_verify_event();
"""

REVERSE_SQL = """
DROP TRIGGER posting_balanced ON ledger_posting;
DROP TRIGGER event_balanced ON ledger_event;
DROP FUNCTION kivo_verify_event();
DROP TRIGGER category_metadata_guard ON ledger_category;
DROP TRIGGER account_metadata_guard ON ledger_account;
DROP FUNCTION kivo_guard_owned_metadata();
DROP TRIGGER write_receipt_immutable ON ledger_writereceipt;
DROP TRIGGER posting_immutable ON ledger_posting;
DROP TRIGGER event_immutable ON ledger_event;
DROP FUNCTION kivo_reject_journal_mutation();
"""


class Migration(migrations.Migration):
    dependencies = [("ledger", "0001_initial")]
    operations = [migrations.RunSQL(SQL, REVERSE_SQL)]
