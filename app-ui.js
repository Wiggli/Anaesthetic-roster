/* GENERATED FILE. Edit the source modules under src/, then run npm run generate:runtime. */
/* Anaesthetic Night Roster V43.1 interface, staffing, allocation and PWA features. */
var historyExpandedDates={};
var historyLoadedDates={};
var historyLoadingDates={};
var historyPageState={};
var sharedLoadPromise=null;
var sharedReloadPending=false;
var sharedReloadPendingBackground=true;
var reloadTimer=null;
var updateRegistration=null;
var reloadForUpdate=false;
var serviceWorkerCacheVersion='Checking…';
var waitingUpdateVersion='';
var waitingUpdateState='new';
var updateActivationTimer=null;
var pendingRemovals={};
var labourOrders={};
var labourOrderAvailable=true;
var allocationDrafts={};
var labourOrderDrafts={};
var nightRoleOverrideDrafts={};
var nightRoleOverrideAvailable=true;
var seventhDecisionDrafts={};
var allocationSaveInFlight=false;
var changesViewPrepared=false;
var activeChangesStep='staffing';
var changesSmartDefaultDate='';
var initialNightChosen=false;
var automaticSelectedDate=null;
var nightSelectionMode='automatic';
var serverClockSyncInFlight=false;
var serverClockLastAttempt=0;
var sharedSyncState='starting';
var sharedSyncMessage='Opening shared roster';
var compatibilityStartupUseCount=0;
var compatibilityStartupLastUsed='';
var rosterCommandInFlight={};var rosterCommandIds={};
var freshnessTimer=null;
var lastResumeRefresh=0;
var sharedSyncTimer=null;
var sharedSyncCheckInFlight=false;
var lastObservedSyncRevision=null;
var lastObservedAccessEpoch=null;
var accessStatusCheckPromise=null;
var accessLossInFlight=false;
var appCompatibility={minimum_read_version:'37.0',minimum_write_version:'41.0',recommended_version:'41.1',maintenance_mode:false,maintenance_message:'Shared roster editing has been temporarily paused.',write_allowed:false,write_status:'update_required'};
var editingAbsenceId=null;
var realtimeGeneration=0;
var realtimeReconnectTimer=null;
var realtimeRetryCount=0;
var realtimeSubscribed=false;
var onboardingStep=0;
var onboardingCandidate=!educationSeen('main',2);
var onboardingReplay=false;
var onboardingChatIntro=false;
var onboardingFeatureKey='';
var onboardingClockChangeDate='';
var onboardingGuideMenu=false;
var clockChangeSessionNotices={};
var clockChangeEducationTimer=null;
var onboardingDirection=1;
var onboardingProfileDraft=null;
var releaseNotesQueued=false;
var pendingProfilePhoto=null;
var pendingProfilePhotoUrl='';
var profileSavedSignature='';
var launchStartedAt=Date.now();
var launchFinished=false;
var launchSlowTimer=null;
var launchRecoveryVisible=false;
var forcedOfflineSession=false;
var startupAttempt=0;
var changedSinceSession={};
var activityOpenedThisSession={};
var lastFailedAction=null;
var scrollChromeFrame=null;
var pendingUpdateMeta=null;
var pwaStandalone=false;
var sharedWelcomeEntry=false;
var sharedLoadFailureStage='';
var sharedLoadFailureCode='';
var startupSnapshotTimeoutMs=7000;
var startupFallbackTimeoutMs=15000;
var recentActivityItems=[];
var recentActivityDate='';
var runtimeRecoveryStatus={safeMode:false,attempts:0,safeModeUntil:0};
var cacheRepairInFlight=null;
var lastCacheVerifyAt=0;

var RELEASE_HISTORY=[
  {"version":"43.1","date":"4 October 2026","title":"Make Chat conversation-first","changes":["The large all-in-one Chat card has been replaced by separate Team and Private conversation sections with cleaner spacing and much less visual bulk.","Anaesthetic Team is now one fully tappable conversation row with a clearer title, timestamp, member count and latest-message preview, without a redundant Open chat button.","Private chats now use larger names, more readable previews, quieter timestamps and unread badges, and no redundant chevrons.","The Chat header is tighter and more balanced, with the compose action integrated beside the title instead of appearing as a detached control.","Safety guidance and notification settings remain accessible but are visually demoted so they no longer compete with the messaging task."],"policy":"quiet"},
  {"version":"43.0","date":"4 October 2026","title":"Refine mobile hierarchy and readability","changes":["Primary screen titles, section headings and supporting text now use one calmer mobile type scale with more consistent spacing across Night, Changes, Breaks and Chat.","Night keeps the personal assignment as the visual priority while reducing competing emphasis in timeline details, status messaging and the Tonight summary.","Changes now lets completed workflow stages recede and gives unresolved allocation decisions, including the seventh-nurse choice, a clearer and more accessible focus.","Breaks is more compact around pending states and selected-night context so the actual break plan appears sooner without hiding any staffing information.","Chat now uses a compact compose control, denser native-style conversation rows and more disciplined unread/status treatments, while the bottom navigation is easier to read and less visually dominated by Actions."],"policy":"quiet"},
  {"version":"42.9","date":"4 October 2026","title":"Keep administrator alerts administrative","changes":["The administrator settings gear no longer repeats selected-night review work such as an unresolved seven-nurse allocation.","Night-specific decisions remain clearly surfaced through Changes and Quick Actions, where they can actually be resolved.","The administrator badge now counts only pending access requests and roster publication attention.","Browser regression coverage verifies that a selected-night task alone leaves the settings gear clear while a pending access request still raises it."],"policy":"quiet"},
  {"version":"42.8","date":"3 October 2026","title":"Show every recorded overtime nurse","changes":["Recorded overtime names on Tonight now wrap naturally instead of being truncated on narrow phones.","Multiple overtime nurses remain fully readable while a seven-nurse role decision is unresolved.","The 42.7 staffing visibility and administrator attention badge fixes remain unchanged.","Browser coverage now verifies that long and multiple overtime names do not overflow or disappear."],"policy":"quiet"},
  {"version":"42.7","date":"3 October 2026","title":"Keep recorded staffing visible while decisions are pending","changes":["Tonight now names recorded overtime nurses as well as showing the overtime count, including while a seven-nurse decision is still pending.","Seven-nurse decision state remains provisional until the allocation is resolved, but it no longer obscures who has already been recorded as overtime cover.","The administrator settings attention badge is repositioned so the circular header control no longer clips it into a red crescent.","Browser coverage now protects both pending seven-nurse overtime visibility and the administrator badge geometry."],"policy":"quiet"},
  {"version":"42.6","date":"3 October 2026","title":"Restore reliable signed-in visibility","changes":["Restores the authoritative hidden-state utility outside the legacy cascade so authenticated screens can reliably hide the sign-in gate and other inactive interface surfaces.","Fixes the 42.5 regression where Google and password authentication succeeded but the sign-in screen could remain visible over the authenticated roster.","Browser smoke setup now uses the production hidden class instead of forcing inline display styles, so this visibility regression is caught in future UI changes.","Architecture coverage now protects the hidden-state contract while preserving the lower-priority legacy CSS ownership introduced in 42.5."],"policy":"quiet"},
  {"version":"42.5","date":"3 October 2026","title":"Stabilise the app-wide visual cascade","changes":["Historical base styling is moved into a low-priority legacy layer so old high-specificity rules can no longer unexpectedly override the current interface across Night, Changes, Breaks, Chat, sheets and administration.","Presentation generations before the 42.4 foundation remain available as compatibility styling but are demoted to a historical cascade layer and stripped of obsolete priority flags.","Chat keeps its complete fallback styling in a lower-priority feature layer, allowing the current shared presentation system to own overlapping controls consistently.","Repository architecture tests now guard CSS ownership so future polish cannot silently reintroduce the same legacy-versus-current cascade conflicts."],"policy":"normal"},
  {"version":"42.4","date":"3 October 2026","title":"Make Night calmer and navigation smoother","changes":["Night removes the duplicate Personalise this view settings row and keeps the hero focused on assignment, live timing, break, colleague context and one full-night action, while preserving the OLD/NEW clock-change wake-up cues and equal-duty handover logic.","Primary-screen swipes no longer drag and animate two full application pages behind the finger; gestures now decide the destination and use a short compositor-only settle while each tab keeps its own saved scroll position.","Night, Changes and Breaks now share a 44 px date-control baseline, and the Breaks summary actions use proper touch-target sizing instead of undersized calendar-adjacent controls.","The five-column dock has one authoritative geometry, with a quieter translucent Actions control, matching label and icon rhythm, a transform-only active lens and the existing corrected unread-badge anchoring."],"policy":"normal"},
  {"version":"42.3","date":"3 October 2026","title":"Fix dock notification badge clipping","changes":["Chat and Changes unread badges now remain fully visible because the shared icon stage explicitly allows the badge to extend beyond the icon box.","The legacy Chat badge offset is limited to the non-React fallback navigation, preventing it from interfering with the current five-column dock.","Badge margins and positioning are normalised in the consolidated dock layer so active and inactive tabs use the same stable geometry."],"policy":"quiet"},
  {"version":"42.2","date":"3 October 2026","title":"Correct Night colour and dock geometry","changes":["The Night hero now uses a self-contained dark colour system with bright assignment text, muted supporting copy, subtle role colour and a dark translucent Duty, Break and Colleague surface instead of mixed light-theme tokens.","Timeline, More details, full-night action and clock-change cues now inherit the same hero palette, preserving OLD/NEW clock clarity while improving contrast and visual hierarchy.","Night date controls and the Tonight card are refined with quieter neutral surfaces and more restrained shadows so blue and green are reserved for interaction and status.","The five bottom destinations now use matching fixed icon stages; Changes and Chat badges are anchored to their icons, Actions uses the same vertical geometry, and the active lens/dock glass are lighter and more Apple-like without obscuring labels."],"policy":"normal"},
  {"version":"42.1","date":"3 October 2026","title":"Unify the presentation foundation","changes":["Changes now uses a calmer grouped workflow with tighter date, staffing, step, empty-state and history surfaces while keeping the existing save and validation logic unchanged.","Breaks now presents the personal break, summary, schedule and coverage information as clearer grouped surfaces with less competing chrome.","Chat now uses denser inbox, safety, thread and composer spacing so more conversation fits on screen without changing delivery, retention, unread or notification behaviour.","The Night and five-column dock CSS are consolidated: clipping-prone negative margins and superseded finishing overrides are removed, while the validated 360 to 412 pixel Night layout and OLD/NEW clock-change behaviour remain authoritative."],"policy":"normal"},
  {"version":"42.0","date":"3 October 2026","title":"Rebuild the UI foundation","changes":["The Night assignment hero no longer clips longer Duty, Break, colleague or assignment text, with safe internal gutters and responsive layouts validated at 412, 390, 384 and 360 pixel phone widths.","Duty, Break and Colleague now use a two-plus-one arrangement on typical phones and a single-column fallback on very narrow screens, while the live 00:00–07:00 timeline wraps safely without changing clock-change or handover logic.","Changes, Breaks, Chat and Full roster now share the same screen-header and roster-date presentation hooks, giving titles, controls, spacing and typography a consistent hierarchy across the app.","The five-column glass dock receives a quieter active lens and safer unread-badge placement, while the grouped Tonight surface and all existing roster, Supabase, authentication and daylight-saving behaviour remain unchanged."],"policy":"normal"},
  {"version":"41.9","date":"3 October 2026","title":"Polish Night composition and spacing","changes":["The Night header and date selector are tightened so the page title, date and assignment sit on one consistent 8-point spacing rhythm.","The redundant assignment eyebrow is removed on normal nights, while the hero keeps the assignment, timeline, Duty, Break, Colleague, More details and one full-night action in a clearer hierarchy.","Tonight is regrouped into one operational surface containing team status, Team allocation and Changes tonight, with Plan ready attached to the team information instead of floating separately.","The bottom dock is reduced to a 64px balanced five-column glass bar with a smaller integrated Actions control, refined unread badge placement and safe content clearance."],"policy":"normal"},
  {"version":"41.8","date":"3 October 2026","title":"Make clock-change time unmistakable","changes":["Clock-change nights now show a large live current-time card marked OLD or NEW, with a clear NOW badge and plain-language confirmation of whether the clock change has already happened.","When clocks go back, the repeated 02:xx hour is labelled FIRST 02:xx before the change and SECOND 02:xx after it, so identical wall-clock times cannot be confused.","The compact live timeline label mirrors the same OLD clock and NEW clock wording while the existing equal-duty handover, repeated-hour timeline and staffing logic remain unchanged.","The wake-up cue includes dark-mode, reduced-motion and reduced-transparency treatment and is covered by browser regression tests for both occurrences of 02:15."],"policy":"normal"},
  {"version":"41.7","date":"3 October 2026","title":"Rebuild the Night screen","changes":["The Night assignment card is cleaner and more focused, with Duty, Break and Colleague details plus one full-night action instead of repeated handover information.","Normal nights show 03:30 only as the timeline division, while clock-change nights keep their special equal-duty handover, repeated-hour or skipped-hour explanation clearly visible.","Tonight, Team allocation and Changes tonight now use a tighter hierarchy, stronger dark-mode contrast and more consistent spacing so the screen is easier to scan during a shift.","The bottom navigation is rebuilt as a balanced five-column glass dock with an integrated Actions control, better badge placement, safe scroll clearance and reduced-motion and reduced-transparency fallbacks."],"policy":"normal"},
  {"version":"41.6","date":"2 October 2026","title":"Polish the app shell","changes":["The bottom Night, Changes, Breaks and Chat rudder has larger destination labels, a better integrated centre Actions control and a lighter glass material that lets moving content remain visible underneath.","Compact scroll headers now show useful screen context where available, use a more legible hierarchy and transition into a genuinely translucent navigation surface instead of an opaque strip.","The Changes workflow control now settles beneath the compact header when sticky, preventing competing chrome while keeping the three-step workflow immediately accessible.","Night and the other primary screens use tighter, more consistent vertical spacing so the first viewport carries more useful information without making cards or controls feel cramped."],"policy":"normal"},
  {"version":"41.5","date":"2 October 2026","title":"Make Night easier to read","changes":["The personal Night hero is substantially shorter and now prioritises assignment, live duty state, handover timing, duty period and break, with a slim direct route to team allocation and profile detail moved behind progressive disclosure.","Tonight is calmer and less repetitive: the duplicate break shortcut and secondary quick-status strip are removed while the team plan, allocation and recent changes remain immediately available.","The centre Actions rudder is smaller and better integrated with the navigation, uses clearer labelling and attention counts, and rotates into a close state while its sheet is open.","The Actions sheet now grows from the centre navigation with restrained motion and presents staffing, review, messaging and sharing actions in a faster two-level hierarchy with reduced-motion fallbacks."],"policy":"normal"},
  {"version":"41.4","date":"2 October 2026","title":"Make night actions easier to reach","changes":["The bottom navigation now uses an integrated centre Quick button between Changes and Breaks while Night, Changes, Breaks and Chat remain the only page destinations.","Quick Actions opens a night-aware sheet for reporting an absence, adding overtime cover, reviewing outstanding changes, starting a private message and sharing the public Night Roster app.","Staffing shortcuts route into the existing guarded Changes workflow and respect offline or server-side write restrictions instead of creating new mutation paths.","The new rudder and sheet retain large touch targets, reduced-motion and reduced-transparency fallbacks, visible focus states and a restrained Liquid Glass treatment."],"policy":"normal"},
  {"version":"41.3","date":"2 October 2026","title":"Make Account and Administrator calmer","changes":["Account now opens to four clear destinations: Profile, Preferences, Security, and App & Help, instead of placing every setting and action in one long sheet.","Administrator now opens to Tonight, People & Access, Roster Management, and System, replacing the crowded five-tab control rail with a task-focused landing view.","Publishing and permanent team rotation are grouped behind Roster Management, while system health, recent admin activity, exports and diagnostics are grouped under System.","Technical health and audit detail stays collapsed until requested, while the existing roster, account, passkey, export and administrator actions continue to use their proven underlying logic."],"policy":"normal"},
  {"version":"41.2","date":"2 October 2026","title":"Finish the modular runtime architecture","changes":["The former app-ui.js source is split into foundation, clinical, synchronization and bootstrap modules, while the public app-ui.js remains a generated compatibility asset for installed PWAs.","Domain clock, freshness and capability logic plus the reliability runtime now live in strict TypeScript source and must typecheck before compatible browser JavaScript is generated.","Release tooling and architecture tests now reject stale generated assets or a return to the previous monolithic source layout.","Superseded one-off presentation boundary notes were removed after durable ownership and safety rules were consolidated into AGENTS.md.","The verified 138-night rotation, staffing and Labour Ward rules, Supabase trust boundary, audit schema, Chat transport and explicit ACTIVATE_UPDATE flow are unchanged."],"policy":"normal"},
  {"version":"41.1","date":"2 October 2026","title":"Make recovery and audit durable","changes":["Repeated failed launches now enter a reduced-risk recovery mode, saved rosters use bounded integrity-checked atomic IndexedDB snapshots, and the active service worker can verify and repair missing cached shell files without bypassing explicit update approval.","Consequential shared roster writes now create immutable server-side audit events with operation IDs, authenticated actor identity and before/after values, with an administrator timeline for review.","Night history now uses bounded keyset pagination, operation idempotency records expire after 90 days, and new database invariant and non-mutating canary checks strengthen long-running health monitoring.","Critical roster requests now collect bounded privacy-safe latency measurements, with CI size budgets guarding against performance drift.","Release testing now includes WebKit/iPhone coverage, low-end CPU and network pressure, ambiguous retry idempotency, real two-page leadership, active-session revocation and a verified roster-data restore drill."],"policy":"normal"},
  {"version":"41.0","date":"2 October 2026","title":"Enforce the roster trust boundary","changes":["Shared roster writes now require a compatible 41.x client, while the server can pause shared editing or block a specific unsafe release without stopping roster viewing.","Older v25, v26, v35 and v48 mutation routes are no longer executable by signed-in browsers; current roster changes use the guarded v49 route.","Audit history now records the authenticated account UUID and resolves the readable actor name on the server instead of trusting a browser-supplied name.","Access and role changes now reach open and multi-tab PWAs; disabled accounts clear private saved roster and Chat state and sign out immediately."],"policy":"important"},
  {"version":"40.1","date":"2 October 2026","title":"Make Chat easier to read and use","changes":["Chat messages, timestamps, thread titles and inbox rows now use a more readable night-shift type scale, with clearer unread and active-conversation states.","New private chat keeps a visible text label even on phones, and the Anaesthetic Team entry remains the dominant first action with a clearer Open chat affordance.","Phone conversations use a cleaner full-canvas thread with larger controls, while desktop keeps the inbox and conversation side by side.","The composer is now one polished translucent surface with a plain textarea and 44 px send control, and private outgoing messages use a clearer blue treatment without changing chat delivery logic."],"policy":"important"},
  {"version":"40.0","date":"2 October 2026","title":"Make shared roster changes safer","changes":["Every clinical roster change now carries a unique operation ID and the latest shared revision to the database, so double taps, retries and lost responses cannot quietly repeat the same action.","Before consequential changes are saved, the app checks that its shared roster revision is still current; if another device changed the night, the latest plan is loaded and the affected roles or staffing state are shown for review.","Final confirmation now has an additional server-side safety gate that rejects understaffed plans, stale role overrides, unavailable staff and invalid Labour Ward orders before the proven allocation and revision-locked finalisation logic runs.","App startup, resume, online recovery, Night rollover, freshness checks, Realtime recovery and update checks now run through a shared lifecycle and scheduler instead of competing timers and independent browser events.","Multiple tabs on the same device coordinate through a local leader so only one owns roster Realtime and routine update polling, while other tabs follow shared revision broadcasts and can take over automatically if the leader closes.","Clock checks now reject unreliable high-latency samples, device storage is routed through one compatibility facade, stable machine error codes replace wording-dependent decisions, and privacy-safe diagnostics record state, recovery and command events without roster identities.","New adversarial tests add generated staffing combinations, stale-client and retry contracts, lifecycle and clock checks, multi-tab coordination safeguards and continued protection for the verified 138-night rotation and explicit PWA update activation."],"policy":"important"},
  {"version":"39.0","date":"2 October 2026","title":"Harden the roster logic foundation","changes":["Night now uses one Malta-time context for automatic versus manual selection, current and next night labels, live duty phase and the 07:00 boundary, with an authenticated server-clock sanity check when online.","Night, Changes and Breaks now share one selected-night plan model, while shared synchronization has explicit starting, live, reconnecting, offline and stale-data states and rejects older snapshots arriving after newer ones.","Shared roster mutations now use one guarded command path that collapses duplicate in-flight actions and verifies the refreshed server outcome after an ambiguous timeout while preserving existing atomic RPCs and revision-conflict protection.","Chat retries now carry a stable client message ID with database-enforced idempotency, and read cursors can only move forward across tabs and devices.","Saved offline roster data now expires after seven days, diagnostics use a bounded privacy-safe local event ring, schema capabilities are centralized, compatibility startup fallbacks are observable, and post-update runtime versions are checked for consistency.","Typed internal event contracts and new invariant tests cover all 138 published rotation nights at the 19:00 and 07:00 boundaries, plus multi-device, retry, stale-snapshot and update-health contracts."],"policy":"important"},
  {"version":"38.02","date":"1 October 2026","title":"Make Night follow the working-shift clock","changes":["From 00:00 through 06:59, Night keeps showing the roster night whose shift is still in progress, including its live timeline and handover state.","At 07:00 Malta time, once that duty window ends, Night automatically moves to the following rostered night rather than leaving the completed night selected.","During the daytime and evening before duty begins, the app keeps showing that next rostered night; once its working night is active, it is labelled Current roster night.","The date control now distinguishes Current roster night from Next roster night correctly, avoiding the earlier misleading label on future dates.","The same clock rule is rechecked every minute and whenever the app becomes visible, while manual date browsing remains respected until the automatic-night shortcut is used."],"policy":"important"},
  {"version":"38.01","date":"1 October 2026","title":"Restore quiet headers and one glossy scroll bar","changes":["Night, Changes, Breaks and Chat no longer use the large blue-green hero masthead introduced in 38.0; their normal top-of-page headers are quiet and content-led again.","A single slim full-width glass bar now fades and glides in only after the page header scrolls away, using the same treatment across Night, Changes, Breaks, Chat, Full Roster and Roster Management.","The scroll bar shows only the current section title, removing extra status text, oversized height and the Admin-only floating rail so the chrome stays calm and predictable.","Scroll-linked blur, opacity and vertical movement are driven continuously for a smoother transition, while screen switches temporarily suppress the bar to prevent stale-header flashes.","The improved Chat readability, content hierarchy, roster calculations, handover logic, staffing rules, break logic, Supabase security and explicit PWA update activation remain unchanged."],"policy":"important"},
  {"version":"38.0","date":"1 October 2026","title":"Unify the app around a premium clinical interface","changes":["Chat is rebuilt around readable team and private-message hierarchy, larger conversation text, cleaner previews, stronger unread states and better use of the available screen instead of tiny labels surrounded by empty space.","Changes and Breaks now use the same premium masthead, typography, spacing, surfaces and interaction language while preserving the existing staffing workflow and calculated break plan.","The compact scrolling header now morphs into a slim full-width glass veil with useful context such as unread messages or outstanding Changes items, replacing the previous detached-looking top bar.","Night, bottom navigation, Account, roster management, dialogs and update surfaces now share the same restrained clinical palette, radii, depth, touch geometry and accessibility fallbacks.","The redesign changes presentation only: the verified rotation, real handover calculation including clock-change nights, staffing rules, break logic, chat delivery, Supabase security and explicit PWA update activation remain unchanged."],"policy":"important"},
  {"version":"37.99","date":"1 October 2026","title":"Give Night a quieter focus","changes":["Night now opens with a leaner hospital header, one clear page title and a lighter date navigator, removing repeated labels while keeping the selected roster night obvious.","Your assignment hero is calmer and more compact while preserving the live handover rail, colleague, duty and break information, clock-change guidance and every existing roster calculation.","As Night scrolls, the hospital masthead now morphs into a compact glass header carrying your assignment and selected date instead of leaving an empty collapsed header.","The update prompt and bottom navigation are smaller, clearer and more genuinely translucent, with quieter secondary actions, a refined active state and reduced-transparency fallbacks.","During the active working night, the interface subtly increases emphasis on the assignment and handover instrument without changing staffing, allocation, break or PWA update behaviour."],"policy":"important"},
  {"version":"37.98","date":"1 October 2026","title":"Fix Share Night Roster buttons","changes":["Send Night Roster now dispatches through the correct share action channel and opens the device share sheet where supported.","Copy link and Installation help use the same corrected share event path instead of silently doing nothing.","Browser coverage now clicks the real Send Night Roster button and verifies that only the public Night Roster welcome URL is shared."],"policy":"important"},
  {"version":"37.97","date":"1 October 2026","title":"Bring back the live blue Night rail","changes":["The Night timeline is now a slim blue elapsed-time rail with a soft highlight for your own duty segment, a live blue progress fill and moving marker during the active night, and a crisp handover marker without the previous chunky segmented panel.","The What matters next / Handover state is now integrated directly into the dark hero instead of appearing as a large pale nested card, while colleague, duty and break facts keep proper high contrast inside the hero.","Clock-change intelligence is preserved on the cleaner rail, including the first and second 02:xx labels on autumn rollback nights, the spring skipped-hour marker, equal-duty handover timing, and reduced-motion support."],"policy":"important"},
  {"version":"37.96","date":"1 October 2026","title":"Make Night feel like a live shift","changes":["The personal Night hero now adapts through the shift with a live what-matters-next state, actionable colleague, duty and break details, subtle handover feedback, and compact routine-versus-exception context across the Night overview and team allocation.","The 00:00–07:00 rail is now a true elapsed-time instrument with highlighted personal duty segments, a live moving marker, explicit handover state and clock-change geometry; autumn rollback nights visibly distinguish the first 02:xx from the second 02:xx, while spring nights show the skipped hour.","Share Night Roster now provides a large offline QR code, native phone sharing, copy-link fallback and installation help. Scanned links open a simple device-aware install welcome flow, while sharing exposes only the public app address and never roster or account data."],"policy":"important"},
  {"version":"37.95","date":"1 October 2026","title":"Keep clock-change nights fair","changes":["Clock-change nights now keep First Part and Second Part equal in real elapsed duty: the handover moves to 04:00 on spring-forward nights and to 03:00 after the rollback on autumn nights, while ordinary nights remain 03:30.","Night, Breaks, personal live-duty status and full-roster summaries now share the same Europe/Malta timing calculation, with clear actual-hours wording, animated clock-change guidance and reduced-motion support.","Affected nights now receive contextual onboarding, a one-time advance reminder when the roster night is within seven days, and a once-per-night device notification when alerts are already enabled, without introducing a new permission prompt."],"policy":"important"},
  {"version":"37.94","date":"1 October 2026","title":"Make the next safe action obvious","changes":["Changes now opens on the step that actually needs attention for each selected night and shows genuine progress toward a ready or shared plan, while the standard automatic six-nurse plan stays quiet.","Notification permission is no longer requested just after sign-in. Night Roster first lets the user reach Team Chat, then offers optional alerts with benefit-first privacy wording and keeps the operating-system permission behind an explicit tap.","Unfinished local Changes selections now warn before a browser reload and block a PWA update from discarding them, while confirmation labels Rostered versus This night so exceptional changes are easier to compare before sharing."],"policy":"normal"},
  {"version":"37.93","date":"1 October 2026","title":"Make guidance part of the app","changes":["First use is now a focused three-step setup: confirm your roster identity, learn where your own night appears, and understand that the normal six-nurse plan is automatic unless something genuinely changes.","Changes, Breaks and Team Chat now explain themselves the first time they are opened, while Account has a proper App Guide with reusable topic shortcuts and one education-state system that still respects earlier completed guidance.","What’s New is now benefit-led and easier to scan, with feature actions, a compact expandable month-grouped version history, smarter quiet/normal/important release visibility, and update read-state recorded only after the update experience is actually viewed."],"policy":"important"},
  {"version":"37.92","date":"1 October 2026","title":"Make the night feel alive","changes":["Night now shows a live duty-state cue, a non-countdown 00:00–07:00 orientation rail, an at-a-glance strip for current state, personal break and unread Chat, a calmer seven-nurse information treatment, smarter since-last-open activity summaries and Jump to me navigation.","Changes now treats an already published plan as a calm completed state with a compact Shared workflow and a quieter View or adjust roles action, while healthy realtime copy is reduced to Up to date and genuine unresolved work still restores the stronger action state.","Breaks now reads as one grouped schedule with Jump to me and structured Labour Ward, Pager and seventh-nurse coverage rows, while shared typography, semantic colours, reduced card furniture, stronger content-under-glass chrome, subtle haptics and accessibility fallbacks are applied across the core app."]},
  {"version":"37.91","date":"30 September 2026","title":"Make settings easier to read","changes":["Notification settings now use larger row titles and descriptions, bigger switches, and visible On, Off or Muted labels so state never depends on colour alone.","Notification colour is simplified: the app accent marks interactive and enabled controls, green is reserved for healthy device status, warning and destructive colours keep their semantic roles, and mute actions use quieter neutral controls.","Account, appearance and roster-management utility surfaces now share larger settings typography, roomier tap targets and clearer grouped-row hierarchy without changing roster, notification or security behaviour."]},
  {"version":"37.90","date":"30 September 2026","title":"Make Team Chat obvious","changes":["The Chat inbox now labels Anaesthetic Team plainly as Team chat, explains that it reaches everyone on tonight’s roster, uses team-member wording, and gives New private chat a visible text label.","The staff-coordination notice is shorter and no longer repeats the 14-day retention message, while notification settings are visually quieter beneath the conversations.","Team and private composers now use one glass dock with a plain text field and one send button, clearer placeholder text, cleaner spacing above the tab bar, and no duplicate borders or glow rings."]},
  {"version":"37.89","date":"30 September 2026","title":"A real Chat inbox","changes":["Chat now opens as an inbox with Anaesthetic Team pinned alongside private conversations, instead of embedding the full group conversation above the inbox.","Team and private conversations now open in a dedicated full-height thread with Liquid Glass header and composer chrome, clearer message grouping, unread dividers and cleaner timestamps.","Unread state is now tied to the conversation actually being open, while replies, @mentions, long-press actions, retry/delete behaviour, notification preferences and the staff-coordination safety boundary remain intact."]},
  {"version":"37.88","date":"30 September 2026","title":"Keep confirmed nights ready","changes":["A confirmed seven-nurse arrangement now shows Plan ready on Night when there are no unresolved staffing, allocation or Labour Ward tasks.","Seven-nurse arrangement text remains visible for context but is styled as informational after confirmation instead of as a warning.","Review needed is now reserved for genuine unresolved work, and it still returns automatically if a later change creates a task or requires confirmation."]},
  {"version":"37.87","date":"30 September 2026","title":"Keep shared plans complete","changes":["The Confirm step now hides the primary Confirm and share action once the selected-night plan is already published, including after the allocation view remounts.","The Night and Breaks confirmation hint is shown only while confirmation is actually required, so a completed shared plan no longer looks unfinished.","If staffing, allocations or night-only roles change after publication, the confirmation controls automatically return so the revised plan can be reviewed and shared again."]},
  {"version":"37.86","date":"30 September 2026","title":"Make Breaks faster to scan","changes":["The compact scroll navigation on Changes, Breaks, Chat and Full Roster is taller and uses a clearer 17px title with more breathing room while retaining the neutral content-under-glass treatment.","Break plan now presents First break and Second break as two clearly separated schedule groups with numbered section markers and integrated nurse counts instead of detached count badges.","Break nurse rows are tighter and easier to scan, while the signed-in nurse uses only a slim blue leading marker, subtle tint and compact You badge rather than a heavy blue block.","Labour Ward and Pager notes now sit under a clearer Additional coverage heading and use flatter separated rows instead of another large rounded card.","The Changes Staffing, Allocation and Confirm selector is shorter and visually secondary to Manage this night, with a thin neutral selection lens and blue active text rather than a large filled segment.","The Changes date control gives more width to the selected date on phone layouts by narrowing arrow controls and the staffing summary column.","The bottom destination lens is quieter and nearly borderless so the active icon and text carry selection while underlying content remains more visible."]},
  {"version":"37.85","date":"30 September 2026","title":"Let content lead the interface","changes":["Night no longer creates a floating scroll header; the selected assignment remains the visual anchor while the page scrolls naturally.","Changes, Breaks, Chat and Full Roster now form a slim neutral navigation edge only as their large page heading leaves the viewport, with no duplicated workflow rail or oversized glass capsule.","Roster Management keeps its normal section tabs in the page and replaces them with one compact Liquid Glass section rail only after those tabs scroll away.","Night now uses a more instrument-like dark assignment surface, a clearer Tonight's assignment label, flatter date and overview groups, hairline-separated rows and fewer card-like containers.","Roster Management status and summary content now reads as grouped settings rows instead of nested dashboard cards, while the original section tabs are no longer a second sticky glass layer.","The bottom navigation is clearer and quieter, with less tint and shadow so the moving lens and the content passing underneath provide the visual depth.","Scroll-edge feathering, typography hierarchy, Reduced Transparency, Increased Contrast and Reduced Motion behavior were aligned with the simplified control-plane model."]},
  {"version":"37.84","date":"30 September 2026","title":"Make Liquid Glass respond to touch","changes":["The bottom navigation now illuminates from the finger position during taps and continuous tab drags, while the selected lens subtly brightens and keeps its existing gel-like flex.","The moving destination lens is now a thin light-and-tint overlay inside the parent material instead of inheriting its own second blur, removing the remaining glass-on-glass over-frosting.","Collapsed Changes and Roster Management controls now receive the same localized touch illumination inside their existing glass plane, preserving the single-material hierarchy.","Touch energy follows the pointer while it moves and disappears cleanly on release or cancellation, without changing navigation, swipe, roster, staffing, authentication, realtime or update behavior.","Reduced Transparency disables the light bloom and Reduced Motion removes its elastic expansion, while browser smoke coverage now guards the new touch-response and single-layer lens states."]},
  {"version":"37.83","date":"30 September 2026","title":"Make floating chrome behave like Liquid Glass","changes":["Floating headers, workflow rails, Roster Management tabs, bottom navigation, Chat chrome and the update prompt now use a much clearer neutral Regular material, allowing shapes and colour from scrolling content to remain visible through the glass.","The compact header now materializes by progressively strengthening blur, saturation, contrast, depth and the scroll-edge dissolve instead of relying on a simple whole-surface fade.","Changes and Roster Management use a single spring-driven selected lens inside the collapsed glass rail, while the bottom navigation lens subtly stretches and compresses during taps, drags and page swipes.","Chat now avoids glass on glass: the outer composer remains the floating material and the input control becomes a thin translucent overlay, while larger account and release sheets use a deliberately thicker Regular material.","Reduced transparency, increased contrast, reduced motion and unsupported-backdrop fallbacks remain intact, and browser coverage now guards transparency, scroll-edge treatment, moving lenses and the single-layer composer."]},
  {"version":"37.82","date":"30 September 2026","title":"Merge contextual controls into glass chrome","changes":["Changes now carries Staffing, Allocation and Confirm inside the collapsed glass header, with the selected step staying in sync with the existing workflow controls.","Roster Management now folds Overview, Publish, Team, Access and Data into the same collapsed glass slab, while the in-page section rail scrolls away naturally instead of forming a second sticky bar.","The compact chrome grows continuously as its contextual rail appears, with blur and saturation increasing with scroll depth so the transition feels attached to the user’s gesture rather than switching abruptly.","Night keeps the signed-in nurse’s assignment visible with the selected date at the trailing edge, while Breaks and Chat retain their personal and live context without changing roster, staffing, authentication, realtime or update-activation behaviour.","Browser coverage now verifies the contextual Changes and administrator rails, their active-state synchronisation and the single-slab management layout."]},
  {"version":"37.81","date":"30 September 2026","title":"Restore unified floating glass","changes":["Roster Management’s Overview, Publish, Team, Access and Data rail is translucent again, with stronger blur, saturation, edge highlights and a more transparent selected segment so content visibly travels underneath it while scrolling.","The scroll-linked compact header, floating bottom navigation, Chat composer and update card now share one optical glass material instead of using slightly different translucent treatments.","Floating chrome gains subtle edge refraction and specular highlights while solid clinical content remains opaque for legibility and hierarchy.","Reduced-transparency and unsupported-browser fallbacks remain solid and accessible, and browser coverage now verifies that the major floating surfaces are genuinely translucent rather than opaque."]},
  {"version":"37.80","date":"30 September 2026","title":"Fix persistent update banner","changes":["The update card now has an explicit high-priority hidden state, fixing the CSS conflict that kept it visible even after the update logic correctly marked Night Roster as already up to date.","The passive update card is now guaranteed to stay off Changes, Breaks and Chat even if a stale visibility class remains on the element.","Browser coverage now verifies both dismissal and Night-only visibility so this specific stuck-banner regression cannot silently return."]},
  {"version":"37.79","date":"30 September 2026","title":"Fix PWA update state","changes":["The app now asks both the active and waiting service workers for their real cache version, so a page that already shows the new interface is described as finishing installation rather than incorrectly claiming that a new version is available.","The update banner is cleared as soon as the accepted service worker takes control, with a timed recovery path that reloads once if the normal controller-change event is missed.","Choosing Later is now scoped to the specific waiting version, so deferring one release cannot accidentally suppress a later update during the same app session.","Same-version component refreshes and partially installed current releases now have distinct, accurate update copy while the explicit ACTIVATE_UPDATE approval flow remains unchanged."]},
  {"version":"37.78","date":"30 September 2026","title":"Add scroll-linked glass and night-shift depth","changes":["Night, Changes, Breaks, Chat, Roster and Roster Management now gain a scroll-linked compact glass header that fades and settles continuously as content moves underneath it, while reduced-motion and reduced-transparency preferences remain respected.","Roster Management now uses a sticky frosted section rail plus grouped status, operational and system-health rows instead of a dashboard of repeated tiles.","The PWA update prompt is smaller, theme-aware and translucent, with a quieter Later action and a clear blue Update action while preserving the existing user-approved service-worker activation flow.","The black personal assignment hero keeps its signature dark identity but gains restrained blue light, inner depth, richer shift-token treatment, scan icons and a subtle Motion entrance.","Chat composer and management chrome now share the same content-under-glass material language so scrolling feels more continuous without adding glass to clinical content surfaces."]},
  {"version":"37.77","date":"30 September 2026","title":"Finish the mobile craftsmanship pass","changes":["Night now has the same clear destination identity as Changes, Breaks and Chat, while its Tonight board relies on spacing and hairline separators rather than extra shadow and card furniture.","Changes now presents Absences and Overtime as one grouped staffing surface, removes duplicated no-record messages and keeps exceptional editing in focused Motion sheets.","Breaks now uses flat nurse rows inside one schedule surface, with blue reserved for the signed-in nurse and interaction rather than decorative section colour.","Chat now keeps notifications after conversations, fixes the masthead composition and renders team messages as true left/right conversation bubbles with lighter metadata and a sticky native-style composer.","Shared chrome gains consistent account and administrator controls, tighter radii, restrained tactile feedback, a lighter Motion tab indicator and a more intentional dark-mode treatment for night-shift use."]},
  {"version":"37.76","date":"30 September 2026","title":"Unify the primary app shell","changes":["Changes, Breaks and Chat now share Mater Dei institutional branding, section-title rhythm and selected-night styling with Night, removing the previous sense that each destination belonged to a different interface.","Night now groups team state, allocation, the signed-in nurse’s break and selected-night activity into one Tonight board, replacing the loose lower-page text with clear operational rows and a deliberate no-changes state.","Changes now keeps absence and overtime forms out of the way during a normal night: compact staffing summaries open focused Motion bottom sheets only when a user chooses to add or edit a staffing change, with blue primary actions.","Break headings and counts are now neutral, while blue is reserved for the signed-in nurse and interaction, removing the leftover purple and teal section colours.","Primary date navigators, spacing, hierarchy and status treatment are more consistent across Night, Changes and Breaks without changing roster logic, shared-data behaviour, swipe navigation, accessibility or PWA update semantics."]},
  {"version":"37.75","date":"30 September 2026","title":"Polish the night shift interface","changes":["Changes now uses a tighter selected-night bar, calmer step control, compact staffing editors and lower-noise empty states, while preserving the existing Staffing → Allocation → Confirm workflow and every shared-data action.","Breaks now presents First break and Second break as one coherent schedule board, uses a subtle blue personal marker instead of the previous heavy outline, and keeps Labour Ward/Pager notes readable without truncating the operational text.","Chat now presents team messages as familiar conversation bubbles, uses a lighter composer and places notification management behind a secondary disclosure so conversations remain the primary content.","Roster management now fits all five sections on a phone without clipped tabs and compresses overview/status surfaces into a clearer operational summary.","Shared React and Tailwind primitives now use quieter borders, tighter rows and more restrained glass, while the floating navigation is slimmer and keeps the existing continuous swipe, reduced-motion, dark-mode and accessibility behaviour."]},
  {"version":"37.74","date":"29 September 2026","title":"Unify the clinical app experience","changes":["Changes now behaves as a guided task flow: automatic steps recede, unresolved allocation work becomes the clear focus, staffing forms use quieter grouped surfaces, and exceptional states communicate through wording and hierarchy rather than colour alone.","Breaks is now an operational duty board with the signed-in nurse’s own break as the primary focus, compact selected-night context, a concise staffing readout and one coherent team break plan.","Chat now prioritises conversations over settings, uses a calmer familiar transcript and composer, keeps private conversations immediately accessible, and moves notification preferences into a secondary position without changing chat, push or realtime behaviour.","The signed-in app now shares neutral graphite and cool surfaces with restrained Apple-style blue interaction cues, removes the remaining teal accents, standardises typography, spacing, grouped rows, empty states, segmented controls and press feedback, and keeps glass limited to floating navigation and transient chrome.","Roster date controls now describe human context such as the current or past roster night, dark mode is treated as a primary night-shift environment, and the existing continuous swipe navigation, reduced-motion support and accessibility behaviour are preserved."]},
  {"version":"37.73","date":"29 September 2026","title":"Unify Night and the professional profile","changes":["Night now reads as one deliberate flow from selected date to personal assignment, team state, allocation and recent activity, reducing disconnected labels, separators and floating actions.","The personal assignment combines identity, role, colleague, duty time, break and the contextual night-situation action into one focused surface while preserving existing roster and swipe behaviour.","Team status and Team allocation are grouped into one compact disclosure area, with full-roster access placed inside the allocation context and a quieter recent-activity empty state.","The account profile now uses a professional identity-first layout with a larger editable photo, preferred name and professional title, clear private roster highlighting, and a distinct verified account identity section.","The Night and profile experiences use neutral graphite and cool surfaces with restrained blue interaction cues, while light, dark and automatic appearance, accessibility and all existing account actions remain intact."]},
  {"version":"37.72","date":"29 September 2026","title":"Refine Night with Apple-style clarity","changes":["Night now uses a graphite and cool-neutral visual system with restrained blue reserved for actions, selected navigation and meaningful status instead of the previous teal treatment.","The personal assignment is the clear focal point, with role, colleague, duty time and break organised through calmer system typography, spacing and progressive disclosure.","The redundant header appearance shortcut has been removed; Light, Automatic and Dark remain available in Account settings, while the existing swipe gestures and clinical roster behaviour stay unchanged."]},
  {"version":"37.71","date":"29 September 2026","title":"Night screen prototype","changes":["The broad 37.70 presentation treatment has been rolled back on Changes, Breaks, Chat, Account and the full roster, while the existing app stack and behavior remain intact.","Night now puts its selected date, personal role, working period, break and colleague ahead of a concise staffing state.","Team allocation is available on demand below the brief, with a calmer light and dark treatment and the existing navigation gestures."]},
  {"version":"37.70","date":"28 September 2026","title":"Read the night at a glance","changes":["The Night screen leads with a distinct assignment panel and a concise staffing brief instead of statistic tiles.","The full roster reads as a searchable ledger, with clearer role and exception details.","Navigation, Changes, Breaks, Chat, account and first-use surfaces share a quieter visual rhythm, with clinical content kept solid."]},
  {"version":"37.69","date":"28 September 2026","title":"Make team chat easier to reach","changes":["The team chat header takes less space while preserving the roster member context.","The message viewport remains scrollable and leaves more room for the composer on phones.","Chat delivery, privacy controls, and navigation gestures remain unchanged."]},
  {"version":"37.68","date":"28 September 2026","title":"Bring the break plan closer","changes":["Your break is easier to read without repeating the staffing count in the personal card.","The selected night uses a compact control while the shared summary carries the staffing count and Labour Ward state.","The break plan starts higher on phone screens without changing any break or allocation rule."]},
  {"version":"37.67","date":"28 September 2026","title":"Simplify account and release history","changes":["The profile editor uses a shorter introduction and a more compact photo and field layout.","Appearance, app help, and sign-in controls remain grouped with clearer spacing.","Version history distinguishes the current update from earlier releases without removing any entries."]},
  {"version":"37.66","date":"28 September 2026","title":"Bring Changes decisions into view","changes":["The selected night and staffing count now share a compact context card.","The Staffing, Allocation, and Confirm steps are easier to scan without taking over the phone screen.","The live state and decisions remain visible while the underlying workflow and roster rules stay the same."]},
  {"version":"37.65","date":"28 September 2026","title":"Clarify the Night allocation dashboard","changes":["The personal Night card gives the role and assignment details more room to scan.","On-duty time, break, and context now share a compact summary strip.","The team overview uses calmer labels and a simpler surface without changing roster calculations."]},
  {"version":"37.64","date":"28 September 2026","title":"Fix cramped roster and break summaries","changes":["Full-roster cards no longer squeeze into a nested desktop grid.","The automatic Labour Ward break status stays on one readable line in the phone summary.","These changes affect layout only; the selected night and break calculations remain the same."]},
  {"version":"37.63","date":"28 September 2026","title":"A clearer full-roster view","changes":["The full roster shows how many nights match the search and makes each night’s live plan easier to scan.","Search and staffing filters now use the shared light and dark controls, with clearer focus and touch targets.","The full-roster cards now use the correct responsive and dark-mode styles."]},
  {"version":"37.62","date":"28 September 2026","title":"Clearer app guidance and updates","changes":["Install and version-history dialogs now use the same clear surfaces and headings as the rest of the app.","Update details keep their separate Later and Update now choices in a more readable sheet.","Installation and version-history dialogs now identify their title and introduction to screen readers."]},
  {"version":"37.61","date":"28 September 2026","title":"A clearer way into Night Roster","changes":["On phones, the sign-in form appears sooner beneath a compact hospital and app introduction.","Onboarding now announces its step count and focuses each new page heading for keyboard and screen-reader navigation.","Sign-in fields and first-use screens use the shared light and dark presentation surfaces."]},
  {"version":"37.60","date":"28 September 2026","title":"Clearer roster management on phones","changes":["Roster management sections now have a scrollable navigation strip with larger touch targets and a clear selected state.","Account rows give long names and email addresses space on narrow phones, with the account action on its own line.","Administrator content uses the same calm surfaces and spacing as the rest of the redesigned app."]},
  {"version":"37.59","date":"28 September 2026","title":"Account and settings, clearly grouped","changes":["Account now groups personal details, appearance, app help and passkeys in a calmer sheet, with a centred dialog on larger screens.","The approved account identity is distinct from preferred profile details and the locally highlighted roster name.","Photo, profile and passkey controls have clearer spacing, touch targets and saving feedback.","Profile privacy, password access, shared roster identity and deliberate PWA update approval remain unchanged."]},
  {"version":"37.58","date":"28 September 2026","title":"Clearer Chat conversations","changes":["Private chats now show clearer unread counts, message previews and times in a more scannable list.","Message actions have a visible control as well as the existing long-press and keyboard actions, and recent messages sit closer to the composer.","The new-message sheet can search current roster members, with registration status shown plainly rather than fading people out.","On larger screens, an empty conversation has a clear starting point instead of an inactive composer.","Chat delivery, privacy, notification preferences, roster calculations and deliberate PWA update approval remain unchanged."]},
  {"version":"37.57","date":"27 September 2026","title":"Clearer Chat connection notices","changes":["Chat connection and service notices now have clear error or update labels beside the conversation.","The existing live text remains visible if the optional presentation component cannot load.","Message delivery, unread state, notification preferences and deliberate PWA update approval remain unchanged."]},
  {"version":"37.56","date":"27 September 2026","title":"Clearer Changes save feedback","changes":["Saving and successful sharing have clear status labels in the Confirm step.","Offline guidance, conflicts and errors remain visible next to the confirmation action with explicit next steps.","The plain live message remains available if the optional presentation component cannot load.","Existing validation, shared writes, retry and deliberate PWA update approval remain unchanged."]},
  {"version":"37.55","date":"27 September 2026","title":"Clearer confirmation review","changes":["The Confirm step shows changed assignments in grouped rows, with the complete plan available when you expand it.","An unresolved allocation is clearly flagged before confirmation, and a reason remains visible alongside the changes.","The Changes heading and step guide now scroll away so they do not cover the confirmation review.","The previous preview remains available if the optional presentation component cannot load.","Staffing and allocation validation, shared confirmation, roster calculations and deliberate PWA update approval remain unchanged."]},
  {"version":"37.54","date":"27 September 2026","title":"Guided Changes workflow","changes":["A guided Staffing, Allocation and Confirm control shows the current step, pending decisions and what to do next.","Staffing records and selected-night allocation choices use simpler grouped rows and larger controls on phones.","The original step controls remain available if the optional presentation component cannot load.","Existing staffing validation, allocation rules, confirmation, shared data and explicit update approval remain unchanged."]},
  {"version":"37.53","date":"27 September 2026","title":"Personal-first interface foundation","changes":["Your allocation now leads the Night screen, followed by the selected night, staffing summary, live team and recent activity.","Breaks shows a personal first or second break summary above the full team plan, while pending allocations remain clearly provisional.","Night, Changes, Breaks, Chat, Account, authentication, dialogs and update surfaces share calmer spacing, solid information surfaces and restrained glass for navigation.","The presentation styles now have one ordered source instead of seven separate cascading override files, with existing React view models and roster actions preserved.","The current release dialog is titled What’s new, with the complete version history still available from Account.","The roster rotation, staffing and allocation rules, Supabase access, push and chat delivery, and explicit PWA update approval flow remain unchanged."]},
  {"version":"37.52","date":"27 September 2026","title":"React interface system","changes":["A reusable React interface system now provides consistent pressable controls, grouped lists, adaptive surfaces, glass surfaces, avatars, badges, empty states, fields and loading primitives across the app.","Motion now powers shared-layout selection in the Appearance control and consistent spring press feedback instead of each screen implementing interaction feedback separately.","Tailwind container queries let profile fields and break-plan layouts adapt to the space available to each component rather than relying only on whole-screen breakpoints.","Chat private conversations and member selection now use a cleaner grouped-list hierarchy, while the message composer is a single floating Liquid Glass capsule with preserved keyboard, character-count and send behaviour.","Changes records, allocation rows, history and staffing forms now use the shared React component system while preserving the existing workflow, identifiers and staffing logic.","Night and Breaks now use the shared Motion pressable and surface primitives for more consistent touch feedback without changing roster calculations or clinical rules.","Tailwind dark-mode utilities are now tied to Night Roster’s own Light, Automatic and Dark setting so React components follow the selected in-app appearance reliably.","Authentication, Supabase data, roster calculations, staffing safety rules, Chat delivery, notifications and the installed PWA identity are unchanged."]},
  {"version":"37.51","date":"27 September 2026","title":"Night interface refined","changes":["Your Night is now a dedicated assignment hero with a clearer identity row, role treatment, compact facts and a lighter contextual action.","Night Summary is one integrated four-part information rail instead of a two-by-two dashboard card grid.","Night Situation now uses compact grouped roster rows with semantic role accents instead of oversized grey cards.","Five-nurse mode now sits in the same visual hierarchy as the rest of Night rather than appearing as a separate heavy card.","Recent Activity is presented as a cleaner grouped timeline with lighter metadata and less visual boxing.","The floating bottom navigation is slimmer and more translucent, with a clearer moving Liquid Glass selection lens.","Night header spacing and controls are more compact while preserving 44-pixel touch targets, safe areas and dark-mode readability.","Roster calculations, staffing rules, authentication, Supabase data, Chat and notifications are unchanged."]},
  {"version":"37.50","date":"27 September 2026","title":"Liquid Glass mobile experience","changes":["A new Liquid Glass application shell gives navigation and key controls a floating, translucent material layer while keeping clinical roster content solid and readable.","Night, Changes, Breaks and Chat now share one persistent bottom navigation bar with a moving selection lens and physically connected page transitions.","Horizontal navigation follows the finger directly, uses distance and velocity when settling, preserves page scroll positions and more reliably distinguishes horizontal swipes from vertical scrolling.","Night presents staffing status and personal allocation with a clearer hierarchy, fewer nested cards and more compact native-style roster rows.","Changes uses a more cohesive date and staffing context, a moving workflow selector and calmer grouped forms for staffing and allocation tasks.","Breaks uses the same date language and a cleaner scan-first presentation for first break, second break and Labour Ward or Pager duties.","Chat now gives conversations greater visual priority while notification preferences and secondary settings are quieter and more structured.","Header controls, sheets, dark mode, safe-area handling, reduced-motion behaviour and touch targets have been refined for installed mobile use.","Motion and gesture work is concentrated on transform-based interactions so the interface feels more responsive without changing authentication, Supabase data or roster calculations."]},
  {"version":"37.49","date":"26 September 2026","title":"Compact roster layout restored","changes":["Night, Changes and Breaks no longer render a second nested card layer inside the existing clinical surfaces.","Personal assignment, staffing records, allocation rows, break groups and recent activity use the established compact mobile layout again.","The React migration remains in place, while the existing Apple-style spacing and clinical hierarchy once again control presentation.","Roster calculations, Supabase data, authentication, Chat, notifications and clinical decision rules remain unchanged."]},
  {"version":"37.48","date":"26 September 2026","title":"Roster startup restored","changes":["Roster startup no longer waits for a React-owned staffing field before the Changes component has mounted.","The same repair restores the read-only saved-roster path when the shared connection is unavailable.","A startup regression check now covers the delayed Changes component mount.","Roster calculations, staffing workflows, Supabase data, authentication, Chat and clinical decision rules remain unchanged."]},
  {"version":"37.47","date":"26 September 2026","title":"React-powered version history","changes":["The App Updated panel and complete Version History are now an isolated React and TypeScript component loaded only when release notes are requested.","The existing version archive, Latest and Previous updates navigation, light and dark styling, accessibility labels and reduced-motion behaviour are preserved.","If the optional component cannot load, the complete escaped HTML release history remains available instead of leaving an empty dialog.","Roster calculations, staffing workflows, Supabase data, authentication, Chat, swipe navigation and the installed PWA identity remain unchanged."]},
  {version:'37.46',date:'25 Sep 2026',title:'Reliable swiping over Chat messages',changes:['Horizontal navigation can now begin directly on a Chat message as well as on blank transcript space. Message rows remain keyboard-focusable and keep their long-press actions, but focusability no longer makes the whole message a forbidden swipe-start area.','This fixes the specific missed gestures visible in the touch recording, where the finger travelled horizontally across message text while the Chat page stayed still, then worked when the same gesture started from nearby blank space.','Buttons, links, inputs, text areas, editable fields and other explicit controls remain protected from accidental navigation, and vertical scrolling is unchanged.','The viewport-pinned page track, roster logic, Supabase data, authentication, staffing rules and clinical workflows are unchanged.']},
  {version:'37.45',date:'25 Sep 2026',title:'More reliable swipe starts',changes:['Horizontal page swipes now start from normal empty space inside status rows, workflow strips, date controls and Chat list containers instead of treating those whole regions as blocked. Actual buttons, links, inputs, text areas and other interactive controls remain protected from accidental navigation.','The gesture direction lock now tolerates the small diagonal wobble that commonly happens at the start of a thumb swipe, while clearly vertical movement still hands control back to normal page scrolling.','A swipe can therefore begin from far more of the visible page without having to repeat the gesture or move the finger to a different vertical position.','The viewport-pinned page track, roster logic, Supabase data, authentication, staffing rules and clinical workflows are unchanged.']},
  {version:'37.44',date:'25 Sep 2026',title:'Stable native page swiping',changes:['Each primary screen now owns its complete top chrome while it moves, so the Night header travels with the Night page instead of appearing or disappearing after the horizontal transition.','Incoming screens are staged at their own saved vertical scroll position, preventing the blank-screen jump seen when moving between tabs that were previously scrolled to different heights.','Primary view geometry now includes the full screen gutters and uses one anchored horizontal track, keeping pages attached edge-to-edge while dragging, reversing direction or settling.','Roster calculations, Supabase data, authentication, staffing rules and clinical workflows are unchanged.']},
  {version:'37.43',date:'25 Sep 2026',title:'Solid continuous page flow',changes:['Night, Changes, Breaks and Chat now move as solid full-size pages on one horizontal track, so adjacent screens meet edge-to-edge instead of fading or scaling through each other.','The transparency and scale morph from 37.42 has been removed because it could make two screens visually overlap during a swipe. Both the outgoing and incoming page remain fully opaque throughout the transition.','Swipe settling, bottom-tab taps and long bottom-bar drags now use the same 260 ms horizontal easing, with the tab selector synchronised to the page movement.','Vertical scrolling, protected controls, Chat interactions, reduced-motion behaviour, roster calculations, Supabase data and authentication are unchanged.']},
  {version:'37.42',date:'25 Sep 2026',title:'Fluid screen transitions',changes:['Night, Changes, Breaks and Chat now hand off as one continuous slide instead of snapping when the destination becomes active.','The outgoing screen subtly scales and fades while the incoming screen settles into place, creating a restrained morph effect that stays tied to the direction of travel.','Tapping a bottom tab and releasing a long bottom-bar drag now use the same screen transition as direct page swipes, while the selected tab indicator moves in sync.','Reduced-motion users still receive an immediate, non-animated view change. Roster calculations, Supabase data, authentication and staffing rules are unchanged.']},
  {version:'37.41',date:'25 Sep 2026',title:'Smoother continuous swiping',changes:['The bottom tab selector now follows one continuous drag across the entire bar, so a single gesture can move from Night through Changes and Breaks all the way to Chat before settling on the nearest tab.','Screen swipes now lock onto the direction once the gesture is clearly horizontal, so small diagonal finger movement no longer cancels a swipe halfway through. The page and bottom selector stay synchronised through the drag.','Horizontal navigation is now available from Chat as well as Night, Changes and Breaks when the gesture begins on safe noninteractive space. Message areas, composers, buttons, forms, workflow controls, dialogs and screen-edge gestures keep their own interactions.','The bottom bar uses a more stable opaque glass layer so content underneath does not read as a second or broken bar. Roster calculations, Supabase data, authentication and the safe PWA update flow are unchanged.']},
  {version:'37.40',date:'25 Sep 2026',title:'Pages that move with your swipe',changes:['The main Night, Changes and Breaks pages now move under your finger during a horizontal drag, with the adjacent page entering from the side you are moving toward.','Page gestures now use natural direct-manipulation direction: drag the page left to advance to the tab on the right, or drag it right to return to the tab on the left. The bottom tab slider keeps its existing direct behavior.','Short page drags settle back into place. Vertical scrolling, forms, workflow controls, dialogs, Chat conversations and screen-edge gestures keep their existing interactions, and reduced-motion settings avoid animated settling.','The verified roster, Supabase data, authentication and safe PWA update flow are unchanged.']},
  {version:'37.39',date:'25 Sep 2026',title:'A tab slider that follows your finger',changes:['The selected highlight in the bottom bar now tracks a horizontal drag across the bar or a noninteractive part of Night, Changes and Breaks, then settles on the chosen tab. Short drags return to the current tab.','Directions match the visible slider: swipe right to the tab on the right, or left to the tab on the left. From Night, swipe right for Changes; from Changes, swipe left for Night.','Vertical scrolling, forms, workflow buttons, dialogs, Chat conversations and screen-edge gestures retain their existing behavior. Reduced-motion settings show the destination without an animated spring; tabs still work by tap and keyboard.','The verified roster, Supabase data and the safe PWA update flow are unchanged.']},
  {version:'37.38',date:'25 Sep 2026',title:'Swipe between screens',changes:['Horizontal swipes now work across the noninteractive content of Night, Changes and Breaks as well as the bottom tab bar, moving one tab at a time.','The gesture uses real touch events so the browser does not cancel it during a swipe. Vertical scrolling, form controls, dialogs, selected text and Chat conversations keep their own interactions; the tabs remain available for every destination.','This corrects the tab-bar swipe introduced in 37.36 that did not respond to normal phone gestures. The roster engine, staffing rules, Chat, shared data and safe update flow remain unchanged.']},
  {version:'37.37',date:'25 Sep 2026',title:'Clearer screen guidance',changes:['The Staffing and Breaks information sheets now render their guidance in a small React and TypeScript component when opened, with Tailwind CSS v4 utilities scoped to that content.','Motion gives the help items a brief reveal in standard mode and shows them immediately when reduced motion is preferred. The existing native dialog, close control and light and dark styles remain in place.','Breaks guidance now describes a provisional plan accurately instead of referring to retired copy and email actions.','If the optional component cannot load, the escaped HTML guidance stays available. The help chunk is included in the PWA shell for offline use, while staffing decisions, Chat, Supabase and updates continue through their existing paths.']},
  {version:'37.36',date:'25 Sep 2026',title:'Responsive React navigation',changes:['The signed-in tab bar is now a reusable React and TypeScript component, loaded after access is authorised. Night, Changes, Breaks and Chat keep their familiar positions, live badges and keyboard controls.','A short horizontal touch swipe across the tab bar moves to the adjacent destination. Taps use restrained Motion feedback that follows the device’s reduced-motion setting.','The existing HTML navigation stays usable if the extra component cannot load. Tailwind CSS v4 utilities remain scoped without resetting clinical styles; light and dark chrome, Supabase access, roster decisions, Chat and safe PWA updates continue as before.','The new component and its separate build asset give the app a tested path for moving stable interface regions incrementally. Clinical screens and their data still run through the existing roster engine.']},
  {version:'37.35',date:'25 Sep 2026',title:'What the new app foundation makes possible',changes:['Now in place: Vite builds the same installable Night Roster PWA from pinned React, TypeScript, Tailwind CSS v4 and Motion for React dependencies. The launch motto is the first small React region; Night, Changes, Breaks and Chat still use their existing working code.','Now in place: TypeScript checks the new frontend code during every build. Tailwind utilities are available with a prefix and without a global reset, so future interface work can share responsive styles without changing the current clinical screens.','Now in place: Motion powers a restrained launch reveal that respects reduced-motion settings. The custom service worker also caches the new build assets while retaining the same app identity, push notifications, offline shell and choice to install updates.','Possible next: migrate one stable screen at a time into reusable React components, improve consistent mobile and desktop layouts and light and dark themes, and load larger sections only when needed. These screens have not yet been migrated.','Possible next: add carefully tested touch gestures, smoother sheets and purposeful spring transitions using Motion, with reduced-motion alternatives. These interactions are not included in this release, and a 120 Hz frame rate cannot be guaranteed on every device.','The 138-night rotation, staffing safety rules, Supabase authentication and data, chat, Realtime and notification permissions remain unchanged. The app continues to be installed and updated from the same web address without an app store.']},
  {version:'37.34',date:'24 Sep 2026',title:'Launch style cleanup',changes:['Removed duplicated style rules and the superseded CSS animation for the React-owned launch motto.','The launch motto remains visible if the optional React module has not loaded, while reduced-motion behavior and the existing roster and notification flows remain intact.']},
  {version:'37.33',date:'24 Sep 2026',title:'Application shell foundation',changes:['The existing PWA now ships from a pinned production build while keeping the same installed identity, roster engine, sign-in, chat, notifications and shared backend.','The static launch motto is the first small React region; its gentle reveal respects reduced-motion settings.','The custom service worker includes new fingerprinted build assets while preserving the update choice, push delivery and offline shell rules.']},
  {version:'37.32',date:'24 Sep 2026',title:'Premium PWA experience',changes:['The operating-system splash now hands off to the exact Night Roster app icon on the same first-paint background, so the static startup frame appears to come alive instead of jumping into a second unrelated loader.','Installation guidance now adapts to iPhone, iPad, Android and already-installed mode, with Home Screen installation presented as a one-time step and future releases handled by the PWA update system.','Installed-app badges now reflect unread Chat and administrator attention where the platform supports the Badging API, while background notifications can show a generic badge until the exact count is refreshed.','Night and Chat are available as app shortcuts on supporting platforms, notification deep links remain routed to the exact conversation, roster night or administrator access screen, and standalone mode hides browser-only install actions.','Minor releases can use quiet automatic-on-reopen updates while important releases retain the full review-and-update sheet; safe areas, keyboard handling, first-paint theme and touch chrome have been refined without changing roster or Supabase behaviour.']},
  {version:'37.31',date:'24 Sep 2026',title:'Cinematic launch and refined onboarding',changes:['Cold launch now uses a staged cinematic reveal that follows the real roster-loading state instead of adding a fake loading delay, then hands off smoothly into the signed-in app or sign-in screen.','First-use onboarding now uses calmer directional transitions, richer visual hierarchy and a dedicated current Chat page covering Team chat, private messages, @mentions, replies, privacy-safe notifications and 14-day retention.','Existing users receive the refreshed Chat introduction once, while replaying the guide from Account still shows the complete onboarding journey.','Normal tab switching no longer animates the whole view, keeping Night, Changes, Breaks and Chat stable while motion is reserved for launch, onboarding, sheets and touch feedback.','Buttons, inputs, grouped surfaces, dark mode and persistent navigation receive a restrained native-style polish with full reduced-motion fallbacks.']},
  {version:'37.30',date:'24 Sep 2026',title:'Reliable chat sends and clearer night wording',changes:['Team and private chat sends no longer fail because reply validation recursively re-enters the chat message policy. Successfully saved messages stay sent even if read-state or push-notification housekeeping has a separate problem.','Your night now says Tonight, Current night, Next night or Selected night according to the date actually being viewed, so a future roster night is no longer described as tonight.','Changes, allocation, break guidance and night-only role wording now refer to the selected night instead of assuming the selected date is today.','The verified roster rotation, staffing rules, breaks, chat privacy, 14-day retention and notification preferences remain unchanged.']},
  {version:'37.29',date:'24 Sep 2026',title:'Operational alerts and focused chat',changes:['Roster changes can now send optional privacy-safe notifications that open the affected night directly.','Administrators get a compact attention badge for access requests, selected-night actions and roster publication, plus a privacy-safe alert when someone requests access.','Anaesthetic Team now supports @mentions with targeted alerts, while Team and private chats can reply to a specific message with a compact quote.','Chat messages are retained for 14 days and then removed automatically by the server.','A lightweight real-browser smoke suite now checks mobile navigation and dark mode alongside the existing regression tests.']},
  {version:'37.28',date:'24 Sep 2026',title:'Cleaner Night and Admin controls',changes:['Night and Breaks now focus on the live roster information itself, with the repeated copy-briefing, copy-breaks and email-roster controls removed.','Roster management keeps the useful Publish, Team, Access and Data sections, while Overview no longer repeats those same destinations as a second row of shortcut buttons.','Unused frontend code that existed only for the removed copy and email actions has been retired; roster calculations, staffing changes, breaks, chat, notifications and Supabase data remain unchanged.']},
  {version:'37.27',date:'24 Sep 2026',title:'Lean maintenance cleanup',changes:['The installed app now reuses the same reviewed icons for standard and maskable purposes instead of shipping duplicate image files, reducing unnecessary app-shell data without changing appearance.','Outdated repository audit snapshots and superseded setup records were removed from the current source tree while remaining available in Git history.','Roster calculations, staffing changes, breaks, Team Chat, notifications, authentication, Supabase data and the complete in-app version history are unchanged.']},
  {version:'37.26',date:'24 Sep 2026',title:'A more complete Team Chat',changes:['Chat now separates days and unread messages clearly, keeps your reading position when new messages arrive and offers a New message shortcut instead of pulling you to the bottom.','Messages that fail to send stay visible with Retry, while message actions let you copy text and delete your own recently sent message without adding editing, reactions or other social features.','Notification controls now show device status, explain blocked permissions, let you mute Anaesthetic Team for one hour, for tonight or until you turn it back on, and let you remove old notification devices.','Private-chat availability updates live as roster members register, notification taps open the relevant conversation, and Chat uses a compact overview request so roster startup remains independent.','Onboarding is shorter, and administrators get privacy-safe health information for roster sync, chat registration and notification delivery without seeing private messages or notification endpoints.']},
  {version:'37.25',date:'24 Sep 2026',title:'Team chat & notifications',changes:['Anaesthetic Team provides one shared group chat for roster discussion, with private one-to-one conversations between registered roster members.','Optional message notifications can alert you to new group or private messages when Night Roster is closed or in the background.','Notification previews protect chat privacy by showing that a new message arrived without displaying the message text on the lock screen.','Chat remains separate from roster changes: any agreed swap or change must still be entered through the existing roster functions.']},
  {version:'37.24',date:'24 Sep 2026',title:'Team chat & notifications',changes:['Anaesthetic Team provides one shared group chat for roster discussion, with private one-to-one conversations between registered roster members.','Optional message notifications can alert you to new group or private messages when Night Roster is closed or in the background.','Notification previews protect chat privacy by showing that a new message arrived without displaying the message text on the lock screen.','Chat remains separate from roster changes: any agreed swap or change must still be entered through the existing roster functions.']},
  {version:'37.23',date:'24 Sep 2026',title:'Team chat',changes:['Anaesthetic Team adds one permanent group conversation for active authorised roster users, plus private one-to-one chats between registered members.','Chat messages are plain text only and never alter the roster; agreed swaps still have to be entered separately through the existing roster functions.','Private conversations and sender identity are protected by Supabase Row Level Security, while the chat directory exposes names only and never email addresses.','Chat loads recent messages only when opened, paginates older messages and uses its own Realtime channel so Night, Changes and Breaks remain independent.']},
  {version:'37.22',date:'24 Sep 2026',title:'Team chat',changes:['Anaesthetic Team adds one permanent group conversation for active authorised roster users, plus private one-to-one chats between registered members.','Chat messages are plain text only and never alter the roster; agreed swaps still have to be entered separately through the existing roster functions.','Private conversations and sender identity are protected by Supabase Row Level Security, while the chat directory exposes names only and never email addresses.','Chat loads recent messages only when opened, paginates older messages and uses its own Realtime channel so Night, Changes and Breaks remain independent.']},
  {version:'37.21',date:'24 Sep 2026',title:'Team chat',changes:['Anaesthetic Team adds one permanent group conversation for active authorised roster users, plus private one-to-one chats between registered members.','Chat messages are plain text only and never alter the roster; agreed swaps still have to be entered separately through the existing roster functions.','Private conversations and sender identity are protected by Supabase Row Level Security, while the chat directory exposes names only and never email addresses.','Chat loads recent messages only when opened, paginates older messages and uses its own Realtime channel so Night, Changes and Breaks remain independent.']},
  {version:'37.20',date:'24 Sep 2026',title:'Team chat',changes:['Anaesthetic Team adds one permanent group conversation for active authorised roster users, plus private one-to-one chats between registered members.','Chat messages are plain text only and never alter the roster; agreed swaps still have to be entered separately through the existing roster functions.','Private conversations and sender identity are protected by Supabase Row Level Security, while the chat directory exposes names only and never email addresses.','Chat loads recent messages only when opened, paginates older messages and uses its own Realtime channel so Night, Changes and Breaks remain independent.']},
  {version:'37.19',date:'24 Sep 2026',title:'Team chat',changes:['Anaesthetic Team adds one permanent group conversation for active authorised roster users, plus private one-to-one chats between registered members.','Chat messages are plain text only and never alter the roster; agreed swaps still have to be entered separately through the existing roster functions.','Private conversations and sender identity are protected by Supabase Row Level Security, while the chat directory exposes names only and never email addresses.','Chat loads recent messages only when opened, paginates older messages and uses its own Realtime channel so Night, Changes and Breaks remain independent.']},
  {version:'37.18',date:'24 Sep 2026',title:'A cleaner sign-in screen',changes:['Night Roster keeps the two simple sign-in routes: approved work email and Google.','The Google action is now centred and presented as one clear Apple-style secondary sign-in choice rather than part of a multi-provider grid.','Microsoft and Apple sign-in remain intentionally absent, so there are no unused or paid-provider options on the login screen.','Authentication rules, access requests, roster permissions and shared data are unchanged.']},
  {version:'37.17',date:'24 Sep 2026',title:'Request access with Google',changes:['Existing approved members continue to sign in normally.','A new Google user who is not yet approved now creates a pending access request without seeing roster data.','Roster administrators can approve or reject pending requests from Authorised accounts.','Approved requests become normal member accounts; administrator access is never granted automatically.']},
  {version:'37.16',date:'24 Sep 2026',title:'Sign in with Google',changes:['Approved roster members can now choose Google sign-in from the Night Roster login screen.','Google returns to the existing Night Roster URL after authentication, then the same approved-email check runs before roster data opens.','Only Google is shown for social sign-in at this stage, so no unconfigured provider is presented to users.','Email and password, password reset, passkeys, roster calculations, staffing, allocations, Pager, Reliever and database permissions remain unchanged.']},

  {version:'37.15',date:'23 Sep 2026',title:'Private device data leaves with you',changes:['Signing out, losing approved access or reaching an invalid session now removes the saved offline roster, cached account email and recently entered staff names from that device.','Authentication and database errors now use safe, useful messages without exposing internal provider or database details, and copied diagnostics no longer include the account email address.','The pinned Supabase browser library is protected by a verified integrity hash, while automated checks guard against secret credentials entering deployed files.','A reviewable database migration removes unused anonymous public-schema privileges without relaxing RLS or changing any authenticated roster permission.','The verified rotation, staffing, allocations, Pager, Reliever, installed-PWA identity and interface remain unchanged.']},
  {version:'37.14',date:'21 Sep 2026',title:'Sign out only on this device',changes:['Signing out now closes only the current browser or installed app session instead of revoking saved sessions on every device.','Realtime and background refresh work are still stopped before the local session is cleared.','Authentication, roster calculations, staffing, allocations, Pager, Reliever, the interface, service-worker update behaviour and database rules remain unchanged.']},
  {version:'37.13',date:'20 Sep 2026',title:'Smaller download, same roster',changes:['The installed app icons and Mater Dei logo use lossless recompression, preserving every decoded pixel and the existing colour profile while reducing their combined transfer size.','Confirmed obsolete styling left behind by the earlier personal-summary and workflow replacements has been removed without changing current selectors or layout.','Authentication, Supabase requests, service-worker update behaviour, the interface, verified rotation and every staffing or allocation rule remain unchanged.']},
  {version:'37.12',date:'19 Sep 2026',title:'One clean route into the roster',changes:['A restored sign-in now starts exactly one shared-roster authorisation path instead of allowing the session listener and startup check to request it twice.','Expired saved sessions are renewed once before the protected roster request is retried, without falling into repeated compatibility reads.','The loaded roster becomes interactive before optional private profile and photo details finish loading, while onboarding still waits for those details.','No interface, roster calculation, staffing, allocation, Pager, Reliever, realtime, privacy or database rule has changed.']},
  {version:'37.11',date:'19 Sep 2026',title:'Seven-nurse role changes now save',changes:['Custom seven-nurse arrangements now pass the atomic database structure check when all seven roles and the required mode are supplied.','An overtime nurse such as Daniel Santucci can be moved into any agreed role, including Reliever or Seventh nurse, while every working nurse remains assigned exactly once.','The verified rotation, seventh-nurse decision workflow, Pager and Reliever rules, staffing calculations and permanent roster remain unchanged.']},
  {version:'37.10',date:'19 Sep 2026',title:'Seven nurses can be arranged for one night',changes:['The night-only role editor now includes a Seventh nurse role whenever seven effective nurses are working, including named overtime staff such as Daniel Santucci.','The new arrangement remains explicitly night-only, requires every effective nurse exactly once, and keeps the permanent rotation and automatic allocation rules unchanged.','The database upgrade is forward-only and validates seven-role assignments atomically before saving them.']},
  {version:'37.9',date:'19 Sep 2026',title:'The roster now finishes opening',changes:['The live browser test found that the shared roster was loading successfully, but the Changes allocation control stopped rendering because its staffing plan was not defined.','The allocation control now derives the selected night’s plan before deciding whether confirmation choices should appear, so Night, Changes and Breaks finish opening after sign-in and on restored sessions.','A deterministic seven-nurse render check now covers the exact state that exposed the failure.','No roster calculation, staffing, allocation, Pager, Reliever, five-nurse, realtime, privacy, database schema or write rule has changed.']},
  {version:'37.8',date:'19 Sep 2026',title:'A clean Android route into the live roster',changes:['Installed Android apps now open the existing protected schema-37 snapshot through a bounded XMLHttpRequest instead of the fetch path that could remain pending after an app update.','The Android request has its own hard deadline and Retry always begins a fresh transport request.','The opening screen no longer presents recovery controls while a normal startup request is still in progress.','No roster calculation, staffing, allocation, Pager, Reliever, five-nurse, realtime, privacy, database schema or write rule has changed.']},
  {version:'37.7',date:'19 Sep 2026',title:'A second independent route into the roster',changes:['Android now opens through sequential authorised roster reads, avoiding the one-request startup transport that remains pending on the affected Samsung browser.','Every compatibility read has an application-level deadline, while other devices retain the protected snapshot with the same independent deadline and automatic fallback.','Try again can no longer wait forever for an abandoned startup promise, and the opening message identifies when the compatibility route is being used.','No roster calculation, staffing, allocation, Pager, Reliever, five-nurse, realtime, privacy, database schema or write rule has changed.']},
  {version:'37.6',date:'18 Sep 2026',title:'Startup requests that reach the roster reliably',changes:['The opening snapshot now uses a bounded authenticated web request instead of the client wrapper that failed to dispatch on the affected Samsung browser.','The request still calls the same protected schema-37 function, preserving account access, privacy and one internally consistent roster snapshot.','Saved-roster recovery now has an executable regression check as well as its existing read-only safeguards.','No roster calculation, staffing, allocation, Pager, Reliever, five-nurse, realtime, privacy or write rule has changed.']},
  {version:'37.5',date:'18 Sep 2026',title:'One dependable connection opens the roster',changes:['The authorised account check, staffing, allocations and essential app settings now arrive as one protected database snapshot instead of several consecutive requests.','The opening screen no longer declares a connection problem while a normal slow database response is still in progress.','The saved-roster fallback remains read-only and available if the single shared request genuinely fails.','No roster calculation, allocation, Pager, Reliever, five-nurse, realtime, privacy or write rule has changed.']},
  {version:'37.4',date:'18 Sep 2026',title:'The shared roster opens in dependable stages',changes:['Startup now loads essential staffing first, then tonight’s allocation state, instead of making eleven database reads compete as one all-or-nothing request.','Settings, schema diagnostics and the realtime revision marker load quietly after the clinical roster is already visible.','Try again waits for an active request to finish before starting a genuinely fresh attempt, preventing overlapping startup requests.','The verified rotation, staffing, allocation, Pager, Reliever, five-nurse, realtime, privacy and database rules remain unchanged.']},
  {version:'37.3',date:'18 Sep 2026',title:'Reliable roster opening and recovery',changes:['The essential shared roster now has enough time to recover from a slow or cold database connection instead of being stopped just as it begins responding.','Recent activity history loads after the core roster opens, so a delayed history request can never block Night, Changes or Breaks.','Try again now shows clear progress, while the read-only saved-roster option safely repairs older or partial saved data before opening it.','The verified rotation, staffing, allocation, Pager, Reliever, realtime, privacy and database rules remain unchanged.']},
  {version:'37.2',date:'18 Sep 2026',title:'A reliable way out of a stalled connection',changes:['Startup checks now have clear time limits, so a delayed account or roster response cannot leave the opening screen indefinitely.','A calm Retry action lets the signed-in nurse try the shared connection again without losing the session.','When a saved snapshot is available, Use saved roster opens the last known roster as an explicitly read-only view until the shared connection returns.','Profile and administrator extras no longer block the core roster from opening, while the verified rotation, staffing, allocation, realtime and privacy rules remain unchanged.','The recovery state keeps the same Apple-style typography, spacing, contrast and reduced-motion behaviour as the rest of the launch experience.']},
  {version:'37.1',date:'15 Sep 2026',title:'A calmer, safer way to update',changes:['A quiet update notice now offers Details, Later and Update without opening a sheet or reloading while someone is working.','Update details show the incoming version, release date and exact changes before installation whenever fresh release information is available.','The update sheet confirms that shared roster data stays intact and keeps one clear Update now action with a reversible Later choice.','Future release information is checked network-first with a safe cached fallback, while activation still waits for explicit approval and reloads only once.','The notice and sheet use restrained Apple-style motion, high-contrast light and dark materials, 44-point touch targets and reduced-motion fallbacks.','The verified rotation and all staffing, allocation, Pager, Reliever, realtime, offline and privacy behaviour remain unchanged.']},
  {version:'37.0',date:'15 Sep 2026',title:'Your night, made immediately useful',changes:['Your night now leads with a clear personal assignment, role-specific icon and the exact position or Labour Ward part.','Working time, break and the relevant colleague or coverage context are separated into readable facts instead of being compressed into one line.','A Changed tonight marker appears only when the selected nurse’s own calculated assignment or Labour Ward order has changed for that night.','One contextual action opens the matching team allocation, absence review or private name choice without adding another bottom tab or repeating the full roster.','The card remains a solid high-contrast clinical surface in light and dark mode, with large touch targets and restrained motion.','The verified rotation and all staffing, Pager, Reliever, five-nurse, allocation, realtime, offline and privacy behaviour remain unchanged.']},
  {version:'36.9',date:'15 Sep 2026',title:'A consistent appearance and focused confirmation',changes:['Confirm now presents only roles that changed, with previous and new assignments shown clearly and the recorded reason kept alongside the review.','The complete plan remains available in a quiet View full plan disclosure without competing with the changed items.','Light, Automatic and Dark appearance choices now use one validated root state before the first paint, update the browser chrome and reapply after the app resumes.','Forms, cards, dialogs and navigation now draw from one final semantic surface layer, preventing isolated light cards or mismatched dark materials.','The verified rotation and all staffing, Pager, Reliever, five-nurse, allocation, realtime, offline and privacy behaviour remain unchanged.']},
  {version:'36.8',date:'15 Sep 2026',title:'Less repetition and a leaner interface',changes:['Confirm now stays quiet when nothing needs reviewing, instead of repeating the complete calculated roster.','Pager and Reliever appear once with their Labour Ward part and break shown beneath, removing duplicate first-part and second-part rows from confirmation and full-roster cards.','Unused legacy Labour Ward editor helpers and styling were removed after confirming they were no longer connected to the interface.','Every repository file was checked; production assets, forward-only migrations, tests, security guidance and deployment documentation remain because they are still required.','The verified rotation and all staffing, Pager, Reliever, five-nurse, allocation, realtime, offline and privacy behaviour remain unchanged.']},
  {version:'36.7',date:'14 Sep 2026',title:'Calm native motion and clearer Apple-style controls',changes:['Night, Changes and Breaks now use restrained directional navigation, compacting scroll headers, native press feedback and complete reduced-motion fallbacks.','Buttons, saved states, errors and operational status colours now follow one consistent semantic hierarchy with stronger light and dark mode contrast.','Recent activity is now an interactive grouped list, and each entry opens a private detail sheet showing its night, reason or allocation detail, actor and recorded time.','Typography scales more naturally across phone and desktop sizes, dense clinical cards remain solid, and translucency remains limited to navigation, headers, sheets and temporary feedback.','The verified rotation and all staffing, Pager, Reliever, five-nurse, allocation, realtime, offline and privacy behaviour remain unchanged.']},
  {version:'36.6',date:'14 Sep 2026',title:'Clearer spacing and complete recent activity',changes:['The selected date and staffing summary now have deliberate breathing room instead of appearing as one joined surface.','Night, Changes and Breaks sit in three clearly separated bottom-tab targets while retaining the restrained floating Apple-style navigation material.','Recent activity now includes the saved reason or allocation detail beneath each change, matching the useful context already available in the full Changes activity history.','Clinical cards remain solid and readable, while the verified roster and all staffing, allocation, realtime and privacy behaviour remain unchanged.']},
  {version:'36.5',date:'14 Sep 2026',title:'Five-nurse night changes now save fully',changes:['The database now accepts the reviewed custom five-nurse structure as well as the established six-role structure.','An agreed five-nurse arrangement can save an overtime nurse on full-night Labour Ward / Pager while the other four working nurses cover theatre.','The database still rejects missing roles, extra roles, blank names and duplicate nurses, while the atomic save continues to verify the exact team working that night.','Normal Reliever-first allocation, the verified permanent rotation, later nights and all existing staffing safeguards remain unchanged.']},
  {version:'36.4',date:'14 Sep 2026',title:'Custom five-nurse roles that save reliably',changes:['An agreed five-nurse night can now be rearranged using exactly the five nurses working, including overtime staff, with one combined full-night Labour Ward / Pager role and four theatre roles.','The normal Reliever-first five-nurse workflow remains the default; the custom editor is an explicit night-only alternative and never changes the permanent rotation.','Night-only role saves now use a schema-35 atomic operation that validates the effective team, prevents duplicate assignments, records actor and time history, and fixes the unsupported JSON object-length database call.','Older installed clients are routed through the corrected atomic validation, while realtime refresh, incomplete-plan protection and all established Pager and Reliever rules remain in place.']},
  {version:'36.3',date:'14 Sep 2026',title:'Clearer dark mode and perfectly round header controls',changes:['Header settings, account and appearance controls now keep a fixed circular shape on narrow phones, including profile photographs.','Dark-mode fields, selection controls and saved staffing records use solid dark surfaces with clearly readable labels, values and placeholders.','Night, Changes and Breaks tab labels and the Staffing, Allocation and Confirm control now retain strong contrast in both appearance modes.','Small operational headings and supporting text were raised while clinical cards remain solid and interface motion stays restrained.','The verified rotation, automatic Pager and Reliever order, staffing safeguards, realtime conflict protection and privacy controls remain unchanged.']},
  {version:'36.2',date:'14 Sep 2026',title:'Meaningful colour and readable unavailable actions',changes:['Recent activity again uses distinct, accessible colours for absence, overtime and allocation changes, while retaining text labels so meaning never depends on colour alone.','Unavailable actions remain clearly inactive without fading their wording or icons, and primary, secondary, destructive and date controls now share one consistent high-contrast treatment.','Night and Breaks explain the exact plan task that must be completed before briefing, break-copy and email actions become available.','The restrained Apple-style hierarchy, solid clinical surfaces, dark mode, verified rotation and all staffing and realtime protections remain unchanged.']},
  {version:'36.1',date:'14 Sep 2026',title:'Restored personal choice and clearer visibility',changes:['Roster highlighting is again selected privately on each device, while administrator Access returns to simple account activation controls.','The My upcoming nights and personal calendar section has been removed from Night.','Important labels, supporting text, selected controls and unavailable actions now use clearer contrast in both light and dark modes.','The verified rotation, atomic staffing writes, recent activity, briefing copy, realtime conflict protection and solid clinical surfaces remain unchanged.']},
  {version:'36.0',date:'13 Sep 2026',title:'Personal planning with safer shared changes',changes:['Verified account-to-roster identity binding now protects personal schedule features and is managed by roster administrators.','Your next published nights appear in a private signed-in view and can be exported as a personal calendar file without team names or roster details.','Night now includes recent activity, changed-since-last-opened feedback and a copyable briefing that stays unavailable while the plan is incomplete.','Absence and overtime changes require the established atomic database functions, preventing partial current-row and history writes.','Failed staffing and allocation actions offer a direct Retry while keeping the entered information on screen.','The final Night, Changes and Breaks structure now lives in the HTML, with larger important touch targets and more legible operational text.','The reviewed schema baseline and forward-only identity migration preserve existing migrations, rotation rules, privacy boundaries and realtime conflict protection.']},
  {version:'35.6',date:'12 Sep 2026',title:'Clearer decisions and help throughout each night',changes:['Staffing, Allocation and Confirm now show honest states without ticks for untouched automatic steps.','Night and Breaks summary items open the exact Absence, Overtime or allocation section they describe.','Absence, overtime and night-only role buttons become available only after the required information has been entered.','The role editor now reveals its reason and save actions only after a genuine night-only change, with a clear way to restore rostered roles.','Breaks removes duplicate ready-state information and keeps completed Labour Ward status informational.','Dedicated Apple-style information sheets explain what each screen does, what happens automatically and when confirmation is required.','Wording and overtime allocation status were refined without changing the verified roster or staffing rules.']},
  {version:'35.5',date:'11 Sep 2026',title:'Clearer Apple spacing throughout the app',changes:['Unrelated summary tiles, allocation cards, break groups and action sections now have clear space between them instead of visually merging.','Night, Changes, Breaks and administrator screens now share one consistent control gap and section rhythm across phone and desktop layouts.','Controls that genuinely work together—date navigation, workflow steps, appearance choices and action-sheet options—remain intentionally grouped.','The Apple-inspired glass treatment stays limited to navigation and supporting chrome, while clinical information, forms and warnings remain solid and easy to read.','Small-phone and dark-mode spacing, borders and surface separation were refined without changing roster, staffing or allocation logic.']},
  {version:'35.4',date:'11 Sep 2026',title:'Liquid-glass navigation and unified app chrome',changes:['The bottom navigation is now a floating liquid-glass tab bar with a clear selected destination and comfortable iPhone safe-area spacing.','Night, Changes and Breaks now share the same translucent header material, subtle inner highlights and restrained depth in light and dark mode.','Account controls, information buttons and segmented controls use one consistent native-style interaction language.','Short spring selection and press motion improves orientation while reduced-motion preferences continue to remove non-essential movement.','Clinical cards, forms, staffing warnings and allocation details remain solid and high-contrast for fast, reliable reading.']},
  {version:'35.3',date:'11 Sep 2026',title:'Live updates that recover automatically',changes:['Staffing, allocation and roster changes now appear on colleagues’ open devices without closing and reopening the app.','Realtime reconnects automatically after sleep, background use or a temporary connection interruption.','A quiet revision check catches missed events without replaying screen animations or interrupting the person using the app.','Night-only role changes and their audit history are now saved together as one database action.','Administrator exports now describe their scope accurately and include night-only role changes, while private profile details and photographs remain excluded.','Email recipients are loaded from protected app settings instead of being published in the website source.']},
  {version:'35.2',date:'7 Sep 2026',title:'Clearer actions from Night through Breaks',changes:['Night summary items now show interaction only when they lead to a useful action, and outstanding work uses an explicit review label.','Outstanding allocation shortcuts open and focus the first unresolved requirement, while blocked review actions explain exactly what remains.','Break copy and email actions remain legible but unavailable until the named staffing or allocation requirement is resolved.','Onboarding now follows the intended journey from purpose and app sections through roster identity, optional profile and optional passkey.','Opening and night-only role wording now state shared-roster, offline and one-night effects more directly.']},
  {version:'35.1',date:'7 Sep 2026',title:'Consistent styling from one design-token system',changes:['The existing Apple-inspired interface now draws its surfaces, text, teal accent, status colours, separators, spacing, corner radii, shadows, translucency and motion from one consolidated design-token layer.','Superseded duplicate CSS rules were removed without changing roster logic, staffing, authentication, shared data or realtime behaviour.']},
  {version:'35.0',date:'6 Sep 2026',title:'Reliable allocation decisions and clearer app health',changes:['Outstanding tasks now name the exact allocation that still needs a nurse, and a valid selection enables review immediately.','Night, Changes, Breaks, copied text and email continue to use the same effective staffing plan, with duplicate saved allocation records ignored safely.','Staffing Undo uses the versioned database functions, and a role-change audit failure is now reported instead of being hidden.','Administrator overview and diagnostics now show actionable roster, account, refresh, application, cache and database health information.','The update window shows only this release, while Version history keeps the complete newest-first archive in its own scrolling view.','Small-screen, dark-mode, focus, disabled-control and reduced-motion presentation received a focused accessibility refinement.']},
  {version:'34.8',date:'2 Sep 2026',title:'Clearer allocations and professional roster names',changes:['Selecting an overtime nurse now completes the visible allocation task immediately, so Review changes becomes available.','Pager and Reliever continue to set the Labour Ward order automatically without creating a hidden confirmation task.','Every Night allocation row now opens the night-only role editor, giving its chevron a clear purpose.','The provisional email and copy actions now keep high-contrast white labels and icons in light and dark mode.','The six permanent roster members now appear by their full professional names throughout Night, Changes, Breaks, the full roster and outgoing summaries.','Internal roster keys and historical records remain unchanged to protect the verified rotation and existing shared data.']},
  {version:'34.7',date:'2 Sep 2026',title:'A calmer welcome from opening to onboarding',changes:['The full Apple-inspired opening experience now appears on every fresh app launch while the roster is genuinely loading.','Slow connections receive a reassuring connecting message instead of leaving the opening screen unchanged.','Onboarding now shows a clear step count alongside the familiar progress dots.','The guide uses simpler descriptions for Night, Changes, Breaks, roster identity, passkeys and optional profile details.','Replayed onboarding closes with the correct Guide completed message rather than repeating the first-use welcome.']},
  {version:'34.6',date:'2 Sep 2026',title:'The complete update archive, clearly visible',changes:['The changelog now shows a clear Latest and Previous updates navigation row at the top.','Previous updates displays the number of preserved releases and jumps directly to the archive.','The release sheet uses one reliable scrolling area so every earlier changelog remains accessible on small phones.','Each release remains separated by version and is never merged into the current update.']},
  {version:'34.5',date:'2 Sep 2026',title:'A warmer, faster opening experience',changes:['Signed-in users now see a brief branded opening state only while the latest shared roster is loading.','The opening state changes to a personal welcome as soon as the roster is ready, then moves directly into Your night.','Signed-out users reach the sign-in screen without an unnecessary delay.','Account now includes View onboarding again, which safely replays the complete guide without resetting first-use completion.','Opening motion, translucency and loading feedback follow the same restrained Apple-inspired system as the rest of the app.']},
  {version:'34.4',date:'30 Aug 2026',title:'A complete, scrollable update story',changes:['The update window now includes the complete version history in one scrollable view.','The newest release is clearly labelled Current update, while all earlier work appears under Previous updates.','Past improvements remain separated by version so older features are never presented as newly added.']},
  {version:'34.3',date:'30 Aug 2026',title:'Clearer record actions and accurate update history',changes:['The update window now describes only the changes introduced in this version.','Version history once again keeps each earlier release as its own separate entry.','Absence records now use one discreet More button instead of placing Edit and Remove beside each other.','Edit and Remove are presented in a native-style action sheet, with the destructive choice clearly separated and coloured red.','Overtime records use the same consistent action pattern on narrow and wide screens.']},
  {version:'34.2',date:'30 Aug 2026',title:'Reliable delivery of the final interface',changes:['A fresh application cache ensures every interface file updates together.','The obsolete five-person model banner is removed, leaving one concise five-nurse arrangement card.','The completed profile and workflow refinements now load consistently in both the installed app and the website.']},
  {version:'34.1',date:'29 Aug 2026',title:'Personal dashboard and quieter automatic workflow',changes:['Saved profile photographs, preferred names and role titles now appear in Your night.','Optional profile setup is included in onboarding and can be replayed later from Account.','Save profile appears only after a profile detail or photograph has changed.','Standard six-nurse nights require no Pager decision or confirmation when the automatic roster order is unchanged.','Confirm displays Not needed without a misleading completion tick.','Five-nurse wording, break guidance and similar-name matching were corrected across the interface.']},
  {version:'34.0',date:'29 Aug 2026',title:'Personal account and safer sign-in',changes:['The account sheet adds editable personal details, a private profile photograph, appearance choices, installation help and onboarding replay.','Approved roster identities remain unchanged in shared allocation records and staffing history.','Supported devices can add an optional passkey using their normal fingerprint, face recognition or device PIN.','The introduction explains passkey privacy without suggesting that Night Roster receives biometric information.','Recent absence, overtime and agreed night-only role changes offer a temporary Undo action.']},
  {version:'33.0',date:'28 Aug 2026',title:'Apple-style interface and guided first use',changes:['The complete interface follows one consistent Apple-inspired system for typography, spacing, controls, materials and motion.','Sign in and account creation use a clearer, calmer welcome experience.','New shift members receive a guided introduction to Night, Changes and Breaks before choosing their roster name.','Wording across the main workflow was simplified so automatic states remain quiet and actions say exactly what they do.']},
  {version:'32.2',date:'28 Aug 2026',title:'Cleaner automatic allocation view',changes:['An ordinary six-nurse night opens without the redundant calculated-plan status banner.','The duplicate Labour Ward order card was removed while Pager and Reliever remained visible in the allocated-roles list.','Detailed allocation controls remain available whenever staffing changes or an agreed night-only role swap requires them.']},
  {version:'32.1',date:'28 Aug 2026',title:'Automatic standard plan and native motion',changes:['A standard six-nurse plan no longer asks for unnecessary confirmation when Pager and Reliever follow their automatic roster order.','Confirmation remains required after absences, overtime allocations, five or seven-nurse decisions, or agreed night-only role changes.','The bottom navigation, screen headers and overlays now use controlled translucent materials with solid clinical content surfaces.','Short spring-style transitions clarify taps, tab changes, sheets and screen navigation without delaying roster information.','Reduced-motion settings continue to remove non-essential movement automatically.']},
  {version:'32.0',date:'28 Aug 2026',title:'Apple-inspired roster redesign',changes:['Night, Changes and Breaks now share one calm mobile design system with grouped surfaces, hairline separators and consistent typography.','Your own allocation remains the first priority on Night, followed by a clearly interactive four-part staffing summary and a compact team list.','Changes now presents the selected night, workflow stages and staffing forms in one coherent working surface without competing coloured panels.','Breaks now prioritises the actual break groups while keeping staffing and Labour Ward status immediately accessible.','The bottom tab bar, controls, dialogs and dark mode were refined together, while all roster calculations, automatic Labour Ward rules and night-only role swaps remain unchanged.']},
  {version:'31.3',date:'28 Aug 2026',title:'Calmer Changes workspace',changes:['Staffing Changes now uses a compact light header with a restrained teal accent instead of an oversized coloured block.','The selected night and live staffing count sit together in one neatly aligned row, keeping more of the working form visible.','Staffing, Allocation and Confirm now form one slim segmented control with the numbers 1, 2 and 3 always visible and completed stages marked separately.','Borders, spacing and shadows were refined throughout the Changes screen for a quieter, more consistent mobile interface.','Dark mode now applies one coherent dark surface across the complete Changes screen instead of mixing dark and white sections.']},
  {version:'31.2',date:'28 Aug 2026',title:'Secure password recovery',changes:['The sign-in screen now includes a clear Forgot password option.','Authorised nurses can request a secure recovery email without administrator intervention.','Opening the email link returns to a dedicated new-password form inside the roster app.','The new password must be entered twice and contain at least eight characters before it is saved.','Existing roster access permissions, roles, staffing data and history remain unchanged.']},
  {version:'31.1',date:'28 Aug 2026',title:'Simplified Labour Ward workflow',changes:['Pager now takes Labour Ward first part and second break automatically, with no separate first-part selector to complete.','Reliever now takes Labour Ward second part and first break automatically.','The single Change tonight’s roles editor remains available for agreed night-only swaps across any core allocation.','Allocation instructions no longer ask staff to divide Labour Ward manually.','The complete motto now wraps cleanly on narrow phone screens instead of being cropped.']},
  {version:'31.0',date:'27 Aug 2026',title:'Automatic night roles and clearer summary',changes:['On a standard six-nurse night, the rostered Pager now automatically works Labour Ward first part and takes second break.','The rostered Reliever automatically works Labour Ward second part and takes first break, while an agreed swap can still be saved for that night only.','A new night-only role editor can swap any two core allocations without changing the permanent rotation or later nights.','Night summary now shows nurses, absences, overtime and outstanding tasks in a clearly tappable two-by-two layout.','First Part, Second Part, Pager and Reliever now use role-specific symbols that directly match their meaning.']},
  {version:'30.1',date:'27 Aug 2026',title:'Complete release history',changes:['The update window now keeps a scrollable history of recent releases instead of replacing the previous notes.','Release notes use smaller, more readable mobile typography with the newest version shown first.','Every future entry can describe its actual changes while all earlier entries remain available below it.']},
  {version:'30.0',date:'27 Aug 2026',title:'Unified mobile interface',changes:['Night, Changes and Breaks now share one consistent light design system, with a coherent dark mode when deliberately enabled.','A new matching line-icon family is used for the bottom tabs, staffing summaries and allocation roles.','All summary cards are clearly interactive and open the relevant staffing, allocation or confirmation step.','Workflow steps always retain the numbers 1, 2 and 3, with a separate tick showing completed stages.','The Changes date and staffing controls remain compact and side by side on mobile screens.']},
  {version:'29.0',date:'27 Aug 2026',title:'Re-composed shift screens',changes:['Night, Changes and Breaks were separated into clearer task-focused screen compositions.','The Night screen prioritised the signed-in nurse’s own allocation before the full team situation.','Changes introduced a dedicated three-stage working surface for staffing, allocation and confirmation.','Breaks introduced distinct First break, Second break and Labour Ward sections.']},
  {version:'28.0',date:'27 Aug 2026',title:'Personalised Night screen',changes:['The old “I am” control was replaced with a personalised Your night section.','The nurse’s role, working period and break became immediately visible without reading the full roster.','A contextual Labour Ward message appears when that nurse’s own allocation is not final.','Live nurse numbers, absences and outstanding tasks were moved into a compact summary.']},
  {version:'27.0',date:'26 Aug 2026',title:'Workflow and readability update',changes:['Dates became easier to read and open through a mobile-friendly calendar control.','Changes was organised into Staffing, Allocation and Confirm stages.','Allocation cards became smaller and colours were standardised by role.','Optional overtime-name suggestions were added while keeping free-text entry available.','Subtle loading and saved-state feedback were introduced.']},
  {version:'26.2',date:'26 Aug 2026',title:'Cleaner roster shortcuts',changes:['The current or next-night shortcut is hidden when the correct roster night is already open.','View full roster expands to the available width when no return shortcut is needed.']},
  {version:'26.1',date:'26 Aug 2026',title:'Clearer automatic-night navigation',changes:['Night shortcut buttons were made equal in size.','Labels now explain whether the app will return to the current working night or the next roster night.','The shortcut becomes inactive when its target night is already selected.']},
  {version:'26.0',date:'26 Aug 2026',title:'Reliability and publishing foundation',changes:['Automated safety checks were added for the verified roster rotation, staffing calculations and 07:00 working-night boundary.','The app gained clearer version, database-schema and connection diagnostics.','Night-plan confirmation and Labour Ward ordering were strengthened while earlier published roster nights remained protected.','The progressive web app update process was improved so new versions can be installed safely.']}
];
var RELEASE_ACTIONS={
  "37.98":[{label:"Share Night Roster",action:"share"},{label:"View version history",action:"history"}],
  "37.97":[
    {label:"Open Night",action:"view",value:"today"},
    {label:"View version history",action:"history"}
  ],
  "37.96":[
    {label:"Open Night",action:"view",value:"today"},
    {label:"Share Night Roster",action:"share"},
    {label:"View version history",action:"history"}
  ],
  "37.95":[
    {label:"Open Breaks",action:"view",value:"breaks"},
    {label:"Open app guide",action:"guide"},
    {label:"View version history",action:"history"}
  ],
  "37.93":[
    {label:"Open app guide",action:"guide"},
    {label:"Open Team Chat",action:"view",value:"chat"},
    {label:"View version history",action:"history"}
  ]
};


function cinematicMotionAllowed(){return !(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)}
function formatDutyHours(value){var total=Math.round(Number(value||0)*60),hours=Math.floor(total/60),minutes=total%60;return hours+'h'+(minutes?' '+minutes+'m':'')}
function clockChangeDetailFor(date){
  var timing=nightDutyTiming(date);if(!timing.isClockChange)return null;
  var back=timing.direction==='back',part=formatDutyHours(timing.partHours),total=formatDutyHours(timing.totalHours);
  return{direction:timing.direction,title:'Clock change night',transitionLabel:back?'Clocks move back one hour':'Clocks move forward one hour',handover:timing.handover,handoverDisplay:timing.handoverDisplay,firstPeriod:timing.firstPeriodDisplay,secondPeriod:timing.secondPeriod,partHours:timing.partHours,partHoursLabel:part,totalHours:timing.totalHours,totalHoursLabel:total,summary:(back?'The repeated hour makes the 00:00–07:00 duty window '+total+'. ':'The skipped hour makes the 00:00–07:00 duty window '+total+'. ')+'Handover moves to '+timing.handoverDisplay+' so First Part and Second Part each work '+part+' of actual duty.',date:date,transitionUtc:timing.transitionUtc,startOffset:timing.startOffset,endOffset:timing.endOffset}
}
function clockChangeEducationKey(date){return'anaes_clock_change_education_'+date}
function clockChangeEducationSeen(date){try{return!!appStorage.getItem(clockChangeEducationKey(date))}catch(error){return false}}
function markClockChangeEducationSeen(date){if(!date)return;try{appStorage.setItem(clockChangeEducationKey(date),'1')}catch(error){}}
function clockChangeReminderKey(kind,date){return'anaes_clock_change_'+kind+'_'+date}
function clockChangeReminderSeen(kind,date){try{return!!appStorage.getItem(clockChangeReminderKey(kind,date))}catch(error){return false}}
function markClockChangeReminderSeen(kind,date){try{appStorage.setItem(clockChangeReminderKey(kind,date),'1')}catch(error){}}
function maybeLiveClockChangeNotification(date,timing){
  if(!timing||!timing.isClockChange||typeof Notification==='undefined'||Notification.permission!=='granted'||clockChangeReminderSeen('live',date))return;
  var clock=maltaDateParts(),operational=operationalRosterDate(new Date());if(operational!==date||!(clock.hour>=19||clock.hour<7))return;
  if(!navigator.serviceWorker||typeof navigator.serviceWorker.getRegistration!=='function')return;
  navigator.serviceWorker.getRegistration().then(function(registration){if(!registration||typeof registration.showNotification!=='function')return;var detail=clockChangeDetailFor(date);return registration.showNotification('Clock change tonight',{body:detail.transitionLabel+'. Equal-duty handover is '+detail.handoverDisplay+' · '+detail.partHoursLabel+' each.',icon:APP_URL+'icon-192.png?v='+APP_VERSION,badge:APP_URL+'icon-192.png?v='+APP_VERSION,tag:'clock-change-'+date,renotify:false,data:{type:'roster',url:APP_URL+'?view=night&date='+encodeURIComponent(date),rosterDate:date}}).then(function(){markClockChangeReminderSeen('live',date)})}).catch(function(){})
}
function maybeUpcomingClockChangeReminder(){
  if(!currentUserProfile||!R.length)return;var today=operationalRosterDate(new Date()),next=R.find(function(row){var delta=daysBetween(today,row.date);return delta>0&&delta<=7&&nightDutyTiming(row.date).isClockChange});if(!next||clockChangeReminderSeen('advance',next.date))return;
  var detail=clockChangeDetailFor(next.date);markClockChangeReminderSeen('advance',next.date);toast('Clock-change roster night on '+fmt(next.date)+' · equal handover '+detail.handoverDisplay+' · '+detail.partHoursLabel+' each')
}
function queueClockChangeAttention(date){
  var timing=nightDutyTiming(date);if(!timing.isClockChange)return;var detail=clockChangeDetailFor(date);
  if(!clockChangeSessionNotices[date]){clockChangeSessionNotices[date]=true;toast(detail.transitionLabel+' · equal-duty handover '+detail.handoverDisplay+' · '+detail.partHoursLabel+' each')}
  maybeLiveClockChangeNotification(date,timing);
  if(!clockChangeEducationSeen(date)&&educationSeen('main',2)){if(clockChangeEducationTimer)clearTimeout(clockChangeEducationTimer);clockChangeEducationTimer=setTimeout(function(){showClockChangeEducation(date,false)},cinematicMotionAllowed()?380:30)}
}
function setLaunchState(title,status){
  var screen=byId('launchScreen');if(!screen||launchFinished)return;
  var heading=byId('launchTitle'),message=byId('launchStatus'),changed=false;
  if(heading&&title&&heading.textContent!==title){heading.textContent=title;changed=true}
  if(message&&status&&message.textContent!==status){message.textContent=status;changed=true}
  if(changed){screen.classList.remove('launchStateChanged');void screen.offsetWidth;screen.classList.add('launchStateChanged')}
}

function plainSnapshotRecord(value){return !!value&&typeof value==='object'&&!Array.isArray(value)}

function snapshotRowsByDate(value){
  var result={};if(!plainSnapshotRecord(value))return result;Object.keys(value).forEach(function(date){if(Array.isArray(value[date]))result[date]=value[date].filter(plainSnapshotRecord)});return result
}

function snapshotRecordsByDate(value){
  var result={};if(!plainSnapshotRecord(value))return result;Object.keys(value).forEach(function(date){if(plainSnapshotRecord(value[date]))result[date]=value[date]});return result
}

function rowsGroupedByDate(rows){
  var result={};(Array.isArray(rows)?rows:[]).forEach(function(row){if(plainSnapshotRecord(row)&&typeof row.roster_date==='string')(result[row.roster_date]||(result[row.roster_date]=[])).push(row)});return result
}

function rowsIndexedByDate(rows){
  var result={};(Array.isArray(rows)?rows:[]).forEach(function(row){if(plainSnapshotRecord(row)&&typeof row.roster_date==='string')result[row.roster_date]=row});return result
}

async function requestStartupSnapshot(){
  var token=currentAccessToken;
  if(!token){
    var authState=await withTimeout(supa.auth.getSession(),10000,'The sign-in session did not respond.');
    if(authState.error)throw authState.error;
    rememberAuthSession(authState.data&&authState.data.session);token=currentAccessToken;
  }
  if(!token){var sessionError=new Error('Your sign-in session is no longer available.');sessionError.code='401';throw sessionError}
  var controller=window.AbortController?new window.AbortController():null,timer=controller?setTimeout(function(){controller.abort()},startupSnapshotTimeoutMs):null;
  try{
    return await withTimeout((async function(){
      var response=await fetch(SUPABASE_URL+'/rest/v1/rpc/get_roster_startup_v49',{method:'POST',headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({p_client_version:APP_VERSION}),cache:'no-store',credentials:'omit',signal:controller?controller.signal:undefined});
      var body=await response.text(),data=null;try{data=body?JSON.parse(body):null}catch(parseError){var invalidError=new Error('The shared roster returned unreadable information.');invalidError.code='INVALID_RESPONSE';throw invalidError}
      if(!response.ok){var requestError=new Error(data&&data.message||'The shared roster could not be loaded.');requestError.code=data&&data.code||String(response.status);requestError.status=response.status;throw requestError}
      return data;
    })(),startupSnapshotTimeoutMs+500,'The shared roster snapshot did not settle.');
  }catch(error){if(error&&error.name==='AbortError'){var timeoutError=new Error('The shared roster did not respond.');timeoutError.code='TIMEOUT';throw timeoutError}throw error}
  finally{if(timer)clearTimeout(timer)}
}

async function requestStartupSnapshotXhr(){
  var token=currentAccessToken;
  if(!token){
    var authState=await withTimeout(supa.auth.getSession(),10000,'The sign-in session did not respond.');
    if(authState.error)throw authState.error;
    rememberAuthSession(authState.data&&authState.data.session);token=currentAccessToken;
  }
  if(!token){var sessionError=new Error('Your sign-in session is no longer available.');sessionError.code='401';throw sessionError}
  if(!window.XMLHttpRequest){var unsupportedError=new Error('This browser cannot use the Android roster connection.');unsupportedError.code='UNSUPPORTED_TRANSPORT';throw unsupportedError}
  return new Promise(function(resolve,reject){
    var settled=false,xhr=new window.XMLHttpRequest(),timer=null;
    function finish(error,value){if(settled)return;settled=true;if(timer)clearTimeout(timer);xhr.onload=xhr.onerror=xhr.onabort=xhr.ontimeout=null;if(error)reject(error);else resolve(value)}
    function transportError(message,code,status){var error=new Error(message);error.code=code||'NETWORK_ERROR';if(status)error.status=status;return error}
    try{
      xhr.open('POST',SUPABASE_URL+'/rest/v1/rpc/get_roster_startup_v49',true);
      xhr.setRequestHeader('apikey',SUPABASE_KEY);xhr.setRequestHeader('Authorization','Bearer '+token);xhr.setRequestHeader('Content-Type','application/json');
      xhr.timeout=startupSnapshotTimeoutMs;
      xhr.onload=function(){
        var data=null;try{data=xhr.responseText?JSON.parse(xhr.responseText):null}catch(parseError){finish(transportError('The shared roster returned unreadable information.','INVALID_RESPONSE'));return}
        if(xhr.status<200||xhr.status>=300){finish(transportError(data&&data.message||'The shared roster could not be loaded.',data&&data.code||String(xhr.status),xhr.status));return}
        finish(null,data)
      };
      xhr.onerror=function(){finish(transportError('The shared roster connection failed.'))};
      xhr.onabort=function(){finish(transportError('The shared roster request was stopped.','TIMEOUT'))};
      xhr.ontimeout=function(){finish(transportError('The shared roster did not respond.','TIMEOUT'))};
      timer=setTimeout(function(){try{xhr.abort()}catch(error){}finish(transportError('The shared roster did not respond.','TIMEOUT'))},startupSnapshotTimeoutMs+500);
      xhr.send(JSON.stringify({p_client_version:APP_VERSION}));
    }catch(error){finish(error)}
  })
}

function startupAuthError(error){var code=String(error&&error.code||''),message=String(error&&error.message||'');return error&&Number(error.status)===401||code==='401'||code==='PGRST301'||code==='AUTH_SESSION_MISSING'||/jwt|token.*(?:expired|invalid)|session.*expired/i.test(message)}

async function requestStartupWithSessionRecovery(request){
  try{return await request()}
  catch(error){
    if(!startupAuthError(error))throw error;
    sharedLoadFailureStage='session';setLaunchState('Preparing your night','Renewing your secure sign-in…');
    try{await refreshAuthSession()}catch(refreshError){refreshError.code=refreshError.code||'AUTH_REFRESH_FAILED';refreshError.startupSessionFailed=true;throw refreshError}
    return request()
  }
}

function startupQuery(promise,message){return withTimeout(promise,startupFallbackTimeoutMs,message)}

function startupQueryFailed(result){return !result||!!result.error}

function preferCompatibilityStartup(){return /android/i.test(navigator.userAgent||'')}

async function compatibilitySyncState(){
  var results=await startupQuery(Promise.all([
    supa.from('app_sync_state').select('revision,updated_at').eq('id',1).maybeSingle(),
    supa.from('app_access_signal').select('access_epoch,updated_at').eq('id',1).maybeSingle()
  ]),'Roster state did not respond.');
  var syncResult=results[0],accessResult=results[1];
  if(startupQueryFailed(syncResult)||!syncResult.data){var error=syncResult&&syncResult.error||new Error('Roster revision could not be checked.');error.code=error.code||'REVISION_UNAVAILABLE';throw error}
  if(startupQueryFailed(accessResult)||!accessResult.data){var accessError=accessResult&&accessResult.error||new Error('Access revision could not be checked.');accessError.code=accessError.code||'ACCESS_REVISION_UNAVAILABLE';throw accessError}
  return{revision:Number(syncResult.data.revision||0),accessEpoch:Number(accessResult.data.access_epoch||0)}
}

async function requestCompatibilityStartup(){
  var email=currentUser&&String(currentUser.email||'').trim().toLowerCase();
  if(!email){var missingUser=new Error('Your sign-in account is unavailable.');missingUser.code='401';throw missingUser}
  sharedLoadFailureStage='access';setLaunchState('Preparing your night','Checking roster access…');
  var profileResult=await startupQuery(supa.from('allowed_users').select('*').eq('email',email).eq('active',true).maybeSingle(),'Roster access did not respond.');
  if(startupQueryFailed(profileResult))throw profileResult&&profileResult.error||new Error('Roster access could not be checked.');
  if(!profileResult.data||!profileResult.data.active){var accessError=new Error('This account is not authorised.');accessError.code='42501';throw accessError}

  for(var attempt=0;attempt<2;attempt++){
    var startingState=await compatibilitySyncState();
    sharedLoadFailureStage='staffing';setLaunchState('Preparing your night',attempt?'The roster changed while opening. Refreshing it once…':'Opening shared staffing through the compatibility route…');
    var changes=await startupQuery(supa.from('night_changes').select('*').order('updated_at',{ascending:true}),'Absence information did not respond.');
    var overtime=await startupQuery(supa.from('night_overtime').select('*').order('updated_at',{ascending:true}),'Overtime information did not respond.');
    var fiveCover=await startupQuery(supa.from('night_five_cover').select('*'),'Five-nurse information did not respond.');
    var settings=await startupQuery(supa.from('roster_settings').select('*').eq('id',1).maybeSingle(),'Roster settings did not respond.');
    var versions=await startupQuery(supa.from('rotation_versions').select('*').order('effective_from',{ascending:true}),'Rotation information did not respond.');
    var staffing=[changes,overtime,fiveCover,settings,versions];
    if(staffing.some(startupQueryFailed)||!settings.data||!(versions.data||[]).length)throw new Error('Shared staffing could not be loaded.');

    sharedLoadFailureStage='allocations';setLaunchState('Preparing your night','Opening selected-night allocations…');
    var labourOrder=await startupQuery(supa.from('night_labour_order').select('*'),'Labour Ward order did not respond.');
    var planStatus=await startupQuery(supa.from('night_plan_status').select('*'),'Night plan status did not respond.');
    var roleOverrides=await startupQuery(supa.from('night_role_overrides').select('*'),'Night-only roles did not respond.');
    var allocations=[labourOrder,planStatus,roleOverrides];
    if(allocations.some(startupQueryFailed))throw new Error('Shared allocations could not be loaded.');

    sharedLoadFailureStage='support';
    var support=await startupQuery(Promise.all([
      supa.from('app_settings').select('*').eq('id',1).maybeSingle(),
      supa.from('app_schema_version').select('*').eq('id',1).maybeSingle(),
      supa.rpc('get_app_compatibility_v49',{p_client_version:APP_VERSION})
    ]),'Roster support information did not respond.').catch(function(){return[{data:null},{data:null},{data:null,error:{code:'COMPATIBILITY_UNAVAILABLE'}}]});
    var endingState=await compatibilitySyncState();
    if(startingState.revision===endingState.revision)return{
      profile:profileResult.data,
      night_changes:staffing[0].data||[],night_overtime:staffing[1].data||[],night_five_cover:staffing[2].data||[],
      roster_settings:staffing[3].data,rotation_versions:staffing[4].data||[],
      night_labour_order:allocations[0].data||[],night_plan_status:allocations[1].data||[],night_role_overrides:allocations[2].data||[],
      app_settings:support[0]&&!support[0].error?support[0].data:null,
      schema_version:support[1]&&!support[1].error&&support[1].data?Number(support[1].data.version||0):0,
      compatibility:support[2]&&!support[2].error?support[2].data:null,
      access_epoch:endingState.accessEpoch,
      sync_revision:endingState.revision
    }
  }
  var changedError=new Error('The shared roster changed while it was opening. Try again.');changedError.code='REVISION_CHANGED';throw changedError
}

function readOfflineSnapshot(){
  try{
    var stored=JSON.parse(appStorage.getItem('anaes_offline_snapshot')||'null'),raw=stored;
    if(stored&&Number(stored.format)===2){
      raw=window.AnaestheticRuntime&&window.AnaestheticRuntime.snapshots?window.AnaestheticRuntime.snapshots.unpackSync(stored):null;
      if(!raw){appStorage.removeItem('anaes_offline_snapshot');recordAppDiagnostic('offline','snapshot','integrity-failed');return null}
    }
    if(!plainSnapshotRecord(raw)||!Array.isArray(raw.rotationVersions)||!raw.rotationVersions.length||!plainSnapshotRecord(raw.rosterSettings))return null;
    if(window.AnaestheticDomain&&window.AnaestheticDomain.snapshotIsExpired&&window.AnaestheticDomain.snapshotIsExpired(raw.saved_at,604800000,appNowMs())){appStorage.removeItem('anaes_offline_snapshot');if(window.AnaestheticRuntime&&window.AnaestheticRuntime.snapshots)window.AnaestheticRuntime.snapshots.remove('offline-roster');recordAppDiagnostic('offline','snapshot','expired');return null}
    var versions=raw.rotationVersions.filter(function(version){return plainSnapshotRecord(version)&&/^\d{4}-\d{2}-\d{2}$/.test(version.effective_from||'')&&['first1','first2','second1','second2','pager','reliever'].every(function(key){return typeof version[key]==='string'&&version[key].trim()})}).map(function(version){var copy=Object.assign({},version);copy.seventh_cycle=Array.isArray(version.seventh_cycle)&&version.seventh_cycle.length?version.seventh_cycle.filter(function(name){return typeof name==='string'&&name.trim()}):ORIGINAL_SEVENTH.slice();return copy});
    if(!versions.length||!/^\d{4}-\d{2}-\d{2}$/.test(raw.rosterSettings.published_until||''))return null;
    return{saved_at:typeof raw.saved_at==='string'&&!isNaN(Date.parse(raw.saved_at))?raw.saved_at:null,nightChanges:snapshotRowsByDate(raw.nightChanges),nightOvertime:snapshotRowsByDate(raw.nightOvertime),fiveCoverChoices:snapshotRecordsByDate(raw.fiveCoverChoices),rosterSettings:Object.assign({},raw.rosterSettings),rotationVersions:versions,labourOrders:snapshotRecordsByDate(raw.labourOrders),nightRoleOverrides:snapshotRecordsByDate(raw.nightRoleOverrides),nightPlanStatuses:snapshotRecordsByDate(raw.nightPlanStatuses),appSettings:plainSnapshotRecord(raw.appSettings)?Object.assign({},raw.appSettings):null,schemaVersion:Number(raw.schemaVersion||0)||0,syncRevision:Number(raw.syncRevision||0)||0,accessEpoch:Number(raw.accessEpoch||0)||0,compatibility:normaliseAppCompatibility(raw.compatibility)}
  }catch(error){recordAppDiagnostic('offline','snapshot-read','failed');return null}
}

function hasOfflineSnapshot(){return !!readOfflineSnapshot()}

function cachedAllowedProfile(email){
  try{var cached=JSON.parse(appStorage.getItem('anaes_cached_profile')||'null');return cached&&cached.email===String(email||'').toLowerCase()&&cached.active?cached:null}catch(error){return null}
}

function showLaunchRecovery(message){
  var screen=byId('launchScreen');if(!screen||launchFinished)return;clearTimeout(launchSlowTimer);launchRecoveryVisible=true;setLaunchState('Connection taking longer',message||'The shared roster has not replied yet.');var recovery=byId('launchRecovery'),offline=byId('launchOfflineBtn'),offlineAvailable=!!(currentUser&&cachedAllowedProfile(currentUser.email)&&hasOfflineSnapshot());if(recovery)recovery.classList.remove('hidden');if(offline)offline.classList.toggle('hidden',!offlineAvailable);screen.classList.add('launchNeedsAction');screen.setAttribute('aria-busy','false')
}

function hideLaunchRecovery(){
  launchRecoveryVisible=false;var recovery=byId('launchRecovery');if(recovery)recovery.classList.add('hidden');var screen=byId('launchScreen');if(screen){screen.classList.remove('launchNeedsAction');screen.setAttribute('aria-busy','true')}
}

function syncPrimaryHeaderActions(){
  var admin=byId('adminSettingsBtn'),account=byId('accountBtn'),sourceAvatar=byId('accountAvatar'),sourceInitial=byId('accountInitial'),adminHidden=!admin||admin.classList.contains('hidden'),hasAvatar=!!(sourceAvatar&&!sourceAvatar.classList.contains('hidden')&&sourceAvatar.src),initial=(sourceInitial&&sourceInitial.textContent||'A').trim().charAt(0)||'A';
  Array.prototype.forEach.call(document.querySelectorAll('[data-shell-settings]'),function(button){button.classList.toggle('hidden',adminHidden);button.onclick=function(){if(admin)admin.click()}});
  Array.prototype.forEach.call(document.querySelectorAll('[data-shell-account]'),function(button){var image=button.querySelector('.primaryHeaderAccountAvatar'),letter=button.querySelector('.primaryHeaderAccountInitial');button.onclick=function(){if(account)account.click()};button.title=account&&account.title||'Open account';if(image){image.classList.toggle('hidden',!hasAvatar);if(hasAvatar)image.src=sourceAvatar.src}if(letter){letter.classList.toggle('hidden',hasAvatar);letter.textContent=initial}});
}

function prepareAuthorisedShell(profile){
  currentUserProfile=profile;byId('authGate').classList.add('hidden');document.body.classList.remove('authPending');var isAdmin=profile.user_role==='admin';byId('adminSettingsBtn').classList.toggle('hidden',!isAdmin);document.querySelector('.bottom').style.gridTemplateColumns='repeat(4,minmax(0,1fr))';byId('accountBtn').title=profile.display_name+' · Open account';byId('accountInitial').textContent=(profile.display_name||profile.email).charAt(0).toUpperCase();syncPrimaryHeaderActions()
}

function normaliseAppCompatibility(value){
  var source=plainSnapshotRecord(value)?value:{},status=String(source.write_status||'update_required');
  return{
    minimum_read_version:String(source.minimum_read_version||'37.0'),
    minimum_write_version:String(source.minimum_write_version||'41.0'),
    recommended_version:String(source.recommended_version||'41.0'),
    maintenance_mode:source.maintenance_mode===true,
    maintenance_message:String(source.maintenance_message||'Shared roster editing has been temporarily paused.'),
    write_allowed:source.write_allowed===true,
    write_status:['allowed','maintenance','version_blocked','update_required','permission_denied'].indexOf(status)>=0?status:'update_required'
  }
}
function compatibilityNeedsUpdate(){return appCompatibility&&(appCompatibility.write_status==='update_required'||appCompatibility.write_status==='version_blocked')}
function sharedWritesBlocked(){return !appCompatibility||appCompatibility.write_allowed!==true}
function sharedWriteNotice(){
  if(!appCompatibility)return'An important Night Roster update is required before shared changes can be made. You can still view the roster.';
  if(appCompatibility.write_status==='maintenance')return appCompatibility.maintenance_message||'Shared roster editing has been temporarily paused. You can still view the roster.';
  if(appCompatibility.write_status==='permission_denied')return'Your signed-in account does not currently have permission to save shared roster changes.';
  return'An important Night Roster update is required before shared changes can be made. You can still view the roster.'
}
function renderWriteGuardState(){
  var blocked=!!(currentUserProfile&&!forcedOfflineSession&&sharedWritesBlocked()),banner=byId('writeGuardBanner'),title=byId('writeGuardTitle'),detail=byId('writeGuardDetail'),updateTakingOver=!!(blocked&&compatibilityNeedsUpdate()&&updateRegistration&&updateRegistration.waiting);
  document.body.classList.toggle('sharedWriteBlocked',blocked);
  if(banner)banner.classList.toggle('hidden',!blocked||updateTakingOver);
  if(!blocked)return;
  var maintenance=appCompatibility&&appCompatibility.write_status==='maintenance';
  if(title)title.textContent=maintenance?'Shared editing paused':'Important update required';
  if(detail)detail.textContent=sharedWriteNotice();
  if(compatibilityNeedsUpdate()&&updateRegistration&&navigator.onLine&&!updateRegistration.waiting)updateRegistration.update().catch(function(){})
}
function setAppCompatibility(value){appCompatibility=normaliseAppCompatibility(value);renderWriteGuardState();updateOfflineControls()}
async function refreshCompatibilityState(){
  if(!supa||!currentUser||!navigator.onLine)return appCompatibility;
  try{var result=await supa.rpc('get_app_compatibility_v49',{p_client_version:APP_VERSION});if(!result.error&&result.data)setAppCompatibility(result.data)}catch(error){}
  return appCompatibility
}
async function enterAccessLost(){
  if(accessLossInFlight)return;accessLossInFlight=true;
  recordAppDiagnostic('access','session','lost');realtimeGeneration++;startupAttempt++;forcedOfflineSession=false;
  if(realtimeReconnectTimer){clearTimeout(realtimeReconnectTimer);realtimeReconnectTimer=null}
  if(window.AnaestheticRuntime&&window.AnaestheticRuntime.scheduler)window.AnaestheticRuntime.scheduler.cancel('shared-revision');
  sharedSyncTimer=null;realtimeSubscribed=false;
  if(changesChannel){try{await supa.removeChannel(changesChannel)}catch(error){}changesChannel=null}
  if(window.chatTeardownSession)window.chatTeardownSession();
  await clearPrivateDeviceData();
  currentUserProfile=null;currentPrivateProfile=null;profileAvatarUrl='';currentAccessToken='';
  nightChanges={};nightOvertime={};changeHistory={};overtimeHistory={};roleOverrideHistory={};fiveCoverChoices={};labourOrders={};nightPlanStatuses={};nightRoleOverrides={};
  lastObservedSyncRevision=null;lastObservedAccessEpoch=null;
  try{await supa.auth.signOut({scope:'local'})}catch(error){}
  currentUser=null;setAuthMode('login');showAuth('Your Night Roster access has changed. Sign in again, or contact the roster administrator if you still need access.',true);
}
async function checkCurrentAccessStatus(expectedEpoch){
  if(accessLossInFlight)return{active:false};
  if(accessStatusCheckPromise)return accessStatusCheckPromise;
  accessStatusCheckPromise=(async function(){
    var result=await supa.rpc('my_access_status_v49');
    if(result.error){recordAppDiagnostic('access','refresh',result.error.code||'failed');return{error:result.error}}
    var status=result.data||{},epoch=Number(status.access_epoch||expectedEpoch||0);lastObservedAccessEpoch=epoch;
    if(!status.active){await enterAccessLost();return{active:false}}
    var previousRole=currentUserProfile&&currentUserProfile.user_role||'',nextRole=String(status.user_role||'member');
    var nextProfile=Object.assign({},currentUserProfile||{},{active:true,display_name:status.display_name||currentUserProfile&&currentUserProfile.display_name||'Shift member',user_role:nextRole});
    currentUserProfile=nextProfile;try{appStorage.setItem('anaes_cached_profile',JSON.stringify(nextProfile))}catch(error){}
    prepareAuthorisedShell(nextProfile);
    if(previousRole&&previousRole!==nextRole){
      recordAppDiagnostic('access','role-change',previousRole+'-to-'+nextRole);
      if(previousRole==='admin'&&nextRole!=='admin'&&document.body.getAttribute('data-view')==='admin')show('today');
      if(nextRole==='admin'&&!forcedOfflineSession)withTimeout(loadAccounts(),6000,'Account list did not respond.').catch(function(){})
    }
    return{active:true,role:nextRole,accessEpoch:epoch}
  })();
  try{return await accessStatusCheckPromise}finally{accessStatusCheckPromise=null}
}

async function retryLaunchConnection(){
  var button=byId('launchRetryBtn'),offline=byId('launchOfflineBtn'),screen=byId('launchScreen'),originalLabel=button&&button.textContent||'Try again';if(button){button.disabled=true;button.textContent='Trying again…'}if(offline)offline.disabled=true;setLaunchState('Trying again',sharedLoadPromise?'Finishing the current roster request before trying again…':'Waiting for the shared roster to respond…');if(screen){screen.classList.add('launchNeedsAction');screen.setAttribute('aria-busy','true')}try{if(!currentUser){window.location.reload();return}if(sharedLoadPromise)try{await sharedLoadPromise}catch(error){}if(!launchFinished)await authorizeUser(currentUser)}finally{if(button){button.disabled=false;button.textContent=originalLabel}if(offline)offline.disabled=false;if(!launchFinished&&!launchRecoveryVisible)showLaunchRecovery('The shared roster still has not responded. Check your connection, then try again.')}
}

function useSavedRosterAtLaunch(){
  var profile=cachedAllowedProfile(currentUser&&currentUser.email);if(!profile||!hasOfflineSnapshot()){showLaunchRecovery('There is no saved roster on this device yet. Try connecting again.');return}currentUserProfile=profile;forcedOfflineSession=true;prepareAuthorisedShell(profile);if(!restoreOfflineSnapshot()){showLaunchRecovery('The saved roster could not be opened. Try connecting again.');return}setSync('offline','Offline · saved information');finishLaunch(true);toast('Showing the last saved roster. Changes are disabled until the connection returns.');updateOfflineControls()
}

function finishLaunch(ready){
  var screen=byId('launchScreen');if(!screen||launchFinished)return;
  clearTimeout(launchSlowTimer);hideLaunchRecovery();
  var motion=cinematicMotionAllowed();
  if(!ready){
    launchFinished=true;screen.setAttribute('aria-busy','false');document.body.classList.add('authRevealing');
    setTimeout(function(){screen.classList.add('dismissed')},motion?90:0);
    setTimeout(function(){screen.classList.add('hidden');document.body.classList.remove('authRevealing')},motion?650:20);
    return
  }
  if(window.AnaestheticRuntime&&window.AnaestheticRuntime.recovery){window.AnaestheticRuntime.recovery.markReady();runtimeRecoveryStatus=window.AnaestheticRuntime.recovery.status()}
  var name=privateProfileName()||currentUserProfile&&currentUserProfile.display_name||'';
  setLaunchState(name?'Welcome back, '+name:'Your night is ready',navigator.onLine&&!forcedOfflineSession?'Everything is ready.':'Showing the last saved roster');
  screen.classList.add('ready');screen.setAttribute('aria-busy','false');document.body.classList.add('appRevealing');launchFinished=true;
  var hold=motion?320:0,fade=motion?520:20;
  setTimeout(function(){screen.classList.add('dismissed')},hold);
  setTimeout(function(){screen.classList.add('hidden')},hold+fade);
  setTimeout(function(){document.body.classList.remove('appRevealing')},hold+fade+(motion?520:20));
}

function rememberOnboardingProfile(){var name=byId('onboardingProfileName'),title=byId('onboardingProfileTitle');if(name||title)onboardingProfileDraft={name:name?name.value:'',title:title?title.value:''}}

function openOnboardingReplay(){var dialog=byId('onboardingDialog');if(!dialog||!dialog.showModal)return;var account=byId('accountSheet');if(account&&account.open)account.close();onboardingChatIntro=false;onboardingFeatureKey='';onboardingGuideMenu=true;onboardingReplay=true;onboardingDirection=1;onboardingStep=0;renderOnboarding();if(!dialog.open)dialog.showModal()}

function offlineSnapshotPayload(){
  return{saved_at:lastSuccessfulSyncAt||new Date(appNowMs()).toISOString(),nightChanges:nightChanges,nightOvertime:nightOvertime,fiveCoverChoices:fiveCoverChoices,rosterSettings:rosterSettings,rotationVersions:rotationVersions,labourOrders:labourOrders,nightRoleOverrides:nightRoleOverrides,nightPlanStatuses:nightPlanStatuses,appSettings:appSettings,schemaVersion:schemaVersion,syncRevision:Number(lastObservedSyncRevision||0),accessEpoch:Number(lastObservedAccessEpoch||0),compatibility:appCompatibility}
}
function saveOfflineSnapshot(){
  try{
    var payload=offlineSnapshotPayload(),runtime=window.AnaestheticRuntime&&window.AnaestheticRuntime.snapshots,envelope=runtime?runtime.packSync(payload,{schemaVersion:schemaVersion,appVersion:APP_VERSION,savedAt:payload.saved_at}):null;
    if(!envelope){recordAppDiagnostic('offline','snapshot-save','rejected');return}
    appStorage.setItem('anaes_offline_snapshot',JSON.stringify(envelope));
    runtime.persist('offline-roster',envelope).then(function(saved){recordAppDiagnostic('offline','snapshot-indexeddb',saved?'saved':'fallback')});
  }catch(error){recordAppDiagnostic('offline','snapshot-save','failed')}
}
async function primeOfflineSnapshotFromIndexedDb(){
  var runtime=window.AnaestheticRuntime&&window.AnaestheticRuntime.snapshots;if(!runtime)return false;
  try{
    var indexed=await runtime.load('offline-roster');if(!indexed||!runtime.unpackSync(indexed))return false;
    var local=null;try{local=JSON.parse(appStorage.getItem('anaes_offline_snapshot')||'null')}catch(error){}
    var indexedAt=Date.parse(indexed.saved_at||''),localAt=Date.parse(local&&local.saved_at||'');
    if(!local||!Number.isFinite(localAt)||Number.isFinite(indexedAt)&&indexedAt>localAt){appStorage.setItem('anaes_offline_snapshot',JSON.stringify(indexed));recordAppDiagnostic('offline','snapshot-indexeddb','restored')}
    return true
  }catch(error){recordAppDiagnostic('offline','snapshot-indexeddb','read-failed');return false}
}


function restoreOfflineSnapshot(){
  try{
    var snapshot=readOfflineSnapshot();if(!snapshot)return false;
    nightChanges=snapshot.nightChanges;nightOvertime=snapshot.nightOvertime;fiveCoverChoices=snapshot.fiveCoverChoices;rosterSettings=snapshot.rosterSettings;rotationVersions=snapshot.rotationVersions;labourOrders=snapshot.labourOrders;nightRoleOverrides=snapshot.nightRoleOverrides;nightPlanStatuses=snapshot.nightPlanStatuses;if(snapshot.appSettings)appSettings=snapshot.appSettings;schemaVersion=snapshot.schemaVersion;lastObservedSyncRevision=Number(snapshot.syncRevision||0);lastObservedAccessEpoch=Number(snapshot.accessEpoch||0);setAppCompatibility(snapshot.compatibility);lastSuccessfulSyncAt=snapshot.saved_at;changeHistory={};overtimeHistory={};roleOverrideHistory={};historyLoadedDates={};historyLoadingDates={};rebuildCalculatedRoster();if(!R.length)return false;nightSelectionMode='automatic';idx=startingIndex(appNow());automaticSelectedDate=R[idx]&&R[idx].date;initialNightChosen=true;setSharedSyncState('offline','');render();return true;
  }catch(error){console.error('Saved roster could not be restored',error);return false}
}

function isStandaloneApp(){return !!(window.navigator.standalone||(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches))}
function sharedAppUrl(){return APP_URL+'?welcome=1'}
function installGuideSteps(){
  var ios=/iphone|ipad|ipod/i.test(navigator.userAgent),android=/android/i.test(navigator.userAgent),standalone=isStandaloneApp(),steps=[],label='';
  if(standalone){label='Night Roster is already installed on this device.';steps=['Open it from your Home Screen or app launcher.','Updates are checked automatically and are applied safely through the installed app.'];}
  else if(ios){label='Four simple taps in Safari. No App Store account is needed.';steps=['Open Night Roster in Safari.','Tap the Share button.','Choose Add to Home Screen and keep Open as Web App enabled.','Tap Add, then open Night Roster from your Home Screen.'];}
  else if(android){label=deferredInstallPrompt?'This phone can install Night Roster now.':'Install Night Roster once and keep it on your Home Screen.';steps=deferredInstallPrompt?['Tap Install Night Roster below.','Confirm Install app.','Open Night Roster from your Home Screen or app launcher.']:['Open the browser menu.','Choose Install app or Add to Home screen.','Confirm Install, then open Night Roster from your Home Screen or app launcher.'];}
  else{label='Install Night Roster for a standalone app window.';steps=['Open your browser menu.','Choose Install app or Add to Home screen if available.','Launch Night Roster from the installed app icon.'];}
  return'<div class="installGuideHero"><img src="icon-192.png?v=43.1" alt=""><div><b>'+esc(standalone?'Installed':'Night Roster')+'</b><span>'+esc(label)+'</span></div></div><div class="installSteps">'+steps.map(function(step,index){return'<div class="installStep"><b>'+(index+1)+'</b><span>'+esc(step)+'</span></div>'}).join('')+'</div>'+(deferredInstallPrompt&&!standalone?'<button type="button" class="primary wide installGuidePrimary" id="installGuidePrimaryBtn">Install Night Roster</button>':'')+'<p class="installGuideFootnote">No App Store or Play Store account is required. Installing only adds the app to this device, and roster access still requires an approved Night Roster account.</p>';
}
async function runInstallPrompt(){
  if(!deferredInstallPrompt){showInstallGuide();return}
  deferredInstallPrompt.prompt();var choice=await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;applyStandaloneUi();if(choice&&choice.outcome==='accepted')toast('Night Roster added to your device')
}
function bindInstallGuideActions(){var button=byId('installGuidePrimaryBtn');if(button)button.onclick=runInstallPrompt}
function showInstallGuide(shared){var dialog=byId('installGuide'),title=byId('installGuideTitle'),intro=byId('installGuideIntro');if(title)title.textContent=shared?'Get Night Roster':'Install Night Roster';if(intro)intro.textContent=shared?'Install it on this phone, then sign in with your approved roster account.':'Install once for a full-screen app experience with automatic updates.';byId('installGuideSteps').innerHTML=installGuideSteps();bindInstallGuideActions();if(dialog&&dialog.showModal&&!dialog.open)dialog.showModal()}
function cleanWelcomeUrl(){try{var url=new URL(location.href);if(url.searchParams.has('welcome')){url.searchParams.delete('welcome');history.replaceState(null,'',url.pathname+(url.search?url.search:'')+(url.hash||''))}}catch(error){}}
function showSharedWelcomeIfRequested(){try{var params=new URLSearchParams(location.search);if(params.get('welcome')!=='1')return;sharedWelcomeEntry=true;cleanWelcomeUrl();setTimeout(function(){if(isStandaloneApp())toast('Night Roster is already installed');else showInstallGuide(true)},180)}catch(error){}}
function showShareApp(){var account=byId('accountSheet');if(account&&account.open)account.close();var dialog=byId('shareAppDialog');if(window.dispatchEvent&&typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('roster:share-app',{detail:{shareUrl:sharedAppUrl(),installed:isStandaloneApp(),nativeShare:typeof navigator.share==='function'}}));if(dialog&&dialog.showModal&&!dialog.open)dialog.showModal()}
async function nativeShareNightRoster(){
  var data={title:'Night Roster',text:'Install Anaesthetic Night Roster on your phone.',url:sharedAppUrl()};
  try{if(navigator.share){await navigator.share(data);return}if(navigator.clipboard&&navigator.clipboard.writeText){await navigator.clipboard.writeText(sharedAppUrl());toast('Night Roster link copied');return}throw new Error('Sharing is not available')}
  catch(error){if(error&&error.name==='AbortError')return;toast('Could not open sharing on this device')}
}
async function copyNightRosterLink(){try{await navigator.clipboard.writeText(sharedAppUrl());toast('Night Roster link copied')}catch(error){toast('Link could not be copied')}}

function passkeySupported(){return !!(window.PublicKeyCredential&&supa&&supa.auth&&typeof supa.auth.signInWithPasskey==='function')}

async function signInWithPasskey(){
  if(!passkeySupported()){authMessage('Passkeys are not supported by this browser. You can still sign in with your password.',true);return}
  var button=byId('authPasskeyBtn');button.disabled=true;authMessage('Use your fingerprint, face recognition or device PIN…');
  try{var result=await supa.auth.signInWithPasskey();if(result.error)throw result.error;if(result.data&&result.data.session)rememberAuthSession(result.data.session);if(result.data&&result.data.user)await authorizeUser(result.data.user,result.data.session)}
  catch(error){var cancelled=error&&(error.name==='NotAllowedError'||/cancel|not allowed/i.test(error.message||''));authMessage(cancelled?'Passkey sign-in was cancelled.':/disabled|not enabled/i.test(error.message||'')?'Passkeys have not been enabled for this roster yet. Use your password for now.':'Passkey sign-in could not be completed. You can still use your password.',!cancelled)}
  finally{button.disabled=false}
}

function privateProfileName(){return currentPrivateProfile&&currentPrivateProfile.profile_name||currentUserProfile&&currentUserProfile.display_name||''}

async function refreshProfileAvatar(){
  profileAvatarUrl='';var path=currentPrivateProfile&&currentPrivateProfile.avatar_path;
  if(path&&profileFeatureAvailable){var result=await supa.storage.from('profile-photos').createSignedUrl(path,3600);if(!result.error&&result.data)profileAvatarUrl=result.data.signedUrl||''}
  applyProfileIdentity();
}

function applyProfileIdentity(){
  if(!currentUserProfile)return;var name=privateProfileName(),initial=(name||currentUserProfile.email||'?').charAt(0).toUpperCase(),headerImage=byId('accountAvatar'),headerInitial=byId('accountInitial'),previewUrl=pendingProfilePhotoUrl||profileAvatarUrl;
  headerInitial.textContent=initial;headerImage.classList.toggle('hidden',!profileAvatarUrl);headerInitial.classList.toggle('hidden',!!profileAvatarUrl);if(profileAvatarUrl)headerImage.src=profileAvatarUrl;
  byId('accountBtn').title=name+' · Open account';syncPrimaryHeaderActions();var preview=byId('profilePhotoPreview'),previewInitial=byId('profilePhotoInitial');if(preview){preview.classList.toggle('hidden',!previewUrl);previewInitial.classList.toggle('hidden',!!previewUrl);previewInitial.textContent=initial;if(previewUrl)preview.src=previewUrl}var remove=byId('removeProfilePhoto');if(remove){remove.classList.toggle('hidden',!profileAvatarUrl&&!pendingProfilePhoto);remove.textContent=pendingProfilePhoto?'Cancel':'Remove'}
}

async function loadOwnProfile(){
  if(!currentUser)return;var result=await supa.from('user_profiles').select('user_id,profile_name,job_title,avatar_path,updated_at').eq('user_id',currentUser.id).maybeSingle();
  if(result.error){profileFeatureAvailable=false;currentPrivateProfile=null;return}profileFeatureAvailable=true;currentPrivateProfile=result.data||{user_id:currentUser.id,profile_name:'',job_title:'',avatar_path:null};await refreshProfileAvatar();
}

function showProfileMessage(message,type){var el=byId('profileMessage');if(!el)return;el.textContent=message||'';el.className='formMessage'+(type?' '+type:'')}

function profileDraftSignature(){return JSON.stringify([(byId('profileName')&&byId('profileName').value||'').trim(),(byId('profileJobTitle')&&byId('profileJobTitle').value||'').trim(),byId('profileRosterName')&&byId('profileRosterName').value||''])}

function updateProfileSaveState(){var button=byId('saveProfileBtn');if(!button)return;var changed=!!pendingProfilePhoto||profileDraftSignature()!==profileSavedSignature;button.classList.toggle('hidden',!changed);if(changed&&byId('profileMessage').classList.contains('success')&&!pendingProfilePhoto)showProfileMessage('')}

function prepareAccountInformationArchitecture(){
  var dialog=byId('accountSheet'),scroll=dialog&&dialog.querySelector('.accountSheetScroll'),header=dialog&&dialog.querySelector('.accountSheetHeader');
  if(!dialog||!scroll||!header)return;
  var intro=scroll.querySelector('.accountSheetIntro');if(intro)intro.classList.add('hidden');
  var profile=byId('profileExperience'),appearance=byId('appearanceExperience'),actions=byId('accountActionsExperience'),passkeys=byId('passkeyList');
  var panes={profile:profile,preferences:appearance&&appearance.closest('.accountGroup'),help:actions&&actions.closest('.accountGroup'),security:passkeys&&passkeys.closest('.accountGroup')};
  Object.keys(panes).forEach(function(key){var pane=panes[key];if(pane){pane.classList.add('accountDetailPane','hidden');pane.setAttribute('data-account-pane',key)}});
  var home=byId('accountHomeHub');
  if(!home){
    home=document.createElement('section');home.id='accountHomeHub';home.className='accountHomeHub';
    home.innerHTML='<div class="accountHomeIdentity"><span class="accountHomeAvatar" id="accountHomeAvatar" aria-hidden="true">?</span><div><h3 id="accountHomeName">Your account</h3><p id="accountHomeRole">Anaesthetic team member</p><small id="accountHomeEmail"></small></div></div><div class="accountHubList"><button type="button" class="accountHubRow" data-account-section="profile"><span class="accountHubIcon" aria-hidden="true">◯</span><span><b>Profile</b><small>Your name, photo and roster highlight</small></span><i aria-hidden="true">›</i></button><button type="button" class="accountHubRow" data-account-section="preferences"><span class="accountHubIcon" aria-hidden="true">◐</span><span><b>Preferences</b><small>Appearance on this device</small></span><i aria-hidden="true">›</i></button><button type="button" class="accountHubRow" data-account-section="security"><span class="accountHubIcon" aria-hidden="true">⌁</span><span><b>Security</b><small>Passkeys and sign-in</small></span><i aria-hidden="true">›</i></button><button type="button" class="accountHubRow" data-account-section="help"><span class="accountHubIcon" aria-hidden="true">?</span><span><b>App &amp; Help</b><small>Guide, updates, install and share</small></span><i aria-hidden="true">›</i></button></div>';
    scroll.insertBefore(home,scroll.firstChild);
    var signOut=byId('accountSignOutBtn'),version=byId('accountVersion');if(signOut)home.appendChild(signOut);if(version)home.appendChild(version);
    Array.prototype.forEach.call(home.querySelectorAll('[data-account-section]'),function(button){button.onclick=function(){showAccountSection(button.getAttribute('data-account-section'))}});
  }
  if(!byId('accountBackBtn')){
    var back=document.createElement('button');back.type='button';back.id='accountBackBtn';back.className='accountBackBtn hidden';back.setAttribute('aria-label','Back to Account');back.textContent='‹';back.onclick=function(){showAccountSection('home')};header.insertBefore(back,header.firstChild)
  }
}
function showAccountSection(section){
  prepareAccountInformationArchitecture();var home=byId('accountHomeHub'),back=byId('accountBackBtn'),title=byId('accountSheetTitle'),eyebrow=byId('accountSheetEyebrow')||document.querySelector('#accountSheet .accountSheetHeader>div>span');
  var labels={profile:'Profile',preferences:'Preferences',security:'Security',help:'App & Help'},target=section&&section!=='home'?document.querySelector('[data-account-pane="'+section+'"]'):null;
  if(home)home.classList.toggle('hidden',!!target);Array.prototype.forEach.call(document.querySelectorAll('#accountSheet [data-account-pane]'),function(pane){pane.classList.toggle('hidden',pane!==target)});
  if(back)back.classList.toggle('hidden',!target);if(title)title.textContent=target?labels[section]:'Account';if(eyebrow)eyebrow.textContent=target?'Account':'Profile & preferences';
  var scroll=document.querySelector('#accountSheet .accountSheetScroll');if(scroll)scroll.scrollTop=0
}

function populateAccountSheet(){
  prepareAccountInformationArchitecture();
  var profile=currentPrivateProfile||{},name=privateProfileName(),rosterName=myName();
  profileSavedSignature=JSON.stringify([(profile.profile_name||'').trim(),(profile.job_title||'').trim(),rosterName||'']);
  var accountVersion=byId('accountVersion');if(accountVersion)accountVersion.textContent='Night Roster '+APP_VERSION+' · Database '+(schemaVersion||'legacy');var homeName=byId('accountHomeName'),homeRole=byId('accountHomeRole'),homeEmail=byId('accountHomeEmail'),homeAvatar=byId('accountHomeAvatar');if(homeName)homeName.textContent=name||currentUserProfile.display_name||'Your account';if(homeRole)homeRole.textContent=(profile.job_title||'Anaesthetic team member');if(homeEmail)homeEmail.textContent=currentUserProfile.email||'';if(homeAvatar)homeAvatar.textContent=(name||currentUserProfile.display_name||currentUserProfile.email||'?').charAt(0).toUpperCase();
  showProfileMessage(profileFeatureAvailable?'':'Ask the administrator to run the V32 profile upgrade before saving your profile.','error');updateProfileSaveState();updateAppearanceButtons();applyProfileIdentity();
  if(window.dispatchEvent&&typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('roster:account',{detail:{theme:themePreference(),installed:isStandaloneApp(),newRelease:releaseNeedsAttention(),version:APP_VERSION,profile:{name:profile.profile_name||'',jobTitle:profile.job_title||'',rosterName:rosterName||'',approvedName:currentUserProfile.display_name||'',email:currentUserProfile.email||'',options:TEAM.map(function(item){return{value:item,label:professionalName(item)}}),initial:(name||currentUserProfile.email||'?').charAt(0).toUpperCase(),photoUrl:pendingProfilePhotoUrl||profileAvatarUrl||'',featureAvailable:profileFeatureAvailable,pendingPhoto:!!pendingProfilePhoto,message:profileFeatureAvailable?'':'Ask the administrator to run the V32 profile upgrade before saving your profile.',messageType:profileFeatureAvailable?'':'error',changed:false}}}));
}

async function showAccountSheet(){var dialog=byId('accountSheet');populateAccountSheet();showAccountSection('home');if(dialog&&dialog.showModal&&!dialog.open){dialog.showModal();await loadPasskeys()}}

async function runAccountAction(action){
  if(action==='theme')return;
  if(action==='guide'){openOnboardingReplay();return}
  if(action==='whatsnew'){byId('accountSheet').close();renderReleaseNotes(false);var latest=byId('releaseNotes');if(latest&&!latest.open)latest.showModal();return}
  if(action==='versions'){byId('accountSheet').close();renderReleaseNotes(true);var history=byId('releaseNotes');if(history&&!history.open)history.showModal();return}
  if(action==='share'){showShareApp();return}
  if(action==='install'){byId('accountSheet').close();if(deferredInstallPrompt)await runInstallPrompt();else showInstallGuide()}
}

function photoBlob(file){
  return new Promise(function(resolve,reject){if(!file||!/^image\/(jpeg|png|webp)$/i.test(file.type)||file.size>8*1024*1024){reject(new Error('Choose a JPEG, PNG or WebP photo smaller than 8 MB.'));return}var image=new Image(),url=URL.createObjectURL(file);image.onload=function(){var size=Math.min(image.naturalWidth,image.naturalHeight),left=(image.naturalWidth-size)/2,top=(image.naturalHeight-size)/2,canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;canvas.getContext('2d').drawImage(image,left,top,size,size,0,0,512,512);URL.revokeObjectURL(url);canvas.toBlob(function(blob){blob?resolve(blob):reject(new Error('The photo could not be prepared.'))},'image/jpeg',.86)};image.onerror=function(){URL.revokeObjectURL(url);reject(new Error('The selected photo could not be opened.'))};image.src=url})
}

async function chooseProfilePhoto(file){try{pendingProfilePhoto=await photoBlob(file);if(pendingProfilePhotoUrl)URL.revokeObjectURL(pendingProfilePhotoUrl);pendingProfilePhotoUrl=URL.createObjectURL(pendingProfilePhoto);applyProfileIdentity();var onboardingPhoto=byId('onboardingPhotoBtn');if(onboardingPhoto)onboardingPhoto.innerHTML='<img id="onboardingPhotoPreview" src="'+esc(pendingProfilePhotoUrl)+'" alt=""><i aria-hidden="true">+</i>';updateProfileSaveState();showProfileMessage('Photo ready to save.','success')}catch(error){showProfileMessage(error.message,'error')}}

async function saveProfile(){
  if(!requireOnline())return;if(!profileFeatureAvailable){showProfileMessage('Run the V32 profile database upgrade first.','error');return}var button=byId('saveProfileBtn'),name=byId('profileName').value.trim(),title=byId('profileJobTitle').value.trim(),rosterName=byId('profileRosterName').value,path=currentPrivateProfile&&currentPrivateProfile.avatar_path||null;button.disabled=true;button.textContent='Saving…';showProfileMessage('Saving your profile…','');
  try{if(pendingProfilePhoto){path=currentUser.id+'/avatar.jpg';var uploaded=await supa.storage.from('profile-photos').upload(path,pendingProfilePhoto,{contentType:'image/jpeg',upsert:true,cacheControl:'3600'});if(uploaded.error)throw uploaded.error}var result=await supa.from('user_profiles').upsert({user_id:currentUser.id,profile_name:name||null,job_title:title||null,avatar_path:path,updated_at:new Date().toISOString()},{onConflict:'user_id'}).select().single();if(result.error)throw result.error;currentPrivateProfile=result.data;pendingProfilePhoto=null;if(pendingProfilePhotoUrl)URL.revokeObjectURL(pendingProfilePhotoUrl);pendingProfilePhotoUrl='';if(rosterName)appStorage.setItem('anaes_my_name',rosterName);else appStorage.removeItem('anaes_my_name');profileSavedSignature=profileDraftSignature();await refreshProfileAvatar();render();updateProfileSaveState();showProfileMessage('Your profile has been saved.','success');toast('Profile saved')}
  catch(error){showProfileMessage('Your profile could not be saved. Check your connection and try again.','error')}
  finally{button.disabled=false;button.textContent='Save profile';updateProfileSaveState()}
}

async function removeProfilePhoto(){
  if(!profileFeatureAvailable)return;if(pendingProfilePhoto){pendingProfilePhoto=null;if(pendingProfilePhotoUrl)URL.revokeObjectURL(pendingProfilePhotoUrl);pendingProfilePhotoUrl='';applyProfileIdentity();updateProfileSaveState();showProfileMessage('Photo change cancelled.');return}var path=currentPrivateProfile&&currentPrivateProfile.avatar_path;if(path){var removed=await supa.storage.from('profile-photos').remove([path]);if(removed.error){showProfileMessage('The photo could not be removed.','error');return}var updated=await supa.from('user_profiles').update({avatar_path:null,updated_at:new Date().toISOString()}).eq('user_id',currentUser.id);if(updated.error){showProfileMessage('The photo record could not be updated.','error');return}currentPrivateProfile.avatar_path=null}profileAvatarUrl='';applyProfileIdentity();updateProfileSaveState();render();showProfileMessage('Profile photo removed.','success')
}

async function loadPasskeys(){
  var button=byId('addPasskeyBtn'),message=byId('passkeyMessage'),detail={message:'',items:[]};if(!passkeySupported()){detail.message='Passkeys are not supported by this browser. Password sign-in remains available.';button.classList.add('hidden');if(window.dispatchEvent&&typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('roster:passkeys',{detail:detail}));return}button.classList.remove('hidden');message.textContent='';var result=await supa.auth.passkey.list();if(result.error){detail.message='No passkeys are available yet. Your administrator may still need to enable them in Supabase.';if(window.dispatchEvent&&typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('roster:passkeys',{detail:detail}));return}var list=result.data&&result.data.passkeys||result.data||[];detail.items=list.map(function(item){return{id:item.id||item.passkey_id,label:item.friendly_name||item.friendlyName||'Saved passkey'}});detail.message='No passkey has been added to this account.';if(window.dispatchEvent&&typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('roster:passkeys',{detail:detail}));
}

async function addPasskey(){var button=byId('addPasskeyBtn');button.disabled=true;byId('passkeyMessage').textContent='Follow your device instructions…';try{var result=await supa.auth.registerPasskey();if(result.error)throw result.error;if(result.data&&result.data.id)await supa.auth.passkey.update({passkeyId:result.data.id,friendlyName:'Night Roster on '+(navigator.platform||'this device')});byId('passkeyMessage').textContent='Passkey added. You can use it on the sign-in screen.';await loadPasskeys();toast('Passkey added')}catch(error){byId('passkeyMessage').textContent=/cancel|not allowed/i.test(error.message||'')?'Passkey setup was cancelled.':/disabled|not enabled/i.test(error.message||'')?'Passkeys must first be enabled in Supabase Authentication settings.':'The passkey could not be added. '+(error.message||'Please try again.')}finally{button.disabled=false}}

async function deletePasskey(id){if(!id||!confirm('Remove this passkey from your Night Roster account?'))return;var result=await supa.auth.passkey.delete({passkeyId:id});if(result.error){byId('passkeyMessage').textContent='The passkey could not be removed.';return}await loadPasskeys();toast('Passkey removed')}

function releasePolicy(){var latest=RELEASE_HISTORY[0]||{};return ['quiet','normal','important'].indexOf(latest.policy)>=0?latest.policy:'normal'}
function releaseNeedsAttention(){return appStorage.getItem('anaes_seen_version')!==APP_VERSION&&releasePolicy()!=='quiet'}
function markCurrentReleaseSeen(){appStorage.setItem('anaes_seen_version',APP_VERSION);var account=byId('accountSheet');if(account&&account.open)populateAccountSheet()}
function showReleaseNotesIfNeeded(){
  if(appStorage.getItem('anaes_seen_version')===APP_VERSION)return;
  var policy=releasePolicy(),returning=appStorage.getItem('anaes_selected_date')||appStorage.getItem('anaes_my_name');
  if(policy!=='important'||!returning)return;
  renderReleaseNotes();releaseNotesQueued=true;var dialog=byId('releaseNotes');setTimeout(function(){if(dialog&&dialog.showModal&&!dialog.open)dialog.showModal()},900)
}
function releaseMonthLabel(date){return String(date||'').replace(/^\\d+\\s+/,'')||String(date||'')}
function releaseActionButtons(actions){return(actions||[]).map(function(item){return'<button type="button" class="releaseShowMe" data-release-action="'+esc(item.action)+'" data-release-value="'+esc(item.value||'')+'">'+esc(item.label)+'<span aria-hidden="true">›</span></button>'}).join('')}
function releaseCurrentFallback(entry,actions){
  return'<div class="releaseHistory"><section class="releaseEntry latest releaseEditorial"><div class="releaseHero"><span class="releaseHeroMark" aria-hidden="true">✦</span><div><span class="releaseHeroEyebrow">Night Roster '+esc(entry.version)+'</span><h3>'+esc(entry.title)+'</h3><p>Here are the improvements worth knowing about.</p></div><time>'+esc(entry.date)+'</time></div><div class="releaseHighlights">'+entry.changes.map(function(change,index){var action=actions[index];return'<article class="releaseHighlight"><span class="releaseHighlightIndex" aria-hidden="true">'+(index+1)+'</span><p>'+esc(change)+'</p>'+(action?releaseActionButtons([action]):'')+'</article>'}).join('')+'</div><button type="button" class="releaseHistoryLink" data-release-action="history">View complete version history <span aria-hidden="true">›</span></button></section></div>'
}
function releaseHistoryFallback(entries){
  var month='';return'<div class="releaseNav" aria-label="Version history navigation"><button type="button" data-release-jump="latest">Latest update</button><button type="button" data-release-jump="previous">Earlier releases <span>'+Math.max(0,entries.length-1)+'</span></button></div><div class="releaseHistory releaseHistoryCompact" tabindex="0" aria-label="Complete Night Roster version history">'+entries.map(function(entry,index){var label=releaseMonthLabel(entry.date),heading=label!==month?'<div class="releaseMonthHeading">'+esc(label)+'</div>':'';month=label;return heading+'<details class="releaseEntry releaseHistoryItem '+(index===0?'latest':'')+'" data-history-index="'+index+'" '+(index===0?'open':'')+'><summary><span class="releaseHistoryVersion">v'+esc(entry.version)+'</span><span class="releaseHistoryCopy"><b>'+esc(entry.title)+'</b><small>'+esc(entry.date)+'</small></span><span class="releaseHistoryChevron" aria-hidden="true">⌄</span></summary><ul>'+entry.changes.map(function(change){return'<li>'+esc(change)+'</li>'}).join('')+'</ul></details>'}).join('')+'</div>'
}
function bindReleaseFallbackActions(host){
  Array.prototype.forEach.call(host.querySelectorAll('[data-release-action]'),function(button){button.onclick=function(){window.dispatchEvent(new CustomEvent('roster:release-action',{detail:{action:button.getAttribute('data-release-action'),value:button.getAttribute('data-release-value')||''}}))}});
  var history=host.querySelector('.releaseHistory');Array.prototype.forEach.call(host.querySelectorAll('[data-release-jump]'),function(button){button.onclick=function(){if(!history)return;var previous=button.getAttribute('data-release-jump')==='previous',target=history.querySelector('.releaseHistoryItem[data-history-index="'+(previous?'1':'0')+'"]');if(!target)return;history.scrollTo({top:Math.max(0,target.offsetTop-8),behavior:window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})}})
}
function renderReleaseNotes(showHistory){
  var dialog=byId('releaseNotes');if(!dialog)return;var latest=RELEASE_HISTORY[0],entries=showHistory?RELEASE_HISTORY:[latest],actions=RELEASE_ACTIONS[latest.version]||[];dialog.classList.add('releaseDialog');dialog.dataset.releaseMode=showHistory?'history':'current';
  var title=byId('releaseNotesTitle'),intro=byId('releaseNotesIntro'),close=byId('closeReleaseNotes');if(title)title.textContent=showHistory?'Version history':'What’s new';if(intro)intro.textContent=showHistory?'Every Night Roster release, newest first':'Version '+latest.version+' · The changes worth knowing about';if(close)close.textContent=showHistory?'Done':'Got it';
  if(!window.__forceReleaseNotesFallback&&typeof window.renderReactReleaseNotes==='function'){window.renderReactReleaseNotes(entries,!!showHistory,actions);return}
  var host=byId('releaseNotesContent');if(!host)return;host.innerHTML=showHistory?releaseHistoryFallback(entries):releaseCurrentFallback(latest,actions);bindReleaseFallbackActions(host);
  if(typeof window.CustomEvent==='function')window.dispatchEvent(new CustomEvent('roster:releasenotes',{detail:{entries:entries,showHistory:!!showHistory,actions:actions}}))
}

function ensureRecordActionSheet(){
  var dialog=byId('recordActionSheet');if(dialog)return dialog;
  dialog=document.createElement('dialog');dialog.id='recordActionSheet';dialog.className='recordActionSheet';dialog.setAttribute('aria-labelledby','recordActionTitle');dialog.innerHTML='<div class="sheetGrabber" aria-hidden="true"></div><div class="recordActionHeading"><span>Staffing record</span><h2 id="recordActionTitle">Choose an action</h2><p id="recordActionDetail"></p></div><div class="recordActionGroup"><button type="button" id="recordEditAction">Edit absence</button><button type="button" class="destructive" id="recordRemoveAction">Remove</button></div><button type="button" class="recordActionCancel" id="recordCancelAction">Cancel</button>';
  document.body.appendChild(dialog);byId('recordCancelAction').onclick=function(){dialog.close()};dialog.addEventListener('click',function(event){if(event.target===dialog)dialog.close()});return dialog;
}

function showRecordActions(kind,id,name){
  var dialog=ensureRecordActionSheet(),edit=byId('recordEditAction'),remove=byId('recordRemoveAction'),absence=kind==='absence';
  byId('recordActionTitle').textContent=name;byId('recordActionDetail').textContent=absence?'Recorded absence':'Confirmed overtime nurse';edit.classList.toggle('hidden',!absence);edit.onclick=function(){dialog.close();editNightChange(id)};remove.textContent=absence?'Remove absence':'Remove overtime nurse';remove.onclick=function(){dialog.close();if(absence)removeNightChange(id);else removeOvertime(id)};if(!dialog.open)dialog.showModal();
}

function educationState(){
  var state={main:0,chat:0,changes:0,breaks:0};
  try{var saved=JSON.parse(appStorage.getItem('anaes_education_state_v1')||'{}');Object.keys(state).forEach(function(key){if(Number(saved[key])>0)state[key]=Number(saved[key])})}catch(error){}
  if(appStorage.getItem('anaes_onboarding_complete_v34'))state.main=Math.max(state.main,2);
  if(appStorage.getItem('anaes_chat_intro_v37_31'))state.chat=Math.max(state.chat,1);
  return state
}
function educationSeen(key,version){return Number(educationState()[key]||0)>=Number(version||1)}
function markEducationSeen(key,version){
  var state=educationState();state[key]=Math.max(Number(state[key]||0),Number(version||1));try{appStorage.setItem('anaes_education_state_v1',JSON.stringify(state))}catch(error){}
  if(key==='main')appStorage.setItem('anaes_onboarding_complete_v34','1');if(key==='chat')appStorage.setItem('anaes_chat_intro_v37_31','1');refreshEducationMarkers()
}
function refreshEducationMarkers(){
  ['changes','breaks','chat'].forEach(function(view){var button=document.querySelector('.bottom button[data-v="'+view+'"]');if(!button)return;var fresh=!educationSeen(view,1);button.classList.toggle('educationNew',fresh);if(fresh)button.setAttribute('data-education-label','New');else button.removeAttribute('data-education-label')})
}
function onboardingMiniNight(selected){
  return'<div class="onboardingProductPreview onboardingNightPreview" aria-hidden="true"><div class="onboardingPreviewHead"><span>YOUR NIGHT</span><small>Example</small></div><div class="onboardingPreviewPerson"><span class="onboardingPreviewAvatar">'+esc(selected?professionalName(selected).charAt(0).toUpperCase():'A')+'</span><div><b>'+esc(selected?professionalName(selected):'Your roster name')+'</b><small>Your allocation stays first</small></div></div><div class="onboardingPreviewFacts"><span><small>Role</small><b>Shown here</b></span><span><small>Break</small><b>Highlighted</b></span></div></div>'
}
function onboardingWorkflowPreview(){
  return'<div class="onboardingProductPreview onboardingWorkflowPreview" aria-hidden="true"><div><span>1</span><b>Staffing</b><small>Who changed?</small></div><i></i><div><span>2</span><b>Allocation</b><small>Only if needed</small></div><i></i><div><span>3</span><b>Share</b><small>Confirm once</small></div></div>'
}
function featureEducationPage(key){
  if(key==='clockchange'){var date=onboardingClockChangeDate||cur().date,timing=nightDutyTiming(date),detail=clockChangeDetailFor(date);return'<div class="onboardingProductPreview clockChangeOnboardingPreview" aria-hidden="true"><div class="clockChangePreviewClock"><span>02</span><i>→</i><span>'+(timing.direction==='back'?'02':'03')+'</span></div><div class="clockChangePreviewSplit"><span><small>FIRST PART</small><b>'+esc(timing.firstPeriodDisplay)+'</b><em>'+esc(detail.partHoursLabel)+' actual</em></span><i></i><span><small>SECOND PART</small><b>'+esc(timing.secondPeriod)+'</b><em>'+esc(detail.partHoursLabel)+' actual</em></span></div></div><span class="onboardingEyebrow">Clock change night</span><h2 id="onboardingTitle">The app keeps both parts equal.</h2><p>'+esc(detail.transitionLabel)+'. Night Roster automatically moves the handover to <b>'+esc(detail.handoverDisplay)+'</b> so First Part and Second Part each work <b>'+esc(detail.partHoursLabel)+'</b> of real elapsed duty.</p><div class="onboardingCallout"><b>No manual adjustment needed</b><span>The roster names and break ownership stay the same. Only the duty handover time changes for this night.</span></div><p class="onboardingFootnote">Night, Breaks, live duty status and roster summaries all use this same equal-duty timing.</p>'}
  if(key==='chat')return'<div class="onboardingProductPreview featureChatPreview" aria-hidden="true"><span>'+interfaceIcon('chat')+'</span><div><i></i><i></i><i></i></div></div><span class="onboardingEyebrow">Team Chat</span><h2 id="onboardingTitle">Team chat, when you need it.</h2><p>Anaesthetic Team reaches everyone on tonight’s roster. Start a private conversation when you only need one colleague.</p><div class="onboardingFeatureList"><div><b>Team</b><span>Coordinate with tonight’s whole roster</span></div><div><b>Private</b><span>Message one registered team member</span></div><div><b>Safety</b><span>Roster coordination only, never patient-identifiable or clinical information</span></div></div><p class="onboardingFootnote">Chat never changes the roster. Record an agreed staffing or role change separately in Changes.</p>';
  if(key==='changes')return onboardingWorkflowPreview()+'<span class="onboardingEyebrow">Changes</span><h2 id="onboardingTitle">You usually don’t need this screen.</h2><p>The standard six-nurse night is already calculated. Use Changes only for a confirmed absence, overtime nurse or agreed night-only allocation.</p><div class="onboardingCallout onboardingCalmCallout"><b>Normal night?</b><span>There is nothing to confirm. Night and Breaks are already ready.</span></div>';
  return'<div class="onboardingProductPreview onboardingBreakPreview" aria-hidden="true"><div><small>FIRST BREAK</small><b>Your name</b><span>03:30 onward</span></div><div><small>SECOND BREAK</small><b>Team</b><span>00:00 to 03:30</span></div><button type="button" tabindex="-1">Jump to me</button></div><span class="onboardingEyebrow">Breaks</span><h2 id="onboardingTitle">Your break is already highlighted.</h2><p>Breaks follows the same live staffing plan as Night. Use Jump to me when you want your own row immediately.</p><div class="onboardingCallout onboardingCalmCallout"><b>One shared plan</b><span>Staffing and role changes flow through to Breaks automatically.</span></div>'
}
function appGuidePage(){
  return'<span class="onboardingEyebrow">App guide</span><h2 id="onboardingTitle">Help that takes you to the right place.</h2><p>Choose a topic. Night Roster will either open that screen or replay its short explanation.</p><div class="appGuideList"><button type="button" data-guide-view="today"><span class="appGuideIcon">'+interfaceIcon('night')+'</span><span><b>Night</b><small>Your allocation and the live team plan</small></span><i>›</i></button><button type="button" data-guide-view="changes"><span class="appGuideIcon">'+interfaceIcon('staffing')+'</span><span><b>Changes</b><small>Absence, overtime and agreed exceptions</small></span><i>›</i></button><button type="button" data-guide-view="breaks"><span class="appGuideIcon">'+interfaceIcon('task')+'</span><span><b>Breaks</b><small>Your break and the shared schedule</small></span><i>›</i></button><button type="button" data-guide-view="chat"><span class="appGuideIcon">'+interfaceIcon('chat')+'</span><span><b>Team Chat</b><small>Team and private roster coordination</small></span><i>›</i></button><button type="button" data-guide-action="account"><span class="appGuideIcon">Aa</span><span><b>Account & notifications</b><small>Profile, appearance, alerts and sign-in</small></span><i>›</i></button><button type="button" data-guide-action="updates"><span class="appGuideIcon">↺</span><span><b>Updates & version history</b><small>What changed and every previous release</small></span><i>›</i></button></div>'
}
function onboardingPages(){
  if(onboardingGuideMenu)return[appGuidePage()];if(onboardingFeatureKey||onboardingChatIntro)return[featureEducationPage(onboardingFeatureKey||'chat')];
  var accountName=currentUserProfile&&currentUserProfile.display_name||'',selected=myName()||TEAM.find(function(name){return sameNurse(name,accountName)})||'';
  return[
    '<span class="onboardingEyebrow">Welcome</span><h2 id="onboardingTitle">First, which roster name is yours?</h2><p>Night Roster uses this only to bring your own allocation and break to the front on this device.</p><div class="onboardingIdentityPreview"><span>'+(selected?esc(professionalName(selected).charAt(0).toUpperCase()):'?')+'</span><div><b>'+(selected?esc(professionalName(selected)):'Choose your roster name')+'</b><small>'+(selected?'Matched from your signed-in account':'You can change this later in Account')+'</small></div></div><label class="onboardingNameLabel"><span>Roster name</span><select id="onboardingNamePick"><option value="">Choose your name</option>'+TEAM.map(function(name){return'<option value="'+esc(name)+'" '+(sameNurse(name,selected)?'selected':'')+'>'+esc(professionalName(name))+'</option>'}).join('')+'</select></label><p class="onboardingFootnote">This never changes the shared roster or anyone else’s allocation.</p>',
    onboardingMiniNight(selected)+'<span class="onboardingEyebrow">Night</span><h2 id="onboardingTitle">What matters to you stays first.</h2><p>Night opens with your own assignment, your break and the live staffing picture before the rest of the team detail.</p><div class="onboardingCallout"><b>No hunting through the roster</b><span>Your personal answer is always the first thing Night tries to show.</span></div>',
    onboardingWorkflowPreview()+'<span class="onboardingEyebrow">Changes</span><h2 id="onboardingTitle">The normal roster is automatic.</h2><p>You only need Changes when something genuinely differs from the calculated night, such as an absence, overtime nurse or an agreed night-only role change.</p><div class="onboardingCallout onboardingCalmCallout"><b>That’s enough to start</b><span>Breaks and Team Chat will explain themselves the first time you open them.</span></div><button type="button" class="onboardingShareShortcut" data-share-night-roster><span><b>Share Night Roster</b><small>Show a QR code to another authorised team member</small></span><i>›</i></button>'
  ]
}
function bindGuideActions(){
  Array.prototype.forEach.call(document.querySelectorAll('[data-guide-view]'),function(button){button.onclick=function(){var view=button.getAttribute('data-guide-view'),dialog=byId('onboardingDialog');onboardingGuideMenu=false;onboardingReplay=false;if(dialog&&dialog.open)dialog.close();show(view);if(view!=='today')setTimeout(function(){showFeatureEducation(view,true)},160)}});
  Array.prototype.forEach.call(document.querySelectorAll('[data-guide-action]'),function(button){button.onclick=function(){var action=button.getAttribute('data-guide-action'),dialog=byId('onboardingDialog');onboardingGuideMenu=false;onboardingReplay=false;if(dialog&&dialog.open)dialog.close();if(action==='account')showAccountSheet();else if(action==='updates'){renderReleaseNotes(true);var release=byId('releaseNotes');if(release&&!release.open)release.showModal()}}})
}
function renderOnboarding(){
  var dialog=byId('onboardingDialog'),content=byId('onboardingContent'),pages=onboardingPages();if(!dialog||!content)return;
  onboardingStep=Math.max(0,Math.min(pages.length-1,onboardingStep));var feature=onboardingFeatureKey||onboardingChatIntro?'feature':onboardingGuideMenu?'guide':'main';dialog.dataset.onboardingPage=feature==='main'?String(onboardingStep):feature;dialog.classList.toggle('onboardingFeatureIntro',feature==='feature');dialog.classList.toggle('onboardingGuideMode',feature==='guide');
  content.innerHTML=pages[onboardingStep];content.classList.remove('onboardingContentIn','onboardingContentBack');void content.offsetWidth;content.classList.add(onboardingDirection<0?'onboardingContentBack':'onboardingContentIn');
  byId('onboardingProgress').innerHTML=pages.map(function(_,index){return'<span class="'+(index===onboardingStep?'active':'')+'" aria-hidden="true"></span>'}).join('');byId('onboardingProgress').setAttribute('aria-valuenow',String(onboardingStep+1));byId('onboardingProgress').setAttribute('aria-valuemax',String(pages.length));
  byId('onboardingStepLabel').textContent=feature==='guide'?'App guide':feature==='feature'?'Quick tip · '+(onboardingFeatureKey==='clockchange'?'Clock change':onboardingFeatureKey==='chat'||onboardingChatIntro?'Chat':onboardingFeatureKey==='changes'?'Changes':'Breaks'):(onboardingStep+1)+' of '+pages.length;
  byId('onboardingBackBtn').classList.toggle('hidden',feature!=='main'||onboardingStep===0);byId('onboardingNextBtn').textContent=feature==='guide'?'Done':feature==='feature'?'Got it':onboardingStep===pages.length-1?'Open my night':'Continue';byId('onboardingSkipBtn').textContent=feature==='main'?'Skip for now':'Close';byId('onboardingSkipBtn').classList.toggle('hidden',feature!=='main'||onboardingStep===pages.length-1);
  var select=byId('onboardingNamePick');if(select)select.onchange=function(){if(select.value)appStorage.setItem('anaes_my_name',select.value);else appStorage.removeItem('anaes_my_name');renderOnboarding()};var shareShortcut=document.querySelector('[data-share-night-roster]');if(shareShortcut)shareShortcut.onclick=function(){var dialog=byId('onboardingDialog');if(dialog&&dialog.open)dialog.close();showShareApp()};bindGuideActions();
  if(dialog.open){content.scrollTop=0;var heading=byId('onboardingTitle');if(heading){heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true})}}
}
async function finishOnboarding(){
  var dialog=byId('onboardingDialog');
  if(onboardingGuideMenu){onboardingGuideMenu=false;onboardingReplay=false;if(dialog&&dialog.open)dialog.close();toast('App guide closed');return}
  if(onboardingFeatureKey||onboardingChatIntro){var key=onboardingFeatureKey||'chat';if(key==='clockchange')markClockChangeEducationSeen(onboardingClockChangeDate);else markEducationSeen(key,1);onboardingFeatureKey='';onboardingClockChangeDate='';onboardingChatIntro=false;onboardingReplay=false;if(dialog&&dialog.open)dialog.close();toast(key==='clockchange'?'Clock-change timing understood':key==='chat'?'Team chat is ready':key==='changes'?'Changes guide completed':'Breaks guide completed');return}
  var wasReplay=onboardingReplay,select=byId('onboardingNamePick');if(select&&select.value)appStorage.setItem('anaes_my_name',select.value);markEducationSeen('main',2);onboardingCandidate=false;onboardingReplay=false;onboardingProfileDraft=null;if(dialog&&dialog.open)dialog.close();render();toast(wasReplay?'Guide completed':'Your night is ready')
}
function showOnboardingIfNeeded(){
  if(!currentUserProfile||releaseNotesQueued||educationSeen('main',2))return;var dialog=byId('onboardingDialog');if(!dialog||!dialog.showModal)return;onboardingFeatureKey='';onboardingClockChangeDate='';onboardingChatIntro=false;onboardingGuideMenu=false;onboardingReplay=false;onboardingDirection=1;onboardingStep=0;renderOnboarding();setTimeout(function(){if(!dialog.open)dialog.showModal()},cinematicMotionAllowed()?520:40)
}
function showFeatureEducation(key,force){
  if(['changes','breaks','chat'].indexOf(key)<0||!currentUserProfile||!educationSeen('main',2))return;if(!force&&educationSeen(key,1))return;
  var dialog=byId('onboardingDialog'),release=byId('releaseNotes');if(!dialog||!dialog.showModal||dialog.open||release&&release.open)return;onboardingFeatureKey=key;onboardingChatIntro=key==='chat';onboardingGuideMenu=false;onboardingReplay=false;onboardingDirection=1;onboardingStep=0;renderOnboarding();setTimeout(function(){if(!dialog.open)dialog.showModal()},cinematicMotionAllowed()?240:20)
}
function showClockChangeEducation(date,force){
  var timing=nightDutyTiming(date);if(!timing.isClockChange||!currentUserProfile||!educationSeen('main',2))return;if(!force&&clockChangeEducationSeen(date))return;
  var dialog=byId('onboardingDialog'),release=byId('releaseNotes');if(!dialog||!dialog.showModal||dialog.open||release&&release.open)return;onboardingFeatureKey='clockchange';onboardingClockChangeDate=date;onboardingChatIntro=false;onboardingGuideMenu=false;onboardingReplay=false;onboardingDirection=1;onboardingStep=0;renderOnboarding();setTimeout(function(){if(!dialog.open)dialog.showModal()},cinematicMotionAllowed()?240:20)
}
function bindFeatureEducation(){
  refreshEducationMarkers();
  window.addEventListener('roster:viewchange',function(event){var view=event&&event.detail&&event.detail.view;if(['changes','breaks','chat'].indexOf(view)>=0){refreshEducationMarkers();setTimeout(function(){showFeatureEducation(view,false)},220)}});
  window.addEventListener('roster:release-action',function(event){var detail=event&&event.detail||{},dialog=byId('releaseNotes');if(detail.action==='history'){renderReleaseNotes(true);return}if(dialog&&dialog.open){markCurrentReleaseSeen();dialog.close()}if(detail.action==='guide'){openOnboardingReplay();return}if(detail.action==='share'){showShareApp();return}if(detail.action==='view'&&detail.value){show(detail.value);if(['changes','breaks','chat'].indexOf(detail.value)>=0)setTimeout(function(){showFeatureEducation(detail.value,true)},180)}})
}
function bindOnboarding(){
  var dialog=byId('onboardingDialog'),next=byId('onboardingNextBtn'),back=byId('onboardingBackBtn'),skip=byId('onboardingSkipBtn');if(!next||!back||!skip)return;
  next.onclick=async function(){rememberOnboardingProfile();var last=onboardingPages().length-1;if(onboardingStep<last){onboardingDirection=1;onboardingStep++;renderOnboarding()}else{next.disabled=true;next.textContent=onboardingFeatureKey||onboardingChatIntro||onboardingGuideMenu?'Closing…':'Saving…';await finishOnboarding();next.disabled=false}};back.onclick=function(){if(onboardingStep>0){onboardingDirection=-1;onboardingStep--;renderOnboarding()}};skip.onclick=finishOnboarding;
  if(dialog&&typeof dialog.addEventListener==='function')dialog.addEventListener('cancel',function(event){if(onboardingFeatureKey||onboardingChatIntro){event.preventDefault();finishOnboarding();return}onboardingGuideMenu=false;onboardingReplay=false})
}

function installedReleaseState(){var latest=RELEASE_HISTORY[0]&&RELEASE_HISTORY[0].version||'Unknown',cache=String(serviceWorkerCacheVersion||'').replace(/^anaesthetic-night-roster-v/,'').replace(/-/g,'.'),stale=cache!=='Checking…'&&cache!=='Not active'&&cache!==APP_VERSION;return{latest:latest,cache:serviceWorkerCacheVersion,stale:stale,waiting:!!(updateRegistration&&updateRegistration.waiting)}}

function diagnosticsText(){
  var backupAt=appStorage.getItem('anaes_last_backup_at'),release=installedReleaseState(),clock=window.AnaestheticDomain&&window.AnaestheticDomain.clockState?window.AnaestheticDomain.clockState():{source:'device',offsetMs:0},caps=rosterCapabilities(),events=window.AnaestheticDomain&&window.AnaestheticDomain.readDiagnostics?window.AnaestheticDomain.readDiagnostics().slice(-10):[],lines=['Running app version: '+APP_VERSION,'Latest release-history version: '+release.latest,'Service-worker cache: '+release.cache,'Installed release: '+(release.stale?'stale cache detected':release.waiting?'update waiting for approval':'current'),'Expected database schema: '+EXPECTED_SCHEMA_VERSION,'Actual database schema: '+(schemaVersion||'legacy'),'Capabilities: server clock '+(caps.serverClock?'yes':'no')+' · chat idempotency '+(caps.chatIdempotency?'yes':'no')+' · monotonic reads '+(caps.monotonicChatRead?'yes':'no'),'Clock source: '+clock.source+' · offset '+Math.round(Number(clock.offsetMs||0))+' ms','Connection state: '+sharedSyncState,'Last successful refresh: '+(lastSuccessfulSyncAt?new Date(lastSuccessfulSyncAt).toLocaleString('en-GB'):'not yet'),'Startup compatibility fallback uses this session: '+compatibilityStartupUseCount+(compatibilityStartupLastUsed?' · last '+compatibilityStartupLastUsed:''),'Last roster-data export: '+(backupAt?new Date(backupAt).toLocaleString('en-GB'):'not recorded on this device'),'Published roster until: '+(rosterSettings.published_until||'unknown'),'Calculated nights: '+R.length,'Current account: '+(currentUserProfile?'signed in as '+currentUserProfile.user_role:'not signed in')];if(events.length){lines.push('Recent local diagnostics:');events.forEach(function(item){lines.push(item.at+' · '+item.category+' · '+item.operation+' · '+item.code)})}return lines.join('\n');
}

function renderDiagnostics(){var el=byId('appDiagnostics');if(!el)return;var backupAt=appStorage.getItem('anaes_last_backup_at'),schemaState=schemaVersion>=EXPECTED_SCHEMA_VERSION?'Current':'Upgrade required',release=installedReleaseState(),compatCount=Number(appStorage.getItem('anaes_compat_startup_count')||0),compatLast=appStorage.getItem('anaes_compat_startup_last_at'),clockConfidence=window.AnaestheticRuntime&&window.AnaestheticRuntime.clock?window.AnaestheticRuntime.clock.confidence():null;el.innerHTML='<div class="diagnosticGrid"><div class="historyItem"><b>Application versions</b><div class="changeMeta">Running '+esc(APP_VERSION)+' · Release history '+esc(release.latest)+'</div></div><div class="historyItem"><b>Service-worker cache</b><div class="changeMeta">'+esc(release.cache)+' · '+esc(release.stale?'Stale cached release detected':release.waiting?'Update awaiting approval':'Current')+'</div></div><div class="historyItem"><b>Database schema</b><div class="changeMeta">Expected '+esc(EXPECTED_SCHEMA_VERSION)+' · Actual '+esc(schemaVersion||'legacy')+' · '+esc(schemaState)+'</div></div><div class="historyItem"><b>Shared-data connection</b><div class="changeMeta">'+(navigator.onLine?'Online':'Offline')+' · Last refreshed '+esc(lastSuccessfulSyncAt?new Date(lastSuccessfulSyncAt).toLocaleString('en-GB'):'not yet')+'</div></div><div class="historyItem"><b>Clock confidence</b><div class="changeMeta">'+esc(clockConfidence?clockConfidence.level+' · '+clockConfidence.sampleCount+' accepted sample'+(clockConfidence.sampleCount===1?'':'s'):'Device clock')+'</div></div><div class="historyItem"><b>Compatibility startup</b><div class="changeMeta">'+esc(compatCount?compatCount+' fallback use'+(compatCount===1?'':'s')+' · Last '+(compatLast?new Date(compatLast).toLocaleString('en-GB'):'this session'):'No fallback use recorded on this device')+'</div></div><div class="historyItem"><b>Last roster-data export</b><div class="changeMeta">'+esc(backupAt?new Date(backupAt).toLocaleString('en-GB'):'Not recorded')+'</div></div></div>'+(release.waiting?'<button type="button" class="primary wide" id="diagnosticUpdateBtn">Update now</button>':'')+'<button type="button" class="soft wide" id="copyDiagnosticsBtn">Copy diagnostic report</button>';var button=byId('copyDiagnosticsBtn');if(button)button.onclick=async function(){try{await navigator.clipboard.writeText(diagnosticsText());toast('Diagnostic report copied')}catch(error){toast('Diagnostic report could not be copied')}};var update=byId('diagnosticUpdateBtn');if(update)update.onclick=applyWaitingUpdate}

function prettyDateMarkup(date){
  if(!date)return'<strong>Select a night</strong><small>Open calendar</small>';
  var value=new Date(date+'T12:00:00'),main=value.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'}),year=value.getFullYear(),state=R.length?automaticNightState():null,automatic=state&&R[state.index]&&R[state.index].date;
  var context=automatic&&date===automatic?(state.isCurrent?'Current roster night':'Next roster night'):automatic&&date<automatic?'Past roster night':'Roster night';
  return'<strong>'+esc(main)+'</strong><small>'+esc(context+' · '+year)+'</small>';
}

function updatePrettyDate(input){
  if(!input)return;var button=input.parentNode&&input.parentNode.querySelector('.prettyDateButton');if(button)button.innerHTML=prettyDateMarkup(input.value);
}

function enhanceDatePicker(id){
  var input=byId(id);if(!input||input.parentNode.classList.contains('prettyDateControl'))return;
  var host=document.createElement('div'),button=document.createElement('button');host.className='prettyDateControl';button.type='button';button.className='prettyDateButton';button.setAttribute('aria-label','Open calendar');
  input.parentNode.insertBefore(host,input);host.appendChild(button);host.appendChild(input);input.classList.add('nativeDatePicker');updatePrettyDate(input);
  button.onclick=function(){try{if(input.showPicker)input.showPicker();else input.click()}catch(error){input.focus();input.click()}};
}


function prepareChangesView(){
  if(changesViewPrepared)return;
  var required=['today','changes','breaks','roster','changesStaffingPane','changesAllocationPane','changesConfirmPane','personalNightCard','nightStatusRow'];
  if(required.some(function(id){return !byId(id)}))return;
  document.body.setAttribute('data-view','today');
  ['datePick','changesDatePick','breakDatePick'].forEach(enhanceDatePicker);
  byId('viewRosterBtn').onclick=function(){show('roster')};
  byId('closeRosterBtn').onclick=function(){show('today')};
  byId('smartNightBtn').onclick=goToAutomaticNight;
  byId('changesSmartNightBtn').onclick=goToAutomaticNight;
  byId('closeNamePickerBtn').onclick=function(){byId('personalNamePicker').classList.add('hidden')};
  byId('continueToAllocationBtn').onclick=function(){setChangesStep('allocation',true)};
  byId('continueToConfirmBtn').onclick=function(){setChangesStep('confirm',true)};
  byId('changesInfoBtn').onclick=function(){openScreenInfo('changes')};
  byId('breaksInfoBtn').onclick=function(){openScreenInfo('breaks')};
  Array.prototype.forEach.call(document.querySelectorAll('[data-changes-step]'),function(button){button.onclick=function(){setChangesStep(button.getAttribute('data-changes-step'),true)}});
  window.addEventListener('roster:changes-step-request',function(event){var step=event&&event.detail&&event.detail.step;if(['staffing','allocation','confirm'].indexOf(step)>=0)setChangesStep(step,true)});
  changesViewPrepared=true;renderDiagnostics();
}
function openScreenInfo(kind){
  var dialog=byId('screenInfoSheet'),title=byId('screenInfoTitle'),intro=byId('screenInfoIntro'),content=byId('screenInfoContent');if(!dialog||!title||!intro||!content)return;
  var items=kind==='breaks'?[['What you see','The break plan always follows the selected night and its latest shared staffing.'],['What happens automatically','Changes to absences, overtime or roles update Night and Breaks together.'],['When the plan is provisional','Breaks cannot be finalised until every required staffing decision is complete.']]:[['Start with Staffing','Record only confirmed absences and overtime nurses.'],['Allocation is usually automatic','A standard six-nurse night uses the rostered roles, with Pager first and Reliever second in Labour Ward.'],['Confirm only changes','A final review is needed only after a staffing change or an agreed night-only role change.']];
  title.textContent=kind==='breaks'?'About Breaks':'About Staffing changes';intro.textContent=kind==='breaks'?'A live view of the selected night’s breaks.':'A three-step path for exceptional changes.';if(typeof window.renderReactScreenInfo==='function')window.renderReactScreenInfo(items);else content.innerHTML=items.map(function(item){return'<section class="infoSheetItem"><h3>'+esc(item[0])+'</h3><p>'+esc(item[1])+'</p></section>'}).join('');if(!dialog.open)dialog.showModal();if(typeof window.CustomEvent==='function')window.dispatchEvent(new CustomEvent('roster:screeninfo',{detail:{items:items}}));
}

function syncDateInputs(date){
  ['datePick','changesDatePick','breakDatePick'].forEach(function(id){var el=byId(id);if(!el)return;el.min=R[0].date;el.max=R[R.length-1].date;el.value=date;updatePrettyDate(el)});
  ['prevNightBtn','changesPrevNightBtn','breakPrevNightBtn'].forEach(function(id){var el=byId(id);if(el)el.disabled=idx<=0});
  ['nextNightBtn','changesNextNightBtn','breakNextNightBtn'].forEach(function(id){var el=byId(id);if(el)el.disabled=idx>=R.length-1});
}

function maltaDateParts(value){
  if(window.AnaestheticDomain&&window.AnaestheticDomain.maltaParts)return window.AnaestheticDomain.maltaParts(value==null?appNow():value);
  var parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Malta',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(value||new Date()),out={};
  parts.forEach(function(part){if(part.type!=='literal')out[part.type]=Number(part.value)});return out;
}

function operationalRosterDate(value){
  if(window.AnaestheticDomain&&window.AnaestheticDomain.operationalRosterDate)return window.AnaestheticDomain.operationalRosterDate(value==null?appNow():value);
  var p=maltaDateParts(value),date=[p.year,String(p.month).padStart(2,'0'),String(p.day).padStart(2,'0')].join('-');
  return p.hour<7?addDays(date,-1):date;
}

function resolveNightContext(value,selectedDate){
  var now=value==null?appNow():value,automatic=window.AnaestheticDomain&&window.AnaestheticDomain.resolveAutomaticNight?window.AnaestheticDomain.resolveAutomaticNight(R,now):null;
  if(!automatic){var p=maltaDateParts(now),target=operationalRosterDate(now),autoIndex=R.findIndex(function(r){return r.date>=target});if(autoIndex<0)autoIndex=Math.max(0,R.length-1);automatic={index:autoIndex,date:R[autoIndex]&&R[autoIndex].date||null,isCurrent:!!(R[autoIndex]&&R[autoIndex].date===target&&(p.hour<7||p.hour>=19)),calendarDate:[p.year,String(p.month).padStart(2,'0'),String(p.day).padStart(2,'0')].join('-'),operationalDate:target,hour:p.hour,minute:p.minute,phase:'next'}}
  var selected=selectedDate||(R[idx]&&R[idx].date)||automatic.date,timing=selected?nightDutyTiming(selected):null,nowValue=now instanceof Date?now.getTime():Number(new Date(now).getTime()),selectedIsAutomatic=selected===automatic.date,phase='selected';
  if(selectedIsAutomatic&&automatic.isCurrent&&timing){phase=nowValue<timing.startUtc?'evening':nowValue<timing.handoverUtc?'first':nowValue<timing.endUtc?'second':'complete'}else if(selectedIsAutomatic)phase='next';
  return{index:automatic.index,automaticDate:automatic.date,selectedDate:selected,isCurrent:automatic.isCurrent,selectedIsAutomatic:selectedIsAutomatic,calendarDate:automatic.calendarDate,operationalDate:automatic.operationalDate,phase:phase,timing:timing,nowMs:nowValue,selectionMode:nightSelectionMode};
}

function startingIndex(value){return R.length?resolveNightContext(value).index:0}

function automaticNightState(value){
  var context=resolveNightContext(value),selected=idx===context.index&&nightSelectionMode==='automatic';
  return{index:context.index,isCurrent:context.isCurrent,selected:selected,label:selected?(context.isCurrent?'Current night selected':'Next night selected'):(context.isCurrent?'Return to current night':'Return to next roster night')};
}

function selectedNightCopy(date,value){
  var context=resolveNightContext(value,date),automatic=context.automaticDate;
  if(context.isCurrent&&date===automatic)return{label:'Current night',assignment:'Current night’s assignment',changed:'Changed this night'};
  if(date===automatic&&!context.isCurrent)return{label:'Next night',assignment:'Next night’s assignment',changed:'Changed for next night'};
  if(date===context.calendarDate)return{label:'Tonight',assignment:'Tonight’s assignment',changed:'Changed tonight'};
  return{label:'Selected night',assignment:'Selected night’s assignment',changed:'Changed for this night'};
}

function quickActionsModel(){
  var base=cur(),plan=staffingPlan(base),tasks=workflowTaskDetails(base,plan),copy=selectedNightCopy(base.date),count=Number(plan.count||0),blocked=sharedWritesBlocked(),offline=!navigator.onLine||forcedOfflineSession,canEdit=!blocked&&!offline,planLabel='';
  if(count<5)planLabel='Cover required before the plan can be finalised';
  else if(tasks.length)planLabel=tasks.length+' decision'+(tasks.length===1?'':'s')+' still to resolve';
  else if(count===6)planLabel='Standard plan ready';
  else planLabel='Plan ready';
  return{contextLabel:copy.label,dateLabel:fmt(base.date),staffingLabel:count+' nurse'+(count===1?'':'s'),planLabel:planLabel,attentionCount:tasks.length,canEdit:canEdit,editReason:offline?'Reconnect to edit the shared roster.':blocked?sharedWriteNotice():''};
}
function renderQuickActionsFallback(model){
  var context=byId('quickActionsFallbackContext'),staffing=byId('quickActionsFallbackStaffing');if(context)context.textContent=model.contextLabel+' · '+model.dateLabel;if(staffing)staffing.textContent=model.staffingLabel+' · '+model.planLabel;
  ['quickAbsenceFallback','quickOvertimeFallback'].forEach(function(id){var button=byId(id);if(button){button.disabled=!model.canEdit;button.setAttribute('aria-disabled',model.canEdit?'false':'true')}});
  var attention=byId('quickActionAttention');if(attention)attention.classList.toggle('hidden',!model.attentionCount);
}
function showQuickActions(){
  var dialog=byId('quickActionsSheet');if(!dialog||document.body.classList.contains('authPending'))return;var model=quickActionsModel();renderQuickActionsFallback(model);
  if(window.dispatchEvent&&typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('roster:quick-actions',{detail:model}));
  if(dialog.showModal&&!dialog.open)dialog.showModal();
}
function quickActionScroll(selector){
  window.setTimeout(function(){var target=document.querySelector(selector);if(target&&target.scrollIntoView)target.scrollIntoView({behavior:window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'})},80);
}
function performQuickAction(action){
  var dialog=byId('quickActionsSheet');if(dialog&&dialog.open)dialog.close();
  if(action==='absence'||action==='overtime'||action==='review'){
    show('changes');
    var step=action==='review'?smartChangesStep(cur()):'staffing';setChangesStep(step,false);
    quickActionScroll(action==='absence'?'.absenceSection':action==='overtime'?'.overtimeSection':'#changes .changePanel');
    return;
  }
  if(action==='private-chat'){
    show('chat');if(typeof window.openChatView==='function')window.openChatView();
    window.setTimeout(function(){var button=byId('chatNewPrivateBtn');if(button)button.click()},120);return;
  }
  if(action==='share'){showShareApp();return}
}
window.showQuickActions=showQuickActions;
window.performQuickAction=performQuickAction;

function updateSmartNightButtons(){
  var state=automaticNightState();
  ['smartNightBtn','changesSmartNightBtn'].forEach(function(id){
    var button=byId(id);if(!button)return;var label=button.querySelector('span');if(label)label.textContent=state.label;else button.textContent=state.label;
    button.disabled=state.selected;button.classList.toggle('hidden',state.selected);button.setAttribute('aria-label',state.label);
  });
  var shortcut=byId('smartNightBtn'),row=shortcut&&shortcut.closest('.rosterShortcutRow');if(row)row.classList.toggle('singleShortcut',state.selected);
}

function renderHeaderSummary(r){
  var state=automaticNightState(),label=state.selected?(state.isCurrent?'Current night':'Next night'):'Selected',count=r.understaffedCount||staffingPlan(baseForDate(r.date)).count;
  byId('headerDateChip').textContent=label+' · '+fmt(r.date);byId('headerModeChip').textContent=count+' nurses';byId('headerModeChip').className='headerChip headerModeChip mode'+r.mode;
}

function goToAutomaticNight(){
  nightSelectionMode='automatic';var context=resolveNightContext();if(window.AnaestheticRuntime&&window.AnaestheticRuntime.state)window.AnaestheticRuntime.state.night.set(context.isCurrent?'automatic-current':'automatic-next');idx=context.index;automaticSelectedDate=R[idx].date;appStorage.setItem('anaes_selected_date',R[idx].date);render();toast(context.isCurrent?'Current working night opened':'Next available roster night opened');
}

function refreshAutomaticNightOnReturn(){
  if(document.visibilityState!=='visible'||!initialNightChosen||nightSelectionMode!=='automatic'||!R.length)return;
  var context=resolveNightContext(),nextDate=R[context.index].date;if(window.AnaestheticRuntime&&window.AnaestheticRuntime.state)window.AnaestheticRuntime.state.night.set(context.isCurrent?'automatic-current':'automatic-next');
  if(nextDate!==automaticSelectedDate){idx=context.index;automaticSelectedDate=nextDate;appStorage.setItem('anaes_selected_date',nextDate);render();toast(context.isCurrent?'Roster moved to the current night':'Roster moved to the next available night')}
}

var shadowPlanSignatures={};
function shadowNightPlanCheck(plan){
  if(!window.AnaestheticRuntime||!plan||!plan.base)return true;
  var signature=plan.date+':'+String(lastObservedSyncRevision==null?'none':lastObservedSyncRevision);
  if(shadowPlanSignatures[signature])return true;
  shadowPlanSignatures[signature]=true;
  var legacyEffective=applyChanges(plan.base),legacyStaffing=staffingPlan(plan.base);
  var canonicalAssignments=(plan.staffing&&plan.staffing.validAssignments||[]).map(function(item){return[String(item.id),item.allocation_key||'']}).sort();
  var legacyAssignments=(legacyStaffing&&legacyStaffing.validAssignments||[]).map(function(item){return[String(item.id),item.allocation_key||'']}).sort();
  var left={effective:plan.effective,count:plan.staffing&&plan.staffing.count,unresolved:plan.staffing&&plan.staffing.unresolved,assignments:canonicalAssignments};
  var right={effective:legacyEffective,count:legacyStaffing&&legacyStaffing.count,unresolved:legacyStaffing&&legacyStaffing.unresolved,assignments:legacyAssignments};
  return window.AnaestheticRuntime.shadowCompare('night-plan',left,right)
}

var lastChangesWorkflowModel=null;
function setChangesStep(step,scroll){
  activeChangesStep=step==='confirm'?'confirm':step==='allocation'?'allocation':'staffing';
  var staffing=byId('changesStaffingPane'),allocation=byId('changesAllocationPane'),confirmation=byId('changesConfirmPane');if(!staffing||!allocation||!confirmation)return;
  staffing.classList.toggle('hidden',activeChangesStep!=='staffing');allocation.classList.toggle('hidden',activeChangesStep!=='allocation');confirmation.classList.toggle('hidden',activeChangesStep!=='confirm');
  Array.prototype.forEach.call(document.querySelectorAll('[data-changes-step]'),function(button){var selected=button.getAttribute('data-changes-step')===activeChangesStep;button.classList.toggle('active',selected);button.setAttribute('aria-selected',selected?'true':'false')});
  if(lastChangesWorkflowModel&&typeof CustomEvent==='function'){
    lastChangesWorkflowModel.active=activeChangesStep;
    window.dispatchEvent(new CustomEvent('roster:changes-workflow',{detail:lastChangesWorkflowModel}));
  }
  if(scroll)(byId('changesWorkflowExperience').dataset.reactReady==='true'?byId('changesWorkflowExperience'):byId('changesWorkflowState')).scrollIntoView({behavior:'smooth',block:'start'});
}

function workflowTaskCount(base,plan,r){
  return workflowTaskDetails(base,plan).length;
}

function smartChangesStep(base){
  var plan=staffingPlan(base),tasks=workflowTaskDetails(base,plan).length;
  if(tasks)return'allocation';
  if(workflowNeedsConfirmation(base,tasks))return'confirm';
  return'staffing';
}

function localChangesDraftParts(base){
  base=base||cur();var date=base.date,parts=[],draft=allocationDrafts[date]||{};
  if(Object.keys(draft).some(function(key){return String(draft[key]||'').trim().length>0}))parts.push('allocation selections');
  if(seventhDecisionDrafts[date])parts.push('seventh-nurse choice');
  if(nightRoleOverrideDrafts[date])parts.push('night-only roles');
  if(cur().date===date){
    var absence=byId('absentName'),overtime=byId('overtimeName');
    if(editingAbsenceId||absence&&absence.value)parts.push('absence form');
    if(overtime&&normaliseNurseName(overtime.value))parts.push('overtime entry');
  }
  return parts;
}

function localChangesDraftSummary(base){
  var parts=localChangesDraftParts(base);
  if(!parts.length)return'';
  return parts.length===1?'Unsaved '+parts[0]:'Unsaved selections in '+parts.length+' places';
}

function allLocalChangesDraftParts(){
  if(!R.length)return[];var currentDate=cur().date,dates=[currentDate];
  [allocationDrafts,seventhDecisionDrafts,nightRoleOverrideDrafts].forEach(function(map){Object.keys(map||{}).forEach(function(date){if(dates.indexOf(date)<0)dates.push(date)})});
  var parts=[];dates.forEach(function(date){var base=R.find(function(item){return item.date===date});if(!base)return;localChangesDraftParts(base).forEach(function(part){parts.push({date:date,part:part})})});return parts;
}

function protectLocalChangesDraft(event){
  if(!currentUserProfile||!allLocalChangesDraftParts().length)return;
  event.preventDefault();event.returnValue='';
}

function workflowTaskDetails(base,plan){
  var tasks=[];
  if(plan.requiresCoverageChoice)tasks.push('Choose the theatre role the rostered Reliever will cover');
  if(plan.requiresSeventhDecision)tasks.push('Choose whether '+professionalName(plan.seventhNurse)+' moves to the seventh position');
  plan.availableKeys.forEach(function(key){if(!selectedAllocationId(base,key))tasks.push('Choose a nurse for '+allocationLabel(key))});
  return tasks;
}

function planNeedsConfirmation(base,decisionTasks){
  if(decisionTasks)return true;var status=nightPlanStatuses[base.date];if(!status||!status.published_at)return true;
  var publishedAt=new Date(status.published_at).getTime(),latest=0;changesFor(base.date).concat(overtimeFor(base.date)).forEach(function(item){latest=Math.max(latest,new Date(item.updated_at||0).getTime()||0)});var storedOrder=labourOrders[base.date];if(storedOrder)latest=Math.max(latest,new Date(storedOrder.updated_at||0).getTime()||0);var roleOverride=nightRoleOverrides[base.date];if(roleOverride)latest=Math.max(latest,new Date(roleOverride.updated_at||0).getTime()||0);
  var draft=allocationDrafts[base.date]||{},plan=staffingPlan(base);if(Object.keys(draft).some(function(key){var saved=plan.validAssignments.find(function(item){return item.allocation_key===key});return(draft[key]||'')!==(saved?saved.id:'')}))return true;
  var labourDraft=labourOrderDrafts[base.date],preview=allocationPreview(base),savedLabour=labourOrderFor(preview);if(labourDraft&&(!savedLabour||labourDraft.first!==savedLabour.first_part_name||labourDraft.second!==savedLabour.second_part_name))return true;
  return latest>publishedAt;
}

function workflowHasManualPlan(base){
  var roleOverride=nightRoleOverrides[base.date];
  return changesFor(base.date).length>0||overtimeFor(base.date).length>0||!!(roleOverride&&validRoleAssignments(roleOverride.assignments));
}

function workflowNeedsConfirmation(base,decisionTasks){
  if(decisionTasks)return true;
  return workflowHasManualPlan(base)&&planNeedsConfirmation(base,0);
}

function fixedRolesHtml(base,plan){
  var r=applyChanges(base),keys=['first1','first2','second1','second2'],rows=[];
  if(r.mode==='5')rows.push(['Full Labour Ward / Pager',r.fullLW]);else keys=keys.concat(['pager','reliever']);
  keys.forEach(function(key){if(plan.availableKeys.indexOf(key)<0&&plan.absentKeys.indexOf(key)<0)rows.push([allocationLabel(key),r[key]])});
  if(r.mode==='7'&&!plan.requiresSeventhDecision&&plan.availableKeys.indexOf('seventh')<0)rows.push(['Seventh nurse',r.seventh]);
  return rows.filter(function(row){return row[1]&&String(row[1]).indexOf('allocation to decide')<0}).map(function(row){return'<div class="fixedRoleRow"><span>'+esc(row[0])+'</span><b>'+esc(professionalNames(row[1]))+'</b></div>'}).join('');
}

function updateChangesWorkflow(base,plan){
  if(!changesViewPrepared)return;
  var r=applyChanges(base),taskDetails=workflowTaskDetails(base,plan),tasks=taskDetails.length,taskInstruction=taskDetails[0]||'',confirmNeeded=workflowNeedsConfirmation(base,tasks),hasManualPlan=workflowHasManualPlan(base),changes=changesFor(base.date),overtime=overtimeFor(base.date),staffingState=byId('staffingStepState'),allocationState=byId('allocationStepState'),confirmState=byId('confirmStepState'),state=byId('changesWorkflowState'),badge=byId('changesTaskBadge'),draftLabel=localChangesDraftSummary(base);
  staffingState.textContent=changes.length||overtime.length?changes.length+' absent · '+overtime.length+' overtime':'No changes';
  var published=nightPlanStatuses[base.date];allocationState.textContent=tasks?tasks+' task'+(tasks===1?'':'s')+' remaining':'Current roles';confirmState.textContent=tasks?'Resolve tasks':confirmNeeded?'Review changes':published&&published.published_at&&hasManualPlan?'Shared':'Not needed';
  var staffingTab=document.querySelector('[data-changes-step="staffing"]'),allocationTab=document.querySelector('[data-changes-step="allocation"]'),confirmTab=document.querySelector('[data-changes-step="confirm"]'),confirmationNotNeeded=!hasManualPlan&&!confirmNeeded,hasStaffingChanges=!!(changes.length||overtime.length),shared=!!(published&&published.published_at&&hasManualPlan&&!confirmNeeded);staffingTab.classList.toggle('complete',hasStaffingChanges);allocationTab.classList.toggle('complete',hasManualPlan&&!tasks);allocationTab.classList.toggle('hasTasks',!!tasks);confirmTab.classList.toggle('complete',shared);confirmTab.classList.toggle('notNeeded',confirmationNotNeeded);confirmTab.classList.toggle('hasTasks',!!confirmNeeded);
  state.innerHTML=tasks?'<b>'+esc(taskInstruction)+'</b><span>'+(tasks>1?esc((tasks-1)+' other allocation decision'+(tasks===2?' also remains.':'s also remain.')):'Select the nurse, then review the changes.')+'</span>':confirmNeeded?'<b>Ready to review</b><span>Check the selected night’s changes before sharing them with everyone.</span>':published&&published.published_at&&hasManualPlan?'<b>Changes shared</b><span>Updated by '+esc(published.published_by||'a shift member')+' at '+esc(shortTime(published.published_at))+'.</span>':'';
  state.classList.toggle('hidden',!tasks&&!confirmNeeded&&!hasManualPlan);
  state.classList.toggle('complete',!confirmNeeded);state.classList.toggle('ready',!tasks&&confirmNeeded);
  var badgeCount=tasks||(confirmNeeded?1:0);badge.textContent=badgeCount;badge.classList.toggle('hidden',!badgeCount);var quickAttention=byId('quickActionAttention');if(quickAttention)quickAttention.classList.toggle('hidden',!badgeCount);
  var allocationAction=byId('continueToAllocationBtn');allocationAction.textContent=tasks?'Resolve allocations':'View or adjust roles';allocationAction.classList.toggle('quietAction',!tasks&&!confirmNeeded);
  var changesPanel=document.querySelector('#changes .changePanel');if(changesPanel)changesPanel.classList.toggle('planShared',shared);
  var confirmButton=byId('continueToConfirmBtn');confirmButton.disabled=!!tasks;confirmButton.classList.toggle('hidden',!confirmNeeded);confirmButton.textContent='Review changes';var confirmReason=byId('continueToConfirmReason');if(confirmReason){confirmReason.textContent=tasks?'Complete the allocation above before reviewing changes.':'';confirmReason.classList.toggle('hidden',!tasks)}
  var allocationSection=document.querySelector('.allocationSection');if(allocationSection)allocationSection.classList.toggle('hidden',!tasks&&!hasManualPlan);
  var allocationHeading=document.querySelector('.allocationSection .stepHeader h3');if(allocationHeading)allocationHeading.textContent='Finalise selected-night allocations';
  var confirmationHeading=document.querySelector('#changesConfirmPane .stepHeader h3'),confirmationIntro=byId('confirmationIntro');if(confirmationHeading)confirmationHeading.textContent=confirmNeeded?'Confirm selected-night changes':shared?'Changes shared':'No changes to review';if(confirmationIntro)confirmationIntro.classList.toggle('hidden',!tasks&&!confirmNeeded);
  var progressValue=tasks?1:confirmNeeded?2:3,progressLabel=tasks?'1 of 3 resolved':confirmNeeded?'2 of 3 resolved':shared?'3 of 3 shared':'Automatic plan ready';
  lastChangesWorkflowModel={active:activeChangesStep,steps:[
    {id:'staffing',label:'Staffing',detail:changes.length||overtime.length?changes.length+' absent · '+overtime.length+' overtime':'Record people',complete:hasStaffingChanges,attention:false,quiet:false},
    {id:'allocation',label:'Allocation',detail:tasks?tasks+' decision'+(tasks===1?'':'s'):'Review roles',complete:hasManualPlan&&!tasks,attention:!!tasks,quiet:!tasks},
    {id:'confirm',label:shared?'Shared':'Confirm',detail:tasks?'After allocation':confirmNeeded?'Review changes':shared?'Published':'When needed',complete:shared,attention:!!confirmNeeded,quiet:confirmationNotNeeded}
  ],headline:tasks?taskInstruction:confirmNeeded?'Ready to review':shared?'Plan shared':'Standard plan is automatic',
  guidance:tasks?(tasks>1?(tasks-1)+' other allocation decision'+(tasks===2?' also remains.':'s also remain.'):'Choose a nurse, then review the changes.'):confirmNeeded?'Check the selected night’s changes before sharing them with everyone.':shared?'Staffing and roles are up to date for everyone.':'Record an absence or overtime only when staffing changes.' ,
  tone:tasks?'attention':confirmNeeded?'ready':shared?'complete':'automatic',progressValue:progressValue,progressMax:3,progressLabel:progressLabel,draftLabel:draftLabel};
  var fixed=fixedRolesHtml(base,plan),fixedList=byId('fixedAllocationList');fixedList.innerHTML=fixed||'<div class="time">Roles will appear after the staffing decisions are complete.</div>';byId('fixedAllocationSummary').textContent='Selected-night roles · '+(fixed.match(/fixedRoleRow/g)||[]).length;
  renderConfirmationPreview(base,plan,tasks,confirmNeeded,taskInstruction);updateConfirmationControls(confirmNeeded,tasks);
  setChangesStep(activeChangesStep,false);
}

function confirmationRow(label,value,detail){return'<div class="confirmationRow"><div><span>'+esc(label)+'</span>'+(detail?'<small>'+esc(detail)+'</small>':'')+'</div><b>'+esc(value||'To decide')+'</b></div>'}

function confirmationChangeRow(label,before,after,detail){return'<div class="confirmationChangeRow"><div><span>'+esc(label)+'</span>'+(detail?'<small>'+esc(detail)+'</small>':'')+'</div><div class="confirmationChangeValues"><del>'+esc(before||'Not assigned')+'</del><i aria-hidden="true">→</i><ins>'+esc(after||'Not assigned')+'</ins></div></div>'}
function confirmationPlanItem(label,value,detail){return{label:label,value:value?professionalNames(value):'To decide',detail:detail||''}}
function confirmationChangeItem(label,before,after,detail){return{label:label,before:professionalNames(before)||'Not assigned',after:professionalNames(after)||'Not assigned',detail:detail||''}}

function labourAssignmentDetail(name,order){
  if(!order)return'Labour Ward part pending';
  var first=order.first||order.first_part_name;
  return canonicalNurseName(first)===canonicalNurseName(name)?'Labour Ward first part · Second break':'Labour Ward second part · First break';
}

function confirmationPlanRows(r,order){
  var rows=[confirmationPlanItem('First part theatre',r.first1+' + '+r.first2,'Second break'),confirmationPlanItem('Second part theatre',r.second1+' + '+r.second2,'First break')];
  if(r.mode==='5')rows.push(confirmationPlanItem('Full-night Labour Ward / Pager',r.fullLW,'Break coordinated when clinical cover allows'));
  else{rows.push(confirmationPlanItem('Pager',r.pager,labourAssignmentDetail(r.pager,order)));rows.push(confirmationPlanItem('Reliever',r.reliever,labourAssignmentDetail(r.reliever,order)))}
  if(r.mode==='7')rows.push(confirmationPlanItem('Seventh nurse',r.seventh,'Break coordinated as required'));
  return rows;
}

function confirmationChangedRows(base,r,order){
  var rostered=rawBaseForDate(base.date),labels={first1:'First Part theatre · position 1',first2:'First Part theatre · position 2',second1:'Second Part theatre · position 1',second2:'Second Part theatre · position 2',pager:'Pager',reliever:'Reliever',seventh:'Seventh nurse'},rows=[];
  ['first1','first2','second1','second2'].forEach(function(key){if(canonicalNurseName(rostered[key])!==canonicalNurseName(r[key]))rows.push(confirmationChangeItem(labels[key],rostered[key],r[key],allocationBreak(key)))});
  if(r.mode==='5'){var before=rostered.pager+' + '+rostered.reliever;if(canonicalNurseName(rostered.pager)!==canonicalNurseName(r.fullLW)||canonicalNurseName(rostered.reliever)!==canonicalNurseName(r.fullLW))rows.push(confirmationChangeItem('Full-night Labour Ward / Pager',before,r.fullLW,'00:00–07:00'))}
  else ['pager','reliever'].forEach(function(key){if(canonicalNurseName(rostered[key])!==canonicalNurseName(r[key]))rows.push(confirmationChangeItem(labels[key],rostered[key],r[key],labourAssignmentDetail(r[key],order)))});
  if(r.mode==='7'&&canonicalNurseName(rostered.seventh)!==canonicalNurseName(r.seventh))rows.push(confirmationChangeItem(labels.seventh,rostered.seventh,r.seventh,'Break coordinated as required'));
  if(!rows.length){changesFor(base.date).forEach(function(change){rows.push(confirmationChangeItem('Absence',change.absent_name,change.replacement_name||'Not working',change.reason||'Unavailable'))});overtimeFor(base.date).forEach(function(entry){rows.push(confirmationChangeItem('Overtime','Not working',entry.nurse_name,entry.allocation_key?allocationLabel(entry.allocation_key):'Allocation to decide'))})}
  return rows;
}

function confirmationReason(base){var reasons=[],override=nightRoleOverrides[base.date];if(override&&override.reason)reasons.push(override.reason);changesFor(base.date).forEach(function(change){if(change.reason)reasons.push(change.reason)});reasons=reasons.filter(function(reason,index,list){return list.indexOf(reason)===index});return reasons.join(' · ')}

function renderConfirmationPreview(base,plan,tasks,confirmNeeded,taskInstruction){
  var host=byId('confirmationPreview');if(!host)return;var r=allocationPreview(base);
  var visible=!!(tasks||confirmNeeded),order=labourOrderDrafts[base.date]||labourOrderFor(r)||(!tasks?{first:r.pager,second:r.reliever}:null),changed=visible?confirmationChangedRows(base,r,order):[],full=visible?confirmationPlanRows(r,order):[],reason=visible?confirmationReason(base):'';
  var model={visible:visible,blocked:!!tasks,instruction:taskInstruction||'Complete the remaining allocation',changed:changed,full:full,reason:reason};
  if(host.dataset.reactReady!=='true')host.innerHTML=visible?(tasks?'<div class="confirmationWarning">'+esc(model.instruction)+' before continuing.</div>':'<div class="confirmationReady">Review only what changed before sharing.</div>')+'<div class="confirmationChanges">'+changed.map(function(item){return confirmationChangeRow(item.label,item.before,item.after,item.detail)}).join('')+'</div>'+(reason?'<div class="confirmationReason"><span>Reason</span><b>'+esc(reason)+'</b></div>':'')+'<details class="confirmationFullPlan"><summary>View full plan</summary><div>'+full.map(function(item){return confirmationRow(item.label,item.value,item.detail)}).join('')+'</div></details>':'';
  if(window.dispatchEvent&&typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('roster:changes-confirmation',{detail:model}));
}

function cur(){
  var base=Object.assign({},localCur());base.mode='6';return applyNightRoleOverride(base);
}

function rawBaseForDate(date){
  var original=R.find(function(r){return r.date===date})||localCur();var base=Object.assign({},original);base.mode='6';return base;
}

function roleAssignmentKeys(assignments){return assignments&&assignments.mode==='5'?FIVE_NIGHT_ROLE_KEYS:assignments&&assignments.mode==='7'?SEVEN_NIGHT_ROLE_KEYS:CORE_ALLOCATION_KEYS}
var FIVE_NIGHT_ROLE_KEYS=['first1','first2','second1','second2','fullLW'];
var SEVEN_NIGHT_ROLE_KEYS=['first1','first2','second1','second2','pager','reliever','seventh'];
function validRoleAssignments(assignments){if(!assignments||typeof assignments!=='object'||Array.isArray(assignments))return false;var keys=roleAssignmentKeys(assignments),custom=assignments.mode==='5'||assignments.mode==='7',expected=(custom?keys.concat(['mode']):keys).slice().sort(),supplied=Object.keys(assignments).sort();if(expected.length!==supplied.length||expected.some(function(key,index){return supplied[index]!==key}))return false;var values=keys.map(function(key){return String(assignments[key]||'').trim()});return values.every(Boolean)&&new Set(values.map(function(name){return canonicalNurseName(name)})).size===keys.length}
function sameNightNameSet(left,right){if(left.length!==right.length)return false;var wanted=left.map(function(name){return canonicalNurseName(name)}).sort(),actual=right.map(function(name){return canonicalNurseName(name)}).sort();return wanted.every(function(name,index){return name===actual[index]})}
function nightWorkingNames(base){var raw=rawBaseForDate(base.date),changes=changesFor(base.date),overtime=overtimeFor(base.date),absent=changes.map(function(change){return canonicalNurseName(change.absent_name)}),names=[];function add(name){name=String(name||'').trim();if(name&&!names.some(function(saved){return canonicalNurseName(saved)===canonicalNurseName(name)}))names.push(name)}CORE_ALLOCATION_KEYS.forEach(function(key){if(absent.indexOf(canonicalNurseName(raw[key]))<0)add(raw[key])});changes.forEach(function(change){add(change.replacement_name)});overtime.forEach(function(entry){add(entry.nurse_name)});return names}
function validRoleAssignmentsForNight(base,assignments){if(!validRoleAssignments(assignments))return false;var working=nightWorkingNames(base),assigned;if(assignments.mode==='5'){assigned=FIVE_NIGHT_ROLE_KEYS.map(function(key){return assignments[key]});return working.length===5&&sameNightNameSet(working,assigned)}if(assignments.mode==='7'){assigned=SEVEN_NIGHT_ROLE_KEYS.map(function(key){return assignments[key]});return working.length===7&&sameNightNameSet(working,assigned)}return true}
function customFiveAssignmentsFor(base){var stored=nightRoleOverrides[base.date],assignments=stored&&stored.assignments;return validRoleAssignmentsForNight(base,assignments)&&assignments.mode==='5'?Object.assign({},assignments):null}
function applyNightRoleOverride(base){var copy=Object.assign({},base),stored=nightRoleOverrides[base.date],assignments=stored&&stored.assignments;if(validRoleAssignments(assignments)&&assignments.mode!=='5'){CORE_ALLOCATION_KEYS.forEach(function(key){copy[key]=assignments[key]});if(assignments.mode==='7'){copy.seventh=assignments.seventh;copy.mode='7'}}return copy}
function baseForDate(date){return applyNightRoleOverride(rawBaseForDate(date))}

function seventhRotationChoice(base,changes){
  var scheduled=base.seventh||'OT Nurse';
  if(scheduled==='OT Nurse')return{scheduled:scheduled,nurse:'OT Nurse',source:'overtime',fallback:false,vacatedKey:'seventh'};
  var absent=(changes||[]).map(function(c){return String(c.absent_name||'').toLowerCase()});
  var scheduledKey=allocationKeyForName(base,scheduled);
  if(scheduledKey&&absent.indexOf(String(scheduled).toLowerCase())<0)return{scheduled:scheduled,nurse:scheduled,source:'permanent',fallback:false,vacatedKey:scheduledKey};
  var version=versionForDate(base.date),cycle=version&&Array.isArray(version.seventh_cycle)&&version.seventh_cycle.length?version.seventh_cycle:ORIGINAL_SEVENTH;
  var start=cycle.indexOf(scheduled);if(start<0)start=0;
  /* calculateNight advances the seventh rotation backwards through the stored cycle. */
  for(var step=1;step<=cycle.length;step++){
    var candidate=cycle[((start-step)%cycle.length+cycle.length)%cycle.length];
    if(!candidate||candidate==='OT Nurse'||absent.indexOf(String(candidate).toLowerCase())>=0)continue;
    var key=allocationKeyForName(base,candidate);
    if(key)return{scheduled:scheduled,nurse:candidate,source:'permanent',fallback:true,vacatedKey:key};
  }
  return{scheduled:scheduled,nurse:'OT Nurse',source:'overtime',fallback:true,vacatedKey:'seventh'};
}

function staffingPlan(base){
  base=applyNightRoleOverride(base);var changes=changesFor(base.date),overtime=overtimeFor(base.date),absentKeys=[],openKeys=[],legacyCover=0;
  changes.forEach(function(c){var key=allocationKeyForName(base,c.absent_name);if(!key)return;if(absentKeys.indexOf(key)<0)absentKeys.push(key);if(c.replacement_name)legacyCover++;else if(openKeys.indexOf(key)<0)openKeys.push(key)});
  var count=6-absentKeys.length+legacyCover+overtime.length,customFive=customFiveAssignmentsFor(base);
  if(count===5&&customFive){var assignedNames=FIVE_NIGHT_ROLE_KEYS.map(function(key){return customFive[key]}),usedOvertime=overtime.filter(function(entry){return assignedNames.some(function(name){return canonicalNurseName(name)===canonicalNurseName(entry.nurse_name)})});return{changes:changes,overtime:overtime,absentKeys:absentKeys,openKeys:openKeys,availableKeys:[],count:count,coverageKey:'custom',coverageChoices:[],coverageSource:'night-only',requiresCoverageChoice:false,requiresSeventhDecision:false,seventhDecision:null,validAssignments:usedOvertime,unassigned:[],unresolved:[],coreComplete:true,extraCount:0,complete:true,seventhChoice:null,seventhNurse:null,seventhVacatedKey:null,customFiveAssignments:customFive}}
  var seventhChoice=null,seventhDecision=null,requiresSeventhDecision=false;
  if(count>=7){seventhChoice=seventhRotationChoice(base,changes);if(seventhChoice.source==='overtime')seventhDecision='overtime';else{var savedRotation=overtime.some(function(o){return o.allocation_key===seventhChoice.vacatedKey}),savedOvertime=overtime.some(function(o){return o.allocation_key==='seventh'});seventhDecision=seventhDecisionDrafts[base.date]||(savedOvertime?'overtime':savedRotation?'rotation':null);requiresSeventhDecision=!seventhDecision}seventhChoice.decision=seventhDecision;if(seventhDecision){var seventhOpenKey=seventhDecision==='rotation'?seventhChoice.vacatedKey:'seventh';if(openKeys.indexOf(seventhOpenKey)<0)openKeys.push(seventhOpenKey)}}
  var coverageKey=null,coverageChoices=[],coverageSource='';if(count===5&&openKeys.length){if(openKeys.indexOf('reliever')>=0){coverageKey='reliever';coverageSource='automatic'}else if(openKeys.indexOf('pager')>=0){coverageKey='pager';coverageSource='automatic'}else{coverageChoices=openKeys.filter(function(key){return['first1','first2','second1','second2'].indexOf(key)>=0});var stored=fiveCoverFor(base.date);if(coverageChoices.length===1){coverageKey=coverageChoices[0];coverageSource='automatic'}else if(stored&&coverageChoices.indexOf(stored.coverage_key)>=0){coverageKey=stored.coverage_key;coverageSource='saved'}}}
  var requiresCoverageChoice=count===5&&coverageChoices.length>1&&!coverageKey,availableKeys=requiresCoverageChoice?[]:openKeys.filter(function(key){return key!==coverageKey}),usedAllocationKeys={},usedOvertimeIds={};var validAssignments=overtime.filter(function(o){var valid=availableKeys.indexOf(o.allocation_key)>=0&&!usedAllocationKeys[o.allocation_key]&&!usedOvertimeIds[o.id];if(valid){usedAllocationKeys[o.allocation_key]=true;usedOvertimeIds[o.id]=true}return valid}),assignedIds=validAssignments.map(function(o){return o.id}),unassigned=overtime.filter(function(o){return assignedIds.indexOf(o.id)<0}),unresolved=availableKeys.filter(function(key){return !validAssignments.some(function(o){return o.allocation_key===key})}),coreComplete=!requiresCoverageChoice&&!requiresSeventhDecision&&unresolved.length===0&&count>=5;
  return{changes:changes,overtime:overtime,absentKeys:absentKeys,openKeys:openKeys,availableKeys:availableKeys,count:count,coverageKey:coverageKey,coverageChoices:coverageChoices,coverageSource:coverageSource,requiresCoverageChoice:requiresCoverageChoice,requiresSeventhDecision:requiresSeventhDecision,seventhDecision:seventhDecision,validAssignments:validAssignments,unassigned:unassigned,unresolved:unresolved,coreComplete:coreComplete,extraCount:Math.max(0,count-7),complete:coreComplete,seventhChoice:seventhChoice,seventhNurse:seventhChoice?seventhChoice.nurse:null,seventhVacatedKey:seventhChoice?seventhChoice.vacatedKey:null};
}

function additionalNurses(plan){
  return plan.count>7&&plan.coreComplete?plan.unassigned.slice():[];
}

function planIsProvisional(base){
  var plan=staffingPlan(base);
  return plan.count<5||plan.requiresCoverageChoice||plan.requiresSeventhDecision||plan.unresolved.length>0;
}

function applyChanges(r){
  r=applyNightRoleOverride(r);var copy=Object.assign({},r),fields=['first1','first2','second1','second2','pager','reliever','fullLW','seventh'];
  copy.mode='6';
  var changes=changesFor(r.date),plan=staffingPlan(copy);
  if(plan.customFiveAssignments){FIVE_NIGHT_ROLE_KEYS.forEach(function(key){copy[key]=plan.customFiveAssignments[key]});copy.mode='5';copy.staffingAdjusted=true;copy.pendingAllocations=[];copy.additionalStaff=[];return copy}
  var customSeven=nightRoleOverrides[r.date]&&nightRoleOverrides[r.date].assignments;
  if(customSeven&&customSeven.mode==='7'&&validRoleAssignmentsForNight(r,customSeven)){SEVEN_NIGHT_ROLE_KEYS.forEach(function(key){copy[key]=customSeven[key]});copy.mode='7';copy.staffingAdjusted=true;copy.pendingAllocations=[];copy.additionalStaff=[];return copy}
  if(plan.count>=7){
    if(plan.seventhChoice.source==='permanent'&&plan.seventhDecision==='rotation')copy.seventh=plan.seventhNurse;
    else copy.seventh=plan.requiresSeventhDecision?'Decision required':'Overtime nurse • allocation to decide';
  }
  changes.filter(function(c){return c.replacement_name}).forEach(function(change){
    fields.forEach(function(k){if(copy[k]===change.absent_name)copy[k]=change.replacement_name});
  });
  plan.validAssignments.forEach(function(o){copy[o.allocation_key]=o.nurse_name});
  if(plan.requiresCoverageChoice){
    plan.openKeys.forEach(function(key){copy[key]='Reliever allocation must be chosen first'});
    copy.mode='5';copy.staffingAdjusted=true;copy.relieverChoiceRequired=true;copy.pendingAllocations=plan.openKeys.slice();
    return copy;
  }
  if(plan.overtime.length){
    var pendingNames=plan.unassigned.map(function(o){return o.nurse_name});
    var pending=plan.count<5?'Uncovered • additional cover required':pendingNames.length===1?pendingNames[0]+' • allocation to decide':pendingNames.length?'Allocation to decide • '+pendingNames.length+' overtime nurses available':'Allocation pending';
    plan.unresolved.forEach(function(key){copy[key]=pending});
    if(plan.count===5&&plan.coverageKey)applyFiveVacancy(copy,plan.coverageKey);
    copy.mode=String(Math.max(5,Math.min(7,plan.count)));
    copy.staffingAdjusted=true;copy.pendingAllocations=plan.unresolved.slice();copy.additionalStaff=additionalNurses(plan).map(function(o){return o.nurse_name});
    if(plan.count<5){copy.understaffedCount=plan.count;copy.fullLW=''}
    return copy;
  }
  if(plan.count===5&&plan.coverageKey){applyFiveVacancy(copy,plan.coverageKey);copy.staffingAdjusted=true;copy.pendingAllocations=[];return copy}
  if(plan.unresolved.length>1){
    plan.unresolved.forEach(function(key){copy[key]='Uncovered • additional cover required'});
    copy.mode='5';copy.staffingAdjusted=true;copy.understaffedCount=plan.count;copy.fullLW='';copy.pendingAllocations=plan.unresolved.slice();
  }
  return copy;
}

function effective(r){
  var plan=staffingPlan(baseForDate(r.date)),count=r.understaffedCount||plan.count,alert;
  if(count<5)alert=count+' nurses are currently recorded. Additional overtime cover is required before allocations and breaks can be finalised.';
  else if(r.mode==='5')alert='Five-nurse arrangement: '+r.fullLW+' covers Labour Ward / Pager from 00:00 to 07:00.';
  else if(count>7)alert=count+' nurses are recorded. The core seven-nurse arrangement is shown, with additional staff available as required.';
  else if(r.mode==='7'&&plan.requiresSeventhDecision)alert='Seven-nurse arrangement: decide whether '+plan.seventhNurse+' moves from '+allocationLabel(plan.seventhVacatedKey)+' into the seventh position.';
  else if(r.mode==='7'&&plan.seventhChoice&&plan.seventhChoice.source==='permanent'&&plan.seventhDecision==='rotation')alert='Seven-nurse arrangement: '+r.seventh+' moves from '+allocationLabel(plan.seventhVacatedKey)+' into the seventh position. Overtime fills the vacated role.';
  else if(r.mode==='7'&&plan.seventhChoice&&plan.seventhChoice.source==='permanent')alert='Seven-nurse arrangement: '+plan.seventhNurse+' remains in '+allocationLabel(plan.seventhVacatedKey)+', while an overtime nurse takes the seventh position.';
  else if(r.mode==='7')alert='Seven-nurse arrangement: the seventh rotation selected an overtime nurse for the additional role.';
  else alert='Standard six-nurse plan: Pager works the Labour Ward first part and Reliever works the second part.';
  return{display:r.mode,fullLW:r.fullLW,alert:alert};
}

function labourOrderFor(r){
  if(!r||r.mode==='5')return null;
  var draft=labourOrderDrafts[r.date];if(draft&&draft.first&&draft.second)return{roster_date:r.date,first_part_name:draft.first,second_part_name:draft.second,automatic:!!draft.automatic};
  var order=labourOrders[r.date];if(!order)return null;
  var expected=[String(r.pager).toLowerCase(),String(r.reliever).toLowerCase()].sort().join('|');
  var stored=[String(order.first_part_name).toLowerCase(),String(order.second_part_name).toLowerCase()].sort().join('|');
  return expected===stored?order:null;
}

function ensureAutomaticLabourOrder(base,r){
  if(!r||r.mode==='5'||planIsProvisional(base))return;
  labourOrderDrafts[base.date]={first:r.pager,second:r.reliever,automatic:true};
}

function labourRoleDetail(name,r){
  var order=labourOrderFor(r),timing=nightDutyTiming(r.date);
  if(!order)return'Labour Ward part and break to decide';
  if(String(order.first_part_name).toLowerCase()===String(name).toLowerCase())return'Labour Ward first part · '+timing.firstPeriodDisplay+(timing.isClockChange?' · '+formatDutyHours(timing.partHours)+' actual':'')+' · Second break';
  return'Labour Ward second part · '+timing.secondPeriod+(timing.isClockChange?' · '+formatDutyHours(timing.partHours)+' actual':'')+' · First break';
}

function sameNurse(a,b){return canonicalNurseName(a)===canonicalNurseName(b)}

function interfaceIcon(type){
  var paths={
    staffing:'<path d="M8.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M3 19a5.5 5.5 0 0 1 11 0"/><path d="M16 8a2.5 2.5 0 0 1 0 5"/><path d="M16.5 15.5A4.5 4.5 0 0 1 21 20"/>',
    absence:'<circle cx="12" cy="12" r="8.5"/><path d="m8.5 12 2.2 2.2 4.8-5"/>',
    task:'<rect x="5" y="4" width="14" height="16" rx="2"/><path d="M9 4.5h6V7H9z"/><path d="M9 11h6M9 15h4"/>',
    first:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l-3.5 2"/><path d="M6.5 5.5 8 7"/>',
    night:'<path d="M18.5 15.5A7.5 7.5 0 0 1 8.5 5a7.5 7.5 0 1 0 10 10.5Z"/><path d="M17.5 4v4M15.5 6h4"/>',
    second:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/><path d="m16 17 1.5 1.5"/>',
    pager:'<rect x="6" y="4" width="12" height="16" rx="2.5"/><path d="M9 8h6v4H9zM9 16h3M15.5 4V2"/>',
    reliever:'<circle cx="10" cy="8" r="3"/><path d="M4 19a6 6 0 0 1 12 0"/><path d="M17 10a4 4 0 0 1 3 6.5M20 13v3.5h-3.5"/>',
    overtime:'<circle cx="9" cy="8" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0M18 8v6M15 11h6"/>',
    seventh:'<circle cx="12" cy="12" r="8.5"/><path d="M12 8v8M8 12h8"/>',
    chat:'<path d="M4 5.5h16v11H9l-5 3v-14Z"/><path d="M8 10h8M8 13h5"/>'
  };
  return'<svg viewBox="0 0 24 24" aria-hidden="true">'+(paths[type]||paths.task)+'</svg>';
}

function roleIconType(badgeClass){return badgeClass==='bFirst'?'first':badgeClass==='bSecond'?'second':badgeClass==='bPager'?'pager':badgeClass==='bReliever'||badgeClass==='bFull'?'reliever':'seventh'}

function personalAllocation(base,r,name){
  var nightCopy=selectedNightCopy(base.date),timing=nightDutyTiming(base.date);
  if(!name)return{key:'unselected',icon:'night',title:'Choose your name',detail:'See your own role and break at a glance.',period:'Select your name',breakLabel:'Shown after selection',context:'Stored privately on this device',pending:false};
  var absence=changesFor(base.date).find(function(item){return sameNurse(item.absent_name,name)});
  if(absence)return{key:'absence',icon:'absence',title:'Not working for this night',detail:(absence.reason||'Absence')+' recorded',period:nightCopy.label,breakLabel:'Not applicable',context:absence.reason||'Absence recorded',pending:false};
  if(sameNurse(r.first1,name)||sameNurse(r.first2,name)){var firstKey=sameNurse(r.first1,name)?'first1':'first2';return{key:firstKey,icon:'first',title:'First Part theatre',detail:'Position '+(firstKey==='first1'?'1':'2'),period:timing.firstPeriodDisplay,breakLabel:'Second break',context:'With '+professionalName(firstKey==='first1'?r.first2:r.first1),pending:false,dutyPart:'first'}}
  if(sameNurse(r.second1,name)||sameNurse(r.second2,name)){var secondKey=sameNurse(r.second1,name)?'second1':'second2';return{key:secondKey,icon:'second',title:'Second Part theatre',detail:'Position '+(secondKey==='second1'?'1':'2'),period:timing.secondPeriod,breakLabel:'First break',context:'With '+professionalName(secondKey==='second1'?r.second2:r.second1),pending:false,dutyPart:'second'}}
  if(r.mode==='5'&&sameNurse(r.fullLW,name))return{key:'fullLW',icon:'reliever',title:'Labour Ward / Pager',detail:'Full-night cover',period:'00:00–07:00',breakLabel:'When clinical cover allows',context:'Sole Labour Ward / Pager cover',pending:false,dutyPart:'full'};
  if(r.mode!=='5'&&(sameNurse(r.pager,name)||sameNurse(r.reliever,name))){
    var pagerRole=sameNurse(r.pager,name),role=pagerRole?'Pager':'Reliever',other=pagerRole?r.reliever:r.pager,order=labourOrderFor(r);
    if(!order)return{key:pagerRole?'pager':'reliever',icon:pagerRole?'pager':'reliever',title:role,detail:'Labour Ward part pending',period:'To be decided',breakLabel:'Pending',context:'With '+professionalName(other),pending:true,other:other};
    if(sameNurse(order.first_part_name,name))return{key:pagerRole?'pager':'reliever',icon:pagerRole?'pager':'reliever',title:role,detail:'Labour Ward first part',period:timing.firstPeriodDisplay,breakLabel:'Second break',context:'With '+professionalName(other),pending:false,dutyPart:'first'};
    return{key:pagerRole?'pager':'reliever',icon:pagerRole?'pager':'reliever',title:role,detail:'Labour Ward second part',period:timing.secondPeriod,breakLabel:'First break',context:'With '+professionalName(other),pending:false,dutyPart:'second'};
  }
  if(r.mode==='7'&&sameNurse(r.seventh,name))return{key:'seventh',icon:'seventh',title:'Seventh nurse',detail:'Additional allocation',period:'As allocated',breakLabel:'As required',context:'Supports this night’s team',pending:false};
  return{key:'unallocated',icon:'task',title:'Not allocated for this night',detail:'An assignment may still be under review.',period:'Pending',breakLabel:'Pending',context:'Open Changes to review',pending:false};
}

function personalLiveStatus(base,assignment){
  var context=resolveNightContext(null,base.date);if(!assignment||!context.isCurrent||!context.selectedIsAutomatic)return'';
  var timing=context.timing||nightDutyTiming(base.date),now=context.nowMs;
  if(assignment.key==='absence')return'Not on duty tonight';
  if(assignment.pending||assignment.key==='unallocated')return'Allocation pending';
  if(assignment.dutyPart==='first'){
    if(now<timing.startUtc)return'On duty next · starts 00:00';
    if(now<timing.handoverUtc)return'On duty now';
    return'Duty block complete';
  }
  if(assignment.dutyPart==='second'){
    if(now<timing.handoverUtc)return'On duty later · starts '+timing.handoverDisplay;
    if(now<timing.endUtc)return'On duty now';
    return'Duty block complete';
  }
  if(assignment.period==='00:00–07:00')return'On duty now';
  if(assignment.key==='seventh')return'Supporting tonight’s team';
  return'Current night';
}

function personalAssignmentChanged(base,r,name,assignment){
  if(!name||!assignment||assignment.key==='unallocated')return false;
  if(assignment.key==='absence'||assignment.key==='fullLW')return true;
  var rostered=rawBaseForDate(base.date);if(!sameNurse(rostered[assignment.key],name))return true;
  if(assignment.key==='pager'||assignment.key==='reliever'){var order=labourOrderFor(r),normallyFirst=sameNurse(r.pager,name);if(order)return normallyFirst!==sameNurse(order.first_part_name,name)}
  return false;
}

function personalFact(label,value){return'<div><dt>'+esc(label)+'</dt><dd>'+esc(value||'Pending')+'</dd></div>'}

function renderPersonalNight(base,r){
  var host=byId('personalNightCard'),notice=byId('personalAllocationNotice');if(!host||!notice)return null;
  var name=myName(),preferred=currentPrivateProfile&&currentPrivateProfile.profile_name||'',jobTitle=currentPrivateProfile&&currentPrivateProfile.job_title||'',displayName=preferred||professionalName(name)||'Choose your name',assignment=personalAllocation(base,r,name),changed=personalAssignmentChanged(base,r,name,assignment),initial=displayName.trim().charAt(0).toUpperCase()||'?',contextLabel=assignment.key==='absence'||assignment.key==='unallocated'?'Status':assignment.key==='unselected'?'Personal view':assignment.key==='fullLW'?'Coverage':assignment.key==='seventh'?'Team':'Working with',nightCopy=selectedNightCopy(base.date),nightTiming=nightDutyTiming(base.date),detail={date:base.date,displayName:displayName,jobTitle:jobTitle,avatarUrl:profileAvatarUrl||'',initial:initial,assignmentLabel:nightCopy.assignment,title:assignment.title,detail:assignment.detail||'',period:assignment.period,breakLabel:assignment.breakLabel,contextLabel:contextLabel,context:assignment.context,changedLabel:changed?nightCopy.changed:'',action:assignment.key==='absence'?'absence':name&&assignment.key!=='unallocated'?'role':'choose',pending:!!assignment.pending,pendingOther:professionalName(assignment.other),liveStatus:personalLiveStatus(base,assignment),dutyPart:assignment.dutyPart||'',dutyStartUtc:nightTiming.startUtc,handoverUtc:nightTiming.handoverUtc,dutyEndUtc:nightTiming.endUtc,handoverLabel:nightTiming.handoverDisplay,transitionUtc:nightTiming.transitionUtc||0,changed:changed,clockChange:clockChangeDetailFor(base.date)};
  var compactAssignment=byId('nightCompactAssignment'),compactDate=byId('nightCompactDate');if(compactAssignment)compactAssignment.textContent=assignment.title||nightCopy.label;if(compactDate)compactDate.textContent=new Date(base.date+'T12:00:00').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});
  if(window.dispatchEvent&&typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('roster:personal-night',{detail:detail}));
  return assignment;
}

function activitySignature(date){
  var records=[];[changesFor(date),overtimeFor(date),changeHistory[date]||[],overtimeHistory[date]||[],roleOverrideHistory[date]||[]].forEach(function(list){list.forEach(function(item){records.push(item.updated_at||item.changed_at||'')})});var status=nightPlanStatuses[date],override=nightRoleOverrides[date],cover=fiveCoverChoices[date],order=labourOrders[date];[status,override,cover,order].forEach(function(item){if(item)records.push(item.updated_at||item.changed_at||JSON.stringify(item))});return records.filter(Boolean).sort().join('|')
}

function renderRecentActivity(date){
  var host=byId('recentActivityList'),chip=byId('changedSinceChip');if(!host||!chip)return;var signature=activitySignature(date),seen={};try{seen=JSON.parse(appStorage.getItem('anaes_seen_night_activity')||'{}')}catch(error){}if(seen[date]&&signature&&seen[date]!==signature)changedSinceSession[date]=true;if(signature){seen[date]=signature;try{appStorage.setItem('anaes_seen_night_activity',JSON.stringify(seen))}catch(error){}}
  var seenAt={};try{seenAt=JSON.parse(appStorage.getItem('anaes_seen_night_activity_at')||'{}')}catch(error){}if(!activityOpenedThisSession[date]){activityOpenedThisSession[date]={previous:Number(seenAt[date]||0),opened:Date.now()};seenAt[date]=Date.now();try{appStorage.setItem('anaes_seen_night_activity_at',JSON.stringify(seenAt))}catch(error){}}
  var session=activityOpenedThisSession[date],items=staffingHistoryFor(date).slice(0,5),updatedCount=session.previous?items.filter(function(item){return(new Date(item.changed_at).getTime()||0)>session.previous}).length:0,sinceLabel=session.previous?new Date(session.previous).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):'you last opened Night';recentActivityItems=items;recentActivityDate=date;var detail={updated:!!(changedSinceSession[date]||updatedCount),updatedCount:updatedCount,sinceLabel:sinceLabel,items:items.map(function(item){return{label:item.label,type:item.type,title:item.title,detail:item.detail||'',meta:(item.changed_by||'Roster member')+' · '+shortTime(item.changed_at)}})};if(window.dispatchEvent&&typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('roster:recent-activity',{detail:detail}));
}

function openActivityDetail(item,date){var dialog=byId('activityDetailSheet'),type=byId('activityDetailType'),title=byId('activityDetailTitle'),content=byId('activityDetailContent');if(!dialog||!item)return;type.className='activityType '+item.type;type.textContent=item.label;title.textContent=item.title;var rows=[['Night',fmt(date)],['Details',item.detail||'No additional reason was recorded.'],['Recorded by',item.changed_by||'Roster member'],['Recorded',new Date(item.changed_at).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'})]];content.innerHTML=rows.map(function(row){return'<div class="activityDetailRow"><span>'+esc(row[0])+'</span><b>'+esc(row[1])+'</b></div>'}).join('');if(!dialog.open)dialog.showModal()}

function updateScrollChrome(){scrollChromeFrame=null;var scrolled=window.scrollY>18;document.body.classList.toggle('uiScrolled',scrolled);document.body.classList.remove('headerCompact')}
function scheduleScrollChrome(){if(scrollChromeFrame)return;scrollChromeFrame=requestAnimationFrame(updateScrollChrome)}

function failedAction(message,retry){lastFailedAction=retry||null;toast(message,retry?{label:'Retry',run:function(){var action=lastFailedAction;lastFailedAction=null;return action&&action()}}:null)}
function notifyRosterUpdate(type,date){if(window.dispatchRosterPush)window.dispatchRosterPush(type,date)}

function render(){
  if(!R.length||!currentUserProfile)return;
  var canonical=buildNightPlan(cur()),base=canonical.base,plan=canonical.staffing,r=canonical.effective,e=effective(r),count=plan.count,dutyTiming=canonical.timing;
  shadowNightPlanCheck(canonical);
  if(window.AnaestheticRuntime&&window.AnaestheticRuntime.state){var runtimeNightContext=resolveNightContext(null,base.date);window.AnaestheticRuntime.state.night.set(nightSelectionMode==='manual'?'manual':runtimeNightContext.isCurrent?'automatic-current':'automatic-next')}
  ensureAutomaticLabourOrder(base,r);
  var labourPending=r.mode!=='5'&&!planIsProvisional(base)&&!labourOrderFor(r);
  var roles=[['bFirst','First Part',r.first1+' + '+r.first2,'Works '+dutyTiming.firstPeriodDisplay+(dutyTiming.isClockChange?' · '+formatDutyHours(dutyTiming.partHours)+' actual':'')+' • Second break'],['bSecond','Second Part',r.second1+' + '+r.second2,'Works '+dutyTiming.secondPeriod+(dutyTiming.isClockChange?' · '+formatDutyHours(dutyTiming.partHours)+' actual':'')+' • First break']];
  if(r.mode!=='5'){
    roles.push(['bPager','Pager',r.pager,labourRoleDetail(r.pager,r)]);
    roles.push(['bReliever','Reliever',r.reliever,labourRoleDetail(r.reliever,r)]);
  }
  syncDateInputs(base.date);renderMyName();var personal=renderPersonalNight(base,r);renderRecentActivity(base.date);renderHeaderSummary(r);updateSmartNightButtons();
  byId('modeStatus').textContent=count+' nurse'+(count===1?'':'s');
  if(byId('changesModeStatus'))byId('changesModeStatus').textContent=count+' nurse'+(count===1?'':'s');
  byId('breakModeStatus').textContent=count+' nurse'+(count===1?'':'s');
  var decisionTasks=workflowTaskCount(base,plan,r),confirmNeeded=workflowNeedsConfirmation(base,decisionTasks),taskCount=decisionTasks||(confirmNeeded?1:0),absenceCount=changesFor(base.date).length,overtimeEntries=overtimeFor(base.date),overtimeCount=overtimeEntries.length;
  var firstTask=workflowTaskDetails(base,plan)[0]||'';
  if(r.mode==='7')roles.push(['b7','Seventh nurse',r.seventh,'Additional nurse · Break coordinated as required']);
  var extras=additionalNurses(plan);
  var roleModel=roles.map(function(c){var tone=roleIconType(c[0]);return{key:c[0],label:c[1],names:professionalNames(c[2]),detail:c[3],tone:tone==='first'||tone==='second'||tone==='pager'||tone==='reliever'||tone==='seventh'?tone:'full',mine:isMine(c[2])}}),fivePerson=r.mode==='5'&&r.understaffedCount>=5?{name:professionalName(r.fullLW),reason:'One nurse covers Labour Ward and Pager for the full night. Their break is coordinated when clinical cover allows.',mine:isMine(r.fullLW)}:null,nightDetail={nurseCount:count,absenceCount:absenceCount,overtimeCount:overtimeCount,overtimeNames:overtimeEntries.map(function(o){return professionalName(o.nurse_name)}),taskCount:taskCount,decisionTasks:decisionTasks,confirmNeeded:confirmNeeded,alert:count!==6&&r.mode!=='5'?e.alert:'',firstTask:decisionTasks?firstTask:'',labourPending:labourPending&&!(personal&&personal.pending),breakLabel:personal&&personal.breakLabel||'',chatUnread:Number(byId('chatUnreadBadge')&&byId('chatUnreadBadge').textContent||0)||0,liveState:personalLiveStatus(base,personal),roles:roleModel,extras:extras.map(function(o){return o.nurse_name}),fivePerson:fivePerson,clockChange:clockChangeDetailFor(base.date),contextLabel:planIsProvisional(base)?'Provisional':nightDutyTiming(base.date).isClockChange?'Clock change':r.mode==='5'?'5-nurse arrangement':r.mode==='7'?'7-nurse arrangement':absenceCount||overtimeCount||workflowHasManualPlan(base)?'Updated night':'Standard night',currentPart:(function(){var context=resolveNightContext(null,base.date);if(!context.isCurrent||!context.selectedIsAutomatic||context.nowMs<context.timing.startUtc||context.nowMs>=context.timing.endUtc)return'';return context.nowMs<context.timing.handoverUtc?'first':'second'})(),dataFreshness:window.AnaestheticDomain&&window.AnaestheticDomain.freshness?window.AnaestheticDomain.freshness(lastSuccessfulSyncAt,navigator.onLine&&!forcedOfflineSession,appNowMs()).label:''};
  if(window.dispatchEvent&&typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('roster:night',{detail:nightDetail}));
  appStorage.setItem('anaes_selected_date',base.date);
  renderChanges(base,canonical);renderRoster();renderBreaks(canonical);bindTaskLinks();queueClockChangeAttention(base.date);maybeUpcomingClockChangeReminder();
  if(currentUserProfile.user_role==='admin')renderAdmin();
  ensureNightHistory(base.date);updateNetworkStatus();save();
}

function goToChanges(target){
  activeChangesStep='allocation';show('changes');
  setTimeout(function(){var el=document.querySelector(target||'#changesAllocationPane');if(el){el.scrollIntoView({behavior:'smooth',block:'start'});var focus=el.querySelector('.needsDecision button, #fiveCoverStep button, [data-final-allocation], button:not(.hidden), select, summary, input');if(focus)focus.focus({preventScroll:true})}},260);
}

function bindTaskLinks(){
  Array.prototype.forEach.call(document.querySelectorAll('[data-go-allocation]'),function(el){
    el.onclick=function(){goToChanges('#changesAllocationPane')};
    if(el.tagName!=='BUTTON'){el.setAttribute('role','button');el.setAttribute('tabindex','0');el.onkeydown=function(event){if(event.key==='Enter'||event.key===' '){event.preventDefault();goToChanges('#changesAllocationPane')}}}
  });
  function bindStaffingTarget(attribute,selector){Array.prototype.forEach.call(document.querySelectorAll('['+attribute+']'),function(el){el.onclick=function(){activeChangesStep='staffing';show('changes');setTimeout(function(){var target=document.querySelector(selector);if(target){target.scrollIntoView({behavior:'smooth',block:'start'});var field=target.querySelector('select,input');if(field)field.focus({preventScroll:true})}},180)}})}
  bindStaffingTarget('data-go-staffing','#changesStaffingPane');bindStaffingTarget('data-go-absence','.absenceSection');bindStaffingTarget('data-go-overtime','.overtimeSection');
  Array.prototype.forEach.call(document.querySelectorAll('[data-go-confirm]'),function(el){el.onclick=function(){activeChangesStep='confirm';show('changes');setTimeout(function(){var target=byId('changesConfirmPane');if(target)target.scrollIntoView({behavior:'smooth',block:'start'})},180)}});
  Array.prototype.forEach.call(document.querySelectorAll('[data-go-role-editor]'),function(el){el.onclick=function(){goToChanges('.nightRoleEditor');setTimeout(function(){var editor=document.querySelector('.nightRoleEditor');if(editor){editor.open=true;editor.scrollIntoView({behavior:'smooth',block:'start'})}},220)}});
}

function recentOvertimeNames(){
  var values=[];try{values=JSON.parse(appStorage.getItem('anaes_recent_overtime_names')||'[]')}catch(error){}
  Object.keys(nightOvertime).forEach(function(date){(nightOvertime[date]||[]).forEach(function(item){values.push(item.nurse_name)})});
  var seen={};return values.map(normaliseNurseName).filter(function(name){var key=name.toLowerCase();if(!name||seen[key])return false;seen[key]=true;return true}).slice(-30).reverse();
}

function rememberOvertimeName(name){var names=recentOvertimeNames().filter(function(item){return item.toLowerCase()!==name.toLowerCase()});names.unshift(name);try{appStorage.setItem('anaes_recent_overtime_names',JSON.stringify(names.slice(0,30)))}catch(error){}}

function renderOvertimeSuggestions(){var list=byId('overtimeSuggestions');if(list)list.innerHTML=recentOvertimeNames().map(function(name){return'<option value="'+esc(name)+'"></option>'}).join('')}

function highlightSavedItem(containerId,name,attribute){var container=byId(containerId);if(!container)return;Array.prototype.forEach.call(container.children,function(item){if(String(item.getAttribute(attribute)||'').toLowerCase()===String(name).toLowerCase()){item.classList.add('savedPulse');setTimeout(function(){item.classList.remove('savedPulse')},1800)}})}

function earliestOvertimeAdd(date,name){
  var matches=(overtimeHistory[date]||[]).filter(function(h){return h.action==='added'&&String(h.nurse_name).toLowerCase()===String(name).toLowerCase()});
  matches.sort(function(a,b){return new Date(a.changed_at)-new Date(b.changed_at)});
  return matches[0]||null;
}

function selectedAllocationId(base,key){
  var draft=allocationDrafts[base.date]||{};
  if(Object.prototype.hasOwnProperty.call(draft,key))return draft[key];
  var assigned=staffingPlan(base).validAssignments.find(function(o){return o.allocation_key===key});
  return assigned?assigned.id:'';
}

function allocationPreview(base){
  var r=applyChanges(base),overtime=overtimeFor(base.date),plan=staffingPlan(base);
  plan.availableKeys.forEach(function(key){var id=selectedAllocationId(base,key),entry=overtime.find(function(o){return o.id===id});if(entry)r[key]=entry.nurse_name});
  return r;
}

function suggestedFiveRoleAssignments(base){var raw=rawBaseForDate(base.date),names=nightWorkingNames(base);if(names.length!==5)return null;var assignments={mode:'5'},used=[],full=[raw.pager,raw.reliever].find(function(name){return names.some(function(active){return canonicalNurseName(active)===canonicalNurseName(name)})});assignments.fullLW=full||names[0];used.push(assignments.fullLW);['first1','first2','second1','second2'].forEach(function(key){var rostered=raw[key];if(names.some(function(active){return canonicalNurseName(active)===canonicalNurseName(rostered)})&&!used.some(function(name){return canonicalNurseName(name)===canonicalNurseName(rostered)})){assignments[key]=rostered;used.push(rostered)}});['first1','first2','second1','second2'].forEach(function(key){if(assignments[key])return;var next=names.find(function(name){return !used.some(function(saved){return canonicalNurseName(saved)===canonicalNurseName(name)})});assignments[key]=next;used.push(next)});return validRoleAssignmentsForNight(base,assignments)?assignments:null}
function currentRoleAssignments(base){var stored=nightRoleOverrides[base.date],assignments=stored&&stored.assignments;if(validRoleAssignmentsForNight(base,assignments))return Object.assign({},assignments);var working=nightWorkingNames(base);if(working.length===5)return suggestedFiveRoleAssignments(base);var current=baseForDate(base.date),normal={};CORE_ALLOCATION_KEYS.forEach(function(key){normal[key]=current[key]});if(working.length===7){var extra=working.find(function(name){return !CORE_ALLOCATION_KEYS.some(function(key){return sameNurse(current[key],name)})});normal.mode='7';normal.seventh=extra||working[6]}return normal}
function roleEditorAssignments(base){var draft=nightRoleOverrideDrafts[base.date];if(draft&&validRoleAssignmentsForNight(base,draft.assignments))return Object.assign({},draft.assignments);return currentRoleAssignments(base)}
function roleAssignmentsDiffer(left,right){if(!left||!right||String(left.mode||'6')!==String(right.mode||'6'))return true;return roleAssignmentKeys(left).some(function(key){return String(left[key]||'')!==String(right[key]||'')})}
function renderNightRoleOverride(base){var host=byId('nightRoleOverrideStep');if(!host)return;if(!nightRoleOverrideAvailable){host.innerHTML='<div class="nightRoleNotice"><b>Night-only role changes need the current database update</b><span>The normal calculated roster remains available.</span></div>';return}var working=nightWorkingNames(base);if(working.length<5){host.innerHTML='<div class="nightRoleNotice"><b>Custom roles are unavailable while cover is incomplete</b><span>Add enough cover to reach five nurses before arranging this night’s roles.</span></div>';return}var stored=nightRoleOverrides[base.date],draft=nightRoleOverrideDrafts[base.date],current=roleEditorAssignments(base),baseline=currentRoleAssignments(base);if(!current||!baseline)return;var keys=roleAssignmentKeys(current),fiveMode=current.mode==='5',sevenMode=current.mode==='7',dirty=!!(draft&&roleAssignmentsDiffer(draft.assignments,baseline)),open=!!draft,labels={first1:'First part · position 1',first2:'First part · position 2',second1:'Second part · position 1',second2:'Second part · position 2',pager:'Pager',reliever:'Reliever',fullLW:'Full-night Labour Ward / Pager',seventh:'Seventh nurse'},names=(fiveMode||sevenMode)?working:keys.map(function(key){return current[key]}),rows='';keys.forEach(function(key){rows+='<label class="'+(key==='fullLW'||key==='seventh'?'nightRoleFullWidth':'')+'"><span>'+esc(labels[key])+'</span><select data-night-role="'+esc(key)+'">'+names.map(function(name){return'<option value="'+esc(name)+'" '+(canonicalNurseName(current[key])===canonicalNurseName(name)?'selected':'')+'>'+esc(professionalName(name))+'</option>'}).join('')+'</select></label>'});var guidance=fiveMode?'Arrange the five nurses working this night across four theatre roles and one full-night Labour Ward / Pager role. Each nurse is used once.':sevenMode?'Arrange all seven nurses working this night across the theatre, Pager, Reliever and Seventh nurse roles. Each nurse is used once.':'Choose a different nurse in any role. The two people swap automatically, so no one is duplicated.',summary=stored?(fiveMode?'Custom five-nurse roles are active':sevenMode?'Custom seven-nurse roles are active':'Night-only roles are active'):(fiveMode?'Optional custom five-nurse arrangement':sevenMode?'Optional custom seven-nurse arrangement':'Optional · roster rotation stays unchanged');host.innerHTML='<details class="nightRoleEditor" '+(open?'open':'')+'><summary><span><b>Change this night’s roles</b><small>'+summary+'</small></span><i aria-hidden="true">›</i></summary><div class="nightRoleEditorBody"><div class="nightRoleGuidance">'+guidance+'</div>'+rows+(dirty?'<div class="nightRoleDraftStatus">Unsaved night-only change</div><label class="nightRoleReason"><span>Reason for the change</span><input id="nightRoleReason" type="text" maxlength="120" placeholder="For example, agreed role arrangement" value="'+esc(draft&&draft.reason||'')+'"></label><div class="nightRoleActions"><button type="button" class="primary" id="saveNightRolesBtn">Save night-only change</button></div>':'')+(stored?'<div class="nightRoleActions restoreRolesAction"><button type="button" class="soft" id="resetNightRolesBtn">Restore rostered roles</button></div>':'')+'</div></details>';Array.prototype.forEach.call(host.querySelectorAll('[data-night-role]'),function(select){select.onchange=function(){var key=select.getAttribute('data-night-role'),assignments=roleEditorAssignments(base),chosen=select.value,assignmentKeys=roleAssignmentKeys(assignments),source=assignmentKeys.find(function(candidate){return canonicalNurseName(assignments[candidate])===canonicalNurseName(chosen)}),previous=assignments[key];if(source&&source!==key)assignments[source]=previous;assignments[key]=chosen;if(roleAssignmentsDiffer(assignments,currentRoleAssignments(base)))nightRoleOverrideDrafts[base.date]={assignments:assignments,reason:(byId('nightRoleReason')&&byId('nightRoleReason').value)||''};else delete nightRoleOverrideDrafts[base.date];renderChanges(base)}});var reason=byId('nightRoleReason');if(reason)reason.oninput=function(){var currentDraft=nightRoleOverrideDrafts[base.date];if(!currentDraft)return;currentDraft.reason=reason.value;nightRoleOverrideDrafts[base.date]=currentDraft;var saveButton=byId('saveNightRolesBtn');if(saveButton)saveButton.disabled=!normaliseNurseName(reason.value)||!navigator.onLine};var save=byId('saveNightRolesBtn');if(save){save.disabled=!normaliseNurseName(draft&&draft.reason||'')||!navigator.onLine;save.onclick=function(){saveNightRoleOverride(base)}}var reset=byId('resetNightRolesBtn');if(reset)reset.onclick=function(){resetNightRoleOverride(base)}}

function nightRoleOverrideModel(base){
  if(!nightRoleOverrideAvailable)return{notice:'Night-only role changes need the current database update. The normal calculated roster remains available.'};
  var working=nightWorkingNames(base);if(working.length<5)return{notice:'Custom roles are unavailable while cover is incomplete. Add enough cover to reach five nurses before arranging this night’s roles.'};
  var stored=nightRoleOverrides[base.date],draft=nightRoleOverrideDrafts[base.date],current=roleEditorAssignments(base),baseline=currentRoleAssignments(base);if(!current||!baseline)return{notice:'Night roles are not available for this night yet.'};
  var keys=roleAssignmentKeys(current),fiveMode=current.mode==='5',sevenMode=current.mode==='7',dirty=!!(draft&&roleAssignmentsDiffer(draft.assignments,baseline)),labels={first1:'First part · position 1',first2:'First part · position 2',second1:'Second part · position 1',second2:'Second part · position 2',pager:'Pager',reliever:'Reliever',fullLW:'Full-night Labour Ward / Pager',seventh:'Seventh nurse'},names=(fiveMode||sevenMode)?working:keys.map(function(key){return current[key]});
  return{guidance:fiveMode?'Arrange the five nurses working this night across four theatre roles and one full-night Labour Ward / Pager role. Each nurse is used once.':sevenMode?'Arrange all seven nurses working this night across the theatre, Pager, Reliever and Seventh nurse roles. Each nurse is used once.':'Choose a different nurse in any role. The two people swap automatically, so no one is duplicated.',summary:stored?(fiveMode?'Custom five-nurse roles are active':sevenMode?'Custom seven-nurse roles are active':'Night-only roles are active'):(fiveMode?'Optional custom five-nurse arrangement':sevenMode?'Optional custom seven-nurse arrangement':'Optional · roster rotation stays unchanged'),open:!!draft,stored:!!stored,dirty:dirty,reason:draft&&draft.reason||'',canSave:dirty&&!!normaliseNurseName(draft&&draft.reason||'')&&navigator.onLine,keys:keys.map(function(key){return{key:key,label:labels[key],fullWidth:key==='fullLW'||key==='seventh'}}),names:names.map(function(name){return{value:name,label:professionalName(name)}}),assignments:current};
}

async function saveNightRoleOverride(base){
  if(!requireOnline())return;var draft=nightRoleOverrideDrafts[base.date],reason=normaliseNurseName(draft&&draft.reason||'');
  if(!draft||!validRoleAssignmentsForNight(base,draft.assignments)||!roleAssignmentsDiffer(draft.assignments,currentRoleAssignments(base))){toast('Change a role before saving');return}if(!reason){toast('Add a short reason for the night-only change');var field=byId('nightRoleReason');if(field)field.focus();return}
  var previous=nightRoleOverrides[base.date]?JSON.parse(JSON.stringify(nightRoleOverrides[base.date])):null,button=byId('saveNightRolesBtn');if(button){button.disabled=true;button.textContent='Saving…'}setSync('saving','Saving night-only roles');
  var expectedAssignments=JSON.parse(JSON.stringify(draft.assignments)),result=await runRosterMutation('roles:save:'+base.date,function(commandId,expectedSyncRevision){return supa.rpc('apply_night_role_override_v49',{p_operation_id:commandId,p_expected_sync_revision:expectedSyncRevision,p_client_version:APP_VERSION,p_roster_date:base.date,p_action:'save',p_assignments:expectedAssignments,p_override_reason:reason,p_history_reason:reason})},function(){var stored=nightRoleOverrides[base.date]&&nightRoleOverrides[base.date].assignments;return !!(stored&&JSON.stringify(stored)===JSON.stringify(expectedAssignments))});
  if(missingRpc(result)){setSync('error','Database update required');toast('Seven-nurse night-only changes require the current database update. Nothing was changed.');if(button){button.disabled=false;button.textContent='Save night-only change'}return}if(rpcError(result))return;delete nightRoleOverrideDrafts[base.date];await loadSharedData();notifyRosterUpdate('roles',base.date);toast('Saved for this night only. The permanent rotation is unchanged.',{label:'Undo',run:function(){return undoNightRoleChange(base.date,previous)}});
}

async function resetNightRoleOverride(base){
  if(!requireOnline()||!confirm('Restore the rostered roles for this night?'))return;setSync('saving','Restoring rostered roles');var stored=nightRoleOverrides[base.date]?JSON.parse(JSON.stringify(nightRoleOverrides[base.date])):null,result=await runRosterMutation('roles:reset:'+base.date,function(commandId,expectedSyncRevision){return supa.rpc('apply_night_role_override_v49',{p_operation_id:commandId,p_expected_sync_revision:expectedSyncRevision,p_client_version:APP_VERSION,p_roster_date:base.date,p_action:'reset',p_assignments:null,p_override_reason:null,p_history_reason:'Restored rostered roles'})},function(){return !nightRoleOverrides[base.date]});if(missingRpc(result)){setSync('error','Database update required');toast('This action requires database schema 36. Nothing was changed.');return}if(rpcError(result))return;delete nightRoleOverrideDrafts[base.date];await loadSharedData();notifyRosterUpdate('roles',base.date);toast('Rostered roles restored',{label:'Undo',run:function(){return undoNightRoleChange(base.date,stored)}});
}

async function undoNightRoleChange(date,previous){
  if(!requireOnline())return;setSync('saving','Undoing role change');var expected=previous&&previous.assignments?JSON.parse(JSON.stringify(previous.assignments)):null,result=await runRosterMutation('roles:undo:'+date,function(commandId,expectedSyncRevision){return supa.rpc('apply_night_role_override_v49',{p_operation_id:commandId,p_expected_sync_revision:expectedSyncRevision,p_client_version:APP_VERSION,p_roster_date:date,p_action:previous?'save':'reset',p_assignments:expected,p_override_reason:previous&&previous.reason||'Previous night-only arrangement',p_history_reason:'Undid the latest role change'})},function(){var current=nightRoleOverrides[date]&&nightRoleOverrides[date].assignments;return expected?!!(current&&JSON.stringify(current)===JSON.stringify(expected)):!current});if(missingRpc(result)){setSync('error','Database update required');toast('Undo requires database schema 36. Nothing was changed.');return}if(rpcError(result))return;await loadSharedData();notifyRosterUpdate('roles',date);toast('Role change undone')
}

function updateConfirmationControls(confirmNeeded,tasks){
  var button=byId('saveAllocationsBtn'),hint=byId('confirmHint');
  if(button){
    button.classList.toggle('hidden',!confirmNeeded);
    button.dataset.workflowBlocked=tasks?'true':'false';
    button.disabled=!!tasks||!navigator.onLine;
    if(!allocationSaveInFlight)button.textContent='Confirm and share changes';
  }
  if(hint)hint.classList.toggle('hidden',!confirmNeeded);
}

function updateAllocationSaveControl(base,plan){
  plan=plan||staffingPlan(base);var tasks=workflowTaskCount(base,plan),confirmNeeded=workflowNeedsConfirmation(base,tasks);
  updateConfirmationControls(confirmNeeded,tasks);
}

function seventhDecisionCard(plan){
  if(plan.count<7||!plan.seventhChoice)return'';
  var choice=plan.seventhChoice;
  if(choice.source==='overtime')return'<div class="seventhDecisionCard confirmed"><div class="decisionEyebrow">Seventh-nurse rotation</div><h3>Overtime nurse takes the seventh position</h3><div class="time">This is the scheduled overtime turn. Choose the overtime nurse in the seventh-nurse allocation below.</div></div>';
  var original=allocationLabel(choice.vacatedKey),fallback=choice.fallback?'<div class="decisionFallback">'+esc(choice.scheduled)+' is absent, so '+esc(choice.nurse)+' is the next available permanent nurse in the seventh rotation.</div>':'';
  return'<div class="seventhDecisionCard '+(plan.requiresSeventhDecision?'needsDecision':'confirmed')+'"><div class="decisionEyebrow">Seventh-nurse decision</div><h3>'+esc(choice.nurse)+': '+esc(original)+' → seventh nurse</h3>'+fallback+'<div class="decisionRoute"><div><span>If rotation is used</span><b>'+esc(choice.nurse)+' becomes seventh nurse</b><small>Overtime fills '+esc(original)+'</small></div><div><span>If original role is kept</span><b>'+esc(choice.nurse)+' stays in '+esc(original)+'</b><small>Overtime fills the seventh position</small></div></div><div class="decisionButtons"><button type="button" class="'+(plan.seventhDecision==='rotation'?'selected':'')+'" data-seventh-decision="rotation">Use seventh rotation</button><button type="button" class="'+(plan.seventhDecision==='overtime'?'selected':'')+'" data-seventh-decision="overtime">Keep original role</button></div>'+(plan.requiresSeventhDecision?'<div class="decisionPrompt">Choose one option before the seven-nurse allocation can be finalised.</div>':'<div class="decisionSaved">Decision selected. Save the allocation below to share it with everyone.</div>')+'</div>';
}

function chooseSeventhDecision(base,decision){
  if(decision!=='rotation'&&decision!=='overtime')return;
  var plan=staffingPlan(base),choice=plan.seventhChoice;if(!choice||choice.source!=='permanent')return;
  seventhDecisionDrafts[base.date]=decision;
  if(allocationDrafts[base.date]){delete allocationDrafts[base.date].seventh;delete allocationDrafts[base.date][choice.vacatedKey]}
  render();
  setTimeout(function(){var card=document.querySelector('.seventhDecisionCard');if(card)card.scrollIntoView({behavior:'smooth',block:'center'})},120);
}

function renderChanges(base,nightPlan){
  var canonical=nightPlan&&nightPlan.date===base.date?nightPlan:buildNightPlan(base);
  if(document.body&&typeof document.body.getAttribute==='function'&&document.body.getAttribute('data-view')==='changes'&&changesSmartDefaultDate!==base.date){activeChangesStep=smartChangesStep(base);changesSmartDefaultDate=base.date}
  var changes=changesFor(base.date),absentLower=changes.map(function(c){return c.absent_name.toLowerCase()}),names=activeNames(base).filter(function(n){return absentLower.indexOf(n.toLowerCase())<0});
  var overtime=overtimeFor(base.date),plan=canonical.staffing,history=staffingHistoryFor(base.date),expanded=!!historyExpandedDates[base.date];
  updateStaffingActionAvailability();
  var extraIds=additionalNurses(plan).map(function(o){return o.id});
  byId('fiveCoverStep').innerHTML=fiveCoverHtml(base,plan);
  var extras=additionalNurses(plan),summary,seventhInfo=seventhDecisionCard(plan);
  if(plan.requiresCoverageChoice)summary='<b>'+plan.count+' nurses working this night</b><div class="time">Choose and save the Reliever’s theatre role first. The remaining positions will then appear for overtime nurses.</div>';
  else if(plan.requiresSeventhDecision)summary='<b>Seventh-nurse decision required</b><div class="time">Review the proposed move below. Your choice determines which allocation the overtime nurse will fill.</div>';
  else if(!overtime.length)summary=workflowHasManualPlan(base)?'<b>No allocation decision needed</b><div class="time">This night’s roles are calculated. Review them before sharing the staffing change.</div>':'<b>No allocation changes</b><div class="time">This night’s roles are calculated automatically.</div>';
  else if(plan.unresolved.length)summary='<b>'+plan.count+' nurses working this night</b><div class="time">'+plan.unresolved.length+' required allocation'+(plan.unresolved.length===1?' remains':'s remain')+' to be decided.</div>';
  else if(extras.length)summary='<b>Core allocations finalised</b><div class="time">'+extras.length+' additional nurse'+(extras.length===1?' remains':'s remain')+' available as required.</div>';
  else summary='<b>Required allocations finalised</b><div class="time">The reliever and overtime allocations are complete.</div>';
  byId('allocationSummary').innerHTML=summary+seventhInfo;
  var allocationDraft=allocationDrafts[base.date]||{};
  var allocationRows=overtime.length&&plan.availableKeys.length?plan.availableKeys.map(function(key){
    var assigned=plan.validAssignments.find(function(o){return o.allocation_key===key});
    var selectedId=Object.prototype.hasOwnProperty.call(allocationDraft,key)?allocationDraft[key]:(assigned?assigned.id:'');
    return{key:key,label:allocationLabel(key),breakLabel:allocationBreak(key),selectedId:selectedId,options:overtime.map(function(o){return{id:o.id,name:o.nurse_name}})};
  }):[];
  var allocationMessage=plan.requiresCoverageChoice?'The overtime choices will appear after the reliever allocation is saved.':plan.requiresSeventhDecision?'Choose the seventh-nurse option above. The correct overtime allocation will then appear here.':'There are no required allocations to finalise.';
  updateAllocationSaveControl(base);renderOvertimeSuggestions();
  var visible=expanded?history:history.slice(0,15);
  var changeDetail={
    absences:changes.map(function(c){return{id:c.id,kind:'absence',name:professionalName(c.absent_name),status:'Absent',meta:(c.reason||'Absence')+' · Updated by '+(c.updated_by||'Shift member')+' at '+shortTime(c.updated_at)}}),
    overtime:overtime.map(function(o){var valid=plan.validAssignments.some(function(item){return item.id===o.id}),extra=extraIds.indexOf(o.id)>=0,added=earliestOvertimeAdd(base.date,o.nurse_name),when=added?added.changed_at:o.updated_at,who=added?added.changed_by:o.updated_by;return{id:o.id,kind:'overtime',name:o.nurse_name,status:extra?'Additional staff · as required':valid?allocationLabel(o.allocation_key):'Awaiting allocation',needsAllocation:!valid&&!extra,meta:'Added by '+(who||'Shift member')+' at '+shortTime(when)}}),
    history:visible.map(function(h){return{label:h.label,type:h.type,title:h.title,detail:h.detail||'',meta:(h.changed_by||'Shift member')+' · '+shortTime(h.changed_at)}}),historyTotal:history.length,historyExpanded:expanded,historyHasMore:!!(historyPageState[base.date]&&historyPageState[base.date].has_more),allocations:allocationRows,allocationMessage:allocationMessage,forms:{names:names.map(function(n){return{value:n,label:professionalName(n)}}),editing:!!editingAbsenceId,overtimeSuggestions:recentOvertimeNames()},roleOverride:nightRoleOverrideModel(base)
  };
  if(window.dispatchEvent&&typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('roster:changes',{detail:changeDetail}));
  Array.prototype.forEach.call(document.querySelectorAll('[data-final-allocation]'),function(select){select.onchange=function(){var date=base.date,key=select.getAttribute('data-final-allocation');if(!allocationDrafts[date])allocationDrafts[date]={};allocationDrafts[date][key]=select.value;updateAllocationSaveControl(base);updateChangesWorkflow(base,plan);formMessage('allocationFormMessage','Selections ready to review.','')}});
  Array.prototype.forEach.call(document.querySelectorAll('[data-seventh-decision]'),function(button){button.onclick=function(){chooseSeventhDecision(base,button.getAttribute('data-seventh-decision'))}});
  var coverButton=byId('saveFiveCoverBtn');if(coverButton)coverButton.onclick=saveFiveCover;
  updateChangesWorkflow(base,plan);
  updateOfflineControls();
}

function updateStaffingActionAvailability(){
  var absence=byId('saveChangeBtn'),absenceName=byId('absentName'),overtime=byId('addOvertimeBtn'),overtimeName=byId('overtimeName'),offline=!navigator.onLine||forcedOfflineSession,writeBlocked=sharedWritesBlocked();
  if(absence)absence.disabled=offline||!absenceName||!absenceName.value||writeBlocked;
  if(overtime)overtime.disabled=offline||!overtimeName||!normaliseNurseName(overtimeName.value)||writeBlocked;
}

function editNightChange(id){
  var item=changesFor(cur().date).find(function(c){return c.id===id});
  if(!item)return;
  editingAbsenceId=id;var option=document.createElement('option');option.value=item.absent_name;option.textContent=professionalName(item.absent_name)+' • editing';
  byId('absentName').prepend(option);byId('absentName').value=item.absent_name;byId('changeReason').value=item.reason||'Leave';
  byId('saveChangeBtn').textContent='Update absence';byId('cancelAbsenceEditBtn').classList.remove('hidden');updateStaffingActionAvailability();
  byId('absentName').scrollIntoView({behavior:'smooth',block:'center'});
}

function cancelAbsenceEdit(){editingAbsenceId=null;byId('absentName').value='';byId('changeReason').value='Leave';byId('saveChangeBtn').textContent='Save absence';byId('cancelAbsenceEditBtn').classList.add('hidden');formMessage('absenceFormMessage','');renderChanges(cur())}

function buildNightPlan(base){
  base=base||cur();var plan=staffingPlan(base),r=applyChanges(base),timing=nightDutyTiming(base.date),provisional=plan.count<5||plan.requiresCoverageChoice||plan.requiresSeventhDecision||plan.unresolved.length>0,labour=labourOrderFor(r),tasks=workflowTaskDetails(base,plan),status=nightPlanStatuses[base.date]||null;
  return{date:base.date,base:base,effective:r,staffing:plan,timing:timing,provisional:provisional,labourOrder:labour,labourPending:r.mode!=='5'&&!provisional&&!labour,tasks:tasks,revision:status?Number(status.revision||0):0,confirmed:!!(status&&status.published_at)};
}

function breakData(r,nightPlan){
  var base=nightPlan&&nightPlan.base||baseForDate(r.date),plan=nightPlan&&nightPlan.staffing||staffingPlan(base),timing=nightPlan&&nightPlan.timing||nightDutyTiming(r.date);
  if(plan.count<5)return{first:[],second:[],notes:['Breaks cannot be finalised while only '+plan.count+' nurses are recorded. Add sufficient overtime cover and complete the allocations first.']};
  var first=[r.second1,r.second2],second=[r.first1,r.first2],notes=[];
  if(r.mode==='5')notes.push(professionalName(r.fullLW)+' covers Labour Ward / Pager for the full night. Their break is coordinated during the shift when clinical cover allows.');
  else{
    var order=labourOrderFor(r);
    if(order){
      first.push(order.second_part_name);second.push(order.first_part_name);
      notes.push('First part Labour Ward / Pager: '+professionalName(order.first_part_name)+' • '+timing.firstPeriodDisplay+' • Second break.');
      notes.push('Second part Labour Ward / Pager: '+professionalName(order.second_part_name)+' • '+timing.secondPeriod+' • First break.');
    }else{
      notes.push(professionalName(r.pager)+' and '+professionalName(r.reliever)+' still need to decide who works each part of Labour Ward / Pager.');
      notes.push('Whoever works the first part takes second break. Whoever works the second part takes first break.');
    }
    if(r.mode==='7')notes.push(professionalName(r.seventh)+' is the seventh nurse and coordinates a break as required.');
    var extras=additionalNurses(plan);if(extras.length)notes.push(extras.map(function(o){return o.nurse_name}).join(' + ')+' remain additional staff and take breaks as required.');
  }
  return{first:first,second:second,notes:notes};
}

function renderBreaks(nightPlan){
  var model=nightPlan&&nightPlan.date===cur().date?nightPlan:buildNightPlan(cur()),base=model.base,r=model.effective,plan=model.staffing,staffingPending=model.provisional,labourPending=r.mode!=='5'&&!model.labourOrder,pending=staffingPending||labourPending,count=plan.count,b=staffingPending?{first:[],second:[],notes:['Breaks are pending until the required staffing and allocations are finalised.']}:breakData(r,model);
  byId('breakDatePick').value=r.date;byId('breakModeStatus').textContent=count+' nurse'+(count===1?'':'s');
  var absenceCount=changesFor(base.date).length,timing=model.timing,detail={date:r.date,formattedDate:fmt(r.date),nurseCount:count,absenceCount:absenceCount,pending:pending,pendingReason:staffingPending?'Complete the remaining staffing allocation.':'Review the Labour Ward allocation.',labourPending:labourPending,first:b.first.map(professionalName),second:b.second.map(professionalName),notes:b.notes,highlightedName:professionalName(myName()),firstDutyPeriod:timing.firstPeriodDisplay,secondDutyPeriod:timing.secondPeriod,clockChange:clockChangeDetailFor(r.date),revision:model.revision,confirmed:model.confirmed};
  if(window.dispatchEvent&&typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('roster:breaks',{detail:detail}));
}

function renderRoster(){
  var q=(byId('search').value||'').toLowerCase(),f=byId('filter').value||'all';
  byId('range').innerHTML='<b>'+R.length+'</b> published nights • '+fmt(R[0].date)+' to '+fmt(R[R.length-1].date);
  var cards=[];
  R.forEach(function(original,i){
    var base=Object.assign({},original);base.mode='6';
    var r=applyChanges(base),changes=changesFor(base.date),overtime=overtimeFor(base.date),plan=staffingPlan(base),count=plan.count,extras=additionalNurses(plan),liveCount=changes.length+overtime.length,labourPending=r.mode!=='5'&&!labourOrderFor(r),dutyTiming=nightDutyTiming(base.date);
    var status=planIsProvisional(base)?'Provisional • staffing decision required':labourPending?'Labour Ward order still required':liveCount?liveCount+' live staffing update'+(liveCount>1?'s':''):dutyTiming.isClockChange?'Clock change night • equal handover '+dutyTiming.handoverDisplay:'Standard calculated rotation';
    var displayMode=String(Math.max(5,Math.min(7,count)));
    if(!((f==='all'||displayMode===f)&&(JSON.stringify(base)+' '+JSON.stringify(r)+' '+JSON.stringify(changes)+' '+JSON.stringify(overtime)).toLowerCase().indexOf(q)>-1))return;
    var details=[{label:'First part',values:[professionalName(r.first1),professionalName(r.first2),dutyTiming.firstPeriodDisplay+(dutyTiming.isClockChange?' · '+formatDutyHours(dutyTiming.partHours)+' actual':'')],tone:'first'},{label:'Second part',values:[professionalName(r.second1),professionalName(r.second2),dutyTiming.secondPeriod+(dutyTiming.isClockChange?' · '+formatDutyHours(dutyTiming.partHours)+' actual':'')],tone:'second'}];
    if(count<5)details.push({label:'Status',values:['Additional overtime cover required'],tone:'warning'});
    else if(r.mode==='5')details.push({label:'Full-night Labour Ward / Pager',values:[professionalName(r.fullLW)],tone:'reliever'});
    else{var order=labourOrderFor(r)||{first:r.pager,second:r.reliever};details.push({label:'Pager',values:[professionalName(r.pager),labourAssignmentDetail(r.pager,order)],tone:'pager'});details.push({label:'Reliever',values:[professionalName(r.reliever),labourAssignmentDetail(r.reliever,order)],tone:'reliever'})}
    if(r.mode==='7')details.push({label:'Seventh nurse',values:[professionalName(r.seventh)]});
    if(extras.length)details.push({label:'Additional',values:extras.map(function(o){return o.nurse_name+' · as required'})});
    if(changes.length)details.push({label:'Absences',values:changes.map(function(c){return professionalName(c.absent_name)+' · '+(c.reason||'Unavailable')}),tone:'warning'});
    if(overtime.length)details.push({label:'Overtime',values:overtime.map(function(o){var allocated=plan.availableKeys.indexOf(o.allocation_key)>=0,extra=extras.some(function(x){return x.id===o.id});return o.nurse_name+' · '+(extra?'as required':allocated?allocationLabel(o.allocation_key):'allocation to decide')})});
    if(r.notes)details.push({label:'Notes',values:[r.notes]});cards.push({index:i,date:fmt(r.date),status:status,count:count,details:details});
  });
  if(window.dispatchEvent&&typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('roster:full-roster',{detail:{cards:cards}}));
}

function requireOnline(){
  if(!navigator.onLine||forcedOfflineSession){setSync('offline','Offline • saved information');toast('The shared roster is unavailable. Your entries remain on screen and can be saved after the connection returns.');return false}
  if(sharedWritesBlocked()){setSync('error',compatibilityNeedsUpdate()?'Update required':'Editing paused');toast(sharedWriteNotice());renderWriteGuardState();return false}
  return true;
}

function formMessage(id,message,state){
  var el=byId(id);if(!el)return;
  if(id==='allocationFormMessage'&&window.dispatchEvent&&typeof CustomEvent==='function'){
    if(el.dataset.reactReady!=='true')el.textContent=message||'';
    el.className='formMessage'+(state?' '+state:'');
    window.dispatchEvent(new CustomEvent('roster:changes-feedback',{detail:{message:message||'',state:state||''}}));
    return;
  }
  el.textContent=message||'';el.className='formMessage'+(state?' '+state:'');
}

function showButtonConfirmation(button,restoredLabel){if(!button)return;setTimeout(function(){if(!button.isConnected)return;button.classList.add('saveConfirmed');button.textContent='✓ Saved';setTimeout(function(){if(!button.isConnected)return;button.classList.remove('saveConfirmed');button.textContent=restoredLabel},1100)},0)}

function markInvalid(id,invalid){var el=byId(id);if(el)el.classList.toggle('fieldInvalid',!!invalid)}

function normaliseNurseName(value){
  var name=String(value||'').trim().replace(/\s+/g,' ');
  if(name&&name===name.toUpperCase()||name&&name===name.toLowerCase())name=name.toLowerCase().replace(/(^|[\s'-])([a-z])/g,function(_,prefix,letter){return prefix+letter.toUpperCase()});
  return name;
}

function timedRequest(request){
  return Promise.race([Promise.resolve(request),new Promise(function(_,reject){setTimeout(function(){reject(new Error('timeout'))},15000)})]);
}

function missingRpc(result){
  if(!result||!result.error)return false;
  var message=(result.error.message||'').toLowerCase();
  return result.error.code==='PGRST202'||message.indexOf('could not find the function')>=0||message.indexOf('function public.')>=0&&message.indexOf('does not exist')>=0;
}

function rpcError(result,messageId){
  if(!result||!result.error)return false;
  var message=(result.error.message||'').toLowerCase(),code=rosterErrorCode(result.error);
  setSync('error','Save failed');
  var compatibilityError=code==='CLIENT_UPDATE_REQUIRED'||code==='CLIENT_VERSION_BLOCKED'||code==='APP_MAINTENANCE';
  var notice=result.atomicRequired?'The database must be upgraded before this staffing change can be saved safely. No partial record was written.':code==='ROSTER_REVISION_CONFLICT'||code==='STALE_CLIENT'?conflictNotice(result):code==='CLIENT_UPDATE_REQUIRED'||code==='CLIENT_VERSION_BLOCKED'?'An important Night Roster update is required before shared changes can be made. You can still view the roster.':code==='APP_MAINTENANCE'?'Shared roster editing has been temporarily paused. You can still view the roster.':code==='PERMISSION_DENIED'||result.error.code==='42501'||message.indexOf('permission denied')>=0||message.indexOf('row-level security')>=0?'Your signed-in account does not currently have permission to save staffing changes.':code==='PLAN_INCOMPLETE'?'The latest night is not complete enough to save safely. Review the outstanding decisions first.':code==='STAFF_NOT_EFFECTIVE'?'One of the selected nurses is no longer available for this night. The latest roster has been loaded for review.':message.indexOf('duplicate')>=0||result.error.code==='23505'?'That nurse is already recorded for this night.':'The staffing change could not be saved. Try again, or copy diagnostics for the administrator.';
  if(compatibilityError)refreshCompatibilityState();
  formMessage(messageId,notice,'error');toast(notice);
  return true;
}

async function saveNightChange(){
  if(!requireOnline())return;
  var base=cur(),absent=byId('absentName').value,reason=byId('changeReason').value;
  if(!absent){markInvalid('absentName',true);formMessage('absenceFormMessage','Select the absent nurse before saving.','error');toast('Select the absent nurse first');byId('absentName').focus();return}
  markInvalid('absentName',false);formMessage('absenceFormMessage','Saving '+absent+'…','');
  setSync('saving','Saving absence');byId('saveChangeBtn').disabled=true;byId('saveChangeBtn').textContent='Saving…';
  try{
    var result=await runRosterMutation('absence:add:'+base.date+':'+canonicalNurseName(absent),function(commandId,expectedSyncRevision){return supa.rpc('record_night_absence_v49',{p_operation_id:commandId,p_expected_sync_revision:expectedSyncRevision,p_client_version:APP_VERSION,p_roster_date:base.date,p_absent_name:absent,p_reason:reason})},function(){return changesFor(base.date).some(function(entry){return sameNurse(entry.absent_name,absent)})});
    if(missingRpc(result))result={error:result.error,atomicRequired:true};
    if(rpcError(result,'absenceFormMessage'))return;
    byId('absentName').value='';editingAbsenceId=null;byId('cancelAbsenceEditBtn').classList.add('hidden');formMessage('absenceFormMessage',absent+' saved as absent.','success');
    try{await loadSharedData()}catch(refreshError){scheduleSharedReload()}notifyRosterUpdate('staffing',base.date);
    formMessage('absenceFormMessage',absent+' saved as absent.','success');highlightSavedItem('changeList',absent,'data-absence-name');showButtonConfirmation(byId('saveChangeBtn'),'Save absence');toast('Absence saved for '+absent,{label:'Undo',run:function(){return undoAddedAbsence(base.date,absent)}});
  }catch(error){setSync('error','Save failed');formMessage('absenceFormMessage','No response was received. Your selection is still here.','error');failedAction('Absence was not saved.',saveNightChange);}
  finally{byId('saveChangeBtn').textContent=editingAbsenceId?'Update absence':'Save absence';updateOfflineControls()}
}

function recordAlreadyRemoved(result){
  if(!result||!result.error)return false;
  var message=(result.error.message||'').toLowerCase();
  return message.indexOf('no longer exists')>=0||message.indexOf('not found')>=0;
}

async function undoAddedAbsence(date,name){var item=(nightChanges[date]||[]).find(function(entry){return sameNurse(entry.absent_name,name)});if(!item){toast('That absence has already changed');return}setSync('saving','Undoing absence');var base=baseForDate(date),result=await runRosterMutation('absence:undo-add:'+date+':'+item.id,function(commandId,expectedSyncRevision){return supa.rpc('remove_night_absence_v49',{p_operation_id:commandId,p_expected_sync_revision:expectedSyncRevision,p_client_version:APP_VERSION,p_change_id:item.id,p_allocation_key:allocationKeyForName(base,item.absent_name)})},function(){return !changesFor(date).some(function(entry){return String(entry.id)===String(item.id)})});if(missingRpc(result)){setSync('error','Undo unavailable');toast('Undo requires the current database version. The absence was not changed.');return}if(rpcError(result))return;await loadSharedData();notifyRosterUpdate('staffing',date);toast('Absence undone')}

async function undoRemovedAbsence(date,item){setSync('saving','Restoring absence');var result=await runRosterMutation('absence:undo-remove:'+date+':'+canonicalNurseName(item.absent_name),function(commandId,expectedSyncRevision){return supa.rpc('record_night_absence_v49',{p_operation_id:commandId,p_expected_sync_revision:expectedSyncRevision,p_client_version:APP_VERSION,p_roster_date:date,p_absent_name:item.absent_name,p_reason:item.reason||'Leave'})},function(){return changesFor(date).some(function(entry){return sameNurse(entry.absent_name,item.absent_name)})});if(missingRpc(result)){setSync('error','Undo unavailable');toast('Undo requires the current database version. The absence remains removed.');return}if(rpcError(result))return;await loadSharedData();notifyRosterUpdate('staffing',date);toast('Absence restored')}

async function undoAddedOvertime(date,name){var item=(nightOvertime[date]||[]).find(function(entry){return sameNurse(entry.nurse_name,name)});if(!item){toast('That overtime entry has already changed');return}setSync('saving','Undoing overtime');var result=await runRosterMutation('overtime:undo-add:'+date+':'+item.id,function(commandId,expectedSyncRevision){return supa.rpc('remove_night_overtime_v49',{p_operation_id:commandId,p_expected_sync_revision:expectedSyncRevision,p_client_version:APP_VERSION,p_overtime_id:item.id})},function(){return !overtimeFor(date).some(function(entry){return String(entry.id)===String(item.id)})});if(missingRpc(result)){setSync('error','Undo unavailable');toast('Undo requires the current database version. The overtime record was not changed.');return}if(rpcError(result))return;await loadSharedData();notifyRosterUpdate('staffing',date);toast('Overtime addition undone')}

async function undoRemovedOvertime(date,item){setSync('saving','Restoring overtime nurse');var result=await runRosterMutation('overtime:undo-remove:'+date+':'+canonicalNurseName(item.nurse_name),function(commandId,expectedSyncRevision){return supa.rpc('add_night_overtime_v49',{p_operation_id:commandId,p_expected_sync_revision:expectedSyncRevision,p_client_version:APP_VERSION,p_roster_date:date,p_nurse_name:item.nurse_name})},function(){return overtimeFor(date).some(function(entry){return sameNurse(entry.nurse_name,item.nurse_name)})});if(missingRpc(result)){setSync('error','Undo unavailable');toast('Undo requires the current database version. The overtime record remains removed.');return}if(rpcError(result))return;await loadSharedData();notifyRosterUpdate('staffing',date);toast('Overtime nurse restored')}

async function removeNightChange(id,button){
  if(!requireOnline())return;
  if(pendingRemovals[id])return;
  var base=cur(),item=changesFor(base.date).find(function(c){return c.id===id});
  if(!item||!confirm('Remove '+item.absent_name+' from the absence list for '+fmt(base.date)+'?'))return;
  pendingRemovals[id]=true;if(button){button.disabled=true;button.textContent='Removing…'}setSync('saving','Removing absence');
  try{
    var allocationKey=allocationKeyForName(base,item.absent_name);
    var result=await runRosterMutation('absence:remove:'+base.date+':'+id,function(commandId,expectedSyncRevision){return supa.rpc('remove_night_absence_v49',{p_operation_id:commandId,p_expected_sync_revision:expectedSyncRevision,p_client_version:APP_VERSION,p_change_id:id,p_allocation_key:allocationKey})},function(){return !changesFor(base.date).some(function(entry){return String(entry.id)===String(id)})});
    if(result&&result.error&&!recordAlreadyRemoved(result)){rpcError(result);return}
    await loadSharedData();if(!recordAlreadyRemoved(result))notifyRosterUpdate('staffing',base.date);if(recordAlreadyRemoved(result))toast('Absence was already removed and the list has been refreshed');else toast('Absence removed',{label:'Undo',run:function(){return undoRemovedAbsence(base.date,item)}});
  }catch(error){setSync('error','Remove failed');failedAction('The absence could not be removed.',function(){return removeNightChange(id,button)});}
  finally{delete pendingRemovals[id];if(button&&button.isConnected){button.disabled=false;button.textContent='Remove'}}
}

async function saveOvertime(){
  if(!requireOnline())return;
  var base=cur(),name=normaliseNurseName(byId('overtimeName').value);
  if(!name){markInvalid('overtimeName',true);formMessage('overtimeFormMessage','Type the overtime nurse\'s name before adding.','error');toast('Type the overtime nurse\'s name first');byId('overtimeName').focus();return}
  if(activeNames(base).some(function(n){return n.toLowerCase()===name.toLowerCase()})){formMessage('overtimeFormMessage',name+' is already rostered for this night.','error');toast(name+' is already assigned on this night');return}
  if(overtimeFor(base.date).some(function(o){return o.nurse_name.toLowerCase()===name.toLowerCase()})){formMessage('overtimeFormMessage',name+' is already on the overtime list.','error');toast(name+' is already listed for overtime');return}
  var similar=overtimeFor(base.date).find(function(o){var a=o.nurse_name.trim().toLowerCase(),b=name.toLowerCase();return a.indexOf(b+' ')===0||b.indexOf(a+' ')===0});
  if(similar&&!confirm(name+' may be the same person as '+similar.nurse_name+'. Add both names as separate overtime nurses?')){formMessage('overtimeFormMessage','Check the existing entry for '+similar.nurse_name+' before adding another name.','error');return}
  markInvalid('overtimeName',false);formMessage('overtimeFormMessage','Adding '+name+'…','');
  setSync('saving','Adding overtime nurse');byId('addOvertimeBtn').disabled=true;byId('addOvertimeBtn').textContent='Adding…';
  try{
    var result=await runRosterMutation('overtime:add:'+base.date+':'+canonicalNurseName(name),function(commandId,expectedSyncRevision){return supa.rpc('add_night_overtime_v49',{p_operation_id:commandId,p_expected_sync_revision:expectedSyncRevision,p_client_version:APP_VERSION,p_roster_date:base.date,p_nurse_name:name})},function(){return overtimeFor(base.date).some(function(entry){return sameNurse(entry.nurse_name,name)})});
    if(missingRpc(result))result={error:result.error,atomicRequired:true};
    if(rpcError(result,'overtimeFormMessage'))return;
    byId('overtimeName').value='';rememberOvertimeName(name);formMessage('overtimeFormMessage',name+' added for overtime.','success');
    try{await loadSharedData()}catch(refreshError){scheduleSharedReload()}notifyRosterUpdate('staffing',base.date);
    formMessage('overtimeFormMessage',name+' added for overtime.','success');highlightSavedItem('overtimeList',name,'data-overtime-name');showButtonConfirmation(byId('addOvertimeBtn'),'Add overtime');toast(name+' added for overtime',{label:'Undo',run:function(){return undoAddedOvertime(base.date,name)}});
  }catch(error){setSync('error','Save failed');formMessage('overtimeFormMessage','No response was received. The name remains here.','error');failedAction('Overtime nurse was not saved.',saveOvertime);}
  finally{byId('addOvertimeBtn').textContent='Add overtime';updateOfflineControls()}
}

async function removeOvertime(id,button){
  if(!requireOnline())return;
  if(pendingRemovals[id])return;
  var base=cur(),entry=overtimeFor(base.date).find(function(o){return o.id===id});
  if(!entry||!confirm('Remove '+entry.nurse_name+' from this night\'s overtime list?'))return;
  pendingRemovals[id]=true;if(button){button.disabled=true;button.textContent='Removing…'}setSync('saving','Removing overtime nurse');
  try{
    var result=await runRosterMutation('overtime:remove:'+base.date+':'+id,function(commandId,expectedSyncRevision){return supa.rpc('remove_night_overtime_v49',{p_operation_id:commandId,p_expected_sync_revision:expectedSyncRevision,p_client_version:APP_VERSION,p_overtime_id:id})},function(){return !overtimeFor(base.date).some(function(entry){return String(entry.id)===String(id)})});
    if(result&&result.error&&!recordAlreadyRemoved(result)){rpcError(result);return}
    await loadSharedData();if(!recordAlreadyRemoved(result))notifyRosterUpdate('staffing',base.date);if(recordAlreadyRemoved(result))toast(entry.nurse_name+' was already removed and the list has been refreshed');else toast(entry.nurse_name+' removed from overtime',{label:'Undo',run:function(){return undoRemovedOvertime(base.date,entry)}});
  }catch(error){setSync('error','Remove failed');failedAction('The overtime nurse could not be removed.',function(){return removeOvertime(id,button)});}
  finally{delete pendingRemovals[id];if(button&&button.isConnected){button.disabled=false;button.textContent='Remove'}}
}

async function saveFiveCover(){
  if(!requireOnline())return;
  var base=cur(),plan=staffingPlan(base),pick=byId('fiveCoverPick'),key=pick&&pick.value;
  if(!key||plan.coverageChoices.indexOf(key)<0){toast('Choose the allocation the reliever will cover');return}
  setSync('saving','Saving reliever allocation');
  var result=await runRosterMutation('five-cover:'+base.date+':'+key,function(commandId,expectedSyncRevision){return supa.rpc('apply_staffing_allocations_v49',{p_operation_id:commandId,p_expected_sync_revision:expectedSyncRevision,p_client_version:APP_VERSION,p_roster_date:base.date,p_action:'reliever',p_coverage_key:key,p_assignments:null,p_reliever_name:base.reliever})},function(){var stored=fiveCoverFor(base.date);return !!(stored&&stored.coverage_key===key)});
  if(rpcError(result))return;await loadSharedData();notifyRosterUpdate('allocation',base.date);toast(base.reliever+' saved before the overtime allocations');
}

function desiredAllocationsById(chosen){
  var desired={};Object.keys(chosen).forEach(function(key){desired[chosen[key]]=key});return desired;
}

async function readStoredAllocations(date,chosen){
  var result=await supa.from('night_overtime').select('id,allocation_key').eq('roster_date',date);
  if(result.error)return result;
  var desired=desiredAllocationsById(chosen),rows=result.data||[],selectedIds=Object.keys(desired);
  return{error:null,matches:selectedIds.every(function(id){return rows.some(function(row){return row.id===id})})&&rows.every(function(row){return(row.allocation_key||null)===(desired[row.id]||null)})};
}

async function saveFinalAllocationsV2510(event){
  if(event&&event.preventDefault)event.preventDefault();
  if(allocationSaveInFlight)return false;
  var button=byId('saveAllocationsBtn'),base,chosen={},used={},chosenCount=0,confirmationOnly=false;
  formMessage('allocationFormMessage','Preparing your allocations…','');
  try{
    if(!requireOnline()){formMessage('allocationFormMessage','Reconnect to the internet, then press Confirm and share again.','error');return false}
    base=cur();
    var currentPlan=staffingPlan(base);
    if(currentPlan.requiresSeventhDecision){formMessage('allocationFormMessage','Choose whether to use the seventh rotation or keep the permanent nurse in their original role.','error');toast('Complete the seventh-nurse decision first');var decisionCard=document.querySelector('.seventhDecisionCard');if(decisionCard)decisionCard.scrollIntoView({behavior:'smooth',block:'center'});return false}
    var selects=Array.prototype.slice.call(document.querySelectorAll('[data-final-allocation]'));
    for(var i=0;i<selects.length;i++){
      var key=selects[i].getAttribute('data-final-allocation'),id=selects[i].value;if(!id)continue;
      if(used[id]){formMessage('allocationFormMessage','Choose a different nurse for each allocation.','error');toast('The same overtime nurse cannot be placed in two allocations');return false}used[id]=true;chosen[key]=id;
    }
    chosenCount=Object.keys(chosen).length;
    confirmationOnly=!chosenCount&&currentPlan.coreComplete&&!currentPlan.requiresCoverageChoice&&!currentPlan.requiresSeventhDecision&&!currentPlan.unresolved.length;
    if(!chosenCount&&!confirmationOnly){formMessage('allocationFormMessage','Complete the remaining allocation decisions before confirming the plan.','error');toast('The plan is not ready to confirm');return false}
    allocationSaveInFlight=true;setSync('saving','Saving this night\'s allocations');button.disabled=true;button.textContent='Saving…';formMessage('allocationFormMessage','Saving '+chosenCount+' allocation'+(chosenCount===1?'':'s')+'…','');
    var expectedRevision=nightPlanStatuses[base.date]?Number(nightPlanStatuses[base.date].revision||0):0;
    var atomicResult=await runRosterMutation('plan:finalise:'+base.date+':'+expectedRevision,function(commandId,expectedSyncRevision){return supa.rpc('finalise_night_plan_v49',{p_operation_id:commandId,p_expected_sync_revision:expectedSyncRevision,p_client_version:APP_VERSION,p_roster_date:base.date,p_assignments:chosenCount?chosen:{},p_labour_first:null,p_labour_second:null,p_expected_revision:expectedRevision})},function(){var status=nightPlanStatuses[base.date],savedPlan=staffingPlan(baseForDate(base.date)),matches=Object.keys(chosen).every(function(key){return savedPlan.validAssignments.some(function(item){return item.allocation_key===key&&String(item.id)===String(chosen[key])})});return !!(status&&status.published_at&&Number(status.revision||0)>expectedRevision&&matches)});
    if(!missingRpc(atomicResult)){
      if(atomicResult&&atomicResult.error&&(rosterErrorCode(atomicResult.error)==='ROSTER_REVISION_CONFLICT'||/changed on another device|revision conflict|ROSTER_REVISION_CONFLICT/i.test(atomicResult.error.message||''))){var conflictMessage=conflictNotice(atomicResult);formMessage('allocationFormMessage',conflictMessage,'error');toast('A newer plan was loaded for review');await loadSharedData();return false}
      if(rpcError(atomicResult,'allocationFormMessage'))return false;
    }else if(confirmationOnly){formMessage('allocationFormMessage','The final confirmation service is unavailable. Ask the administrator to run the V26 database upgrade.','error');toast('Plan confirmation is unavailable');return false
    }else if(chosenCount){
      var result=await runRosterMutation('plan:legacy-allocations:'+base.date,function(commandId,expectedSyncRevision){return supa.rpc('apply_staffing_allocations_v49',{p_operation_id:commandId,p_expected_sync_revision:expectedSyncRevision,p_client_version:APP_VERSION,p_roster_date:base.date,p_action:'allocations',p_coverage_key:null,p_assignments:chosen,p_reliever_name:base.reliever})},function(){var savedPlan=staffingPlan(baseForDate(base.date));return Object.keys(chosen).every(function(key){return savedPlan.validAssignments.some(function(item){return item.allocation_key===key&&String(item.id)===String(chosen[key])})})});
      if(missingRpc(result)){formMessage('allocationFormMessage','The allocation service is unavailable. Ask the administrator to apply database schema 35. Nothing was changed.','error');toast('Allocation service requires a database update');return false}
      if(rpcError(result,'allocationFormMessage'))return false;
      var check=await timedRequest(readStoredAllocations(base.date,chosen));
      if(check.error){rpcError(check,'allocationFormMessage');return false}
      if(!check.matches){formMessage('allocationFormMessage','The database did not retain every selected allocation. Reload the latest plan and try again.','error');toast('Allocations need to be reviewed again');await loadSharedData();return false}
    }
    delete allocationDrafts[base.date];delete labourOrderDrafts[base.date];delete seventhDecisionDrafts[base.date];await loadSharedData();notifyRosterUpdate('allocation',base.date);var plan=staffingPlan(baseForDate(base.date)),saved=chosenCount-plan.unresolved.filter(function(key){return Object.prototype.hasOwnProperty.call(chosen,key)}).length;
    var success=plan.unresolved.length?(saved?saved+' allocation'+(saved===1?'':'s')+' saved':'No allocation saved')+' • '+plan.unresolved.length+' still to decide':confirmationOnly?'This night\'s plan confirmed for everyone':additionalNurses(plan).length?'Core plan published; additional staff remain as required':'This night\'s plan published for everyone';
    formMessage('allocationFormMessage',success,'success');showButtonConfirmation(button,'Confirm and share changes');toast(success);return false;
  }catch(error){setSync('error','Save failed');formMessage('allocationFormMessage','Save stopped: '+(error&&error.message==='timeout'?'the connection timed out. Your selections are still here.':'the allocations could not be confirmed. Your selections are still here.'),'error');failedAction('The allocations could not be saved.',function(){return saveFinalAllocationsV2510()});return false}
  finally{allocationSaveInFlight=false;if(button&&button.isConnected){button.disabled=false;button.textContent='Confirm and share changes'}updateOfflineControls()}
}

async function loadNightHistory(date,renderAfter,append){
  if(!date||historyLoadingDates[date])return;
  historyLoadingDates[date]=true;
  try{
    if(Number(schemaVersion||0)>=50){
      var cursor=append&&historyPageState[date]?historyPageState[date]:{},page=await supa.rpc('night_history_page_v50',{p_roster_date:date,p_before_at:cursor.next_before_at||null,p_before_id:cursor.next_before_id||null,p_limit:50});
      if(page.error)return;
      var data=page.data||{},items=Array.isArray(data.items)?data.items:[],changes=[],overtime=[],roles=[];
      items.forEach(function(item){var payload=item&&item.payload;if(!plainSnapshotRecord(payload))return;if(item.source==='absence')changes.push(payload);else if(item.source==='overtime')overtime.push(payload);else if(item.source==='roles')roles.push(payload)});
      if(append){changeHistory[date]=(changeHistory[date]||[]).concat(changes);overtimeHistory[date]=(overtimeHistory[date]||[]).concat(overtime);roleOverrideHistory[date]=(roleOverrideHistory[date]||[]).concat(roles)}
      else{changeHistory[date]=changes;overtimeHistory[date]=overtime;roleOverrideHistory[date]=roles}
      historyPageState[date]={has_more:!!data.has_more,next_before_at:data.next_before_at||null,next_before_id:data.next_before_id||null};
    }else{
      var results=await Promise.all([supa.from('night_change_history').select('*').eq('roster_date',date).order('changed_at',{ascending:false}).limit(50),supa.from('night_overtime_history').select('*').eq('roster_date',date).order('changed_at',{ascending:false}).limit(50),nightRoleOverrideAvailable?supa.from('night_role_override_history').select('*').eq('roster_date',date).order('changed_at',{ascending:false}).limit(50):Promise.resolve({data:[],error:null})]);
      if(results.some(function(x){return x.error}))return;
      changeHistory[date]=results[0].data||[];overtimeHistory[date]=results[1].data||[];roleOverrideHistory[date]=results[2].data||[];historyPageState[date]={has_more:false,next_before_at:null,next_before_id:null};
    }
    historyLoadedDates[date]=true;
    if(renderAfter!==false&&currentUserProfile&&cur().date===date){renderRecentActivity(date);renderChanges(cur())}
  }finally{delete historyLoadingDates[date]}
}

function ensureNightHistory(date){if(!historyLoadedDates[date])loadNightHistory(date,true,false)}
function loadMoreNightHistory(date){if(historyPageState[date]&&historyPageState[date].has_more)return loadNightHistory(date,true,true)}


function setSharedSyncState(state,message){
  sharedSyncState=state||'live';sharedSyncMessage=message||'';
  if(window.AnaestheticRuntime&&window.AnaestheticRuntime.state){
    var runtimeState=sharedSyncState==='reconnecting'?'reconnecting':sharedSyncState==='offline'?'offline':sharedSyncState==='stale'?'stale':sharedSyncState==='error'?'error':sharedSyncState==='access-lost'?'access-lost':sharedSyncState==='starting'?'starting':'live';
    if(runtimeState==='starting'&&window.AnaestheticRuntime.state.sync.value!=='starting')runtimeState='reconnecting';
    window.AnaestheticRuntime.state.sync.set(runtimeState,{message:sharedSyncMessage});
  }
  setSync(state==='live'?'':state==='reconnecting'?'error':state,message||'');renderDiagnostics();
}
async function syncServerClock(force){
  if(serverClockSyncInFlight||!navigator.onLine||!supa||!rosterCapabilities().serverClock)return false;
  if(!force&&Date.now()-serverClockLastAttempt<900000)return true;
  serverClockLastAttempt=Date.now();serverClockSyncInFlight=true;var sent=Date.now();
  try{
    var result=await withTimeout(supa.rpc('app_server_clock_v47'),2500,'Clock check timed out'),received=Date.now();
    if(result&&result.error)throw result.error;
    var value=result&&result.data;if(Array.isArray(value))value=value[0];
    if(value&&typeof value==='object'&&value.server_now)value=value.server_now;
    var accepted=window.AnaestheticRuntime&&window.AnaestheticRuntime.clock?window.AnaestheticRuntime.clock.addSample(String(value||''),sent,received):(window.AnaestheticDomain&&window.AnaestheticDomain.setServerClock&&window.AnaestheticDomain.setServerClock(String(value||''),sent,received));
    if(!accepted)throw new Error('Invalid server clock');
    recordAppDiagnostic('clock','sync','ok');return true
  }catch(error){recordAppDiagnostic('clock','sync',error&&error.code||'fallback');return false}
  finally{serverClockSyncInFlight=false}
}
function noteCompatibilityStartup(path){
  compatibilityStartupUseCount++;compatibilityStartupLastUsed=path;
  var previous=Number(appStorage.getItem('anaes_compat_startup_count')||0);
  appStorage.setItem('anaes_compat_startup_count',String(previous+1));
  appStorage.setItem('anaes_compat_startup_last',String(path||'unknown'));
  appStorage.setItem('anaes_compat_startup_last_at',new Date().toISOString());
  recordAppDiagnostic('compatibility','startup',path)
}
function commandKey(value){return String(value||'command').replace(/[^A-Za-z0-9_.:-]/g,'').slice(0,120)}
function rosterErrorCode(error){return window.AnaestheticRuntime&&window.AnaestheticRuntime.errors?window.AnaestheticRuntime.errors.code(error):String(error&&error.message||error&&error.code||'UNKNOWN')}
function mutationDateFromKey(key){var match=String(key||'').match(/(20\\d{2}-\\d{2}-\\d{2})/);return match&&match[1]||null}
function conflictPlanSnapshot(date){try{var base=date&&baseForDate(date);if(!base)return null;var model=buildNightPlan(base);return{date:model.date,revision:model.revision,confirmed:model.confirmed,provisional:model.provisional,effective:model.effective,staffing:{count:model.staffing&&model.staffing.count,unresolved:model.staffing&&model.staffing.unresolved,assignments:model.staffing&&model.staffing.validAssignments},labourOrder:model.labourOrder}}catch(error){return null}}
function conflictSummary(before,after){
  if(!before||!after)return[];
  var changes=[],labels={first1:'First Part · position 1',first2:'First Part · position 2',second1:'Second Part · position 1',second2:'Second Part · position 2',pager:'Pager',reliever:'Reliever',seventh:'Seventh nurse',fullLW:'Labour Ward / Pager'};
  Object.keys(labels).forEach(function(key){
    var left=before.effective&&before.effective[key],right=after.effective&&after.effective[key];
    if(JSON.stringify(left)!==JSON.stringify(right))changes.push({label:labels[key],before:left||'Unassigned',after:right||'Unassigned'})
  });
  var beforeCount=before.staffing&&Number(before.staffing.count),afterCount=after.staffing&&Number(after.staffing.count);
  if(Number.isFinite(beforeCount)&&Number.isFinite(afterCount)&&beforeCount!==afterCount)changes.push({label:'Staffing',before:beforeCount+' nurses',after:afterCount+' nurses'});
  var beforeTasks=before.staffing&&before.staffing.unresolved||[],afterTasks=after.staffing&&after.staffing.unresolved||[];
  if(JSON.stringify(beforeTasks)!==JSON.stringify(afterTasks))changes.push({label:'Outstanding decisions',before:beforeTasks.length?beforeTasks.join(', '):'None',after:afterTasks.length?afterTasks.join(', '):'None'});
  if(!!before.confirmed!==!!after.confirmed)changes.push({label:'Confirmation',before:before.confirmed?'Confirmed':'Not confirmed',after:after.confirmed?'Confirmed':'Not confirmed'});
  if(JSON.stringify(before.labourOrder||null)!==JSON.stringify(after.labourOrder||null))changes.push({label:'Labour Ward order',before:before.labourOrder?'Changed':'Not set',after:after.labourOrder?'Changed':'Not set'});
  return changes.slice(0,8)
}
function conflictNotice(result){
  var changes=result&&Array.isArray(result.conflictChanges)?result.conflictChanges:[];
  if(!changes.length)return'This night changed on another device. The latest version has been loaded, so review it before saving again.';
  var detail=changes.slice(0,3).map(function(change){return change.label+': '+change.before+' → '+change.after}).join('; ');
  return'This night changed on another device. '+detail+'. Review the latest version before saving again.'
}
async function ensureFreshBeforeMutation(){
  if(!rosterCapabilities().freshnessBarrier)return{ok:true,revision:Number(lastObservedSyncRevision||0)};
  if(!navigator.onLine||forcedOfflineSession)return{ok:false,error:{message:'STALE_CLIENT',code:'STALE_CLIENT'}};
  var result=await supa.from('app_sync_state').select('revision').eq('id',1).maybeSingle();
  if(result.error||!result.data)return{ok:false,error:result.error||{message:'STALE_CLIENT',code:'STALE_CLIENT'}};
  var revision=Number(result.data.revision||0);
  if(lastObservedSyncRevision===null){lastObservedSyncRevision=revision;return{ok:true,revision:revision}}
  if(revision!==Number(lastObservedSyncRevision)){
    await loadSharedData({background:true});
    return{ok:false,error:{message:'ROSTER_REVISION_CONFLICT',code:'ROSTER_REVISION_CONFLICT'},revision:revision};
  }
  return{ok:true,revision:revision}
}
function runRosterMutation(key,execute,verify){
  key=commandKey(key);if(rosterCommandInFlight[key])return rosterCommandInFlight[key];
  var commandId=rosterCommandIds[key]||(window.AnaestheticDomain&&window.AnaestheticDomain.commandId?window.AnaestheticDomain.commandId():'command-'+Date.now()),date=mutationDateFromKey(key),beforePlan=conflictPlanSnapshot(date);
  rosterCommandIds[key]=commandId;
  recordAppDiagnostic('mutation',key,'start');
  var work=(async function(){
    var ambiguous=false;
    try{
      var freshness=await ensureFreshBeforeMutation();
      if(!freshness.ok){
        delete rosterCommandIds[key];
        var staleResult={data:null,error:freshness.error,conflictChanges:conflictSummary(beforePlan,conflictPlanSnapshot(date))};
        recordAppDiagnostic('mutation',key,'stale-client');return staleResult
      }
      var expectedSyncRevision=Number(freshness.revision);
      var result=window.AnaestheticRuntime&&window.AnaestheticRuntime.latency?await window.AnaestheticRuntime.latency.measure('roster-mutation',function(){return timedRequest(execute(commandId,expectedSyncRevision))}):await timedRequest(execute(commandId,expectedSyncRevision));
      if(result&&result.error){
        var code=rosterErrorCode(result.error);
        if(code==='ROSTER_REVISION_CONFLICT'||String(result.error.message||'').indexOf('ROSTER_REVISION_CONFLICT')>=0){
          await loadSharedData({background:true});result.conflictChanges=conflictSummary(beforePlan,conflictPlanSnapshot(date));recordAppDiagnostic('mutation',key,'revision-conflict');
        }
        delete rosterCommandIds[key];
        return result
      }
      delete rosterCommandIds[key];
      recordAppDiagnostic('mutation',key,'committed');return result
    }catch(error){
      ambiguous=error&&error.message==='timeout'||error&&error.name==='AbortError'||error&&error.code==='TIMEOUT';
      recordAppDiagnostic('mutation',key,error&&error.code||(ambiguous?'timeout':'error'));
      if(typeof verify==='function'){
        try{
          await loadSharedData({background:true});
          if(await Promise.resolve(verify())){
            delete rosterCommandIds[key];
            recordAppDiagnostic('mutation',key,'verified-after-timeout');
            return{data:{verified:true,command_id:commandId},error:null,recovered:true}
          }
        }catch(refreshError){recordAppDiagnostic('mutation',key,'verify-failed')}
      }
      if(!ambiguous)delete rosterCommandIds[key];
      throw error
    }finally{delete rosterCommandInFlight[key]}
  })();
  rosterCommandInFlight[key]=work;return work
}

async function loadSharedData(options){
  var background=!!(options&&options.background),loadStarted=window.performance&&performance.now?performance.now():Date.now();
  if(sharedLoadPromise){sharedReloadPending=true;sharedReloadPendingBackground=sharedReloadPendingBackground&&background;return sharedLoadPromise}
  if(!background)document.body.classList.add('dataRefreshing');
  sharedLoadPromise=(async function(){
    try{
      sharedLoadFailureCode='';setSharedSyncState('starting','Opening shared roster');
      sharedLoadFailureStage='snapshot';setLaunchState('Preparing your night','Opening the shared roster…');
      var snapshot;if(preferCompatibilityStartup()){
        try{sharedLoadFailureStage='snapshot';setLaunchState('Preparing your night','Opening the protected Android roster…');snapshot=await requestStartupWithSessionRecovery(requestStartupSnapshotXhr)}catch(androidTransportError){
          if(androidTransportError&&androidTransportError.startupSessionFailed)throw androidTransportError;
          if(androidTransportError&&androidTransportError.code==='42501')throw androidTransportError;
          console.warn('Protected Android startup was unavailable; using compatibility reads',androidTransportError);noteCompatibilityStartup('android-fallback');
          snapshot=await requestCompatibilityStartup()
        }
      }else try{snapshot=await requestStartupWithSessionRecovery(requestStartupSnapshot)}catch(snapshotError){
        if(snapshotError&&snapshotError.startupSessionFailed)throw snapshotError;
        if(snapshotError&&snapshotError.code==='42501')throw snapshotError;
        console.warn('Protected startup snapshot was unavailable; using compatibility reads',snapshotError);noteCompatibilityStartup('snapshot-fallback');
        snapshot=await requestCompatibilityStartup()
      }
      var profile=snapshot&&snapshot.profile;
      if(!plainSnapshotRecord(snapshot)||!plainSnapshotRecord(profile)||!profile.active||!Array.isArray(snapshot.rotation_versions)||!snapshot.rotation_versions.length||!plainSnapshotRecord(snapshot.roster_settings))throw new Error('The shared roster returned incomplete information.');
      if(currentUser&&String(profile.email||'').toLowerCase()!==String(currentUser.email||'').toLowerCase()){var accessError=new Error('The shared roster returned the wrong account.');accessError.code='42501';throw accessError}
      currentUserProfile=profile;try{appStorage.setItem('anaes_cached_profile',JSON.stringify(profile))}catch(error){}prepareAuthorisedShell(profile);
      nightChanges=rowsGroupedByDate(snapshot.night_changes);nightOvertime=rowsGroupedByDate(snapshot.night_overtime);fiveCoverChoices=rowsIndexedByDate(snapshot.night_five_cover);
      rosterSettings=snapshot.roster_settings;rotationVersions=snapshot.rotation_versions;
      labourOrderAvailable=true;labourOrders=rowsIndexedByDate(snapshot.night_labour_order);
      nightPlanStatuses=rowsIndexedByDate(snapshot.night_plan_status);
      nightRoleOverrideAvailable=true;nightRoleOverrides=rowsIndexedByDate(snapshot.night_role_overrides);
      if(plainSnapshotRecord(snapshot.app_settings)){appSettings=snapshot.app_settings}
      schemaVersion=Number(snapshot.schema_version||0);setAppCompatibility(snapshot.compatibility);var incomingRevision=Number(snapshot.sync_revision||0),incomingAccessEpoch=Number(snapshot.access_epoch||0);
      if(lastObservedSyncRevision!==null&&incomingRevision<lastObservedSyncRevision){var staleError=new Error('An older roster snapshot was rejected.');staleError.code='STALE_SNAPSHOT';throw staleError}
      lastObservedSyncRevision=incomingRevision;lastObservedAccessEpoch=incomingAccessEpoch;if(window.AnaestheticRuntime&&window.AnaestheticRuntime.coordinator)window.AnaestheticRuntime.coordinator.announce('sync-revision',{revision:incomingRevision,accessEpoch:incomingAccessEpoch});await syncServerClock(false);
      rebuildCalculatedRoster();
      if(!initialNightChosen){nightSelectionMode='automatic';idx=startingIndex(appNow());automaticSelectedDate=R[idx].date;initialNightChosen=true}
      else if(nightSelectionMode==='automatic'){idx=startingIndex(appNow());automaticSelectedDate=R[idx].date}
      else{var selected=appStorage.getItem('anaes_selected_date'),selectedIdx=selected?R.findIndex(function(r){return r.date===selected}):-1;idx=selectedIdx>=0?selectedIdx:Math.min(idx,R.length-1)}
      lastSuccessfulSyncAt=new Date(appNowMs()).toISOString();forcedOfflineSession=false;sharedLoadFailureStage='';sharedLoadFailureCode='';saveOfflineSnapshot();setSharedSyncState('live','');render();renderDiagnostics();return true;
    }catch(error){
      console.error('Shared roster startup failed during '+sharedLoadFailureStage,error);recordAppDiagnostic('startup',sharedLoadFailureStage,error&&error.code||'error');
      sharedLoadFailureCode=String(error&&((error.status&&String(error.status))||error.code)||'').replace(/[^A-Za-z0-9_.-]/g,'').slice(0,32);
      if(error&&(error.startupSessionFailed||startupAuthError(error)))sharedLoadFailureStage='session';
      if(error&&error.code==='42501'){sharedLoadFailureStage='access';forcedOfflineSession=false;return false}
      var cached=currentUser&&cachedAllowedProfile(currentUser.email);if(!currentUserProfile&&cached)prepareAuthorisedShell(cached);
      forcedOfflineSession=true;if(cached&&restoreOfflineSnapshot()){updateOfflineControls();return true}forcedOfflineSession=false;
      setSharedSyncState('error','Shared data unavailable');return false
    }
  })();
  try{return await sharedLoadPromise}finally{if(window.AnaestheticRuntime&&window.AnaestheticRuntime.latency)window.AnaestheticRuntime.latency.record('shared-load',(window.performance&&performance.now?performance.now():Date.now())-loadStarted,true);if(!background)document.body.classList.remove('dataRefreshing');sharedLoadPromise=null;if(sharedReloadPending){var nextBackground=sharedReloadPendingBackground;sharedReloadPending=false;sharedReloadPendingBackground=true;setTimeout(function(){loadSharedData({background:nextBackground})},120)}}
}

function scheduleSharedReload(background){clearTimeout(reloadTimer);reloadTimer=setTimeout(function(){loadSharedData({background:background!==false})},350)}

async function checkSharedRevision(options){
  options=options||{};
  if(sharedSyncCheckInFlight||forcedOfflineSession||!currentUserProfile||!navigator.onLine||document.visibilityState==='hidden')return{skipped:true};
  sharedSyncCheckInFlight=true;
  try{
    var revisionRequest=function(){return Promise.all([
      supa.from('app_sync_state').select('revision').eq('id',1).maybeSingle(),
      supa.from('app_access_signal').select('access_epoch').eq('id',1).maybeSingle()
    ])},results=window.AnaestheticRuntime&&window.AnaestheticRuntime.latency?await window.AnaestheticRuntime.latency.measure('revision-check',revisionRequest):await revisionRequest();
    var result=results[0],accessResult=results[1],accessEpoch=accessResult&&!accessResult.error&&accessResult.data?Number(accessResult.data.access_epoch||0):null;
    if(accessEpoch!==null){
      if(lastObservedAccessEpoch===null)lastObservedAccessEpoch=accessEpoch;
      if(accessEpoch!==Number(lastObservedAccessEpoch||0)){
        var access=await checkCurrentAccessStatus(accessEpoch);
        if(access&&!access.active)return{changed:true,accessLost:true,revision:Number(lastObservedSyncRevision||0),accessEpoch:accessEpoch}
      }
    }
    if(result.error||!result.data){if(Date.now()-new Date(lastSuccessfulSyncAt||0).getTime()>30000)scheduleSharedReload(true);return{error:result.error||new Error('Revision unavailable'),accessEpoch:accessEpoch}}
    var revision=Number(result.data.revision||0);
    if(lastObservedSyncRevision===null){lastObservedSyncRevision=revision;return{changed:false,revision:revision,accessEpoch:accessEpoch}}
    if(revision!==Number(lastObservedSyncRevision)){
      if(options.reloadNow)await loadSharedData({background:true});else scheduleSharedReload(true);
      if(window.AnaestheticRuntime&&window.AnaestheticRuntime.coordinator)window.AnaestheticRuntime.coordinator.announce('sync-revision',{revision:revision,accessEpoch:accessEpoch===null?Number(lastObservedAccessEpoch||0):accessEpoch});
      return{changed:true,revision:revision,accessEpoch:accessEpoch};
    }
    return{changed:false,revision:revision,accessEpoch:accessEpoch};
  }finally{sharedSyncCheckInFlight=false}
}

function startSharedSyncMonitor(){
  if(sharedSyncTimer)return;
  if(window.AnaestheticRuntime&&window.AnaestheticRuntime.scheduler){
    sharedSyncTimer='runtime';
    window.AnaestheticRuntime.scheduler.every('shared-revision',function(){
      return realtimeSubscribed&&sharedSyncState==='live'?60000:15000
    },function(){
      if(window.AnaestheticRuntime.coordinator&&!window.AnaestheticRuntime.coordinator.isLeader())return;
      if(!realtimeSubscribed&&currentUserProfile&&navigator.onLine&&!forcedOfflineSession)subscribeToChanges();
      return checkSharedRevision()
    });
  }else sharedSyncTimer=setInterval(checkSharedRevision,15000)
}

function scheduleRealtimeReconnect(){
  if(realtimeReconnectTimer||forcedOfflineSession||!currentUserProfile||!navigator.onLine)return;
  if(window.AnaestheticRuntime&&window.AnaestheticRuntime.coordinator&&!window.AnaestheticRuntime.coordinator.isLeader())return;
  var delay=Math.min(30000,1000*Math.pow(2,realtimeRetryCount++));
  realtimeReconnectTimer=setTimeout(function(){realtimeReconnectTimer=null;subscribeToChanges()},delay);
}

function subscribeToChanges(){
  if(window.AnaestheticRuntime&&window.AnaestheticRuntime.coordinator&&!window.AnaestheticRuntime.coordinator.isLeader()){
    realtimeSubscribed=false;if(changesChannel){supa.removeChannel(changesChannel);changesChannel=null}setSharedSyncState('live','');return;
  }
  var generation=++realtimeGeneration;realtimeSubscribed=false;if(realtimeReconnectTimer){clearTimeout(realtimeReconnectTimer);realtimeReconnectTimer=null}if(changesChannel)supa.removeChannel(changesChannel);
  var tables=['app_sync_state','app_access_signal','night_changes','night_overtime','night_change_history','night_overtime_history','night_five_cover','roster_settings','rotation_versions','night_plan_status','app_settings'];if(labourOrderAvailable)tables.push('night_labour_order');if(nightRoleOverrideAvailable)tables.push('night_role_overrides','night_role_override_history');
  changesChannel=supa.channel('roster-live-v41');
  tables.forEach(function(table){changesChannel.on('postgres_changes',{event:'*',schema:'public',table:table},function(payload){
    if(table==='night_change_history'||table==='night_overtime_history'||table==='night_role_override_history'){
      var date=(payload.new&&payload.new.roster_date)||(payload.old&&payload.old.roster_date);if(date){historyLoadedDates[date]=false;if(currentUserProfile&&cur().date===date)ensureNightHistory(date)}
    }
    if(table==='app_access_signal'&&payload.new){
      var accessEpoch=Number(payload.new.access_epoch||0);
      if(window.AnaestheticRuntime&&window.AnaestheticRuntime.coordinator)window.AnaestheticRuntime.coordinator.announce('sync-revision',{revision:Number(lastObservedSyncRevision||0),accessEpoch:accessEpoch});
      if(accessEpoch!==Number(lastObservedAccessEpoch||0)){
        checkCurrentAccessStatus(accessEpoch).then(function(access){if(access&&access.active)scheduleSharedReload(true)});
      }
      return
    }
    if(table==='app_sync_state'&&payload.new&&window.AnaestheticRuntime&&window.AnaestheticRuntime.coordinator){
      window.AnaestheticRuntime.coordinator.announce('sync-revision',{revision:Number(payload.new.revision||0),accessEpoch:Number(lastObservedAccessEpoch||0)});
    }
    scheduleSharedReload(true);
  })});
  changesChannel.subscribe(function(status){if(generation!==realtimeGeneration)return;if(status==='SUBSCRIBED'){realtimeSubscribed=true;realtimeRetryCount=0;setSharedSyncState('live','');checkSharedRevision()}else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){realtimeSubscribed=false;setSharedSyncState('reconnecting','Reconnecting live updates…');recordAppDiagnostic('realtime','roster',status);scheduleRealtimeReconnect()}});
}

function resumeSharedSync(){if(forcedOfflineSession||!currentUserProfile||!navigator.onLine)return;if(!realtimeSubscribed)subscribeToChanges();checkSharedRevision();if(Date.now()-new Date(lastSuccessfulSyncAt||0).getTime()>30000)scheduleSharedReload(true)}
async function reconcileApplication(reason){
  applyThemePreference();
  if(!currentUserProfile)return false;
  if(!navigator.onLine){realtimeSubscribed=false;updateNetworkStatus();return false}
  lastResumeRefresh=Date.now();
  try{
    var sessionResult=supa&&supa.auth&&supa.auth.getSession?await supa.auth.getSession():null;
    if(sessionResult&&sessionResult.error)throw sessionResult.error;
    if(sessionResult&&sessionResult.data&&!sessionResult.data.session){setSharedSyncState('error','Sign-in needs attention');recordAppDiagnostic('lifecycle','session','missing');return false}
    await syncServerClock(false);
    var check=await checkSharedRevision({reloadNow:true});
    if(nightSelectionMode==='automatic')refreshAutomaticNightOnReturn();
    if(!realtimeSubscribed)subscribeToChanges();
    if(typeof verifyRuntimeHealth==='function')verifyRuntimeHealth();
    updateNetworkStatus();
    recordAppDiagnostic('lifecycle','resume',reason||'unknown');
    return !(check&&check.error)
  }catch(error){recordAppDiagnostic('lifecycle','resume',error&&error.code||'failed');setSharedSyncState('reconnecting','Reconnecting live updates…');scheduleRealtimeReconnect();return false}
}

function updateOfflineControls(){
  var offline=!navigator.onLine||forcedOfflineSession,writeBlocked=sharedWritesBlocked(),ids=['saveAllocationsBtn','saveNightRolesBtn','resetNightRolesBtn','saveTeamVersionBtn','previewExtendBtn','extendBtn'];
  ids.forEach(function(id){var el=byId(id);if(el)el.disabled=offline||writeBlocked||el.dataset.workflowBlocked==='true'});
  var addAccount=byId('addAccountBtn');if(addAccount)addAccount.disabled=offline;
  var cover=byId('saveFiveCoverBtn');if(cover)cover.disabled=offline||writeBlocked;
  var labour=byId('saveLabourOrderBtn');if(labour)labour.disabled=offline||writeBlocked;
  renderWriteGuardState();updateStaffingActionAvailability();
}

function sharedTransportLive(){
  if(realtimeSubscribed)return true;
  return !!(window.AnaestheticRuntime&&window.AnaestheticRuntime.coordinator&&!window.AnaestheticRuntime.coordinator.isLeader())
}
function updateNetworkStatus(){
  var live=sharedTransportLive();
  if(!navigator.onLine||forcedOfflineSession)setSharedSyncState('offline','');else if(currentUserProfile)setSharedSyncState(live?'live':'reconnecting',live?'':'Reconnecting live updates…');
  updateOfflineControls();
}

function chooseDate(inputId){
  var value=byId(inputId).value,previous=idx;if(!value){render();return}nightSelectionMode='manual';if(window.AnaestheticRuntime&&window.AnaestheticRuntime.state)window.AnaestheticRuntime.state.night.set('manual');
  if(value<R[0].date){idx=0;toast('The published roster begins on '+fmt(R[0].date));render();return}
  if(value>R[R.length-1].date){idx=R.length-1;toast('The roster is currently published only until '+fmt(R[R.length-1].date));render();return}
  var i=R.findIndex(function(r){return r.date>=value});idx=i<0?R.length-1:i;if(idx!==previous)document.body.setAttribute('data-date-direction',idx>previous?'next':'previous');if(R[idx].date!==value)toast('Next rostered night: '+fmt(R[idx].date));render();setTimeout(function(){document.body.removeAttribute('data-date-direction')},360);
}

function csvCell(value){return '"'+String(value==null?'':value).replaceAll('"','""')+'"'}

function exportCSV(){
  var headers=['Date','Actual nurse count','Status','First Part','Second Part','Pager','Reliever','Full-night Labour Ward / Pager','Seventh nurse','Additional staff','Absences','Overtime','Reliever cover choice','Notes'];
  var rows=R.map(function(original){
    var base=Object.assign({},original);base.mode='6';var r=applyChanges(base),plan=staffingPlan(base),extras=additionalNurses(plan),changes=changesFor(base.date),overtime=overtimeFor(base.date);
    return[base.date,plan.count,planIsProvisional(base)?'Provisional':extras.length?'Core finalised; additional staff as required':'Final',r.first1+' + '+r.first2,r.second1+' + '+r.second2,r.mode==='5'?'':r.pager,r.mode==='5'?'':r.reliever,r.mode==='5'?r.fullLW:'',r.mode==='7'?r.seventh:'',extras.map(function(o){return o.nurse_name}).join(' + '),changes.map(function(c){return c.absent_name+' ('+(c.reason||'Unavailable')+')'}).join('; '),overtime.map(function(o){return o.nurse_name+' ('+(o.allocation_key?allocationLabel(o.allocation_key):'Awaiting allocation')+')'}).join('; '),plan.coverageKey?allocationLabel(plan.coverageKey):'',r.notes||''].map(csvCell).join(',');
  });
  download('anaesthetic-roster-v'+APP_VERSION.replace('.','-')+'.csv',headers.map(csvCell).join(',')+'\n'+rows.join('\n'),'text/csv');
}

async function backup(){
  if(!requireOnline())return;
  toast('Preparing roster-data export');
  var allHistory=await Promise.all([supa.from('night_change_history').select('*').order('changed_at',{ascending:false}),supa.from('night_overtime_history').select('*').order('changed_at',{ascending:false}),supa.from('night_role_override_history').select('*').order('changed_at',{ascending:false})]);
  if(allHistory.some(function(x){return x.error})){toast('The roster-data export could not be prepared');return}
  var createdAt=new Date().toISOString();download('roster-data-export-v'+APP_VERSION.replace('.','-')+'.json',JSON.stringify({created_at:createdAt,app_version:APP_VERSION,scope_note:'Roster and administrator data only. Private profile details and profile photos are excluded.',roster_settings:rosterSettings,rotation_versions:rotationVersions,night_changes:nightChanges,night_overtime:nightOvertime,absence_history:allHistory[0].data||[],overtime_history:allHistory[1].data||[],night_role_overrides:Object.values(nightRoleOverrides),night_role_override_history:allHistory[2].data||[],five_nurse_cover:fiveCoverChoices,labour_ward_orders:Object.values(labourOrders),night_plan_statuses:Object.values(nightPlanStatuses),app_settings:appSettings,authorised_accounts:authorisedAccounts},null,2),'application/json');appStorage.setItem('anaes_last_backup_at',createdAt);renderDiagnostics();
}

function fallbackUpdateMeta(){return{version:'',date:'',title:'Night Roster update',summary:'The latest Night Roster improvements are ready to install.',changes:['Reliability, clarity and interface improvements are ready.'],update_policy:'important'}}

function validUpdateMeta(value){return !!(value&&typeof value==='object'&&/^\d+(?:\.\d+)+$/.test(String(value.version||''))&&typeof value.title==='string'&&Array.isArray(value.changes)&&value.changes.length&&value.changes.every(function(item){return typeof item==='string'&&item.trim().length>0})&&(!value.update_policy||['automatic','quiet','normal','important'].indexOf(value.update_policy)>=0))}
function updateIsAutomatic(){return !!(pendingUpdateMeta&&(pendingUpdateMeta.update_policy==='automatic'||pendingUpdateMeta.update_policy==='quiet'))}
function cacheVersionNumber(value){var match=String(value||'').match(/anaesthetic-night-roster-v(\d+(?:-\d+)+)/);return match?match[1].replace(/-/g,'.'):''}
function waitingUpdateDeferralKey(){return'anaes_update_later_'+(waitingUpdateVersion||(pendingUpdateMeta&&pendingUpdateMeta.version)||'unknown')}
function clearUpdateNotice(){var banner=byId('updateBanner'),dialog=byId('updateDetails');if(banner)banner.classList.add('hidden');if(dialog&&dialog.open)dialog.close()}
function classifyWaitingUpdate(){
  var incoming=waitingUpdateVersion||(pendingUpdateMeta&&pendingUpdateMeta.version)||'',active=cacheVersionNumber(serviceWorkerCacheVersion);
  if(incoming&&incoming!==APP_VERSION)return'new';
  if(incoming&&active===incoming)return'refresh';
  return'finish';
}
function workerCacheName(worker){
  if(!worker||typeof MessageChannel!=='function')return Promise.resolve('');
  return new Promise(function(resolve){
    var settled=false,channel=new MessageChannel(),timer=setTimeout(function(){if(!settled){settled=true;resolve('')}},900);
    channel.port1.onmessage=function(event){if(settled)return;settled=true;clearTimeout(timer);resolve(event.data&&event.data.type==='CACHE_VERSION'?String(event.data.value||''):'')};
    try{worker.postMessage({type:'GET_CACHE_VERSION'},[channel.port2])}catch(error){clearTimeout(timer);settled=true;resolve('')}
  });
}

function workerCacheHealth(worker,type){
  if(!worker||typeof MessageChannel!=='function')return Promise.resolve(null);
  return new Promise(function(resolve){
    var settled=false,channel=new MessageChannel(),timer=setTimeout(function(){if(!settled){settled=true;resolve(null)}},2500);
    channel.port1.onmessage=function(event){
      if(settled)return;var data=event&&event.data||{};
      if(data.type!=='CACHE_HEALTH')return;
      settled=true;clearTimeout(timer);resolve(data)
    };
    try{worker.postMessage({type:type||'VERIFY_CACHE'},[channel.port2])}catch(error){clearTimeout(timer);settled=true;resolve(null)}
  })
}
async function verifyAndRepairAppShell(force){
  var worker=navigator.serviceWorker&&navigator.serviceWorker.controller;if(!worker)return null;
  if(!force&&Date.now()-lastCacheVerifyAt<15*60*1000)return null;
  if(cacheRepairInFlight)return cacheRepairInFlight;
  lastCacheVerifyAt=Date.now();
  cacheRepairInFlight=(async function(){
    var first=await workerCacheHealth(worker,'VERIFY_CACHE');
    if(!first){recordAppDiagnostic('update','cache-health','unavailable');return null}
    var missing=Array.isArray(first.missing)?first.missing:[];
    if(!missing.length){recordAppDiagnostic('update','cache-health','healthy');return first}
    recordAppDiagnostic('update','cache-health','repair-'+missing.length);
    var repaired=await workerCacheHealth(worker,'REPAIR_CACHE');
    if(!repaired||Array.isArray(repaired.missing)&&repaired.missing.length){recordAppDiagnostic('update','cache-health','repair-failed');return repaired}
    recordAppDiagnostic('update','cache-health','repaired');return repaired
  })();
  try{return await cacheRepairInFlight}finally{cacheRepairInFlight=null}
}
async function refreshControllerCacheVersion(){
  var worker=navigator.serviceWorker&&navigator.serviceWorker.controller;if(!worker)return'';
  var value=await workerCacheName(worker);if(value){serviceWorkerCacheVersion=value;renderDiagnostics()}return value;
}
function verifyRuntimeHealth(){
  var release=installedReleaseState(),expected='anaesthetic-night-roster-v'+APP_VERSION.replaceAll('.','-'),healthy=RELEASE_HISTORY[0]&&RELEASE_HISTORY[0].version===APP_VERSION&&(!navigator.serviceWorker||!navigator.serviceWorker.controller||serviceWorkerCacheVersion==='Checking…'||serviceWorkerCacheVersion==='Not active'||serviceWorkerCacheVersion===expected);
  if(!healthy){recordAppDiagnostic('update','runtime-health','mismatch');verifyAndRepairAppShell(true);setSharedSyncState('error','App update needs attention');return false}
  if(release.stale){recordAppDiagnostic('update','runtime-health','stale-cache');verifyAndRepairAppShell(true);return false}
  verifyAndRepairAppShell(false);return true
}

function renderPendingUpdate(){
  var meta=pendingUpdateMeta||fallbackUpdateMeta(),serverRequired=compatibilityNeedsUpdate(),automatic=!serverRequired&&updateIsAutomatic(),incoming=waitingUpdateVersion||meta.version||'',state=waitingUpdateState||classifyWaitingUpdate(),version=incoming?'Version '+incoming+(meta.date?' · '+meta.date:''):'Update ready';
  var banner=byId('updateBanner'),bannerVersion=byId('updateBannerVersion'),bannerTitle=banner&&banner.querySelector('.updateBannerSummary b'),bannerSmall=banner&&banner.querySelector('.updateBannerSummary small'),sheetVersion=byId('updateDetailsVersion'),sheetTitle=byId('updateDetailsTitle'),sheetSummary=byId('updateDetailsSummary'),safety=byId('updateSafetyNote'),list=byId('updateChangesList'),laterBanner=byId('laterUpdateBtn'),laterSheet=byId('laterUpdateSheetBtn');
  if(banner)banner.classList.toggle('automatic',automatic);
  if(state==='finish'){
    if(bannerVersion)bannerVersion.textContent=(incoming?'Version '+incoming:'This version')+' is already open';
    if(bannerTitle)bannerTitle.textContent='Finish installing the update';
    if(bannerSmall)bannerSmall.textContent='One quick restart will sync the app cache.';
    if(sheetVersion)sheetVersion.textContent='Finish install · '+(incoming||APP_VERSION);
  }else if(state==='refresh'){
    if(bannerVersion)bannerVersion.textContent=(incoming?'Version '+incoming:'Current version')+' · app components';
    if(bannerTitle)bannerTitle.textContent='Finish refreshing Night Roster';
    if(bannerSmall)bannerSmall.textContent='The app is open, but updated components are still waiting.';
    if(sheetVersion)sheetVersion.textContent='Component refresh · '+(incoming||APP_VERSION);
  }else{
    if(bannerVersion)bannerVersion.textContent=serverRequired?'Safety update · '+version:(automatic?'Ready for next reopen · '+version:version);
    if(bannerTitle)bannerTitle.textContent=serverRequired?'Important Night Roster update required':'Night Roster update ready';
    if(bannerSmall)bannerSmall.textContent=serverRequired?'Shared changes stay paused until this update is installed.':(automatic?'No action required. It will install safely when Night Roster is next reopened.':(meta.title||'Review what changed or update now.'));
    if(sheetVersion)sheetVersion.textContent=serverRequired?'Required safety update · '+version:(automatic?'Automatic update · '+version:version);
  }
  if(sheetTitle)sheetTitle.textContent=serverRequired&&state==='new'?'Update required before shared changes':state==='new'?(meta.title||'Night Roster update'):'Finish installing '+(incoming||APP_VERSION);
  if(sheetSummary)sheetSummary.textContent=serverRequired&&state==='new'?'You can continue viewing the roster, but shared changes are disabled until this version is installed. Review what changed, then choose Update.':state==='new'?(meta.summary||'Review what is changing, then update when convenient.'):'The visible app and its cached PWA shell are temporarily on different states. Updating once will activate the waiting service worker and reopen Night Roster in sync.';
  if(safety){var copy=safety.querySelector('span');if(copy)copy.innerHTML=serverRequired?'<b>Your shared roster data stays intact.</b> Viewing remains available while shared editing waits for the required update.':automatic?'<b>Your shared roster data stays intact.</b> Close and reopen Night Roster to take this update automatically, or update now.':'<b>Your shared roster data stays intact.</b> The app will reopen once after the waiting update is activated.'}
  if(laterBanner)laterBanner.classList.toggle('hidden',serverRequired);
  if(laterSheet)laterSheet.classList.toggle('hidden',serverRequired);
  if(list)list.innerHTML=meta.changes.map(function(change){return'<li>'+esc(change)+'</li>'}).join('');
}

async function loadPendingUpdateMeta(){
  pendingUpdateMeta=fallbackUpdateMeta();renderPendingUpdate();
  try{var response=await fetch('./release.json?check='+Date.now(),{cache:'no-store',credentials:'same-origin'});if(!response.ok)throw new Error('Release information unavailable');var value=await response.json();if(validUpdateMeta(value))pendingUpdateMeta=value}catch(error){}
  if(!waitingUpdateVersion&&pendingUpdateMeta&&pendingUpdateMeta.version)waitingUpdateVersion=pendingUpdateMeta.version;
  waitingUpdateState=classifyWaitingUpdate();renderPendingUpdate();return pendingUpdateMeta;
}

async function showUpdate(registration){
  updateRegistration=registration;var waiting=registration&&registration.waiting;if(!waiting){clearUpdateNotice();renderWriteGuardState();renderDiagnostics();return}
  pendingUpdateMeta=null;waitingUpdateVersion=cacheVersionNumber(await workerCacheName(waiting));await loadPendingUpdateMeta();waitingUpdateState=classifyWaitingUpdate();renderPendingUpdate();renderDiagnostics();
  sessionStorage.removeItem('anaes_update_later');
  if(sessionStorage.getItem(waitingUpdateDeferralKey())==='1'&&!updateIsAutomatic()&&!compatibilityNeedsUpdate()){renderWriteGuardState();return}
  var banner=byId('updateBanner');if(banner)banner.classList.remove('hidden');renderWriteGuardState();
}

function openUpdateDetails(){var dialog=byId('updateDetails');if(!dialog||!dialog.showModal)return;renderPendingUpdate();byId('updateDetailsStatus').textContent=compatibilityNeedsUpdate()?'Shared roster viewing remains available, but shared changes require this update.':updateIsAutomatic()?'This update will install on a future reopen even if you do nothing.':waitingUpdateState==='new'?'':'Night Roster will reopen once to finish synchronising this version.';if(!dialog.open)dialog.showModal()}

function dismissWaitingUpdate(){if(compatibilityNeedsUpdate()){toast('This safety update is required before shared changes can be made');renderPendingUpdate();return}sessionStorage.setItem(waitingUpdateDeferralKey(),'1');clearUpdateNotice();toast(updateIsAutomatic()?'Update will install when Night Roster is reopened':'Update saved for later')}

function finishUpdateActivation(){
  if(updateActivationTimer){clearTimeout(updateActivationTimer);updateActivationTimer=null}
  clearUpdateNotice();waitingUpdateVersion='';waitingUpdateState='new';
}
function resetUpdateButtons(){
  [byId('applyUpdateBtn'),byId('applyUpdateSheetBtn'),byId('diagnosticUpdateBtn')].forEach(function(button){if(button){button.disabled=false;button.textContent='Update'}});
}
function applyWaitingUpdate(){
  if(!updateRegistration||!updateRegistration.waiting){clearUpdateNotice();toast('Night Roster is already up to date');return}
  var pendingDrafts=allLocalChangesDraftParts(),status=byId('updateDetailsStatus');if(pendingDrafts.length){if(status)status.textContent='You have unfinished Changes selections. Save or clear them before updating so your work is not lost.';toast('Finish your unsaved Changes before updating');return}
  var buttons=[byId('applyUpdateBtn'),byId('applyUpdateSheetBtn'),byId('diagnosticUpdateBtn')];reloadForUpdate=true;sessionStorage.removeItem(waitingUpdateDeferralKey());buttons.forEach(function(button){if(button){button.disabled=true;button.textContent='Updating…'}});if(status)status.textContent='Activating the update. Night Roster will reopen automatically.';
  updateRegistration.waiting.postMessage({type:'ACTIVATE_UPDATE'});
  if(updateActivationTimer)clearTimeout(updateActivationTimer);
  updateActivationTimer=setTimeout(async function(){
    if(!reloadForUpdate)return;
    try{if(updateRegistration)await updateRegistration.update()}catch(error){}
    if(updateRegistration&&!updateRegistration.waiting){finishUpdateActivation();reloadForUpdate=false;window.location.reload();return}
    reloadForUpdate=false;resetUpdateButtons();if(status)status.textContent='The update is still waiting. Try Update once more.';toast('Update is still waiting to activate');
  },5000);
}

function applyStandaloneUi(){
  pwaStandalone=isStandaloneApp();document.body.classList.toggle('standaloneApp',pwaStandalone);
  var install=byId('installBtn'),accountInstall=byId('accountInstallBtn');
  if(install)install.classList.toggle('hidden',pwaStandalone||(!deferredInstallPrompt&&!/iphone|ipad|ipod/i.test(navigator.userAgent)));
  if(accountInstall)accountInstall.classList.toggle('hidden',pwaStandalone);
}
function setupViewportState(){
  function update(){
    var viewport=window.visualViewport,active=document.activeElement,editable=!!(active&&/^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)),height=viewport?viewport.height:window.innerHeight;
    document.documentElement.style.setProperty('--app-viewport-height',Math.round(height)+'px');
    var keyboard=!!(viewport&&editable&&window.innerHeight-viewport.height>120);
    document.body.classList.toggle('keyboardVisible',keyboard);
  }
  if(window.visualViewport){window.visualViewport.addEventListener('resize',update);window.visualViewport.addEventListener('scroll',update)}
  window.addEventListener('orientationchange',function(){setTimeout(update,120)});
  document.addEventListener('focusin',function(){setTimeout(update,60)});document.addEventListener('focusout',function(){setTimeout(update,120)});update();
}
function setupPWA(){
  var install=byId('installBtn');
  applyStandaloneUi();setupViewportState();
  window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();deferredInstallPrompt=e;applyStandaloneUi();var guide=byId('installGuide');if(guide&&guide.open){byId('installGuideSteps').innerHTML=installGuideSteps();bindInstallGuideActions()}});
  install.onclick=async function(){if(deferredInstallPrompt){await runInstallPrompt();return}showInstallGuide()};
  window.addEventListener('appinstalled',function(){deferredInstallPrompt=null;applyStandaloneUi();toast('Night Roster installed')});
  byId('applyUpdateBtn').onclick=applyWaitingUpdate;byId('applyUpdateSheetBtn').onclick=applyWaitingUpdate;byId('openUpdateDetailsBtn').onclick=openUpdateDetails;byId('laterUpdateBtn').onclick=dismissWaitingUpdate;byId('laterUpdateSheetBtn').onclick=dismissWaitingUpdate;
  if(navigator.serviceWorker&&typeof navigator.serviceWorker.addEventListener==='function'&&typeof navigator.serviceWorker.register==='function'){
    navigator.serviceWorker.addEventListener('message',function(event){if(event.data&&event.data.type==='CACHE_VERSION'){serviceWorkerCacheVersion=event.data.value||'Unknown';renderDiagnostics();verifyRuntimeHealth()}});navigator.serviceWorker.addEventListener('controllerchange',function(){finishUpdateActivation();refreshControllerCacheVersion().then(verifyRuntimeHealth);if(reloadForUpdate){reloadForUpdate=false;window.location.reload()}else renderDiagnostics()});
    var check=function(){if(window.AnaestheticRuntime&&window.AnaestheticRuntime.coordinator&&!window.AnaestheticRuntime.coordinator.isLeader())return;if(updateRegistration&&navigator.onLine)updateRegistration.update().catch(function(){})};
    window.addEventListener('load',async function(){try{updateRegistration=await navigator.serviceWorker.register('./service-worker.js',{updateViaCache:'none'});updateRegistration.addEventListener('updatefound',function(){var worker=updateRegistration.installing;if(!worker)return;worker.addEventListener('statechange',function(){if(worker.state==='installed'&&navigator.serviceWorker.controller)showUpdate(updateRegistration)})});await navigator.serviceWorker.ready;if(navigator.serviceWorker.controller){var activeCache=await refreshControllerCacheVersion();if(!activeCache)navigator.serviceWorker.controller.postMessage({type:'GET_CACHE_VERSION'});else verifyRuntimeHealth();await verifyAndRepairAppShell(!!(runtimeRecoveryStatus&&runtimeRecoveryStatus.safeMode))}else{serviceWorkerCacheVersion='Not active';renderDiagnostics()}if(updateRegistration.waiting)await showUpdate(updateRegistration);if(!window.AnaestheticRuntime||!window.AnaestheticRuntime.coordinator||window.AnaestheticRuntime.coordinator.isLeader())await updateRegistration.update();if(window.AnaestheticRuntime&&window.AnaestheticRuntime.scheduler)window.AnaestheticRuntime.scheduler.every('pwa-update',900000,check);else setInterval(check,900000)}catch(e){serviceWorkerCacheVersion='Not active';renderDiagnostics()}});
    window.addEventListener('focus',check);document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')check()});
  }
  var closeInstall=byId('closeInstallGuide'),closeRelease=byId('closeReleaseNotes'),releaseDialog=byId('releaseNotes');if(closeInstall)closeInstall.onclick=function(){byId('installGuide').close()};if(closeRelease)closeRelease.onclick=function(){releaseDialog.close()};if(releaseDialog&&typeof releaseDialog.addEventListener==='function')releaseDialog.addEventListener('close',function(){if(releaseDialog.dataset.releaseMode==='current'||releaseDialog.dataset.releaseMode==='history')markCurrentReleaseSeen();releaseNotesQueued=false;showOnboardingIfNeeded()});showReleaseNotesIfNeeded();
  if(window.matchMedia){var standaloneQuery=window.matchMedia('(display-mode: standalone)');var standaloneChanged=function(){applyStandaloneUi()};if(standaloneQuery.addEventListener)standaloneQuery.addEventListener('change',standaloneChanged)}
  applyStandaloneUi();showSharedWelcomeIfRequested();
}


function accessRequestDisplayName(user){
  var metadata=user&&user.user_metadata||{},name=String(metadata.full_name||metadata.name||'').trim();
  if(name)return name.slice(0,100);
  var email=String(user&&user.email||'').trim(),local=email.split('@')[0]||'New roster member';
  return local.replace(/[._-]+/g,' ').replace(/\b\w/g,function(ch){return ch.toUpperCase()}).slice(0,100);
}
async function ensureAccessRequest(user){
  if(!user||!user.id||!user.email)return{status:'error'};
  var existing=await supa.from('access_requests').select('status').eq('user_id',user.id).maybeSingle();
  if(!existing.error&&existing.data)return{status:existing.data.status};
  if(existing.error&&existing.error.code!=='PGRST116')return{status:'error'};
  var created=await supa.from('access_requests').insert({user_id:user.id,email:user.email.toLowerCase(),display_name:accessRequestDisplayName(user),status:'pending'});
  if(created.error)return{status:'error'};
  if(window.dispatchAccessRequestPush){try{await window.dispatchAccessRequestPush(user.id)}catch(error){}}
  return{status:'pending',created:true};
}

async function authorizeUser(user,session){
  if(!user)return showAuth();if(session)rememberAuthSession(session);var attempt=++startupAttempt;currentUser=user;setLaunchState('Preparing your night',navigator.onLine?'Checking your account and shared roster…':'Showing the last saved roster');
  var sharedReady=await loadSharedData();if(attempt!==startupAttempt)return;
  if(!sharedReady&&sharedLoadFailureStage==='access'){
    var request=await ensureAccessRequest(user);
    await supa.auth.signOut({scope:'local'});clearPrivateDeviceData();currentUser=null;currentUserProfile=null;
    if(request.status==='pending')showAuth(request.created?'Your access request has been sent. A roster administrator needs to approve it before you can enter.':'Your access request is still waiting for administrator approval.');
    else if(request.status==='rejected')showAuth('Your access request was not approved. Contact the roster administrator if you think this should be reviewed.',true);
    else showAuth('This account is not approved for Night Roster yet. Try again later or contact the roster administrator.',true);
    return
  }
  if(!sharedReady&&sharedLoadFailureStage==='session'){clearPrivateDeviceData();currentUser=null;currentAccessToken='';currentUserProfile=null;showAuth('Your saved sign-in has expired. Sign in again to open the shared roster.',true);return}
  if(!sharedReady){var stage={session:'your saved sign-in',snapshot:'the protected roster',staffing:'shared staffing',allocations:'selected-night allocations',support:'roster support data'}[sharedLoadFailureStage]||'the shared roster',code=sharedLoadFailureCode?' (code '+sharedLoadFailureCode+')':'';showLaunchRecovery('The connection stopped while opening '+stage+code+'. Try again.');return}
  accessLossInFlight=false;
  var isAdmin=currentUserProfile&&currentUserProfile.user_role==='admin';
  var profilePromise=Promise.resolve();if(!forcedOfflineSession)profilePromise=withTimeout(loadOwnProfile(),6000,'Profile details did not respond.').catch(function(){profileFeatureAvailable=false;currentPrivateProfile=null});
  if(!forcedOfflineSession)subscribeToChanges();startSharedSyncMonitor();if(isAdmin&&!forcedOfflineSession)withTimeout(loadAccounts(),6000,'Account list did not respond.').catch(function(){});finishLaunch(true);
  await profilePromise;if(attempt!==startupAttempt)return;showOnboardingIfNeeded();
}

function bind(){
  initTheme();if(typeof prepareAdminInformationArchitecture==='function')prepareAdminInformationArchitecture();window.addEventListener('beforeunload',protectLocalChangesDraft);launchSlowTimer=setTimeout(function(){setLaunchState('Still connecting','Finishing the shared roster connection…')},12000);prepareChangesView();setupPWA();bindOnboarding();bindFeatureEducation();byId('launchRetryBtn').onclick=retryLaunchConnection;byId('launchOfflineBtn').onclick=useSavedRosterAtLaunch;
  if(window.AnaestheticRuntime&&window.AnaestheticRuntime.lifecycle)window.AnaestheticRuntime.lifecycle.setResumeHandler(reconcileApplication);
  window.addEventListener('online',function(){updateNetworkStatus();if(forcedOfflineSession){loadSharedData({background:true}).then(function(ready){if(ready&&!forcedOfflineSession){subscribeToChanges();startSharedSyncMonitor()}else updateOfflineControls()})}});
  window.addEventListener('offline',function(){realtimeSubscribed=false;updateNetworkStatus()});
  window.addEventListener('roster:peer-revision',function(event){var detail=event&&event.detail||{},revision=Number(detail.revision),accessEpoch=Number(detail.accessEpoch);if(Number.isFinite(accessEpoch)&&accessEpoch!==Number(lastObservedAccessEpoch||0)){checkCurrentAccessStatus(accessEpoch).then(function(access){if(access&&access.active&&Number.isFinite(revision)&&revision!==Number(lastObservedSyncRevision||0))scheduleSharedReload(true)});return}if(Number.isFinite(revision)&&revision!==Number(lastObservedSyncRevision||0))scheduleSharedReload(true)});
  window.addEventListener('roster:tab-leader',function(event){
    var isLeader=!!(event&&event.detail&&event.detail.isLeader);
    if(!isLeader){
      realtimeSubscribed=false;
      if(realtimeReconnectTimer){clearTimeout(realtimeReconnectTimer);realtimeReconnectTimer=null}
      if(changesChannel){supa.removeChannel(changesChannel);changesChannel=null}
      setSharedSyncState(navigator.onLine?'live':'offline','');
      recordAppDiagnostic('tabs','leadership','follower');
      return
    }
    recordAppDiagnostic('tabs','leadership','leader');
    if(currentUserProfile&&navigator.onLine&&!forcedOfflineSession)subscribeToChanges()
  });
  window.addEventListener('scroll',scheduleScrollChrome,{passive:true});
  if(window.AnaestheticRuntime&&window.AnaestheticRuntime.scheduler){
    window.AnaestheticRuntime.scheduler.every('automatic-night',60000,refreshAutomaticNightOnReturn,{immediate:true});
    window.AnaestheticRuntime.scheduler.every('freshness-label',30000,function(){if(currentUserProfile)setSync(sharedSyncState==='live'?'':sharedSyncState,sharedSyncMessage)});
  }else{
    setInterval(refreshAutomaticNightOnReturn,60000);freshnessTimer=setInterval(function(){if(currentUserProfile)setSync(sharedSyncState==='live'?'':sharedSyncState,sharedSyncMessage)},30000)
  }
  updateScrollChrome();
  window.addEventListener('roster:activity-open',function(event){var index=Number(event&&event.detail&&event.detail.index);if(Number.isInteger(index)&&recentActivityItems[index])openActivityDetail(recentActivityItems[index],recentActivityDate)});
  window.addEventListener('roster:clock-change-guide',function(){showClockChangeEducation(cur().date,true)});
  window.addEventListener('roster:share-action',function(event){var action=event&&event.detail&&event.detail.action;if(action==='native')nativeShareNightRoster();else if(action==='copy')copyNightRosterLink();else if(action==='install'){var share=byId('shareAppDialog');if(share&&share.open)share.close();showInstallGuide(true)}});
  window.addEventListener('roster:changes-action',function(event){var detail=event&&event.detail||{};if(detail.action==='record')showRecordActions(detail.kind,detail.id,detail.name);else if(detail.action==='allocation')setChangesStep('allocation',true);else if(detail.action==='history'){var date=cur().date;if(historyExpandedDates[date]&&historyPageState[date]&&historyPageState[date].has_more)loadMoreNightHistory(date);else{historyExpandedDates[date]=!historyExpandedDates[date];renderChanges(cur())}}else if(detail.action==='allocation-select'){var base=cur(),date=base.date;if(!allocationDrafts[date])allocationDrafts[date]={};allocationDrafts[date][detail.key]=detail.value;updateAllocationSaveControl(base);updateChangesWorkflow(base,staffingPlan(base));formMessage('allocationFormMessage','Selections ready to review.','')}else if(detail.action==='allocation-mounted')updateAllocationSaveControl(cur());else if(detail.action==='absence-save')saveNightChange();else if(detail.action==='overtime-save')saveOvertime();else if(detail.action==='absence-cancel')cancelAbsenceEdit();else if(detail.action==='role-select'){var roleBase=cur(),assignments=roleEditorAssignments(roleBase),chosen=detail.value,assignmentKeys=roleAssignmentKeys(assignments),source=assignmentKeys.find(function(candidate){return canonicalNurseName(assignments[candidate])===canonicalNurseName(chosen)}),previous=assignments[detail.key];if(source&&source!==detail.key)assignments[source]=previous;assignments[detail.key]=chosen;if(roleAssignmentsDiffer(assignments,currentRoleAssignments(roleBase)))nightRoleOverrideDrafts[roleBase.date]={assignments:assignments,reason:(nightRoleOverrideDrafts[roleBase.date]&&nightRoleOverrideDrafts[roleBase.date].reason)||''};else delete nightRoleOverrideDrafts[roleBase.date];renderChanges(roleBase)}else if(detail.action==='role-reason'){var reasonDraft=nightRoleOverrideDrafts[cur().date];if(reasonDraft){reasonDraft.reason=detail.value;nightRoleOverrideDrafts[cur().date]=reasonDraft}}else if(detail.action==='role-save')saveNightRoleOverride(cur());else if(detail.action==='role-reset')resetNightRoleOverride(cur());else if(detail.action==='staffing-input'){updateStaffingActionAvailability();markInvalid('absentName',false);markInvalid('overtimeName',false);formMessage('absenceFormMessage','');formMessage('overtimeFormMessage','')}else if(detail.action==='staffing-mounted')updateStaffingActionAvailability()});
  window.addEventListener('roster:open-night',function(event){var next=Number(event&&event.detail&&event.detail.index);if(Number.isInteger(next)&&R[next]){idx=next;show('today')}});
  window.addEventListener('roster:account-action',function(event){var detail=event&&event.detail||{};if(detail.action==='theme')setThemePreference(detail.value);else if(detail.action==='passkey-remove')deletePasskey(detail.value);else if(detail.action==='profile-input')updateProfileSaveState();else if(detail.action==='profile-save')saveProfile();else if(detail.action==='profile-photo')chooseProfilePhoto(detail.value);else if(detail.action==='profile-photo-remove')removeProfilePhoto();else runAccountAction(detail.action)});
  window.addEventListener('roster:admin-account-action',function(event){var detail=event&&event.detail||{};if(detail.action==='add')addAuthorisedAccount();else if(detail.action==='approve')approveAccessRequest(detail.value);else if(detail.action==='reject')rejectAccessRequest(detail.value);else if(detail.action==='toggle')toggleAuthorisedAccount(detail.value)});
  window.addEventListener('roster:quick-action',function(event){var action=event&&event.detail&&event.detail.action;if(action)performQuickAction(action)});
  byId('loginTab').onclick=function(){setAuthMode('login')};byId('signupTab').onclick=function(){setAuthMode('signup')};byId('authSubmitBtn').onclick=submitAuth;byId('authGoogleBtn').onclick=signInWithGoogle;byId('authPasskeyBtn').onclick=signInWithPasskey;byId('authPasskeyBtn').classList.toggle('hidden',!passkeySupported());byId('forgotPasswordBtn').onclick=requestPasswordReset;byId('cancelRecoveryBtn').onclick=function(){setAuthMode('login')};byId('authPassword').onkeydown=function(e){if(e.key==='Enter')submitAuth()};byId('authPasswordConfirm').onkeydown=function(e){if(e.key==='Enter')submitAuth()};
  byId('accountBtn').onclick=showAccountSheet;byId('closeAccountSheet').onclick=function(){byId('accountSheet').close()};byId('accountSignOutBtn').onclick=function(){byId('accountSheet').close();signOutUser()};byId('addPasskeyBtn').onclick=addPasskey;byId('accountOnboardingBtn').onclick=openOnboardingReplay;byId('accountInstallBtn').onclick=async function(){byId('accountSheet').close();if(deferredInstallPrompt){deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;byId('installBtn').classList.add('hidden')}else showInstallGuide()};byId('accountVersionHistoryBtn').onclick=function(){byId('accountSheet').close();renderReleaseNotes(true);byId('releaseNotes').showModal()};Array.prototype.forEach.call(document.querySelectorAll('[data-theme-choice]'),function(button){button.onclick=function(){setThemePreference(button.getAttribute('data-theme-choice'))}});byId('adminSettingsBtn').onclick=function(){activeAdminTab='home';show('admin')};byId('closeAdminBtn').onclick=function(){show('today')};var healthRefresh=byId('refreshAdminHealthBtn');if(healthRefresh)healthRefresh.onclick=function(){if(typeof loadAdminHealth==='function')loadAdminHealth(true)};
  var legacySaveChange=byId('saveChangeBtn'),legacyCancelAbsence=byId('cancelAbsenceEditBtn'),legacyAbsent=byId('absentName'),legacyAddOvertime=byId('addOvertimeBtn'),legacySaveAllocations=byId('saveAllocationsBtn'),legacyOvertime=byId('overtimeName'),legacyAddAccount=byId('addAccountBtn');if(legacySaveChange)legacySaveChange.onclick=saveNightChange;if(legacyCancelAbsence)legacyCancelAbsence.onclick=cancelAbsenceEdit;if(legacyAbsent)legacyAbsent.onchange=function(){markInvalid('absentName',false);formMessage('absenceFormMessage','');updateStaffingActionAvailability()};if(legacyAddOvertime)legacyAddOvertime.onclick=saveOvertime;if(legacySaveAllocations)legacySaveAllocations.onclick=saveFinalAllocationsV2510;if(legacyOvertime){legacyOvertime.oninput=function(){markInvalid('overtimeName',false);formMessage('overtimeFormMessage','');updateStaffingActionAvailability()};legacyOvertime.onkeydown=function(e){if(e.key==='Enter'&&!byId('addOvertimeBtn').disabled)saveOvertime()}}if(legacyAddAccount)legacyAddAccount.onclick=addAuthorisedAccount;
  var themeButton=byId('themeBtn');if(themeButton)themeButton.onclick=toggleTheme;byId('datePick').onchange=selectByDate;byId('changesDatePick').onchange=function(){chooseDate('changesDatePick')};byId('breakDatePick').onchange=selectBreakDate;byId('teamEffectiveDate').onchange=selectTeamEffectiveDate;byId('extendDate').onchange=selectExtendDate;
  byId('prevNightBtn').onclick=function(){changeNight(-1)};byId('nextNightBtn').onclick=function(){changeNight(1)};byId('changesPrevNightBtn').onclick=function(){changeNight(-1)};byId('changesNextNightBtn').onclick=function(){changeNight(1)};byId('breakPrevNightBtn').onclick=function(){changeNight(-1)};byId('breakNextNightBtn').onclick=function(){changeNight(1)};byId('teamPrevNightBtn').onclick=function(){changeNight(-1)};byId('teamNextNightBtn').onclick=function(){changeNight(1)};byId('extendPrevNightBtn').onclick=function(){changeExtendNight(-1)};byId('extendNextNightBtn').onclick=function(){changeExtendNight(1)};
  byId('myNamePick').onchange=changeMyName;byId('search').oninput=renderRoster;byId('filter').onchange=renderRoster;
  Array.prototype.forEach.call(document.querySelectorAll('[data-admin-tab]'),function(b){b.onclick=function(){switchAdminTab(b.getAttribute('data-admin-tab'))}});Array.prototype.forEach.call(document.querySelectorAll('[data-extend-months]'),function(b){b.onclick=function(){setExtendRange(Number(b.getAttribute('data-extend-months')))}});
  byId('previewExtendBtn').onclick=previewExtension;byId('extendBtn').onclick=extendRoster;byId('saveTeamVersionBtn').onclick=previewTeamChange;byId('exportBtn').onclick=exportCSV;byId('backupBtn').onclick=backup;
  byId('closeScreenInfoSheet').onclick=function(){byId('screenInfoSheet').close()};if(byId('closeShareAppDialog'))byId('closeShareAppDialog').onclick=function(){byId('shareAppDialog').close()};byId('closeActivityDetailSheet').onclick=function(){byId('activityDetailSheet').close()};var quickClose=byId('closeQuickActionsSheet');if(quickClose)quickClose.onclick=function(){var dialog=byId('quickActionsSheet');if(dialog&&dialog.open)dialog.close()};Array.prototype.forEach.call(document.querySelectorAll('[data-quick-action]'),function(button){button.onclick=function(){performQuickAction(button.getAttribute('data-quick-action'))}});Array.prototype.forEach.call(document.querySelectorAll('.bottom button'),function(b){if(b.hasAttribute('data-quick-rudder')){b.onclick=showQuickActions;return}b.onclick=function(){var view=b.getAttribute('data-v');if(!view)return;show(view);if(view==='chat'&&typeof window.openChatView==='function')window.openChatView()}});updateOfflineControls();
}

bind();
initApplication();

