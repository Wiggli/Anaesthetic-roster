# Development workflow

The development loop is deliberately split into a fast inner loop and a full release gate. This prevents a small visual adjustment from paying the cost of every browser, database and deployment check while preserving the safety of the final release.

## Start every development session

1. Start from the latest `main` branch and create a fresh task branch.
2. Run `npm run context`.
3. Read `AGENTS.md`, `.project-state.json` and `docs/CURRENT_STATE.md`.
4. Make related edits on the task branch before opening the pull request. The deployment workflow runs on pull requests and `main`, so assembling the branch first avoids starting CI after every partial edit.

## Fast inner loop

Use `npm run verify:fast` while iterating. It regenerates compatibility assets, checks release consistency, runs TypeScript validation, executes the highest-value roster and architecture regression tests, builds the app once and verifies the build artifact.

For presentation changes, run the Chromium browser smoke suite after the fast verification when Playwright is already available. If it is not installed in the current workspace, use the pinned temporary runner:

```sh
npm install --no-save --no-package-lock @playwright/test@1.55.0
npx playwright install chromium
npm run verify:browser
```

Do not reinstall browsers between small changes in the same workspace.

## Change classes

| Change | Fast loop expectation | Full gate |
| --- | --- | --- |
| Documentation only | focused review | CI required check |
| UI or CSS | `npm run verify:fast` plus Chromium smoke when practical | full regression, Chromium smoke, low-end resilience |
| Roster/domain logic | `npm run verify:fast` plus relevant deterministic tests | full regression and browser lanes |
| Database/security boundary | relevant deterministic tests plus migration review | full regression, browser lanes, protected migration on `main` |
| Release/PWA infrastructure | `npm run verify:fast` and release checks | complete CI and post-deploy verification |

WebKit is intentionally not part of every pull-request iteration. It runs on `main`, manual release recovery and the scheduled compatibility run, where it validates the iPhone/Safari-sensitive PWA path without slowing every CSS adjustment.

## CI shape

The workflow uses independent lanes so expensive work can overlap:

```text
regression ─────────────────────────────┐
                                       │
build ──► exact pages-dist ─► Chromium ─┼─► required "test" gate
                     └─────► resilience ┘
                                                │
                                                ▼
                                      migration on main
                                                │
                                                ▼
                                  deploy the same pages-dist
```

The `build` and `regression` jobs begin independently. Browser jobs consume the exact `pages-dist` artifact created by the build job rather than rebuilding it. Pull requests run Chromium mobile, desktop and low-end checks. Main, manual and scheduled runs also include WebKit. The final `test` job is a lightweight aggregator so the branch-protection check name remains stable.

Superseded pull-request runs are cancelled automatically. Main deployment runs are not cancelled by a later main push, which prevents a partially completed migration/deployment from being abandoned.

## CI monitoring budget

Do not continuously poll GitHub Actions. Check the job summary first, then use approximately 20, 40, 60, 90 and 120 second backoff intervals, with no more than five routine status reads for one run. Fetch detailed logs only for a failed job or a job that has clearly exceeded its normal duration.

If a workflow remains unexpectedly active after roughly five minutes, stop blind polling and inspect the specific running job. Retry a failed job once when the failure is plausibly transient. If the same failure repeats, diagnose the cause before retrying again.

## Release gate

Before merging a consequential change, `npm test` must pass. CI then supplies the browser and artifact gate. A user-visible release changes `release.json` and runs `npm run release`; documentation, tests and developer-workflow improvements do not need a public app-version bump.

The release script synchronises the public runtime version and also updates `.project-state.json`, while `npm run verify:release` checks that both remain aligned.

## Avoiding development drift

Do not revive stale branches or old downloaded project copies. Do not hand-edit generated compatibility artifacts. Do not scatter the current version across new files. Do not create alternate roster mutation paths for convenience, and do not weaken the full release gate merely to make an individual iteration faster.
