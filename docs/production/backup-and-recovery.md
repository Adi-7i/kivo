# Backup and disaster recovery

**BLOCKED — release blocker. No backup or restore was executed.** No Supabase
Dashboard/management credential, verified plan, retained recovery point, secure
backup store or authorized independent restore target was supplied. `pg_dump`,
`pg_restore` and `psql` are absent. SQL access to an application database cannot
establish the project's billing plan or actual retained backups.

[Supabase backup documentation](https://supabase.com/docs/guides/platform/backups)
describes plan-dependent daily backups and PITR. Provider documentation describes
capability, not proof of this project's entitlement, backup health or recovery.
Use [the current restore guidance](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
when the operator supplies the actual recovery mechanism.

| Required recovery fact | Current status |
| --- | --- |
| Actual plan and daily/PITR entitlement | NOT VERIFIED |
| Earliest/latest recoverable timestamp and retention | NOT VERIFIED |
| Backup accessibility, encryption, operator access and storage | NOT VERIFIED |
| Restore duration and reconciled restored data | NOT VERIFIED |
| Measured RPO/RTO and accepted recovery targets | NOT VERIFIED; no numbers invented |
| Independent restore target and change approval | BLOCKED |

## Concrete isolated drill procedure

1. Operator records project identity, actual plan/retention, backup/PITR timestamps,
   failed backup alerts, authorized recoverers and secure artifact storage.
   Agree desired RPO/RTO and identify an independent isolated project/database.
   Record its private connection-file path and explicit restore permission.
2. Review compatible PostgreSQL client versions and obtain installation approval.
   Choose actual provider restore-to-new-project or an encrypted logical backup.
   Supply credentials through protected service/password files or a secret store,
   never connection strings in command arguments. Record checksums and access logs.
3. Capture a consistent source manifest: migration history, schema, role/ACL/RLS/
   function grants, constraints/triggers, table counts, ledger reconciliation and
   sampled known synthetic write receipts. Back up required role definitions
   separately; do not assume a database dump includes cluster LOGIN roles or
   usable passwords. Do not copy production credentials into the restored app.
4. Verify target identity differs from live source before any restore command.
   Use the provider/client restore procedure selected for that backup format.
   No `--clean`, database drop, overwrite of live records or routing change is
   authorized by this document. Preserve original source/backups throughout.
5. Provision reviewed target migration/runtime roles and backend-only policies;
   validate helper EXECUTE and client-role revocations. Check schema/migrations,
   590-event baseline only if that exact captured source manifest still applies,
   counts, ledger/FIFO/rent/report reconciliation and original-key replay.
   Verify immutable financial guards and cross-user denials with target-only
   synthetic credentials. Run restored application workflows with a private
   isolated endpoint; prevent public access or outbound integrations.
6. Record source recovery point, backup age, start/finish and validation time,
   actual RPO/data loss and total RTO. Compare with approved targets; preserve
   command exits and audit evidence. Restore success alone is not financial
   recovery success. Do not claim a pass if roles/ACLs or reconciliation fail.
7. Obtain separate permission for any future cutover and recovery of live service.
   Choose an application revision compatible with restored migration history;
   retain helper privacy restrictions. Handle old sessions/secret rotations
   explicitly. Never discard post-recovery-point financial writes silently:
   reconcile durable receipts/audit evidence with the operator.

Until the drill succeeds and actual retention/access are evidenced, G7 remains
BLOCKED. Prepared procedures do not satisfy backup/restore verification.
