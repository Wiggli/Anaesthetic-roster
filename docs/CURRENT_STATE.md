# Current project state

This file is the short continuity note for the Anaesthetic Night Roster. It is intentionally concise so a new development session can understand the project without reconstructing old chat history.

## Canonical state

- The latest `main` branch is the source of truth.
- `release.json` is the source of truth for the deployable app version and release notes.
- `.project-state.json` contains machine-readable release, schema, verification and CI continuity data.
- The current database contract is schema 56. Any later schema change must be a new forward-only migration and must update the machine-readable state.
- `AGENTS.md` contains the permanent product, clinical, security, design and deployment invariants.

## Runtime ownership

- `app-core.js` owns the established roster engine, authentication, administration and shared base render path.
- `src/legacy-ui/foundation.js`, `clinical.js`, `sync.js` and `bootstrap.js` are the modular source of truth for the compatibility UI. `app-ui.js` is generated.
- `src/domain-logic.ts` and `src/runtime-foundation.ts` are TypeScript source. Their root JavaScript counterparts are generated compatibility files.
- React/TypeScript regions under `src/` are used for progressively migrated interaction and presentation areas.

## Presentation ownership

Release 52.0 extends the canonical system in `src/product-unified.css` and dock geometry in `src/rudder-navigation.css` with explicit Light/Dark semantic materials and compatibility aliases. `src/product-motion.ts` owns motion preferences and optional haptics; `src/product-interactions.ts` owns Actions dismissal, discoverable colleague shortcuts and installed-PWA refresh. The shell observer coalesces structural changes rather than scanning after every message or clock update.

The selected-night context is shared by Night, Changes and Breaks; Chat uses a compact date/count row and one identity on its team conversation. Account mounts exactly one page in `accountPageOutlet`, retaining inactive control nodes and their listeners. Personalise uses live state and a compact preview. Changes uses a single workflow host for React or its fallback, with native modal staffing editors. Presentation clocks use the established `appNowMs()` source and suspend offscreen. Return-summary acknowledgement uses existing bounded, private-device activity keys and clears on sign-out. Domain calculations and the schema-49 clinical write contract remain unchanged.

`docs/PRODUCT_COHERENCE_52.md` records implementation scope and verification limits.

## Development state

Development uses a fast inner loop and a single deterministic release gate. Ordinary iterations use `npm run verify:fast`, while `npm run verify:ci` is the exact routine CI gate for consequential changes and combines the complete deterministic regression suite, TypeScript validation, one Vite build and build-artifact verification.

The routine GitHub Actions workflow now contains one `test` job, a conditional Supabase migration job and Pages deployment of the exact artifact produced by `test`. It has no scheduled browser work of its own. Expensive Chromium and WebKit smoke and resilience work is isolated in the separate nightly/manual browser compatibility workflow, so browser-runner instability no longer creates repeated repair commits during ordinary merges. The required status check remains named `test`, Node 22 is pinned across local and CI tooling, and production still performs a small live PWA-shell version check after deployment.

## Continuity rule

Before starting substantial work in a fresh session, run `npm run context` and read this file plus `docs/DEVELOPMENT_WORKFLOW.md`. Update this note only when architecture, schema, workflow or durable project status changes. Do not use it as a running chat transcript.

Release 53.0 adds guarded account access changes in set_account_access_v54, server protection for the current administrator and last active administrator, explicit role controls, verified save results, and clearer Google/email access guidance. No authentication identities are merged by name, and account deactivation does not alter the permanent rotation or historical roster records.

Release 54.0 introduces `rotation_versions.base_size` (five or six), nullable Reliever only for five-person establishments, append-only future periods, guarded v49 administration and unchanged audit/realtime ownership. The 12 October 2026 period removes Yentl from future membership and starts André on Pager, with all earlier rows preserved. Five remains the minimum safe staffing threshold. Older engines receive a historical startup view capped before the first five-person period and must explicitly update before shared writes.

Release 54.1 corrects the future 12 October seed to preserve the original Pager queue with Yentl removed: André on 12 October, Michael Galea on 16 October, James on 20 October, Shaun on 24 October, Michael Debono on 28 October, then André on 1 November. Schema 56 changes only four starting slots in the exact known future period, retaining append-only administration and all earlier periods and clinical history.

Release 54.2 strengthens Roster Management form and save handling. Future period previews show Pager order and retain the existing seventh cycle across membership changes; replacement nurses inherit the departing member’s cycle place. The schema remains 56 and existing periods remain append-only.
