# Feature release rules

These rules are permanent development requirements for the Anaesthetic Night Roster. They exist so major feature work stays understandable to nurses without requiring a separate reminder from the product owner.

## Keep onboarding and the tutorial in sync

A feature-level release is any update that adds, removes, materially changes, or relocates a user-facing capability, workflow, decision path, navigation pattern, major Night surface, Account surface, Chat capability, AI capability, or other interaction that a nurse may reasonably need explained.

For every feature-level release, the development task is not complete until the education layer has been reviewed and updated in the same change. Update `src/legacy-ui/education.js` so both first-use onboarding and the replayable Tutorial & app guide accurately describe the new product. Add or revise a focused feature lesson where appropriate, update the complete tutorial when the feature changes the normal user journey, and increment the relevant value in `educationVersions()` so existing users receive refreshed guidance once when that is useful.

Small visual polish, copy corrections, internal refactors, test-only work, and narrow bug fixes do not require forcing users through a refreshed tutorial unless the way they use the app actually changes. When there is any reasonable doubt, review the education layer and prefer keeping it current rather than leaving a new feature undocumented.

The release notes and tutorial serve different purposes. Release notes explain what changed, while onboarding and the Tutorial & app guide explain how to use the resulting product. A changelog entry alone is therefore not considered sufficient education for a new feature.

## Simplified release numbering

Keep technical version identifiers because the PWA, cache, compatibility checks, and write guards depend on them, but use a simpler release-number rhythm going forward.

A substantial feature release or meaningful product milestone advances to the next whole release number, for example `47.0`, `48.0`, `49.0`. Small follow-up fixes, polish, layout adjustments, and maintenance work within that release use one decimal sequence such as `47.1`, `47.2`, `47.3`.

Do not create a new release number for every tiny cosmetic tweak when several related changes can safely be shipped together. Batch closely related minor work into one patch release where practical, while still creating a new release immediately when safety, compatibility, or an important user-facing fix requires it.

Do not introduce deeper version chains such as `47.2.1` for routine app development. The preferred public scheme is `major.patch`, with whole-number milestones for feature releases and a single decimal patch counter for follow-up work.

Historical version numbers remain unchanged. Never renumber or rewrite old changelog entries simply to fit the newer convention.
