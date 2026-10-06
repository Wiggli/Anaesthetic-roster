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

The current product-coherence tokens use the 4, 8, 12, 16, 24 and 32 pixel spacing rhythm, 14 pixel control radius, 20 pixel content-card radius and 28 pixel hero radius. Ordinary transitions should use the shared 180 to 240 millisecond motion range.

Colour is semantic before it is decorative. Strong app accent colour means selection or action. Green means healthy, live or confirmed state, amber means attention, and red means destructive or urgent state. Personal and shift accent colours may identify people or the team but must never replace clinical state colours.

Touch targets, safe-area padding, light/dark parity, visible focus, semantic labels, non-colour status indicators and `prefers-reduced-motion` remain mandatory.

## Review

A perceptible interface change should be inspected at representative phone and desktop sizes. Pull-request Chromium smoke covers routine polish; production and scheduled compatibility verification adds WebKit for Safari-sensitive behaviour.

For whole-app polish, review the complete path Night → Changes → Actions → Breaks → Chat → Account rather than approving screens independently. The product should preserve one hierarchy, one header grammar, one shift identity, one status language and one motion language through that path.

## Cascade ownership

The production cascade has explicit ownership boundaries so older compatibility CSS cannot unexpectedly win against current UI work.

- `styles.css` is the compatibility base and lives inside `@layer legacy-base`. It may provide defaults for unmigrated markup, but it must not contain `!important`.
- `chat.css` is the complete Chat fallback and lives inside `@layer legacy-chat`. Shared current presentation may override overlapping Chat chrome.
- Historical presentation generations before the 42.4 foundation live inside `@layer presentation-history` without `!important`.
- The 42.4-and-newer presentation foundation remains unlayered and is the shared current product authority.
- `account-admin-polish.css` owns account and administrator component internals, while `rudder-navigation.css` owns primary dock geometry.
- `product-polish.css` owns the established screen-level refinements and safety-sensitive compatibility polish from the 45.x and 46.x generations.
- `product-coherence.css` is the final durable product-wide cohesion authority. It normalises shared spacing, hierarchy, surfaces, chrome, typography and motion across existing components, but it must not redefine roster calculations, mutation behaviour, role semantics or clinical status meaning.
- `product-coherence-bridge.css` is a narrow migration bridge for presentation properties that older `product-polish.css` generations locked with `!important`. It must remain presentation-only, may target only selectors already migrated into the coherence system, and should shrink as those older locks are retired from their owning stylesheet.

When a visual defect appears, first identify the owning stylesheet and remove or demote the competing rule. New component-specific fixes do not belong in the bridge. New product-wide rules belong in `product-coherence.css`, while the bridge is reserved only for replacing an existing important lock that prevents an already-defined coherence rule from taking effect.

## Visibility state

Visibility state is an explicit exception to ordinary component cascade ownership. The current unlayered presentation owns the global `.hidden` utility and deliberately uses `display: none !important` so a component's normal `display` declaration can never reveal a surface that application state has marked inactive. This is a semantic state invariant, not a screen-specific specificity patch.
