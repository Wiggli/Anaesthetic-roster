# Current project state

This file is the short continuity note for the Anaesthetic Night Roster. It is intentionally concise so a new development session can understand the project without reconstructing old chat history.

## Canonical state

- The latest `main` branch is the source of truth.
- `release.json` is the source of truth for the deployable app version and release notes.
- `.project-state.json` contains machine-readable release, schema, verification and CI continuity data.
- The current database contract is schema 50. Any later schema change must be a new forward-only migration and must update the machine-readable state.
- `AGENTS.md` contains the permanent product, clinical, security, design and deployment invariants.

## Runtime ownership

- `app-core.js` owns the established roster engine, authentication, administration and shared base render path.
- `src/legacy-ui/foundation.js`, `clinical.js`, `sync.js` and `bootstrap.js` are the modular source of truth for the compatibility UI. `app-ui.js` is generated.
- `src/domain-logic.ts` and `src/runtime-foundation.ts` are TypeScript source. Their root JavaScript counterparts are generated compatibility files.
- React/TypeScript regions under `src/` are used for progressively migrated interaction and presentation areas.\n- `src/ui-foundation.css` is the final shared presentation layer for Night, Changes, Breaks, Chat and the five-column dock. It is imported after the older presentation/rudder layers so new shared composition work should go there rather than adding another historical override block.

## Development state

Development uses a fast inner loop and a separate release gate. Ordinary iterations should use `npm run verify:fast`; complete regression and browser compatibility remain part of the pull-request and production pipeline. A developer should not repeatedly bump the public app version while exploring UI polish.

The CI workflow builds the deployable artifact once, reuses that exact artifact in browser verification and production deployment, runs Chromium-focused checks for pull requests, and reserves WebKit resilience for production or scheduled compatibility verification. The required status check remains named `test`.

## Continuity rule

Before starting substantial work in a fresh session, run `npm run context` and read this file plus `docs/DEVELOPMENT_WORKFLOW.md`. Update this note only when architecture, schema, workflow or durable project status changes. Do not use it as a running chat transcript.
