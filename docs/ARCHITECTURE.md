# Architecture map

This document is a navigation aid. The binding implementation rules remain in `AGENTS.md`.

## Application shell

The production application is a static Vite-built PWA on GitHub Pages. `index.html` provides the durable shell and progressively mounts React/TypeScript regions while retaining the proven global roster contracts.

## Source ownership

- `app-core.js`: established roster calculation, authentication, administration and core data flow.
- `src/legacy-ui/foundation.js`: shared UI state, release history and foundational presentation helpers.
- `src/legacy-ui/clinical.js`: selected-night clinical presentation and canonical NightPlan adapters.
- `src/legacy-ui/sync.js`: reconciliation, refresh and lifecycle synchronisation.
- `src/legacy-ui/bootstrap.js`: browser event binding and final startup wiring.
- `src/domain-logic.ts`: typed working-night and domain helpers.
- `src/runtime-foundation.ts`: typed resilience and runtime helpers.
- Other `src/*.tsx` modules: progressively migrated interface regions.

`app-ui.js`, `domain-logic.js` and `runtime-foundation.js` are generated compatibility artifacts. Their stable root URLs are retained for installed PWAs.

## Backend boundary

Supabase provides authentication, shared data, realtime updates and protected RPCs. Browser writes use the guarded schema-49 mutation boundary while schema 50 adds durability and health safeguards. Database details and migration rules are summarised in `docs/DATABASE.md`.

## Delivery path

Vite produces `dist`. CI verifies release metadata, deterministic logic and the built artifact, then exercises that exact artifact in browser jobs. Production migration and Pages deployment occur only after the stable required `test` gate succeeds.
