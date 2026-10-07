# 51.1 repair review

Repairs the five-control dock in React and its HTML fallback, restores the Actions sheet's layout and bounded line icons, separates onboarding progress from Skip, preserves reachable onboarding actions inside simulated iPhone safe areas, and waits for Night to be visible before playing the personal greeting.

## Verification

- Complete `npm run verify:ci` passed on Node 22: deterministic regression suite, release/generated-artifact checks, TypeScript, production build and build-artifact verification.
- 36 focused Chromium and iPhone WebKit browser checks passed at 320, 360, 390, 412 and 430 px, including light/dark appearance, Actions, onboarding, simulated 44 px top / 34 px bottom safe areas, operational pages, Account and failed optional-chunk fallback controls.
- Production greeting lifecycle tests cover launch/onboarding occlusion, completion, interruption and background refresh without restarting.
- Layout tests isolate service-worker caching so blocked-chunk simulations actually reach the network; separate PWA suites retain service-worker behavior.
- Representative screenshots below were visually reviewed for separated labels, legible copy, bounded icons and reachable controls.

Browser run: https://github.com/Wiggli/Anaesthetic-roster/actions/runs/37654878365

## Screenshots

- [320 px light Actions](320-light-mobile-chromium-actions.png)
- [320 px light onboarding](320-light-mobile-chromium-onboarding.png)
- [390 px dark Actions](390-dark-mobile-webkit-actions.png)
- [390 px dark onboarding](390-dark-mobile-webkit-onboarding.png)

Roster calculations, staffing decisions, authentication, shared-data contracts and database schema are preserved.
