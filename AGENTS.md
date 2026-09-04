# Anaesthetic Night Roster: permanent repository guidance

This file applies to the complete repository. Read it before making any change. It records the product invariants and operating practices embodied by the current application; treat them as requirements unless a task explicitly changes one of them.

## Product and architecture

- This is a restricted-access, mobile-first progressive web application for the Mater Dei anaesthetic night team. The GitHub repository and GitHub Pages application shell may be public, but roster data and roster actions require Supabase authentication, authorised membership, and Row Level Security. It gives authorised nurses one shared view of the selected night's allocation, live staffing changes, final allocations, breaks, and the published roster.
- The latest `main` branch on GitHub is the application source of truth. Never develop from an old ZIP, download, or stale workspace copy; update the workspace from the latest `main` before branching.
- The production application is a static site: `index.html`, `styles.css`, `app-core.js`, and `app-ui.js`, plus the manifest, service worker, icons, and branded images. There is no build or bundling step. Keep the browser-compatible global-script architecture unless a task explicitly authorises a migration.
- `app-core.js` owns roster calculation, staffing rules, authentication, administration, and the base render path. `app-ui.js` progressively composes the current interface, shared-data workflow, profile/onboarding features, release history, realtime updates, and PWA lifecycle. Changes often need coordinated review in both files.
- `index-18.html`, `app-v25.js`, `header-background.jpg`, and `header-background.png` are obsolete legacy files if they remain in the repository. They must never be loaded or deployed.
- Supabase is the shared backend and authentication provider. The public URL and publishable browser key may be committed; they are not secrets. Never commit a database password, access token, service-role/secret key, or other privileged credential. Security depends on Row Level Security and the authorised-account model, not on hiding the publishable key.
- The current known shared schema is represented by `allowed_users`, `app_schema_version`, `app_settings`, `roster_settings`, `rotation_versions`, `night_changes`, `night_change_history`, `night_overtime`, `night_overtime_history`, `night_five_cover`, `night_labour_order`, `night_plan_status`, `night_role_overrides`, `night_role_override_history`, `user_profiles`, and the private `profile-photos` bucket. This is not a permanently exhaustive list: inspect all existing migrations and current application usage before modifying the schema. Preserve compatibility with existing rows, history, RPC contracts, and realtime consumers.
- Shared staffing mutations use the established versioned RPCs rather than ad-hoc multi-step browser writes: `record_night_absence_v25`, `remove_night_absence_v25`, `add_night_overtime_v25`, `remove_night_overtime_v25`, `apply_staffing_allocations_v25`, and `finalise_night_plan_v26`.
- Database migrations are forward-only, timestamped root files named `supabase-migration-YYYYMMDDHHMMSS_description.sql`. An already deployed migration must never be edited, renamed, or reused. Statements should be safely repeatable where practical. Every schema upgrade must update `app_schema_version` atomically to the exact matching version.

## Clinical roster and business-logic invariants

These are safety-critical domain rules. Do not casually “simplify” them or replace them with visually similar logic.

### Verified permanent rotation

- The immutable reference rotation begins on **2026-06-30**, ends on **2027-12-30**, contains **138** roster nights and **137** four-day transitions, and has fingerprint **`9f1d88bc`**.
- The original six internal roster identities and initial slots are James, Michael G, Andre, Michael D, Yentl, and Shaun. Their six core positions rotate one step every four days. Every core night must contain six distinct permanent assignments.
- The seventh-nurse cycle is James, Michael G, Andre, Michael D, Yentl, Shaun, OT Nurse and advances in the direction implemented by `calculateNight`/`seventhRotationChoice`. Do not reverse or reorder it.
- The original short names remain stable internal data identifiers. The complete professional display-name mapping is:
  - Andre → André Bartolo
  - Michael D → Michael Debono
  - Michael G → Michael Galea
  - James → James Galea
  - Yentl → Yentl Cutajar
  - Shaun → Shaun Galea
  These mappings are display-only and must not rewrite stored rotation or history records.
- Generate nights in UTC-safe calendar arithmetic at four-day intervals. Do not use local-time arithmetic for roster generation.
- A permanent personnel change creates a new effective-dated `rotation_versions` row. It affects the selected effective night and future nights only. Earlier published nights, history, and the verified reference must remain unchanged.
- Publishing extends `roster_settings.published_until` from the next four-day roster night. It must never remove or recalculate already published nights. Keep the reference fingerprint check and extension preview/confirmation safeguards.

### Operational night and allocations

