# Chat status presentation boundary (37.57)

Chat's connection and service notices now use a typed React status surface with accessible alert or status semantics. The existing `chatSetStatus` function remains responsible for choosing the operational wording and visibility, and its plain live message remains the fallback when the optional presentation chunk cannot load.

The transcript, composer, conversation list, member picker and message actions continue to use their established adapters. No change was made to delivery, retention, unread counts, notification settings, authentication, Supabase schema or permissions, roster logic, PWA identity or update activation.

Verification includes the Node regression suite, typechecked production build, artifact check and mobile/desktop browser checks for error, recovery, clearing and optional-chunk failure. Live two-device messaging and an installed-PWA update still require an authenticated environment for deployment verification.

The remaining redesign spans the full Chat action and notification settings experience, Account/Admin, auth/onboarding, lifecycle sheets and proved removal of old CSS.
