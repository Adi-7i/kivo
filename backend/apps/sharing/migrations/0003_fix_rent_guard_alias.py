"""Repair the rent-plan record variable collision without editing applied history."""

from django.db import migrations

SQL = """
CREATE OR REPLACE FUNCTION kivo_guard_relationship() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE owner_id bigint; rent_terms sharing_rentplan%ROWTYPE; last_day integer;
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
        SELECT * INTO STRICT rent_terms FROM sharing_rentplan WHERE id=NEW.plan_id;
        last_day:=EXTRACT(day FROM (date_trunc('month',NEW.month)+interval '1 month - 1 day'));
        IF rent_terms.user_id<>owner_id OR NOT rent_terms.active OR EXTRACT(day FROM NEW.month)<>1
            OR NEW.due_date <> (NEW.month + (LEAST(COALESCE(rent_terms.due_day,last_day),last_day)-1))
            OR NEW.due_date < rent_terms.start_date THEN
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
"""


class Migration(migrations.Migration):
    dependencies = [("sharing", "0002_relationship_guards")]
    operations = [migrations.RunSQL(SQL)]

