# Supabase backup and recovery

This repository uses a free, encrypted logical-backup workflow because scheduled
Supabase backups and point-in-time recovery are not available on the current
plan. The workflow is read-only against production. It runs weekly and can also
be started manually after it exists on `main`.

## What each recovery point contains

- database roles, application schema, application data and RLS definitions
- Supabase migration history
- managed Auth table data, including password hashes, and Storage metadata
- all objects currently in the private `profile-photos` Storage bucket
- checksums and recovery metadata

The GitHub artifact contains only a CMS-encrypted `.p7m` file. Plain SQL, Auth
data and Storage objects are never uploaded as artifacts. The matching private
recovery key must remain outside GitHub. The repository contains only the public
recipient certificate at `backup/backup-recipient.crt`.

The recovery key file is named
`Anaesthetic_Roster_Backup_Recovery_Key.pem`. Losing it makes every encrypted
artifact unrecoverable. Anyone who obtains it and a backup artifact can read the
production backup, so keep an additional secure offline copy.

## Create and verify the first recovery point

1. Merge this backup-only pull request after review.
2. Open **Actions > Encrypted Supabase backup > Run workflow** on `main`.
3. Confirm the job succeeds and download its encrypted artifact.
4. Decrypt it locally with the public certificate and private recovery key:

   ```bash
   openssl cms -decrypt -binary -inform DER \
     -in anaesthetic-roster-RUN-ATTEMPT.tar.gz.p7m \
     -recip backup/backup-recipient.crt \
     -inkey Anaesthetic_Roster_Backup_Recovery_Key.pem \
     -out anaesthetic-roster-backup.tar.gz
   ```

5. Extract into an empty private directory and verify the checksums:

   ```bash
   mkdir recovered
   tar -C recovered -xzf anaesthetic-roster-backup.tar.gz
   cd recovered
   sha256sum --check SHA256SUMS
   ```

Never commit, email or attach the decrypted archive, SQL files, Storage files or
private key to a public issue or pull request.

## Restore rehearsal

Always restore to an isolated non-production Supabase project first. Do not run
these commands against production.

1. Configure the target project extensions and obtain its database connection
   string and password.
2. Restore roles, schema and application data using the current Supabase CLI
   guidance:

   ```bash
   psql --single-transaction --variable ON_ERROR_STOP=1 \
     --file roles.sql \
     --file schema.sql \
     --command 'SET session_replication_role = replica' \
     --file data.sql \
     --dbname "$TARGET_DATABASE_URL"
   ```

3. Restore `history-schema.sql` and `history-data.sql` to preserve migration
   history.
4. Restore `auth-data.sql` and `storage-data.sql` only to a fresh compatible
   target project. Both are Supabase-managed schemas, so verify compatibility
   before import. Expect existing sessions to require fresh authentication if
   project JWT secrets differ.
5. Confirm the private `profile-photos` bucket configuration, then upload the
   files under `storage/profile-photos` with the Supabase CLI.
6. Re-create project-level settings that are not database objects, including
   Auth redirect/provider configuration, API keys and any future Edge Functions.
7. Verify table counts, Auth users, RLS behavior, Storage checksums and Realtime
   publication membership before treating the rehearsal as successful.

This process is a recovery capability, not zero-downtime disaster recovery.
The free plan still has up to seven days of possible data loss between weekly
runs and no point-in-time recovery.
