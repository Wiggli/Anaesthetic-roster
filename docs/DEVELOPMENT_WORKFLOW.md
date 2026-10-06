# Development workflow

The development loop is deliberately split into a fast inner loop, one deterministic release gate, and a separate browser compatibility workflow. Routine feature work should therefore fail quickly and predictably, while expensive Chromium and WebKit resilience checks remain available without delaying every small merge.

## Start every development session

1. Start from the latest `main` branch and create a fresh task branch.
2. Use Node 22, which is pinned by `.nvmrc`, `package.json`, and GitHub Actions.
3. Run `npm run context`.
4. Read `AGENTS.md`, `.project-state.json` and `docs/CURRENT_STATE.md`.
5. Assemble related edits on the task branch before opening a pull request, rather than triggering CI after every partial change.

## Fast inner loop

Use `npm run verify:fast` while iterating. It regenerates compatibility assets, checks release consistency, runs TypeScript validation, executes the highest-value roster and architecture tests, builds the application once, and verifies the build artifact.

For presentation work, a focused browser smoke run is still encouraged when Playwright is already available. If the browser runner is not present in the workspace, use the pinned temporary version and avoid reinstalling it between small changes:

```sh
npm install --no-save --no-package-lock @playwright/test@1.55.0
npx playwright install chromium
npm run verify:browser -- --project=mobile-chromium
```

## Single release gate

Before a consequential pull request is merged, run:

```sh
npm run verify:ci
```

This is the same deterministic command used by the routine GitHub Actions `test` job. It runs the complete Node regression suite against the checked-in generated artifacts, performs TypeScript validation, builds the application once with Vite, and verifies the resulting `dist` artifact.

The important rule is that CI does not regenerate compatibility files before the strict release check. If generated runtime files are stale, the gate should fail rather than silently repairing the branch.

## Routine CI and deployment

The main workflow is intentionally small:

```text
pull request ─► test
                 └─► exact pages-dist artifact

main push ─────► test ─► migrate only when backend changed ─► deploy same pages-dist
```

The required check remains named `test`. Superseded pull-request runs are cancelled, while main deployment work is not cancelled by a later push. The `test` job performs one installation and one deterministic verification path, then uploads the exact `pages-dist` artifact that production later downloads. There is no post-merge check-result reuse logic and there are no duplicate browser lanes inside the deployment workflow.

Database migration remains protected behind the successful `test` job. The Supabase CLI only runs when migrations or the chat notification Edge Function changed, while ordinary UI and application changes continue directly to Pages deployment after the migration job confirms that no backend action is needed.

## Browser compatibility

Chromium and WebKit smoke and resilience coverage lives in `.github/workflows/compatibility.yml`. It runs nightly at the established 03:17 UTC schedule and can also be started manually whenever a UI, PWA, Safari, safe-area, or resilience change deserves immediate cross-browser verification.

The compatibility workflow first runs `npm run verify:ci`, then installs the pinned Playwright runner and executes both `npm run verify:browser` and `npm run verify:resilience`. Keeping this work separate means a transient browser-runner problem cannot block an otherwise valid routine deployment, while the application still receives regular iPhone and low-end-browser coverage.

## Change classes

| Change | Fast loop expectation | Merge expectation | Browser compatibility |
| --- | --- | --- | --- |
| Documentation only | focused review | `npm run verify:ci` when workflow or architecture docs change | not normally required |
| UI or CSS | `npm run verify:fast` plus focused smoke when practical | `npm run verify:ci` | run manually for significant layout, Safari or PWA changes |
| Roster/domain logic | `npm run verify:fast` plus relevant deterministic tests | `npm run verify:ci` | use when the change affects rendered interaction paths |
| Database/security boundary | relevant deterministic tests plus migration review | `npm run verify:ci` and protected migration on `main` | use when browser authentication or network behaviour changes |
| Release/PWA infrastructure | `npm run verify:fast` and release checks | `npm run verify:ci` | manual compatibility run strongly recommended |

## CI monitoring budget

Do not continuously poll GitHub Actions. Check the job summary first, then use approximately 20, 40, 60, 90 and 120 second backoff intervals, with no more than five routine status reads for one run. Fetch detailed logs only for a failed job or a job that has clearly exceeded its normal duration.

If a workflow remains unexpectedly active after roughly five minutes, stop blind polling and inspect the specific running job. Retry a failed job once when the failure is plausibly transient. If the same failure repeats, diagnose the cause before retrying again.

## Release and deployment rules

A user-visible release changes `release.json` and runs `npm run release`; documentation, tests and developer-workflow improvements do not require a public app-version bump. The release script synchronises the runtime version and `.project-state.json`, while `npm run verify:release` checks that those values and generated compatibility artifacts remain aligned.

Production deployment must always reuse the `pages-dist` artifact created by the successful `test` job. The deploy step performs a small live PWA-shell check against `index.html`, the service worker and the manifest so that a version mismatch is detected without repeating the entire browser suite after deployment.

## Avoiding development drift

Do not revive stale branches or old downloaded project copies, do not hand-edit generated compatibility artifacts, and do not scatter the current version across new files. Keep the routine deployment workflow small, place scheduled or diagnostic work in separate workflows, and resist adding another CI lane when a deterministic repository test or a manually triggered compatibility check would provide the same protection with less operational complexity.
