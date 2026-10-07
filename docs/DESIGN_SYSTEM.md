# Design system

The Anaesthetic Night Roster uses one restrained, Apple-inspired mobile clinical design language. This file records durable presentation ownership so later polish does not create competing one-off styles.

## Principles

Clinical information hierarchy comes before decoration. The signed-in nurse's assignment and live night state are primary, exceptional staffing work is prominent only when action is required, and detail is progressively disclosed.

The product-wide hierarchy is: the nurse's role tonight, their break, changes requiring attention, the team plan, then secondary detail. Visual emphasis should follow that order on every operational screen.

Translucency is reserved for chrome and overlays where content can visibly move behind the material. Clinical cards and form surfaces remain stable and readable. Motion is short, purposeful and must have a reduced-motion fallback.

The shared shift identity is one component expressed at different densities. Night may use the expanded treatment, while Changes, Breaks and Chat use compact treatments without inventing different visual identities.

## Shared surfaces

Prefer existing shared structures for headers, bottom navigation, the centre Actions control, sheets, dialogs, cards, settings rows, switches, status badges and toast feedback. A change intended across several screens should be made at the shared selector/component/token level rather than repeated as screen-specific overrides.

Night, Changes, Breaks and Chat use one page-header grammar. The centre Actions control remains a command surface rather than a fifth destination. Account and Personalisation use the same surface, typography, radius and motion language as the operational screens rather than behaving like a separate settings application.

Use only three ordinary elevation levels: page canvas, stable content surface and a single highlighted or floating surface. Nested card-on-card decoration should be removed unless the nesting communicates a real hierarchy.

## Tokens and consistency

Use the established spacing, radius, typography, surface and motion variables already defined in the stylesheets. New durable values should be introduced as shared custom properties rather than copied numeric literals across unrelated selectors.

The active product system uses a 4, 8, 12, 16, 24 and 32 pixel spacing rhythm, 12 pixel control radii and a 16 pixel content-card radius. Ordinary transitions use the shared 180 to 200 millisecond motion range. These values are owned by `product-unified.css`, so new screens should consume the same tokens rather than introduce another local scale.

Typography uses one 10, 12, 14, 16, 18, 22 and 28 pixel scale, adjusted by the saved reading-size preference. Date rails show an abbreviated weekday and month with the year, keeping the selected date readable at 320 pixels.

Colour is semantic before it is decorative. Strong app accent colour means selection or action. Green means healthy, live or confirmed state, amber means attention, and red means destructive or urgent state. Personal and shift accent colours may identify people or the team but must never replace clinical state colours.

Touch targets, safe-area padding, light/dark parity, visible focus, semantic labels, non-colour status indicators and `prefers-reduced-motion` remain mandatory.

## Review

A perceptible interface change should be inspected at representative phone and desktop sizes. Pull-request Chromium smoke covers routine polish; production and scheduled compatibility verification adds WebKit for Safari-sensitive behaviour.

For whole-app polish, review the complete path Night → Changes → Actions → Breaks → Chat → Account rather than approving screens independently. The product should preserve one hierarchy, one header grammar, one shift identity, one status language and one motion language through that path.

## Cascade ownership

The production cascade has one final product-wide presentation owner. Older compatibility layers may provide component internals, but they are not allowed to define a second competing coherence system.

- `styles.css` holds compatibility internals in `@layer legacy-base` and `legacy-components`.
- `chat.css`, `night-welcome.css`, and `night-intelligence.css` keep feature internals inside explicit compatibility layers.
- `src/presentation.css` holds deduplicated component compatibility rules in `presentation-history` and `presentation-components`. Shared geometry no longer belongs to historical generations.
- `src/account-admin-polish.css` contains retained administrator internals in `account-components`.
- `src/rudder-navigation.css` owns the persistent five-column dock, icon stages, badges and safe-area geometry. Selection is a state of the destination button, with no sliding indicator element.
- `src/product-unified.css` is the canonical presentation authority for page gutters, spacing, typography, surfaces, radii, identity, date rails, forms, sheets, Account pages and shared motion. It uses normal cascade ownership without priority flags.
- The superseded `product-polish.css`, `product-coherence.css`, `product-coherence-bridge.css` and `product-coherence-correction.css` files are deleted.
- `src/selected-night.ts` composes one context from the original identity, count and native date controls. It retains the original nodes and listeners and moves Breaks content outside that compact context.
- Changes mounts its React workflow into the same host that contains the functional HTML fallback. React replaces that fallback rather than rendering beside it.
- Account has one `accountPageOutlet`. Inactive pages are detached and retained, preserving controls and drafts; only the current page is mounted. `accountPresentationElement` resolves retained controls for existing presentation adapters, including notifications.

A new whole-app visual rule belongs in `product-unified.css`. A component-specific rule belongs in its owning component stylesheet. Do not create another final override stylesheet. If an older compatibility rule prevents the product system from taking effect, retire or demote that older rule rather than adding another coherence layer.

## Visibility state

Visibility state is an explicit exception to ordinary component cascade ownership. The current unlayered presentation owns the global `.hidden` utility and deliberately uses `display: none !important` so a component's normal `display` declaration can never reveal a surface that application state has marked inactive. This is a semantic state invariant, not a screen-specific specificity patch.
