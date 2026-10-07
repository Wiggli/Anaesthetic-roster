# 51.2 Chat navigation repair

The reported Breaks screenshot showed Night, Changes, Actions and Breaks occupying four columns, with Chat clipped below the dock. `prepareAuthorisedShell` wrote an inline four-column grid during sign-in and saved-roster resume. Inline styling took precedence over the canonical five-column CSS fixed in 51.1.

The repair removes that assignment. Dock geometry remains owned by `src/rudder-navigation.css`; account identity and administrator visibility are unchanged. No roster calculations, staffing rules, dates, backend contracts or schema were changed.

The deterministic regression executes the production shell setup for both account roles and rejects the previous override. The browser fixture now calls the same setup rather than manually bypassing it. Its matrix covers 320, 360, 390, 412 and 430 pixel widths, light/dark appearance, Actions and onboarding, plus HTML fallback navigation. Administrator coverage visits Night, Changes, Breaks and Chat; desktop coverage uses a 1280 pixel viewport.

Complete deterministic regression, TypeScript and production-build verification passed locally and in GitHub Actions. All 36 browser checks passed in Chromium (mobile and desktop) and iPhone WebKit. The three attached Breaks screenshots were visually reviewed with all five controls visible, including Chat.

Screenshots:
- [Chromium mobile Breaks dock](mobile-chromium-breaks-chat-visible.png)
- [iPhone WebKit Breaks dock](mobile-webkit-breaks-chat-visible.png)
- [Desktop Chromium Breaks dock](desktop-chromium-breaks-chat-visible.png)
