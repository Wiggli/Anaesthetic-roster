# Current project state

This file is the short continuity note for the Anaesthetic Night Roster. It is intentionally concise so a new development session can understand the project without reconstructing old chat history.

## Canonical state

- The latest `main` branch is the source of truth.
- `release.json` is the source of truth for the deployable app version and release notes.
- `.project-state.json` contains machine-readable release, schema, verification and CI continuity data.
- The current database contract is schema 53. Any later schema change must be a new forward-only migration and must update the machine-readable state.
- `AGENTS.md` contains the permanent product, clinical, security, design and deployment invariants.

## Runtime ownership

- `app-core.js` owns the established roster engine, authentication, administration and shared base render path.
- `src/legacy-ui/foundation.js`, `clinical.js`, `sync.js` and `bootstrap.js` are the modular source of truth for the compatibility UI. `app-ui.js` is generated.
- `src/domain-logic.ts` and `src/runtime-foundation.ts` are TypeScript source. Their root JavaScript counterparts are generated compatibility files.
- React/TypeScript regions under `src/` are used for progressively migrated interaction and presentation areas.

## Development state

Development uses a fast inner loop and a single deterministic release gate. Ordinary iterations use `npm run verify:fast`, while `npm run verify:ci` is the exact routine CI gate for consequential changes and combines the complete deterministic regression suite, TypeScript validation, one Vite build and build-artifact verification.

The routine GitHub Actions workflow now contains one `test` job, a conditional Supabase migration job and Pages deployment of the exact artifact produced by `test`. It has no scheduled browser work of its own. Expensive Chromium and WebKit smoke and resilience work is isolated in the separate nightly/manual browser compatibility workflow, so browser-runner instability no longer creates repeated repair commits during ordinary merges. The required status check remains named `test`, Node 22 is pinned across local and CI tooling, and production still performs a small live PWA-shell version check after deployment.

## Continuity rule

Before starting substantial work in a fresh session, run `npm run context` and read this file plus `docs/DEVELOPMENT_WORKFLOW.md`. Update this note only when architecture, schema, workflow or durable project status changes. Do not use it as a running chat transcript.