- Interpret “current night” in the **Europe/Malta** time zone. The working night is **19:00–07:00**: before 07:00 belongs to the previous calendar date; at 07:00 the operational date advances; at and after 19:00 the current calendar date is the working night. Daytime selection resolves to the next available roster night.
- The normal model has six nurses and is automatic: two First Part theatre positions, two Second Part theatre positions, Pager, and Reliever. Do not introduce a confirmation task for an unchanged standard six-person plan.
- First Part theatre works **00:00–03:30** and takes the **Second break**. Second Part theatre works **03:30–07:00** and takes the **First break**.
- In the automatic six-person Labour Ward plan, Pager works Labour Ward first part and takes Second break; Reliever works Labour Ward second part and takes First break. Keep the night-only role editor for genuinely agreed swaps, without changing the permanent rotation or later nights.
- Staffing count is the six core nurses minus uncovered absences, plus legacy named replacement cover, plus confirmed overtime. Absences, overtime, allocations, confirmations, and role overrides must retain actor/time history and update all authorised devices through Supabase realtime.
- Below five nurses, the plan is provisional: require additional cover and do not finalise allocations or breaks. Never present an incomplete clinical plan as complete.
- At five nurses, one nurse covers Labour Ward/Pager for the full night. A Pager or Reliever vacancy determines that cover automatically. For a theatre vacancy, the rostered Reliever chooses among multiple vacant theatre roles before overtime nurses are allocated; preserve that ordering and the saved `night_five_cover` choice.
- At seven nurses, follow the stored seventh rotation. If a permanent nurse is selected for the seventh position, require the explicit choice between moving that nurse and filling the vacated core role with overtime, or leaving the nurse in the core role and allocating overtime as seventh. If the cycle selects OT Nurse, the seventh role is overtime. Skip absent permanent candidates using the established backwards-cycle fallback.
- Above seven nurses, complete the core seven-person plan first and display remaining overtime staff as additional staff for allocation as required.
- An allocation is complete only when all required five/seven-person decisions and open roles are resolved. Labour Ward order, night plan status, and night-only overrides must be validated against the effective nurses for that date. Breaks, copy/email summaries, the Night view, and Changes must all derive from the same effective plan.
- Destructive or consequential actions retain confirmation, clear error/saving states, and where currently supported a short-lived Undo path. Never silently discard shared changes or history.

## Accounts, privacy, resilience, and security

- Only active emails in `allowed_users` may use the roster. Roles are `member` and `admin`; roster publishing, permanent team changes, authorised-account management, exports, backups, and diagnostics remain administrator-only.
- Do not allow an administrator to deactivate their own current account through the account manager. Preserve password login/signup, email confirmation, password recovery, and optional passkey flows. Passkeys are an optional device-mediated convenience; never imply that the app receives biometric data, and always retain password access.
- Official approved identity, display-only professional roster name, locally selected highlighted roster name, and optional private preferred-name/job-title/photo profile are distinct concepts. Profile customisation must never alter shared allocation identity or historical records.
- Escape all user- or database-controlled strings before injecting HTML. Preserve validation for names, emails, dates, file type/size, allocation keys, and account permissions.
- Network writes go to Supabase. The service worker must never cache Supabase authentication, REST, realtime, or private profile-photo traffic. Only the pinned public Supabase library may be cached cross-origin.
- The local offline snapshot is read-only fallback data, not an offline mutation queue. On reconnect/resume, refresh shared data. Keep explicit Live/Saving/Offline/Problem feedback and the last successful refresh time.
- Navigation requests are network-first with the cached `index.html` fallback. Versioned same-origin app-shell assets are cache-first. A service-worker update waits until the user accepts the update banner, then activates and reloads once. Preserve this safe update flow.

## Experience and design rules

- Optimise first for a phone used during a clinical night, while retaining the wider sign-in layout and usable desktop presentation. The information hierarchy is: the signed-in nurse's own allocation first, then live team/staffing state, exceptional tasks, and detail.
- Keep the three primary destinations **Night**, **Changes**, and **Breaks**. The full roster is a secondary view. Changes remains a numbered **Staffing → Allocation → Confirm** workflow, with automatic/no-action states quiet and exceptional tasks unmistakable.
- Use the established restrained Apple-inspired system: system font stack, teal accent, grouped solid clinical surfaces, hairline separators, rounded native-like controls, controlled translucency only for chrome/overlays, concise line icons, and short purposeful motion. Do not add a competing visual language, gratuitous animation, or decoration that obscures clinical information.
- Use the `apple-web-design` skill when it is available. If it is unavailable, the Apple-inspired design requirements in this file remain mandatory and the task must not invent a competing visual language.
- Preserve light, dark, and automatic appearance choices; safe-area padding; portrait PWA behaviour; legible high-contrast action text/icons; responsive small-phone layouts; and `prefers-reduced-motion` fallbacks.
- Maintain semantic HTML and accessibility: labels for controls, useful button text/ARIA labels, visible focus behaviour, `aria-live` feedback for asynchronous state, dialog labelling, keyboard activation for interactive cards, `aria-current` navigation, and non-colour indicators for status.
- User-facing language is concise, calm, and operational. Say exactly what is automatic, pending, saved, provisional, or unavailable. Do not imply clinical completeness until the underlying plan is complete.
- Any perceptible UI change must be inspected at representative mobile and desktop sizes, in light and dark modes where relevant. Capture a screenshot when the task/environment instructions require it.

