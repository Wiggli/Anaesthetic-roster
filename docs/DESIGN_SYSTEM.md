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

The active product system uses a 6, 10, 14, 18 and 24 pixel spacing rhythm, 12 to 15 pixel control radii and a 20 pixel content-card radius. Ordinary transitions use the shared 180 to 240 millisecond motion range. These values are owned by `product-unified.css`, so new screens should consume the same tokens rather than introduce another local scale.

Colour is semantic before it is decorative. Strong app accent colour means selection or action. Green means healthy, live or confirmed state, amber means attention, and red means destructive or urgent state. Personal and shift accent colours may identify people or the team but must never replace clinical state colours.

Touch targets, safe-area padding, light/dark parity, visible focus, semantic labels, non-colour status indicators and `prefers-reduced-motion` remain mandatory.

## Review

A perceptible interface change should be inspected at representative phone and desktop sizes. Pull-request Chromium smoke covers routine polish; production and scheduled compatibility verification adds WebKit for Safari-sensitive behaviour.

For whole-app polish, review the complete path Night → Changes → Actions → Breaks → Chat → Account rather than approving screens independently. The product should preserve one hierarchy, one header grammar, one shift identity, one status language and one motion language through that path.

## Cascade ownership

The production cascade has one final product-wide presentation owner. Older compatibility layers may provide component internals, but they are not allowed to define a second competing coherence system.

- `styles.css` remains the compatibility base inside `@layer legacy-base`.
- `chat.css` remains the Chat fallback inside `@layer legacy-chat`.
- Historical presentation generations remain compatibility history and should continue shrinking.
- `account-admin-polish.css` owns account and administrator component internals.
- `rudder-navigation.css` owns low-level primary dock geometry.
- `product-polish.css` owns established safety-sensitive compatibility polish that has not yet been retired.
- `product-unified.css` is the single final product-wide presentation authority. It owns shared spacing, typography hierarchy, surfaces, radii, shift identity, live-state language, Actions presentation, navigation appearance, motion, focus treatment and small-phone adaptation across Night, Changes, Actions, Breaks, Chat, Account and Personalisation.
- `product-coherence.css`, `product-coherence-bridge.css` and `product-coherence-correction.css` are retained only as historical migration references and are not imported into the production cascade.

A new whole-app visual rule belongs in `product-unified.css`. A component-specific rule belongs in its owning component stylesheet. Do not create another final override stylesheet. If an older compatibility rule prevents the product system from taking effect, retire or demote that older rule rather than adding another coherence layer.

## Visibility state

Visibility state is an explicit exception to ordinary component cascade ownership. The current unlayered presentation owns the global `.hidden` utility and deliberately uses `display: none !important` so a component's normal `display` declaration can never reveal a surface that application state has marked inactive. This is a semantic state invariant, not a screen-specific specificity patch.
