# Night Roster 52.0 product coherence refactor

The recorded application and the repository implementation were reviewed before changing presentation. Release 52 consolidates the existing application around one mobile shell, readable Light and Dark materials, shared motion and calm operational feedback. It retains the existing operational destinations and clinical workflows.

## Architecture and design system

`src/product-unified.css` owns semantic materials, text, status colours, spacing, typography, radii and shared component presentation. Three solid surface levels and three radius levels replace competing materials; translucency is reserved for chrome. Existing token aliases consume the same semantic values rather than introducing a second system. `src/rudder-navigation.css` owns dock geometry and selection.

`src/ui-system.tsx` supplies shared surfaces, status badges, empty states and controls. `src/product-motion.ts` unifies Motion transitions, saved and operating-system reduced-motion preferences, scroll behaviour and optional haptics. `src/coherent-shell.ts` uses an idempotent, frame-coalesced structural observer, while `src/product-interactions.ts` owns presentation-only dialog dismissal, colleague shortcuts and installed-PWA refresh gestures. Clinical mutations remain in their existing guarded adapters.

## Screens and interactions

Night, Changes, Breaks, Chat, Actions and Account share materials, header treatment, margins, status language and transitions. The existing Account routes, including Preferences, Notifications, App & Help, Security and Roster Management, inherit the same primitives and theme aliases. Onboarding and contextual help describe the current experience.

- The fixed five-column dock uses one travelling selected plate, restrained icon emphasis and a central Actions control. Its entry transform retains horizontal centring. Actions opening and dismissal stay connected to the control, with native dialog focus and Escape behaviour.
- Night retains the existing First Part / Second Part rail and canonical Malta/DST timing. Visible clocks update at a low frequency and immediately on resume; transient feedback names changed staffing, allocation, phase, overtime or breaks. Plan completion animates only when the same selected night becomes ready.
- Changes presents activity with who, when and before/after information. Staffing sheets use native dialogs rather than a second custom modal implementation.
- Breaks adds compact first/second period orientation, companions and current/upcoming context from canonical timestamps, retaining Jump to me and provisional-plan safeguards.
- Chat groups and styles messages within the same system, settles only arriving messages and preserves an older reading position. The solid composer uses 16px input text to avoid iOS focus zoom. Existing delivery, unread, permissions and connection behaviour remain intact.
- Returning to Night can reveal meaningful updates since the previous acknowledgement. Got it clears attention without resurrecting it on the next visit; private history is bounded and cleared on sign-out.
- Colleague shortcuts have a visible button and an optional long press. Message is offered only for an available, uniquely matched directory identity; allocation and copy remain accessible without long press.
- Installed-PWA pull to refresh uses the existing authenticated background read, retains visible content, rejects horizontal gestures and resolves to completion or a short failure state. It does not create an offline write queue.
- Personalisation previews private name/job and shared shift name, symbol and accent immediately, while the existing Save and permission boundaries remain unchanged.

## Light, Dark and accessibility

Both themes have explicit primary, secondary, elevated and floating materials; readable text; separators; overlays; clinical statuses; duty colours; chat bubbles; skeletons; shadows and ambient illumination. Personal identity hues have readable theme-specific treatment and never recolour clinical status. Semantic text and status tokens are tested for at least 4.5:1 contrast on all three solid surfaces, as are white identity glyphs on the six selectable hues.

Native dialogs preserve focus containment and dismissal. Controls retain semantic buttons, accessible labels, focus states and ordinary alternatives to long press. Operating-system and saved reduced-motion choices disable CSS motion and JavaScript press/settle effects. Shared status feedback uses live regions without persistent animated badges.

## iOS, PWA and performance

First-paint HTML theme colour, runtime theme chrome, manifest and application canvas use the same semantic background values. Safe-area and visual-viewport ownership remain in the existing shell, with dock and sheet geometry checked at narrow and wide phone sizes and simulated standalone portrait/landscape insets. Onboarding entry is opacity-only, avoiding movement into the home-indicator region. Prefixed and standard backdrop declarations compile correctly for Chromium and WebKit.

No production dependencies or animation framework were added. Reused data remains visible while refreshing, message history no longer receives whole-list layout animation, time-aware effects are static between low-frequency updates, and structural observer work is coalesced. Existing source and built-artifact budgets remain unchanged.

## Removed debt and corrected defects

Owned dock, chrome, composer and surface declarations were removed from historical styles rather than left beneath a new override layer. Superseded entry keyframes, an unused legacy role-editor renderer, an unused sync helper and custom staffing-backdrop styles were removed. The active typed role editor and all existing save paths remain.

Corrections include the inherited black Night canvas and duplicate local palette in Dark mode, an orphan screen-entry selector, lost/retained backdrop filters after CSS compilation, onboarding safe-area entry overflow, reduced-motion selector specificity, acknowledgement resurfacing, personal preview alignment and insufficient muted-text contrast on the Light elevated surface. Reconnecting uses the information status instead of a danger colour, photo actions use readable theme accents, and outgoing Chat bubbles no longer sit inside a second painted message wrapper.

## Verification and boundaries

The release generator aligns 52.0 across runtime, cache and installed identity. `npm run verify:ci` checks release/generated source, clinical invariants, staffing and DST, concurrency/recovery, security, chat, push, backup, source/bundle budgets, TypeScript and the production artifact. Browser review covers both themes at 320, 390 and 430px, core routes, personalisation, Actions, native sheets, return-summary acknowledgement, reduced motion, colleague shortcuts, chat scroll retention and PWA refresh, alongside the existing regression suites.

No database migration, roster calculation, staffing rule, guarded write contract, authentication flow or push-delivery implementation was changed. Live typing or attachment affordances were not invented where the existing product has no corresponding capability. Browser fixtures exercise presentation and contracts without authenticating a real clinical account or making production writes. Physical iOS/Android installation, real Google login and end-to-end push delivery still require device/account release review; browser emulation does not establish those results.

Final browser results and release-review status are recorded in the pull request.
