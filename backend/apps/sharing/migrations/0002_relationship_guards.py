"""Owner isolation, immutable references and deferred rent/reserve reconciliation."""

from django.db import migrations

SQL = """
CREATE FUNCTION kivo_guard_relationship() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE owner_id bigint; expected_owner bigint; p sharing_rentplan%ROWTYPE; last_day integer;
BEGIN
    IF TG_OP='UPDATE' THEN
        IF TG_TABLE_NAME='sharing_contact' THEN
            IF NEW.user_id<>OLD.user_id OR NEW.id<>OLD.id OR NEW.created_at<>OLD.created_at THEN
                RAISE EXCEPTION 'Contact identity and ownership are immutable' USING ERRCODE='23514';
            END IF;
        ELSIF TG_TABLE_NAME='sharing_rentplan' THEN
            IF (to_jsonb(NEW)-'active') IS DISTINCT FROM (to_jsonb(OLD)-'active') THEN
                RAISE EXCEPTION 'Rent terms are immutable; deactivate and replace the plan' USING ERRCODE='23514';
            END IF;
        END IF;
        RETURN NEW;
    END IF;
    IF TG_TABLE_NAME IN ('sharing_contact','sharing_metadatachange','sharing_rentplan') THEN
        owner_id:=NEW.user_id;
        IF TG_TABLE_NAME='sharing_rentplan' THEN
            IF NOT EXISTS (SELECT 1 FROM ledger_category WHERE id=NEW.category_id AND user_id=owner_id) THEN
                RAISE EXCEPTION 'Cross-owner rent category' USING ERRCODE='23514';
            END IF;
        END IF;
    ELSIF TG_TABLE_NAME='sharing_claim' THEN
        owner_id:=NEW.user_id;
        IF NOT EXISTS (SELECT 1 FROM sharing_contact WHERE id=NEW.contact_id AND user_id=owner_id)
            OR NOT EXISTS (SELECT 1 FROM ledger_event WHERE id=NEW.source_event_id AND user_id=owner_id
                AND ((NEW.direction='receivable' AND kind IN ('lend','shared_paid'))
                  OR (NEW.direction='payable' AND kind IN ('borrow','shared_due')))) THEN
            RAISE EXCEPTION 'Invalid personal claim origin or ownership' USING ERRCODE='23514';
        END IF;
    ELSIF TG_TABLE_NAME='sharing_sharedbill' THEN
        owner_id:=NEW.user_id;
        IF NOT EXISTS (SELECT 1 FROM ledger_event WHERE id=NEW.event_id AND user_id=owner_id
                AND ((NEW.payer_id IS NULL AND kind='shared_paid') OR (NEW.payer_id IS NOT NULL AND kind='shared_due')))
            OR (NEW.payer_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sharing_contact WHERE id=NEW.payer_id AND user_id=owner_id)) THEN
            RAISE EXCEPTION 'Invalid shared bill origin or payer' USING ERRCODE='23514';
        END IF;
    ELSIF TG_TABLE_NAME='sharing_billshare' THEN
        SELECT user_id INTO STRICT owner_id FROM sharing_sharedbill WHERE id=NEW.bill_id;
        IF NEW.contact_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sharing_contact WHERE id=NEW.contact_id AND user_id=owner_id) THEN
            RAISE EXCEPTION 'Cross-owner bill participant' USING ERRCODE='23514';
        END IF;
        IF NEW.claim_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sharing_claim WHERE id=NEW.claim_id AND user_id=owner_id) THEN
            RAISE EXCEPTION 'Cross-owner bill claim' USING ERRCODE='23514';
        END IF;
    ELSIF TG_TABLE_NAME='sharing_rentshare' THEN
        SELECT user_id INTO STRICT owner_id FROM sharing_rentplan WHERE id=NEW.plan_id;
        IF NEW.contact_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sharing_contact WHERE id=NEW.contact_id AND user_id=owner_id) THEN
            RAISE EXCEPTION 'Cross-owner rent participant' USING ERRCODE='23514';
        END IF;
    ELSIF TG_TABLE_NAME='sharing_rentobligation' THEN
        owner_id:=NEW.user_id;
        SELECT * INTO STRICT p FROM sharing_rentplan WHERE id=NEW.plan_id;
        last_day:=EXTRACT(day FROM (date_trunc('month',NEW.month)+interval '1 month - 1 day'));
        IF p.user_id<>owner_id OR NOT p.active OR EXTRACT(day FROM NEW.month)<>1
            OR NEW.due_date <> (NEW.month + (LEAST(COALESCE(p.due_day,last_day),last_day)-1))
            OR NEW.due_date < p.start_date THEN
            RAISE EXCEPTION 'Invalid rent calendar or ownership' USING ERRCODE='23514';
        END IF;
    ELSIF TG_TABLE_NAME='sharing_obligationchange' THEN
        SELECT user_id INTO STRICT owner_id FROM sharing_rentobligation WHERE id=NEW.obligation_id;
        IF btrim(NEW.reason)='' THEN
            RAISE EXCEPTION 'Rent status changes require a reason' USING ERRCODE='23514';
        END IF;
    ELSIF TG_TABLE_NAME='sharing_rentpayment' THEN
        SELECT o.user_id INTO STRICT owner_id FROM sharing_rentobligation o WHERE o.id=NEW.obligation_id;
        IF NOT EXISTS (SELECT 1 FROM ledger_event e JOIN sharing_rentobligation o ON o.id=NEW.obligation_id
            JOIN sharing_rentplan p ON p.id=o.plan_id WHERE e.id=NEW.event_id AND e.user_id=owner_id
            AND e.kind IN ('expense','shared_paid') AND e.category_id=p.category_id) THEN
            RAISE EXCEPTION 'Invalid rent payment journal or ownership' USING ERRCODE='23514';
        END IF;
    ELSIF TG_TABLE_NAME='sharing_rentreserve' THEN
        owner_id:=NEW.user_id;
        IF NOT EXISTS (SELECT 1 FROM sharing_rentobligation WHERE id=NEW.obligation_id AND user_id=owner_id) THEN
            RAISE EXCEPTION 'Cross-owner rent reserve' USING ERRCODE='23514';
        END IF;
    ELSIF TG_TABLE_NAME='sharing_reservechange' THEN
        SELECT user_id INTO STRICT owner_id FROM sharing_rentreserve WHERE id=NEW.reserve_id;
        IF btrim(NEW.reason)='' THEN
            RAISE EXCEPTION 'Reserve changes require a reason' USING ERRCODE='23514';
        END IF;
        IF NEW.payment_id IS NOT NULL THEN
            IF NEW.delta_paise>=0 OR NOT EXISTS (SELECT 1 FROM sharing_rentpayment p
                JOIN sharing_rentreserve r ON r.id=NEW.reserve_id
                WHERE p.id=NEW.payment_id AND p.obligation_id=r.obligation_id) THEN
                RAISE EXCEPTION 'Invalid reserve payment consumption' USING ERRCODE='23514';
            END IF;
        END IF;
    ELSE
        RAISE EXCEPTION 'Unsupported relationship table' USING ERRCODE='23514';
    END IF;
    PERFORM 1 FROM users WHERE id=owner_id FOR UPDATE;
    RETURN NEW;
END;
$$;

CREATE FUNCTION kivo_guard_journal_relationship() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_TABLE_NAME='ledger_event' THEN
        IF NEW.contact_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sharing_contact WHERE id=NEW.contact_id AND user_id=NEW.user_id) THEN
            RAISE EXCEPTION 'Cross-owner journal contact' USING ERRCODE='23514';
        END IF;
    ELSE
        IF NEW.claim_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sharing_claim c JOIN ledger_event e ON e.id=NEW.event_id
            WHERE c.id=NEW.claim_id AND c.user_id=e.user_id AND c.direction=NEW.book) THEN
            RAISE EXCEPTION 'Invalid journal claim ownership or book' USING ERRCODE='23514';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER journal_contact_owner BEFORE INSERT ON ledger_event FOR EACH ROW EXECUTE FUNCTION kivo_guard_journal_relationship();
CREATE TRIGGER journal_claim_owner BEFORE INSERT ON ledger_posting FOR EACH ROW EXECUTE FUNCTION kivo_guard_journal_relationship();

CREATE FUNCTION kivo_verify_rent() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target_plan uuid; owner_id bigint;
BEGIN
    IF TG_TABLE_NAME='sharing_rentplan' THEN target_plan:=NEW.id;
    ELSIF TG_TABLE_NAME='sharing_rentshare' THEN target_plan:=NEW.plan_id;
    END IF;
    IF target_plan IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM sharing_rentplan p JOIN sharing_rentshare s ON s.plan_id=p.id
            WHERE p.id=target_plan GROUP BY p.id,p.amount_paise
            HAVING sum(s.amount_paise)=p.amount_paise AND count(*) FILTER (WHERE s.contact_id IS NULL)=1 AND count(*)<=100) THEN
            RAISE EXCEPTION 'Rent shares must conserve gross rent and include the owner' USING ERRCODE='23514';
        END IF;
        RETURN NULL;
    END IF;
    IF TG_TABLE_NAME='ledger_event' THEN
        IF NOT EXISTS (SELECT 1 FROM sharing_rentpayment WHERE event_id IN (NEW.id,NEW.reverses_id)) THEN
            RETURN NULL;
        END IF;
        owner_id:=NEW.user_id;
    ELSIF TG_TABLE_NAME IN ('sharing_rentobligation','sharing_rentreserve') THEN
        owner_id:=NEW.user_id;
    ELSIF TG_TABLE_NAME IN ('sharing_obligationchange','sharing_rentpayment') THEN
        SELECT user_id INTO STRICT owner_id FROM sharing_rentobligation WHERE id=NEW.obligation_id;
    ELSIF TG_TABLE_NAME='sharing_reservechange' THEN
        SELECT user_id INTO STRICT owner_id FROM sharing_rentreserve WHERE id=NEW.reserve_id;
    END IF;
    IF EXISTS (SELECT 1 FROM sharing_rentobligation o JOIN sharing_rentplan p ON p.id=o.plan_id
        WHERE o.user_id=owner_id AND COALESCE((SELECT sum(e.amount_paise) FROM sharing_rentpayment r JOIN ledger_event e ON e.id=r.event_id
            WHERE r.obligation_id=o.id AND NOT EXISTS (SELECT 1 FROM ledger_event v WHERE v.reverses_id=e.id)),0)>p.amount_paise) THEN
        RAISE EXCEPTION 'Rent payment exceeds obligation' USING ERRCODE='23514';
    END IF;
    IF EXISTS (SELECT 1 FROM sharing_rentreserve r WHERE r.user_id=owner_id AND COALESCE((SELECT sum(c.delta_paise) FROM sharing_reservechange c
        LEFT JOIN sharing_rentpayment p ON p.id=c.payment_id LEFT JOIN ledger_event v ON v.reverses_id=p.event_id
        WHERE c.reserve_id=r.id AND v.id IS NULL),0)<0) THEN
        RAISE EXCEPTION 'Negative active rent reserve' USING ERRCODE='23514';
    END IF;
    IF EXISTS (SELECT 1 FROM sharing_rentobligation o JOIN sharing_rentplan t ON t.id=o.plan_id
        WHERE o.user_id=owner_id AND COALESCE((SELECT sum(c.delta_paise) FROM sharing_rentreserve r JOIN sharing_reservechange c ON c.reserve_id=r.id
            LEFT JOIN sharing_rentpayment p ON p.id=c.payment_id LEFT JOIN ledger_event v ON v.reverses_id=p.event_id
            WHERE r.obligation_id=o.id AND v.id IS NULL),0)
        + COALESCE((SELECT sum(e.amount_paise) FROM sharing_rentpayment p JOIN ledger_event e ON e.id=p.event_id
            WHERE p.obligation_id=o.id AND NOT EXISTS (SELECT 1 FROM ledger_event v WHERE v.reverses_id=e.id)),0)>t.amount_paise) THEN
        RAISE EXCEPTION 'Rent is reserved or paid more than once' USING ERRCODE='23514';
    END IF;
    IF EXISTS (SELECT 1 FROM sharing_rentobligation o
        WHERE o.user_id=owner_id AND (SELECT c.action FROM sharing_obligationchange c WHERE c.obligation_id=o.id ORDER BY c.created_at DESC,c.id DESC LIMIT 1)='skip'
        AND (EXISTS (SELECT 1 FROM sharing_rentpayment p JOIN ledger_event e ON e.id=p.event_id
            WHERE p.obligation_id=o.id AND NOT EXISTS (SELECT 1 FROM ledger_event v WHERE v.reverses_id=e.id))
            OR COALESCE((SELECT sum(c.delta_paise) FROM sharing_rentreserve r JOIN sharing_reservechange c ON c.reserve_id=r.id
                LEFT JOIN sharing_rentpayment p ON p.id=c.payment_id LEFT JOIN ledger_event v ON v.reverses_id=p.event_id
                WHERE r.obligation_id=o.id AND v.id IS NULL),0)<>0)) THEN
        RAISE EXCEPTION 'Skipped rent cannot retain active payments or reserves' USING ERRCODE='23514';
    END IF;
    RETURN NULL;
END;
$$;

DO $$ DECLARE table_name text;
BEGIN
    FOREACH table_name IN ARRAY ARRAY['sharing_contact','sharing_claim','sharing_metadatachange',
        'sharing_rentobligation','sharing_obligationchange','sharing_rentpayment','sharing_rentplan',
        'sharing_rentreserve','sharing_rentshare','sharing_reservechange','sharing_sharedbill','sharing_billshare'] LOOP
        EXECUTE format('CREATE TRIGGER relationship_owner BEFORE INSERT ON %I FOR EACH ROW EXECUTE FUNCTION kivo_guard_relationship()',table_name);
        IF table_name IN ('sharing_contact','sharing_rentplan') THEN
            EXECUTE format('CREATE TRIGGER relationship_metadata BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION kivo_guard_relationship()',table_name);
        ELSE
            EXECUTE format('CREATE TRIGGER relationship_immutable BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION kivo_reject_journal_mutation()',table_name);
        END IF;
    END LOOP;
    FOREACH table_name IN ARRAY ARRAY['sharing_rentplan','sharing_rentshare','sharing_rentobligation',
        'sharing_obligationchange','sharing_rentpayment','sharing_rentreserve','sharing_reservechange','ledger_event'] LOOP
        EXECUTE format('CREATE CONSTRAINT TRIGGER rent_reconciles AFTER INSERT ON %I DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION kivo_verify_rent()',table_name);
    END LOOP;
END;
$$;
"""


class Migration(migrations.Migration):
    dependencies = [("sharing", "0001_initial"), ("ledger", "0005_relationship_references")]
    operations = [migrations.RunSQL(SQL)]
