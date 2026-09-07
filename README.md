# Anaesthetic Night Roster

The Anaesthetic Night Roster is a mobile-first operational roster for the Mater Dei anaesthetic night team. It gives authorised staff a shared view of night allocations, staffing changes, breaks, and published roster information.

Access to roster data and actions is private and restricted to authorised accounts. **Do not store patient information in this application or repository.**

## Architecture

The production application is a static progressive web app with no build or bundling step. Supabase provides authentication and shared data, protected by authorised-account checks and Row Level Security. The service worker supplies the controlled app-shell cache and safe installed-PWA update flow.

The authoritative production files are:

- `index.html`
- `styles.css`
- `app-core.js`
- `app-ui.js`
- `manifest.webmanifest`
- `service-worker.js`
- the icons and current branded images referenced by those files and the deployment workflow

The explicit GitHub Pages file allow-list is maintained in `.github/workflows/deploy-pages.yml`.

## Test locally

Install Node.js 22 (matching GitHub Actions), then run:

```sh
npm test
```

This invokes the deterministic Node test suite directly; the application has no production package installation or build step.

## Change and deployment process

1. Start from the latest `main` branch and create a focused non-`main` branch.
2. Make and review the change, preserve the requirements in `AGENTS.md`, and run `npm test` before committing.
3. Push the branch and open a pull request. GitHub Actions runs the test job for pull requests targeting `main`.
4. After required checks pass, the pull request may be merged (including by configured auto-merge).
5. A push to `main` runs tests, applies forward-only Supabase migrations, and then deploys the allow-listed static files to GitHub Pages.
6. Installed PWAs detect the new service worker and offer the update through the application's safe update flow.

Schema changes require a new timestamped, forward-only migration that follows the rules in `AGENTS.md`; never edit an already deployed migration.

## Safety and security

Never commit access tokens, database passwords, service-role keys, private keys, `.env` files, or other privileged credentials. The browser's Supabase publishable key is public configuration; it does not replace Row Level Security or authorised-account enforcement. See `SECURITY.md` for private security reporting guidance.

The clinical roster, staffing, allocation, date, identity, privacy, and PWA invariants in `AGENTS.md` are safety-critical and must be preserved by every change.

## Copyright

This repository is proprietary. See `COPYRIGHT.md`; no open-source licence is granted.
