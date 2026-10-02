# Database contract

The current expected shared database schema is 50. The detailed table and RPC invariants are maintained in `AGENTS.md` and the checked-in migrations.

## Migration rules

Migrations are forward-only timestamped files under `supabase/migrations/`. A deployed migration must never be edited, renamed, reordered or reused. A schema change must update `app_schema_version` to the exact new version and must also update `.project-state.json` and the browser's expected schema constant.

## Browser write boundary

Authenticated browser mutations use the guarded schema-49 RPC family and send the current app version. Legacy direct browser mutation routes remain revoked. Server-side identity and audit fields must be derived from the authenticated session rather than trusted from browser-supplied identity strings.

## Deployment

Database migration is a protected production job that runs only after the required CI gate succeeds on `main` or an explicit recovery dispatch. Repository secrets are used only inside the deployment job and must never be printed, copied into client code or written into documentation.
