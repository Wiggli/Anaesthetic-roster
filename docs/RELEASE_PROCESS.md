# Release process

## Source of truth

`release.json` is the only human-edited source for a new public release number, date, title, summary and change list. Do not manually bump version references through the application.

## User-visible release

1. Update `release.json` with a monotonically newer version and accurate notes.
2. Run `npm run release`.
3. Run `npm run verify:fast`, then `npm test`.
4. Open the pull request after the branch is coherent.
5. Let CI verify the exact build artifact in Chromium and resilience lanes.
6. Merge only after the required `test` status succeeds.
7. On `main`, the protected migration job runs before GitHub Pages deploys the exact previously tested artifact.
8. Verify the live version, service-worker cache alignment, current/next Malta night and update activation.

`npm run release` synchronises application/package/PWA references, generated compatibility assets and `.project-state.json`. `npm run verify:release` rejects drift.

## Non-release work

Documentation-only, test-only and developer-workflow changes do not receive a public application version bump. UI experiments should remain on a task branch and use the fast inner loop until they are genuinely ready to become a release.