## Testing and review requirements

- Do not add production dependencies merely to run the existing tests. Temporary development or browser-testing tools may be used without committing them. Run **`npm test`** (which executes `node tests/roster.test.js`) before every commit. The suite must continue to validate the reference fingerprint/count, unique six-person assignments, four-day transitions, staffing counts, Malta 07:00 boundary, prospective-only permanent changes, and PWA network/cache safety.
- Add or extend deterministic Node assertions whenever business logic, dates, staffing, versioning, or service-worker behaviour changes. Tests run the production scripts in a minimal VM; keep core rules testable without a live browser or Supabase connection.
- For HTML/CSS/UI changes, also perform a browser smoke test of authentication/loading, Night, Changes, Breaks, dialogs/sheets, responsive layout, dark mode, and offline/update states as applicable. Do not use production shared data for destructive testing.
- Review all changes for earlier-night preservation, professional-name versus internal-key separation, provisional-plan handling, realtime refresh, offline fallback, role/account authorization, escaped output, and accidental secret exposure.
- Keep changes narrowly scoped. Do not reformat or modernise the compact global JavaScript as collateral work; it makes safety review and historical comparison harder.

## Version and changelog rules

- The runtime version source is `APP_VERSION` in `app-core.js`; `RELEASE_HISTORY[0].version` in `app-ui.js` must match it. Every user-visible release gets a new newest-first release entry containing only that version's actual changes. Never merge, rewrite, collapse, or delete older entries: the complete in-app archive is permanent product history.
- Use the project's monotonically increasing release number for a deployable application change. A documentation-only repository change does not require a runtime version bump or release entry.
- For a runtime bump, update every production cache-busting reference together: the comments/version constant in the JS where applicable, `index.html` CSS/manifest/script/asset query strings and visible release intro, `manifest.webmanifest` icon query strings, `service-worker.js` `CACHE_NAME` and every app-shell URL, and any deployment documentation that names the release. Confirm no stale production version remains.
- Increase `EXPECTED_SCHEMA_VERSION` only with a corresponding forward-only migration and `app_schema_version` update. The browser must remain honest when a schema is legacy or an optional feature is unavailable; do not mask database/app incompatibility.
- `package.json` currently exists primarily to expose the Node test command and contains an older package version; do not treat it as runtime truth. If a future task deliberately establishes package-version synchronization, update the rule and all version checks atomically.

## Deployment and pull-request rules

- Work on a non-`main` branch. Before delivery, inspect the diff, run the required tests, commit all intended changes, push the branch to the configured remote, and open a pull request with a concise title, change summary, test evidence, deployment/schema impact, and any manual verification notes.
- The GitHub workflow is the production path and runs only on `main` pushes or manual dispatch: tests must pass, then Supabase migrations run, then GitHub Pages deploys. Do not bypass the test or migration dependency.
- Database deployment requires repository secrets `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD`; never print or embed them. The fixed project ref is public configuration. If migrations are present, the workflow initialises Supabase, copies every `supabase-migration-*.sql` into `supabase/migrations/`, links the project, and runs `supabase db push --linked --yes` before publishing.
- GitHub Pages publishes only the explicit `dist` allow-list in `.github/workflows/deploy-pages.yml`. When adding a required production asset, add it to the HTML/manifest/service-worker as appropriate **and** to that copy allow-list. Do not deploy tests, documentation, historical snapshots, repository metadata, migrations, or secrets.
- Keep the pinned CDN dependency and GitHub Action major versions deliberate. Review upgrades for browser support, cache behaviour, supply-chain impact, and workflow compatibility rather than accepting automated version churn blindly.
- After deployment, verify the Pages URL, sign-in, shared refresh, current/next Malta night, staffing/break rendering, database schema diagnostic, installability, and update-banner activation on an existing installation. A release is not complete if the app shell and service-worker cache are on different versions.

## Definition of done

A change is ready only when it preserves the verified rotation and clinical rules, protects shared/private data, works in the static/PWA architecture, includes any required forward migration and newest-first release note, keeps all runtime cache versions aligned, passes `npm test`, receives appropriate browser/accessibility review, contains no privileged secret, and is committed, pushed, and represented by a pull request.
