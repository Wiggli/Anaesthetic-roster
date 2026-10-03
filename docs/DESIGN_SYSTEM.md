# Design system

The Anaesthetic Night Roster uses one restrained, Apple-inspired mobile clinical design language. This file records durable presentation ownership so later polish does not create competing one-off styles.

## Principles

Clinical information hierarchy comes before decoration. The signed-in nurse's assignment and live night state are primary, exceptional staffing work is prominent only when action is required, and detail is progressively disclosed.

Translucency is reserved for chrome and overlays where content can visibly move behind the material. Clinical cards and form surfaces remain stable and readable. Motion is short, purposeful and must have a reduced-motion fallback.

## Shared surfaces

Prefer existing shared structures for headers, bottom navigation, the centre Actions control, sheets, dialogs, cards, settings rows, switches, status badges and toast feedback. A change intended across several screens should be made at the shared selector/component/token level rather than repeated as screen-specific overrides.

## Tokens and consistency

Use the established spacing, radius, typography, surface and motion variables already defined in the stylesheet. New durable values should be introduced as shared custom properties rather than copied numeric literals across unrelated selectors.

Touch targets, safe-area padding, light/dark parity, visible focus, semantic labels, non-colour status indicators and `prefers-reduced-motion` remain mandatory.

## Review

A perceptible interface change should be inspected at representative phone and desktop sizes. Pull-request Chromium smoke covers routine polish; production and scheduled compatibility verification adds WebKit for Safari-sensitive behaviour.


## Cascade ownership

The production cascade has explicit ownership boundaries so older compatibility CSS cannot unexpectedly win against current UI work.

- `styles.css` is the compatibility base and lives inside `@layer legacy-base`. It may provide defaults for unmigrated markup, but it must not contain `!important`.
- `chat.css` is the complete Chat fallback and lives inside `@layer legacy-chat`. Shared current presentation may override overlapping Chat chrome.
- Historical presentation generations before the 42.4 foundation live inside `@layer presentation-history` without `!important`.
- The 42.4-and-newer presentation foundation remains unlayered and is the shared current product authority.
- `account-admin-polish.css` owns account and administrator refinements, while `rudder-navigation.css` owns primary dock geometry. New work should modify the owning stylesheet rather than adding a competing override elsewhere.

When a visual defect appears, first identify the owning stylesheet and remove or demote the competing rule. Do not fix cascade conflicts by adding another higher-specificity selector or another `!important`.
