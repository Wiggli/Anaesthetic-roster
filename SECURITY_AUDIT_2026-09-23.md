# Security audit, 23 September 2026

## Result

The application does not contain user passwords, password hashes, a Supabase
secret/service-role key, a database password, or a database connection string.
The `sb_publishable_…` key in `app-core.js` is intentionally public browser
configuration. RLS and authenticated function permissions, rather than secrecy
of that key, protect the roster.

The current tree and all 168 reachable Git commits were scanned for common
Supabase secret keys, database URLs, private keys, GitHub tokens and AWS access
keys. No candidate credential was found. Real credentials must still never be
placed in a commit, issue, pull request, screenshot, diagnostic report or test
fixture.

## Confirmed protections

- All 17 application tables in `public` have RLS enabled.
- Anonymous API checks returned no roster or account data.
- The private `profile-photos` bucket restricts each authenticated user to their
  own user-ID path and accepts only JPEG, PNG and WebP images up to 2 MiB.
- Protected functions are not executable by `anon`; authenticated functions
  check active membership or administrator status where required.
- The browser uses a publishable key. No service-role credential is shipped.
- GitHub Actions use repository secrets rather than committed values and have
  narrowly scoped permissions.
- The service worker excludes Supabase Auth, REST and Realtime traffic from its
  runtime cache. The saved offline roster remains read-only.
- Email confirmation is enabled, anonymous Auth users are disabled, and only
  email/password authentication is enabled.
- The production security and performance advisors report no missing-RLS or
  query-performance finding. Seven Security Definer notices remain documented
  because the functions intentionally cross RLS boundaries after checking the
  caller.

## Candidate changes in version 37.15

1. Clear the offline roster, cached account email, recent overtime names,
   activity marker and saved staff-name selection whenever the user explicitly
   signs out, loses approved access, or has an invalid session.
2. Preserve non-sensitive theme, install and navigation preferences at logout.
3. Replace raw Supabase Auth and database errors shown in the interface with
   safe messages that do not reveal backend detail.
4. Remove the signed-in email address from copied diagnostics.
5. Add Subresource Integrity and anonymous CORS to the exact pinned Supabase
   browser-library version.
6. Add automated checks for the integrity pin, publishable-key boundary,
   accidental secret credentials, safe error rendering and private-cache
   cleanup.
7. Add a forward migration that removes unused `anon` access to the `public`
   schema and its existing tables, sequences and functions, then changes the
   `postgres` owner defaults so future objects do not automatically become
   anonymous endpoints. Authenticated privileges and every RLS policy remain
   unchanged.

No production database change is part of the audit itself. The migration must
be reviewed, backed up, merged and applied through the normal workflow, followed
by anonymous, member and administrator permission tests.

## Dashboard controls requiring owner verification

- Enable leaked-password protection in Supabase Auth. The live advisor reports
  that it is currently disabled.
- Review Auth rate limits and enable CAPTCHA if unwanted sign-up traffic appears.
  Self-service sign-up is currently required for the approved-user onboarding
  flow, so it should not simply be disabled.
- Confirm GitHub secret scanning and push protection in repository settings.
  Public repositories receive secret scanning for supported patterns, but the
  connected API does not expose the repository toggle.
- Protect every administrator account with a strong unique password and a
  passkey. The application supports passkeys but does not force enrolment.
- Review active Auth users and `allowed_users` periodically, promptly disabling
  leavers in both places where appropriate.

## Deferred changes that need a dedicated migration and test plan

- Authenticated members currently have the intended shared-roster write access
  through RLS. Some tables also allow direct writes outside the atomic RPC path,
  which means a malicious authenticated client could bypass parts of the UI
  workflow or provide misleading free-text actor labels. Tightening this safely
  requires an inventory of every active client version, server-derived actor
  identity, explicit member/admin write tests and a staged migration. It is not
  included in the low-risk hardening change.
- GitHub Pages cannot attach the full set of response security headers available
  from a configurable origin, particularly CSP `frame-ancestors`. Moving hosting
  only for headers would be an infrastructure decision and is not justified as
  a silent cleanup change.
- The seven intentional Security Definer functions should remain until their
  authenticated and authorization behaviour can be exercised in an isolated
  database branch. Removing `SECURITY DEFINER` without that proof could break
  correct RLS-protected operations.

## Verification required before deployment

- Run the complete repository test suite and required GitHub workflow.
- Apply the migration only after a fresh encrypted production backup succeeds.
- Confirm anonymous REST and RPC calls remain blocked.
- Test a normal member and an administrator through fresh login, restored
  session, roster read, allowed write, prohibited admin write and logout.
- Confirm logout removes the five private local-storage entries while retaining
  the selected appearance.
- Reopen the installed PWA and confirm the version 37.15 service worker updates
  through the existing user-approved update flow.
- Re-run Supabase security and performance advisors after migration.

## References

- Supabase production checklist: https://supabase.com/docs/guides/deployment/going-into-prod
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase API key security: https://supabase.com/docs/guides/api/api-keys
- Supabase password security: https://supabase.com/docs/guides/auth/password-security
- GitHub secret scanning: https://docs.github.com/code-security/secret-scanning/introduction/about-secret-scanning
- GitHub push protection: https://docs.github.com/code-security/secret-scanning/protecting-pushes-with-secret-scanning
- OWASP browser storage guidance: https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html
