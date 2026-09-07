# Deployment

The Anaesthetic Night Roster is released through the repository's GitHub workflow. Do not manually upload an application package to GitHub Pages and do not paste migrations into the Supabase SQL Editor as the normal deployment process.

## Pull request

1. Codex starts from the latest `main`, creates a focused non-`main` branch, makes the requested changes, and runs `npm test`.
2. Codex commits and pushes the branch, then opens a pull request containing the change summary, test evidence, schema/deployment impact, and relevant manual verification notes.
3. For pull requests targeting `main`, GitHub Actions runs the automated test job. Migration and deployment jobs do not run for pull request events.
4. After all required reviews and checks pass, configured auto-merge may merge the pull request. A maintainer may also merge it through the normal protected-branch process.

## Main-branch release

A push to `main` starts the ordered production workflow:

1. Run `npm test`.
2. If tests pass, prepare and apply all timestamped `supabase-migration-*.sql` files with the Supabase CLI.
3. If migrations succeed, copy only the explicit production allow-list into the `dist` artifact and deploy it to GitHub Pages.
4. Verify that the deployed Pages URL responds over HTTPS.

The migration and GitHub Pages jobs are restricted to pushes to `main`; they never deploy a pull request branch. A failed test or migration prevents later deployment stages.

## Installed PWA updates

The service worker installs the versioned app shell without forcing an immediate takeover. When an update is ready, the installed PWA offers it through the in-app update banner; accepting activates the waiting worker and reloads the app once. Do not bypass this safe update path.

## Secrets and configuration

`SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD` are GitHub Actions repository secrets used by the migration job. Never display them in logs or screenshots, place them in commands that echo them, or commit them to the repository. Never commit service-role keys, private keys, personal access tokens, or local `.env` files.

The Supabase project reference and browser publishable key are public configuration. Supabase Row Level Security and authorised accounts remain mandatory protections for shared roster data.
