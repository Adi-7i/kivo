"""Remove default/client EXECUTE grants; deployment requires explicit approval.

Private runtime roles must receive named EXECUTE grants in the reviewed role plan.
This intentionally has no automatic reverse: rollback must not reopen helpers to
PUBLIC. Application rollback can retain these privileges unchanged.
"""

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("ledger", "0008_serialize_journal_relationships"),
        ("sharing", "0004_friend_paid_rent_reserves"),
    ]

    operations = [
        migrations.RunSQL(
            """
            REVOKE EXECUTE ON FUNCTION public.kivo_expected_postings(bigint)
                FROM PUBLIC, anon, authenticated, service_role;
            REVOKE EXECUTE ON FUNCTION public.kivo_reserve_change_active(uuid,bigint)
                FROM PUBLIC, anon, authenticated, service_role;
            """
        ),
    ]
