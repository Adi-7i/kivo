"""Keep Django-owned data inaccessible through Supabase client API roles."""

from django.db import migrations

SQL = """
DO $$
DECLARE
    target record;
    client_role text;
BEGIN
    FOR target IN
        SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname='public' AND c.relkind IN ('r', 'p') AND (
            c.relname LIKE 'ledger_%' OR c.relname IN (
                'users', 'users_groups', 'users_user_permissions', 'django_session',
                'auth_group', 'auth_group_permissions', 'auth_permission',
                'django_admin_log', 'django_content_type', 'django_migrations'
            )
        )
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target.relname);
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC', target.relname);
        FOREACH client_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role']
        LOOP
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=client_role) THEN
                EXECUTE format('REVOKE ALL ON TABLE public.%I FROM %I', target.relname, client_role);
            END IF;
        END LOOP;
    END LOOP;
    FOR target IN
        SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname='public' AND c.relkind='S' AND (
            c.relname LIKE 'ledger_%' OR c.relname LIKE 'users_%'
            OR c.relname LIKE 'auth_%' OR c.relname LIKE 'django_%'
        )
    LOOP
        EXECUTE format('REVOKE ALL ON SEQUENCE public.%I FROM PUBLIC', target.relname);
        FOREACH client_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role']
        LOOP
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=client_role) THEN
                EXECUTE format('REVOKE ALL ON SEQUENCE public.%I FROM %I', target.relname, client_role);
            END IF;
        END LOOP;
    END LOOP;
END;
$$;
"""


class Migration(migrations.Migration):
    dependencies = [
        ("ledger", "0002_journal_guards"),
        ("users", "0002_user_name"),
        ("sessions", "0001_initial"),
        ("admin", "0003_logentry_add_action_flag_choices"),
    ]
    # Intentionally no automatic reversal that would expose private data again.
    operations = [migrations.RunSQL(SQL)]
