/* Anaesthetic Night Roster V37.30 interface, staffing, allocation and PWA features. */
var historyExpandedDates={};
var historyLoadedDates={};
var historyLoadingDates={};
var sharedLoadPromise=null;
var sharedReloadPending=false;
var sharedReloadPendingBackground=true;
var reloadTimer=null;
var updateRegistration=null;
var reloadForUpdate=false;
var serviceWorkerCacheVersion='Checking…';
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
var initialNightChosen=false;
var automaticSelectedDate=null;
var lastResumeRefresh=0;
var sharedSyncTimer=null;
var sharedSyncCheckInFlight=false;
var lastObservedSyncRevision=null;
var editingAbsenceId=null;
var realtimeGeneration=0;
var realtimeReconnectTimer=null;
var realtimeRetryCount=0;
var realtimeSubscribed=false;
var onboardingStep=0;
var onboardingCandidate=!localStorage.getItem('anaes_onboarding_complete_v34');
var onboardingReplay=false;
var onboardingChatIntro=false;
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
var lastFailedAction=null;
var scrollChromeFrame=null;
var pendingUpdateMeta=null;
var sharedLoadFailureStage='';
var sharedLoadFailureCode='';
var startupSnapshotTimeoutMs=7000;
var startupFallbackTimeoutMs=15000;

var RELEASE_HISTORY=[
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

function setLaunchState(title,status){var screen=byId('launchScreen');if(!screen||launchFinished)return;var heading=byId('launchTitle'),message=byId('launchStatus');if(heading&&title)heading.textContent=title;if(message&&status)message.textContent=status}

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
      var response=await fetch(SUPABASE_URL+'/rest/v1/rpc/get_roster_startup_v37',{method:'POST',headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:'{}',cache:'no-store',credentials:'omit',signal:controller?controller.signal:undefined});
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
      xhr.open('POST',SUPABASE_URL+'/rest/v1/rpc/get_roster_startup_v37',true);
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
      xhr.send('{}');
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

async function compatibilitySyncRevision(){
  var result=await startupQuery(supa.from('app_sync_state').select('revision,updated_at').eq('id',1).maybeSingle(),'Roster revision did not respond.');
  if(startupQueryFailed(result)||!result.data){var error=result&&result.error||new Error('Roster revision could not be checked.');error.code=error.code||'REVISION_UNAVAILABLE';throw error}
  return Number(result.data.revision||0)
}

async function requestCompatibilityStartup(){
  var email=currentUser&&String(currentUser.email||'').trim().toLowerCase();
  if(!email){var missingUser=new Error('Your sign-in account is unavailable.');missingUser.code='401';throw missingUser}
  sharedLoadFailureStage='access';setLaunchState('Preparing your night','Checking roster access…');
  var profileResult=await startupQuery(supa.from('allowed_users').select('*').eq('email',email).eq('active',true).maybeSingle(),'Roster access did not respond.');
  if(startupQueryFailed(profileResult))throw profileResult&&profileResult.error||new Error('Roster access could not be checked.');
  if(!profileResult.data||!profileResult.data.active){var accessError=new Error('This account is not authorised.');accessError.code='42501';throw accessError}

  for(var attempt=0;attempt<2;attempt++){
    var startingRevision=await compatibilitySyncRevision();
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
      supa.from('app_schema_version').select('*').eq('id',1).maybeSingle()
    ]),'Roster support information did not respond.').catch(function(){return[{data:null},{data:null}]});
    var endingRevision=await compatibilitySyncRevision();
    if(startingRevision===endingRevision)return{
      profile:profileResult.data,
      night_changes:staffing[0].data||[],night_overtime:staffing[1].data||[],night_five_cover:staffing[2].data||[],
      roster_settings:staffing[3].data,rotation_versions:staffing[4].data||[],
      night_labour_order:allocations[0].data||[],night_plan_status:allocations[1].data||[],night_role_overrides:allocations[2].data||[],
      app_settings:support[0]&&!support[0].error?support[0].data:null,
      schema_version:support[1]&&!support[1].error&&support[1].data?Number(support[1].data.version||0):0,
      sync_revision:endingRevision
    }
  }
  var changedError=new Error('The shared roster changed while it was opening. Try again.');changedError.code='REVISION_CHANGED';throw changedError
}

function readOfflineSnapshot(){
  try{
    var raw=JSON.parse(localStorage.getItem('anaes_offline_snapshot')||'null');if(!plainSnapshotRecord(raw)||!Array.isArray(raw.rotationVersions)||!raw.rotationVersions.length||!plainSnapshotRecord(raw.rosterSettings))return null;
    var versions=raw.rotationVersions.filter(function(version){return plainSnapshotRecord(version)&&/^\d{4}-\d{2}-\d{2}$/.test(version.effective_from||'')&&['first1','first2','second1','second2','pager','reliever'].every(function(key){return typeof version[key]==='string'&&version[key].trim()})}).map(function(version){var copy=Object.assign({},version);copy.seventh_cycle=Array.isArray(version.seventh_cycle)&&version.seventh_cycle.length?version.seventh_cycle.filter(function(name){return typeof name==='string'&&name.trim()}):ORIGINAL_SEVENTH.slice();return copy});
    if(!versions.length||!/^\d{4}-\d{2}-\d{2}$/.test(raw.rosterSettings.published_until||''))return null;
    return{saved_at:typeof raw.saved_at==='string'&&!isNaN(Date.parse(raw.saved_at))?raw.saved_at:null,nightChanges:snapshotRowsByDate(raw.nightChanges),nightOvertime:snapshotRowsByDate(raw.nightOvertime),fiveCoverChoices:snapshotRecordsByDate(raw.fiveCoverChoices),rosterSettings:Object.assign({},raw.rosterSettings),rotationVersions:versions,labourOrders:snapshotRecordsByDate(raw.labourOrders),nightRoleOverrides:snapshotRecordsByDate(raw.nightRoleOverrides),nightPlanStatuses:snapshotRecordsByDate(raw.nightPlanStatuses),appSettings:plainSnapshotRecord(raw.appSettings)?Object.assign({},raw.appSettings):null,schemaVersion:Number(raw.schemaVersion||0)||0}
  }catch(error){return null}
}

function hasOfflineSnapshot(){return !!readOfflineSnapshot()}

function cachedAllowedProfile(email){
  try{var cached=JSON.parse(localStorage.getItem('anaes_cached_profile')||'null');return cached&&cached.email===String(email||'').toLowerCase()&&cached.active?cached:null}catch(error){return null}
}

function showLaunchRecovery(message){
  var screen=byId('launchScreen');if(!screen||launchFinished)return;clearTimeout(launchSlowTimer);launchRecoveryVisible=true;setLaunchState('Connection taking longer',message||'The shared roster has not replied yet.');var recovery=byId('launchRecovery'),offline=byId('launchOfflineBtn'),offlineAvailable=!!(currentUser&&cachedAllowedProfile(currentUser.email)&&hasOfflineSnapshot());if(recovery)recovery.classList.remove('hidden');if(offline)offline.classList.toggle('hidden',!offlineAvailable);screen.classList.add('launchNeedsAction');screen.setAttribute('aria-busy','false')
}

function hideLaunchRecovery(){
  launchRecoveryVisible=false;var recovery=byId('launchRecovery');if(recovery)recovery.classList.add('hidden');var screen=byId('launchScreen');if(screen){screen.classList.remove('launchNeedsAction');screen.setAttribute('aria-busy','true')}
}

function prepareAuthorisedShell(profile){
  currentUserProfile=profile;byId('authGate').classList.add('hidden');document.body.classList.remove('authPending');var isAdmin=profile.user_role==='admin';byId('adminSettingsBtn').classList.toggle('hidden',!isAdmin);document.querySelector('.bottom').style.gridTemplateColumns='repeat(4,minmax(0,1fr))';byId('accountBtn').title=profile.display_name+' · Open account';byId('accountInitial').textContent=(profile.display_name||profile.email).charAt(0).toUpperCase()
}

async function retryLaunchConnection(){
  var button=byId('launchRetryBtn'),offline=byId('launchOfflineBtn'),screen=byId('launchScreen'),originalLabel=button&&button.textContent||'Try again';if(button){button.disabled=true;button.textContent='Trying again…'}if(offline)offline.disabled=true;setLaunchState('Trying again',sharedLoadPromise?'Finishing the current roster request before trying again…':'Waiting for the shared roster to respond…');if(screen){screen.classList.add('launchNeedsAction');screen.setAttribute('aria-busy','true')}try{if(!currentUser){window.location.reload();return}if(sharedLoadPromise)try{await sharedLoadPromise}catch(error){}if(!launchFinished)await authorizeUser(currentUser)}finally{if(button){button.disabled=false;button.textContent=originalLabel}if(offline)offline.disabled=false;if(!launchFinished&&!launchRecoveryVisible)showLaunchRecovery('The shared roster still has not responded. Check your connection, then try again.')}
}

function useSavedRosterAtLaunch(){
  var profile=cachedAllowedProfile(currentUser&&currentUser.email);if(!profile||!hasOfflineSnapshot()){showLaunchRecovery('There is no saved roster on this device yet. Try connecting again.');return}currentUserProfile=profile;forcedOfflineSession=true;prepareAuthorisedShell(profile);if(!restoreOfflineSnapshot()){showLaunchRecovery('The saved roster could not be opened. Try connecting again.');return}setSync('offline','Offline · saved information');finishLaunch(true);toast('Showing the last saved roster. Changes are disabled until the connection returns.');updateOfflineControls()
}

function finishLaunch(ready){
  var screen=byId('launchScreen');if(!screen||launchFinished)return;
  clearTimeout(launchSlowTimer);
  hideLaunchRecovery();
  if(!ready){launchFinished=true;screen.classList.add('dismissed');screen.setAttribute('aria-busy','false');setTimeout(function(){screen.classList.add('hidden')},260);return}
  var name=privateProfileName()||currentUserProfile&&currentUserProfile.display_name||'';setLaunchState(name?'Welcome back, '+name:'Your night is ready',navigator.onLine&&!forcedOfflineSession?'Your night is ready.':'Showing the last saved roster');screen.classList.add('ready');screen.setAttribute('aria-busy','false');
  launchFinished=true;screen.classList.add('dismissed');setTimeout(function(){screen.classList.add('hidden')},300);
}

function rememberOnboardingProfile(){var name=byId('onboardingProfileName'),title=byId('onboardingProfileTitle');if(name||title)onboardingProfileDraft={name:name?name.value:'',title:title?title.value:''}}

function openOnboardingReplay(){var dialog=byId('onboardingDialog');if(!dialog||!dialog.showModal)return;byId('accountSheet').close();onboardingChatIntro=false;onboardingReplay=true;onboardingStep=0;renderOnboarding();dialog.showModal()}

function saveOfflineSnapshot(){
  try{localStorage.setItem('anaes_offline_snapshot',JSON.stringify({saved_at:lastSuccessfulSyncAt||new Date().toISOString(),nightChanges:nightChanges,nightOvertime:nightOvertime,fiveCoverChoices:fiveCoverChoices,rosterSettings:rosterSettings,rotationVersions:rotationVersions,labourOrders:labourOrders,nightRoleOverrides:nightRoleOverrides,nightPlanStatuses:nightPlanStatuses,appSettings:appSettings,schemaVersion:schemaVersion}))}catch(error){}
}


function restoreOfflineSnapshot(){
  try{
    var snapshot=readOfflineSnapshot();if(!snapshot)return false;
    nightChanges=snapshot.nightChanges;nightOvertime=snapshot.nightOvertime;fiveCoverChoices=snapshot.fiveCoverChoices;rosterSettings=snapshot.rosterSettings;rotationVersions=snapshot.rotationVersions;labourOrders=snapshot.labourOrders;nightRoleOverrides=snapshot.nightRoleOverrides;nightPlanStatuses=snapshot.nightPlanStatuses;if(snapshot.appSettings)appSettings=snapshot.appSettings;schemaVersion=snapshot.schemaVersion;lastSuccessfulSyncAt=snapshot.saved_at;changeHistory={};overtimeHistory={};roleOverrideHistory={};historyLoadedDates={};historyLoadingDates={};rebuildCalculatedRoster();if(!R.length)return false;idx=startingIndex();automaticSelectedDate=R[idx]&&R[idx].date;initialNightChosen=true;setSync('offline','Offline · saved '+(lastSuccessfulSyncAt?shortTime(lastSuccessfulSyncAt):'previously'));render();return true;
  }catch(error){console.error('Saved roster could not be restored',error);return false}
}

function installGuideSteps(){
  var ios=/iphone|ipad|ipod/i.test(navigator.userAgent),steps=ios?['Open this page in Safari.','Tap the Share button.','Choose Add to Home Screen, then tap Add.']:['Open the browser menu.','Choose Install app or Add to Home screen.','Confirm Install, then open Night Roster from your Home screen.'];
  return'<div class="installSteps">'+steps.map(function(step,index){return'<div class="installStep"><b>'+(index+1)+'</b><span>'+esc(step)+'</span></div>'}).join('')+'</div>';
}

function showInstallGuide(){var dialog=byId('installGuide');byId('installGuideSteps').innerHTML=installGuideSteps();if(dialog&&dialog.showModal)dialog.showModal()}

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
  byId('accountBtn').title=name+' · Open account';var preview=byId('profilePhotoPreview'),previewInitial=byId('profilePhotoInitial');if(preview){preview.classList.toggle('hidden',!previewUrl);previewInitial.classList.toggle('hidden',!!previewUrl);previewInitial.textContent=initial;if(previewUrl)preview.src=previewUrl}var remove=byId('removeProfilePhoto');if(remove){remove.classList.toggle('hidden',!profileAvatarUrl&&!pendingProfilePhoto);remove.textContent=pendingProfilePhoto?'Cancel':'Remove'}
}

async function loadOwnProfile(){
  if(!currentUser)return;var result=await supa.from('user_profiles').select('user_id,profile_name,job_title,avatar_path,updated_at').eq('user_id',currentUser.id).maybeSingle();
  if(result.error){profileFeatureAvailable=false;currentPrivateProfile=null;return}profileFeatureAvailable=true;currentPrivateProfile=result.data||{user_id:currentUser.id,profile_name:'',job_title:'',avatar_path:null};await refreshProfileAvatar();
}

function showProfileMessage(message,type){var el=byId('profileMessage');if(!el)return;el.textContent=message||'';el.className='formMessage'+(type?' '+type:'')}

function profileDraftSignature(){return JSON.stringify([(byId('profileName')&&byId('profileName').value||'').trim(),(byId('profileJobTitle')&&byId('profileJobTitle').value||'').trim(),byId('profileRosterName')&&byId('profileRosterName').value||''])}

function updateProfileSaveState(){var button=byId('saveProfileBtn');if(!button)return;var changed=!!pendingProfilePhoto||profileDraftSignature()!==profileSavedSignature;button.classList.toggle('hidden',!changed);if(changed&&byId('profileMessage').classList.contains('success')&&!pendingProfilePhoto)showProfileMessage('')}

function populateAccountSheet(){
  var profile=currentPrivateProfile||{},name=privateProfileName();byId('profileName').value=profile.profile_name||'';byId('profileJobTitle').value=profile.job_title||'';byId('profileApprovedName').textContent=currentUserProfile.display_name;byId('profileEmail').textContent=currentUserProfile.email;
  var rosterName=myName();byId('profileRosterName').innerHTML='<option value="">Do not highlight a name</option>'+TEAM.map(function(item){return'<option value="'+esc(item)+'"'+(sameNurse(item,rosterName)?' selected':'')+'>'+esc(professionalName(item))+'</option>'}).join('');byId('profilePhotoInitial').textContent=(name||'?').charAt(0).toUpperCase();byId('accountVersion').textContent='Night Roster '+APP_VERSION+' · Database '+(schemaVersion||'legacy');profileSavedSignature=profileDraftSignature();showProfileMessage(profileFeatureAvailable?'':'Ask the administrator to run the V32 profile upgrade before saving your profile.','error');updateProfileSaveState();updateAppearanceButtons();applyProfileIdentity();
}

async function showAccountSheet(){var dialog=byId('accountSheet');populateAccountSheet();if(dialog&&dialog.showModal&&!dialog.open){dialog.showModal();await loadPasskeys()}}

function photoBlob(file){
  return new Promise(function(resolve,reject){if(!file||!/^image\/(jpeg|png|webp)$/i.test(file.type)||file.size>8*1024*1024){reject(new Error('Choose a JPEG, PNG or WebP photo smaller than 8 MB.'));return}var image=new Image(),url=URL.createObjectURL(file);image.onload=function(){var size=Math.min(image.naturalWidth,image.naturalHeight),left=(image.naturalWidth-size)/2,top=(image.naturalHeight-size)/2,canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;canvas.getContext('2d').drawImage(image,left,top,size,size,0,0,512,512);URL.revokeObjectURL(url);canvas.toBlob(function(blob){blob?resolve(blob):reject(new Error('The photo could not be prepared.'))},'image/jpeg',.86)};image.onerror=function(){URL.revokeObjectURL(url);reject(new Error('The selected photo could not be opened.'))};image.src=url})
}

async function chooseProfilePhoto(file){try{pendingProfilePhoto=await photoBlob(file);if(pendingProfilePhotoUrl)URL.revokeObjectURL(pendingProfilePhotoUrl);pendingProfilePhotoUrl=URL.createObjectURL(pendingProfilePhoto);applyProfileIdentity();var onboardingPhoto=byId('onboardingPhotoBtn');if(onboardingPhoto)onboardingPhoto.innerHTML='<img id="onboardingPhotoPreview" src="'+esc(pendingProfilePhotoUrl)+'" alt=""><i aria-hidden="true">+</i>';updateProfileSaveState();showProfileMessage('Photo ready to save.','success')}catch(error){showProfileMessage(error.message,'error')}}

async function saveProfile(){
  if(!requireOnline())return;if(!profileFeatureAvailable){showProfileMessage('Run the V32 profile database upgrade first.','error');return}var button=byId('saveProfileBtn'),name=byId('profileName').value.trim(),title=byId('profileJobTitle').value.trim(),rosterName=byId('profileRosterName').value,path=currentPrivateProfile&&currentPrivateProfile.avatar_path||null;button.disabled=true;button.textContent='Saving…';showProfileMessage('Saving your profile…','');
  try{if(pendingProfilePhoto){path=currentUser.id+'/avatar.jpg';var uploaded=await supa.storage.from('profile-photos').upload(path,pendingProfilePhoto,{contentType:'image/jpeg',upsert:true,cacheControl:'3600'});if(uploaded.error)throw uploaded.error}var result=await supa.from('user_profiles').upsert({user_id:currentUser.id,profile_name:name||null,job_title:title||null,avatar_path:path,updated_at:new Date().toISOString()},{onConflict:'user_id'}).select().single();if(result.error)throw result.error;currentPrivateProfile=result.data;pendingProfilePhoto=null;if(pendingProfilePhotoUrl)URL.revokeObjectURL(pendingProfilePhotoUrl);pendingProfilePhotoUrl='';if(rosterName)localStorage.setItem('anaes_my_name',rosterName);else localStorage.removeItem('anaes_my_name');profileSavedSignature=profileDraftSignature();await refreshProfileAvatar();render();updateProfileSaveState();showProfileMessage('Your profile has been saved.','success');toast('Profile saved')}
  catch(error){showProfileMessage('Your profile could not be saved. Check your connection and try again.','error')}
  finally{button.disabled=false;button.textContent='Save profile';updateProfileSaveState()}
}

async function removeProfilePhoto(){
  if(!profileFeatureAvailable)return;if(pendingProfilePhoto){pendingProfilePhoto=null;if(pendingProfilePhotoUrl)URL.revokeObjectURL(pendingProfilePhotoUrl);pendingProfilePhotoUrl='';applyProfileIdentity();updateProfileSaveState();showProfileMessage('Photo change cancelled.');return}var path=currentPrivateProfile&&currentPrivateProfile.avatar_path;if(path){var removed=await supa.storage.from('profile-photos').remove([path]);if(removed.error){showProfileMessage('The photo could not be removed.','error');return}var updated=await supa.from('user_profiles').update({avatar_path:null,updated_at:new Date().toISOString()}).eq('user_id',currentUser.id);if(updated.error){showProfileMessage('The photo record could not be updated.','error');return}currentPrivateProfile.avatar_path=null}profileAvatarUrl='';applyProfileIdentity();updateProfileSaveState();render();showProfileMessage('Profile photo removed.','success')
}

async function loadPasskeys(){
  var host=byId('passkeyList'),button=byId('addPasskeyBtn'),message=byId('passkeyMessage');if(!passkeySupported()){host.innerHTML='<p class="accountHelp">Passkeys are not supported by this browser. Password sign-in remains available.</p>';button.classList.add('hidden');return}button.classList.remove('hidden');message.textContent='';var result=await supa.auth.passkey.list();if(result.error){host.innerHTML='<p class="accountHelp">No passkeys are available yet. Your administrator may still need to enable them in Supabase.</p>';return}var list=result.data&&result.data.passkeys||result.data||[];host.innerHTML=list.length?list.map(function(item){var id=item.id||item.passkey_id,label=item.friendly_name||item.friendlyName||'Saved passkey';return'<div class="passkeyRow"><span><b>'+esc(label)+'</b><small>Ready for password-free sign in</small></span><button type="button" data-remove-passkey="'+esc(id)+'">Remove</button></div>'}).join(''):'<p class="accountHelp">No passkey has been added to this account.</p>';Array.prototype.forEach.call(host.querySelectorAll('[data-remove-passkey]'),function(remove){remove.onclick=function(){deletePasskey(remove.getAttribute('data-remove-passkey'))}})
}

async function addPasskey(){var button=byId('addPasskeyBtn');button.disabled=true;byId('passkeyMessage').textContent='Follow your device instructions…';try{var result=await supa.auth.registerPasskey();if(result.error)throw result.error;if(result.data&&result.data.id)await supa.auth.passkey.update({passkeyId:result.data.id,friendlyName:'Night Roster on '+(navigator.platform||'this device')});byId('passkeyMessage').textContent='Passkey added. You can use it on the sign-in screen.';await loadPasskeys();toast('Passkey added')}catch(error){byId('passkeyMessage').textContent=/cancel|not allowed/i.test(error.message||'')?'Passkey setup was cancelled.':/disabled|not enabled/i.test(error.message||'')?'Passkeys must first be enabled in Supabase Authentication settings.':'The passkey could not be added. '+(error.message||'Please try again.')}finally{button.disabled=false}}

async function deletePasskey(id){if(!id||!confirm('Remove this passkey from your Night Roster account?'))return;var result=await supa.auth.passkey.delete({passkeyId:id});if(result.error){byId('passkeyMessage').textContent='The passkey could not be removed.';return}await loadPasskeys();toast('Passkey removed')}

function showReleaseNotesIfNeeded(){
  var seen=localStorage.getItem('anaes_seen_version'),returning=localStorage.getItem('anaes_selected_date')||localStorage.getItem('anaes_my_name');
  if(seen===APP_VERSION)return;renderReleaseNotes();localStorage.setItem('anaes_seen_version',APP_VERSION);if(returning){releaseNotesQueued=true;var dialog=byId('releaseNotes');setTimeout(function(){if(dialog&&dialog.showModal&&!dialog.open)dialog.showModal()},900)}
}

function renderReleaseNotes(showHistory){
  var dialog=byId('releaseNotes');if(!dialog)return;var latest=RELEASE_HISTORY[0],entries=showHistory?RELEASE_HISTORY:[latest];dialog.classList.add('releaseDialog');dialog.dataset.releaseMode=showHistory?'history':'current';
  var title=byId('releaseNotesTitle'),intro=byId('releaseNotesIntro'),close=byId('closeReleaseNotes');if(title)title.textContent=showHistory?'Version history':'App updated';if(intro)intro.textContent=showHistory?'Night Roster '+APP_VERSION+' · Complete release history':'Version '+latest.version+' · What changed in this update';if(close)close.textContent=showHistory?'Done':'Got it';
  var oldList=dialog.querySelector('ul'),history=dialog.querySelector('.releaseHistory'),nav=dialog.querySelector('.releaseNav');if(!history){history=document.createElement('div');history.className='releaseHistory';history.setAttribute('tabindex','0');if(oldList)oldList.replaceWith(history);else dialog.appendChild(history)}if(!nav){nav=document.createElement('div');nav.className='releaseNav';nav.setAttribute('aria-label','Version history navigation');dialog.insertBefore(nav,history)}nav.classList.toggle('hidden',!showHistory);nav.innerHTML=showHistory?'<button type="button" data-release-jump="latest">Latest</button><button type="button" data-release-jump="previous">Previous updates <span>'+esc(RELEASE_HISTORY.length-1)+'</span></button>':'';history.setAttribute('aria-label',showHistory?'Complete Night Roster version history':'Changes in version '+latest.version);
  history.innerHTML=entries.map(function(entry,index){var archive=index===1?'<div class="releaseArchiveHeading"><span>Previous updates</span><small>The work that shaped Night Roster</small></div>':'';return archive+'<section class="releaseEntry '+(index===0?'latest':'')+'"><div class="releaseVersion"><div><span>'+(index===0?'Current update · ':'')+'Version '+esc(entry.version)+'</span><h3>'+esc(entry.title)+'</h3></div><time>'+esc(entry.date)+'</time></div><ul>'+entry.changes.map(function(change){return'<li>'+esc(change)+'</li>'}).join('')+'</ul></section>'}).join('');history.scrollTop=0;
  Array.prototype.forEach.call(nav.querySelectorAll('[data-release-jump]'),function(button){button.onclick=function(){var previous=button.getAttribute('data-release-jump')==='previous',target=previous?history.querySelector('.releaseArchiveHeading'):history.querySelector('.releaseEntry.latest');if(!target)return;history.scrollTo({top:Math.max(0,target.offsetTop-(previous?0:8)),behavior:window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})}});
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

function onboardingChatPage(){
  return '<div class="onboardingVisual chatOnboardingVisual" aria-hidden="true"><span class="chatOnboardingIcon">'+interfaceIcon('chat')+'</span><div class="chatOnboardingLines"><i></i><i></i><i></i></div></div><span class="onboardingEyebrow">Chat</span><h2 id="onboardingTitle">Keep roster conversations together.</h2><p>Anaesthetic Team is the shared chat for roster matters. You can also message a registered roster colleague privately. If you agree a swap or another change in chat, update the roster separately.</p><div class="onboardingFeatureList"><div><b>Team</b><span>Ask the group about a roster night, availability or a possible swap</span></div><div><b>Private</b><span>Message a registered roster colleague one-to-one</span></div><div><b>Alerts</b><span>Optional notifications tell you when a new message arrives</span></div></div><p class="onboardingFootnote">Chat is for staff coordination only. Do not share patient-identifiable or clinical information.</p>';
}

function onboardingPages(){
  if(onboardingChatIntro)return[onboardingChatPage()];
  var accountName=currentUserProfile&&currentUserProfile.display_name||'',selected=myName()||TEAM.find(function(name){return sameNurse(name,accountName)})||'';
  var introEyebrow=onboardingReplay?'App guide':'Welcome',introTitle=onboardingReplay?'A quick tour of Night Roster.':'Your night at a glance.';
  return[
    '<div class="onboardingVisual welcomeVisual" aria-hidden="true"><span class="onboardingMoon">'+interfaceIcon('night')+'</span></div><span class="onboardingEyebrow">'+introEyebrow+'</span><h2 id="onboardingTitle">'+introTitle+'</h2><p>Night opens with your allocation and the live staffing picture for the whole anaesthetic team.</p><div class="onboardingCallout"><b>Night</b><span>See who is working, each role and the current plan in one place.</span></div>',
    '<div class="onboardingVisual workflowVisual" aria-hidden="true"><span>'+interfaceIcon('staffing')+'</span><i></i><span>'+interfaceIcon('overtime')+'</span><i></i><span>'+interfaceIcon('task')+'</span></div><span class="onboardingEyebrow">Changes</span><h2 id="onboardingTitle">Record only what changes.</h2><p>Use Changes for confirmed absences, overtime and any agreed night-only allocation. The normal six-nurse roster is already calculated for you.</p><div class="onboardingFeatureList"><div><b>Staffing</b><span>Absence and overtime</span></div><div><b>Allocation</b><span>Only when the selected night differs from the roster</span></div><div><b>Breaks</b><span>Updates from the same live staffing plan</span></div></div>',
    onboardingChatPage(),
    '<div class="onboardingVisual identityVisual" aria-hidden="true"><span>'+(selected?esc(selected.charAt(0).toUpperCase()):'?')+'</span></div><span class="onboardingEyebrow">Your identity</span><h2 id="onboardingTitle">Which roster name is yours?</h2><p>Choose your roster name so Night Roster can highlight your own allocation on this device.</p><label class="onboardingNameLabel"><span>Roster name</span><select id="onboardingNamePick"><option value="">Choose your name</option>'+TEAM.map(function(name){return'<option value="'+esc(name)+'" '+(sameNurse(name,selected)?'selected':'')+'>'+esc(professionalName(name))+'</option>'}).join('')+'</select></label><p class="onboardingFootnote">This does not change the shared roster or anyone else’s view.</p>',
    '<div class="onboardingVisual readyVisual" aria-hidden="true"><span>'+interfaceIcon('task')+'</span></div><span class="onboardingEyebrow">Ready</span><h2 id="onboardingTitle">That’s all you need to start.</h2><p>Open Night for the selected night’s plan, Changes when something genuinely changes, Breaks for that arrangement and Chat for team coordination.</p><div class="onboardingCallout"><b>More options live in Account</b><span>You can add a profile photo, preferred name or passkey later without holding up setup.</span></div>'
  ];
}

function renderOnboarding(){
  var dialog=byId('onboardingDialog'),content=byId('onboardingContent'),pages=onboardingPages();if(!dialog||!content)return;
  onboardingStep=Math.max(0,Math.min(pages.length-1,onboardingStep));content.innerHTML=pages[onboardingStep];content.classList.remove('onboardingContentIn');void content.offsetWidth;content.classList.add('onboardingContentIn');
  byId('onboardingProgress').innerHTML=pages.map(function(_,index){return'<span class="'+(index===onboardingStep?'active':'')+'" aria-hidden="true"></span>'}).join('');
  byId('onboardingStepLabel').textContent=onboardingChatIntro?'New feature':(onboardingStep+1)+' of '+pages.length;
  byId('onboardingBackBtn').classList.toggle('hidden',onboardingChatIntro||onboardingStep===0);byId('onboardingNextBtn').textContent=onboardingChatIntro?'Got it':onboardingStep===pages.length-1?'Open my night':'Continue';byId('onboardingSkipBtn').textContent=onboardingReplay?'Close':'Skip';byId('onboardingSkipBtn').classList.toggle('hidden',onboardingChatIntro||onboardingStep===pages.length-1);
  var select=byId('onboardingNamePick');if(select)select.onchange=function(){if(select.value)localStorage.setItem('anaes_my_name',select.value);else localStorage.removeItem('anaes_my_name');var visual=document.querySelector('.identityVisual span');if(visual)visual.textContent=select.value?select.value.charAt(0).toUpperCase():'?'};
  var passkeyButton=byId('onboardingPasskeyBtn');if(passkeyButton)passkeyButton.onclick=addOnboardingPasskey;
  var photoButton=byId('onboardingPhotoBtn');if(photoButton)photoButton.onclick=function(){byId('profilePhotoInput').click()};
}

async function addOnboardingPasskey(){var button=byId('onboardingPasskeyBtn'),message=byId('onboardingPasskeyMessage');if(!button||!message)return;button.disabled=true;button.textContent='Follow your phone’s instructions…';message.textContent='Your device will handle the secure identity check.';try{var result=await supa.auth.registerPasskey();if(result.error)throw result.error;if(result.data&&result.data.id)await supa.auth.passkey.update({passkeyId:result.data.id,friendlyName:'Night Roster on '+(navigator.platform||'this device')});button.textContent='Passkey added';message.textContent='You can use it next time, while your password remains available.';toast('Passkey added')}catch(error){button.disabled=false;button.textContent='Set up a passkey now';message.textContent=/cancel|not allowed/i.test(error.message||'')?'Setup was cancelled. You can continue and add it later from your account.':/disabled|not enabled/i.test(error.message||'')?'Passkeys are not enabled for this roster yet. Continue using your password for now.':'The passkey could not be added. You can continue using your password.'}}

async function finishOnboarding(){
  if(onboardingChatIntro){
    localStorage.setItem('anaes_chat_intro_v37_24','1');onboardingChatIntro=false;onboardingReplay=false;var chatDialog=byId('onboardingDialog');if(chatDialog&&chatDialog.open)chatDialog.close();render();toast('Team chat is ready');return
  }
  var wasReplay=onboardingReplay,select=byId('onboardingNamePick');if(select&&select.value)localStorage.setItem('anaes_my_name',select.value);
  localStorage.setItem('anaes_onboarding_complete_v34','1');localStorage.setItem('anaes_chat_intro_v37_24','1');onboardingCandidate=false;onboardingReplay=false;onboardingProfileDraft=null;var dialog=byId('onboardingDialog');if(dialog&&dialog.open)dialog.close();render();toast(wasReplay?'Guide completed':'Your night is ready');
}

function showOnboardingIfNeeded(){
  if(!currentUserProfile||releaseNotesQueued)return;
  var dialog=byId('onboardingDialog');if(!dialog||!dialog.showModal)return;
  var firstUse=onboardingCandidate&&!localStorage.getItem('anaes_onboarding_complete_v34');
  var needsChatIntro=!firstUse&&!localStorage.getItem('anaes_chat_intro_v37_24');
  if(!firstUse&&!needsChatIntro)return;
  onboardingChatIntro=needsChatIntro;onboardingReplay=false;onboardingStep=0;renderOnboarding();setTimeout(function(){if(!dialog.open)dialog.showModal()},350);
}

function bindOnboarding(){
  var dialog=byId('onboardingDialog'),next=byId('onboardingNextBtn'),back=byId('onboardingBackBtn'),skip=byId('onboardingSkipBtn');if(!next||!back||!skip)return;
  next.onclick=async function(){rememberOnboardingProfile();var last=onboardingPages().length-1;if(onboardingStep<last){onboardingStep++;renderOnboarding()}else{next.disabled=true;next.textContent=onboardingChatIntro?'Closing…':'Saving…';await finishOnboarding();next.disabled=false}};back.onclick=function(){if(onboardingStep>0){onboardingStep--;renderOnboarding()}};skip.onclick=finishOnboarding;
  if(dialog&&typeof dialog.addEventListener==='function')dialog.addEventListener('cancel',function(event){if(onboardingChatIntro){event.preventDefault();finishOnboarding();return}onboardingReplay=false});
}

function installedReleaseState(){var latest=RELEASE_HISTORY[0]&&RELEASE_HISTORY[0].version||'Unknown',cache=String(serviceWorkerCacheVersion||'').replace(/^anaesthetic-night-roster-v/,'').replace(/-/g,'.'),stale=cache!=='Checking…'&&cache!=='Not active'&&cache!==APP_VERSION;return{latest:latest,cache:serviceWorkerCacheVersion,stale:stale,waiting:!!(updateRegistration&&updateRegistration.waiting)}}

function diagnosticsText(){
  var backupAt=localStorage.getItem('anaes_last_backup_at'),release=installedReleaseState();return['Running app version: '+APP_VERSION,'Latest release-history version: '+release.latest,'Service-worker cache: '+release.cache,'Installed release: '+(release.stale?'stale cache detected':release.waiting?'update waiting for approval':'current'),'Expected database schema: '+EXPECTED_SCHEMA_VERSION,'Actual database schema: '+(schemaVersion||'legacy'),'Connection: '+(navigator.onLine?'online':'offline'),'Last successful refresh: '+(lastSuccessfulSyncAt?new Date(lastSuccessfulSyncAt).toLocaleString('en-GB'):'not yet'),'Last roster-data export: '+(backupAt?new Date(backupAt).toLocaleString('en-GB'):'not recorded on this device'),'Published roster until: '+(rosterSettings.published_until||'unknown'),'Calculated nights: '+R.length,'Current account: '+(currentUserProfile?'signed in as '+currentUserProfile.user_role:'not signed in')].join('\n');
}

function renderDiagnostics(){var el=byId('appDiagnostics');if(!el)return;var backupAt=localStorage.getItem('anaes_last_backup_at'),schemaState=schemaVersion>=EXPECTED_SCHEMA_VERSION?'Current':'Upgrade required',release=installedReleaseState();el.innerHTML='<div class="diagnosticGrid"><div class="historyItem"><b>Application versions</b><div class="changeMeta">Running '+esc(APP_VERSION)+' · Release history '+esc(release.latest)+'</div></div><div class="historyItem"><b>Service-worker cache</b><div class="changeMeta">'+esc(release.cache)+' · '+esc(release.stale?'Stale cached release detected':release.waiting?'Update awaiting approval':'Current')+'</div></div><div class="historyItem"><b>Database schema</b><div class="changeMeta">Expected '+esc(EXPECTED_SCHEMA_VERSION)+' · Actual '+esc(schemaVersion||'legacy')+' · '+esc(schemaState)+'</div></div><div class="historyItem"><b>Shared-data connection</b><div class="changeMeta">'+(navigator.onLine?'Online':'Offline')+' · Last refreshed '+esc(lastSuccessfulSyncAt?new Date(lastSuccessfulSyncAt).toLocaleString('en-GB'):'not yet')+'</div></div><div class="historyItem"><b>Last roster-data export</b><div class="changeMeta">'+esc(backupAt?new Date(backupAt).toLocaleString('en-GB'):'Not recorded')+'</div></div></div>'+(release.waiting?'<button type="button" class="primary wide" id="diagnosticUpdateBtn">Update now</button>':'')+'<button type="button" class="soft wide" id="copyDiagnosticsBtn">Copy diagnostic report</button>';var button=byId('copyDiagnosticsBtn');if(button)button.onclick=async function(){try{await navigator.clipboard.writeText(diagnosticsText());toast('Diagnostic report copied')}catch(error){toast('Diagnostic report could not be copied')}};var update=byId('diagnosticUpdateBtn');if(update)update.onclick=applyWaitingUpdate}

function prettyDateMarkup(date){
  if(!date)return'<strong>Select a night</strong><small>Open calendar</small>';
  var value=new Date(date+'T12:00:00'),main=value.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'}),year=value.getFullYear();
  return'<strong>'+esc(main)+'</strong><small>'+esc(year)+'</small>';
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
  renderReleaseNotes();changesViewPrepared=true;renderDiagnostics();
}
function openScreenInfo(kind){
  var dialog=byId('screenInfoSheet'),title=byId('screenInfoTitle'),intro=byId('screenInfoIntro'),content=byId('screenInfoContent');if(!dialog||!title||!intro||!content)return;
  var items=kind==='breaks'?[['What you see','The break plan always follows the selected night and its latest shared staffing.'],['What happens automatically','Changes to absences, overtime or roles update Night and Breaks together.'],['When actions are unavailable','Copy and email stay unavailable until every required staffing decision is complete.']]:[['Start with Staffing','Record only confirmed absences and overtime nurses.'],['Allocation is usually automatic','A standard six-nurse night uses the rostered roles, with Pager first and Reliever second in Labour Ward.'],['Confirm only changes','A final review is needed only after a staffing change or an agreed night-only role change.']];
  title.textContent=kind==='breaks'?'About Breaks':'About Staffing changes';intro.textContent=kind==='breaks'?'A live view of the selected night’s breaks.':'A three-step path for exceptional changes.';content.innerHTML=items.map(function(item){return'<section class="infoSheetItem"><h3>'+esc(item[0])+'</h3><p>'+esc(item[1])+'</p></section>'}).join('');if(!dialog.open)dialog.showModal();
}

function syncDateInputs(date){
  ['datePick','changesDatePick','breakDatePick'].forEach(function(id){var el=byId(id);if(!el)return;el.min=R[0].date;el.max=R[R.length-1].date;el.value=date;updatePrettyDate(el)});
  ['prevNightBtn','changesPrevNightBtn','breakPrevNightBtn'].forEach(function(id){var el=byId(id);if(el)el.disabled=idx<=0});
  ['nextNightBtn','changesNextNightBtn','breakNextNightBtn'].forEach(function(id){var el=byId(id);if(el)el.disabled=idx>=R.length-1});
}

function maltaDateParts(value){
  var parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Malta',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(value||new Date()),out={};
  parts.forEach(function(part){if(part.type!=='literal')out[part.type]=Number(part.value)});return out;
}

function operationalRosterDate(value){
  var p=maltaDateParts(value),date=[p.year,String(p.month).padStart(2,'0'),String(p.day).padStart(2,'0')].join('-');
  return p.hour<7?addDays(date,-1):date;
}

function startingIndex(value){
  if(!R.length)return 0;
  var target=operationalRosterDate(value),i=R.findIndex(function(r){return r.date>=target});
  return i>-1?i:Math.max(0,R.length-1);
}

function automaticNightState(value){
  var autoIndex=startingIndex(value),clock=maltaDateParts(value),target=operationalRosterDate(value),isCurrent=R[autoIndex]&&R[autoIndex].date===target&&(clock.hour<7||clock.hour>=19),selected=idx===autoIndex;
  return{index:autoIndex,isCurrent:isCurrent,selected:selected,label:selected?(isCurrent?'Current night selected':'Next night selected'):(isCurrent?'Return to current night':'Return to next roster night')};
}

function selectedNightCopy(date,value){
  var p=maltaDateParts(value),today=[p.year,String(p.month).padStart(2,'0'),String(p.day).padStart(2,'0')].join('-'),state=automaticNightState(value),automatic=R[state.index]&&R[state.index].date;
  if(state.isCurrent&&date===automatic)return{label:'Current night',assignment:'Current night’s assignment',changed:'Changed this night'};
  if(date===today)return{label:'Tonight',assignment:'Tonight’s assignment',changed:'Changed tonight'};
  if(date===automatic&&date>today)return{label:'Next night',assignment:'Next night’s assignment',changed:'Changed for next night'};
  return{label:'Selected night',assignment:'Selected night’s assignment',changed:'Changed for this night'};
}

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
  var hour=maltaDateParts().hour;idx=startingIndex();automaticSelectedDate=R[idx].date;localStorage.setItem('anaes_selected_date',R[idx].date);render();toast(hour<7||hour>=19?'Current working night opened':'Next available roster night opened');
}

function refreshAutomaticNightOnReturn(){
  if(document.visibilityState!=='visible'||!initialNightChosen||!automaticSelectedDate||!R.length)return;
  var selected=localStorage.getItem('anaes_selected_date'),nextDate=R[startingIndex()].date;
  if(selected===automaticSelectedDate&&nextDate!==automaticSelectedDate){idx=startingIndex();automaticSelectedDate=nextDate;render();toast('Roster moved to the next available night')}
}

function setChangesStep(step,scroll){
  activeChangesStep=step==='confirm'?'confirm':step==='allocation'?'allocation':'staffing';
  var staffing=byId('changesStaffingPane'),allocation=byId('changesAllocationPane'),confirmation=byId('changesConfirmPane');if(!staffing||!allocation||!confirmation)return;
  staffing.classList.toggle('hidden',activeChangesStep!=='staffing');allocation.classList.toggle('hidden',activeChangesStep!=='allocation');confirmation.classList.toggle('hidden',activeChangesStep!=='confirm');
  Array.prototype.forEach.call(document.querySelectorAll('[data-changes-step]'),function(button){var selected=button.getAttribute('data-changes-step')===activeChangesStep;button.classList.toggle('active',selected);button.setAttribute('aria-selected',selected?'true':'false')});
  if(scroll)byId('changesWorkflowState').scrollIntoView({behavior:'smooth',block:'start'});
}

function workflowTaskCount(base,plan,r){
  return workflowTaskDetails(base,plan).length;
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
  var r=applyChanges(base),taskDetails=workflowTaskDetails(base,plan),tasks=taskDetails.length,taskInstruction=taskDetails[0]||'',confirmNeeded=workflowNeedsConfirmation(base,tasks),hasManualPlan=workflowHasManualPlan(base),changes=changesFor(base.date),overtime=overtimeFor(base.date),staffingState=byId('staffingStepState'),allocationState=byId('allocationStepState'),confirmState=byId('confirmStepState'),state=byId('changesWorkflowState'),badge=byId('changesTaskBadge');
  staffingState.textContent=changes.length||overtime.length?changes.length+' absent · '+overtime.length+' overtime':'No changes';
  var published=nightPlanStatuses[base.date];allocationState.textContent=tasks?tasks+' task'+(tasks===1?'':'s')+' remaining':'Current roles';confirmState.textContent=tasks?'Resolve tasks':confirmNeeded?'Review changes':published&&published.published_at&&hasManualPlan?'Shared':'Not needed';
  var staffingTab=document.querySelector('[data-changes-step="staffing"]'),allocationTab=document.querySelector('[data-changes-step="allocation"]'),confirmTab=document.querySelector('[data-changes-step="confirm"]'),confirmationNotNeeded=!hasManualPlan&&!confirmNeeded,hasStaffingChanges=!!(changes.length||overtime.length),shared=!!(published&&published.published_at&&hasManualPlan&&!confirmNeeded);staffingTab.classList.toggle('complete',hasStaffingChanges);allocationTab.classList.toggle('complete',hasManualPlan&&!tasks);allocationTab.classList.toggle('hasTasks',!!tasks);confirmTab.classList.toggle('complete',shared);confirmTab.classList.toggle('notNeeded',confirmationNotNeeded);confirmTab.classList.toggle('hasTasks',!!confirmNeeded);
  state.innerHTML=tasks?'<b>'+esc(taskInstruction)+'</b><span>'+(tasks>1?esc((tasks-1)+' other allocation decision'+(tasks===2?' also remains.':'s also remain.')):'Select the nurse, then review the changes.')+'</span>':confirmNeeded?'<b>Ready to review</b><span>Check the selected night’s changes before sharing them with everyone.</span>':published&&published.published_at&&hasManualPlan?'<b>Changes shared</b><span>Updated by '+esc(published.published_by||'a shift member')+' at '+esc(shortTime(published.published_at))+'.</span>':'';
  state.classList.toggle('hidden',!tasks&&!confirmNeeded&&!hasManualPlan);
  state.classList.toggle('complete',!confirmNeeded);state.classList.toggle('ready',!tasks&&confirmNeeded);
  var badgeCount=tasks||(confirmNeeded?1:0);badge.textContent=badgeCount;badge.classList.toggle('hidden',!badgeCount);
  byId('continueToAllocationBtn').textContent=tasks?'Resolve allocations':'Review or change roles';
  var confirmButton=byId('continueToConfirmBtn');confirmButton.disabled=!!tasks;confirmButton.classList.toggle('hidden',!confirmNeeded);confirmButton.textContent='Review changes';var confirmReason=byId('continueToConfirmReason');if(confirmReason){confirmReason.textContent=tasks?'Complete the allocation above before reviewing changes.':'';confirmReason.classList.toggle('hidden',!tasks)}
  var allocationSection=document.querySelector('.allocationSection');if(allocationSection)allocationSection.classList.toggle('hidden',!tasks&&!hasManualPlan);
  var allocationHeading=document.querySelector('.allocationSection .stepHeader h3');if(allocationHeading)allocationHeading.textContent='Finalise selected-night allocations';
  var confirmationHeading=document.querySelector('#changesConfirmPane .stepHeader h3'),confirmationIntro=byId('confirmationIntro');if(confirmationHeading)confirmationHeading.textContent=confirmNeeded?'Confirm selected-night changes':shared?'Changes shared':'No changes to review';if(confirmationIntro)confirmationIntro.classList.toggle('hidden',!tasks&&!confirmNeeded);
  var fixed=fixedRolesHtml(base,plan),fixedList=byId('fixedAllocationList');fixedList.innerHTML=fixed||'<div class="time">Roles will appear after the staffing decisions are complete.</div>';byId('fixedAllocationSummary').textContent='Selected-night roles · '+(fixed.match(/fixedRoleRow/g)||[]).length;
  renderConfirmationPreview(base,plan,tasks,confirmNeeded,taskInstruction);var save=byId('saveAllocationsBtn');if(save){save.classList.toggle('hidden',!confirmNeeded);save.dataset.workflowBlocked=tasks?'true':'false';save.disabled=!!tasks||!navigator.onLine}
  setChangesStep(activeChangesStep,false);
}

function confirmationRow(label,value,detail){return'<div class="confirmationRow"><div><span>'+esc(label)+'</span>'+(detail?'<small>'+esc(detail)+'</small>':'')+'</div><b>'+esc(value?professionalNames(value):'To decide')+'</b></div>'}

function confirmationChangeRow(label,before,after,detail){return'<div class="confirmationChangeRow"><div><span>'+esc(label)+'</span>'+(detail?'<small>'+esc(detail)+'</small>':'')+'</div><div class="confirmationChangeValues"><del>'+esc(professionalNames(before)||'Not assigned')+'</del><i aria-hidden="true">→</i><ins>'+esc(professionalNames(after)||'Not assigned')+'</ins></div></div>'}

function labourAssignmentDetail(name,order){
  if(!order)return'Labour Ward part pending';
  var first=order.first||order.first_part_name;
  return canonicalNurseName(first)===canonicalNurseName(name)?'Labour Ward first part · Second break':'Labour Ward second part · First break';
}

function confirmationPlanRows(r,order){
  var rows=[confirmationRow('First part theatre',r.first1+' + '+r.first2,'Second break'),confirmationRow('Second part theatre',r.second1+' + '+r.second2,'First break')];
  if(r.mode==='5')rows.push(confirmationRow('Full-night Labour Ward / Pager',r.fullLW,'Break coordinated when clinical cover allows'));
  else{rows.push(confirmationRow('Pager',r.pager,labourAssignmentDetail(r.pager,order)));rows.push(confirmationRow('Reliever',r.reliever,labourAssignmentDetail(r.reliever,order)))}
  if(r.mode==='7')rows.push(confirmationRow('Seventh nurse',r.seventh,'Break coordinated as required'));
  return rows;
}

function confirmationChangedRows(base,r,order){
  var rostered=rawBaseForDate(base.date),labels={first1:'First Part theatre · position 1',first2:'First Part theatre · position 2',second1:'Second Part theatre · position 1',second2:'Second Part theatre · position 2',pager:'Pager',reliever:'Reliever',seventh:'Seventh nurse'},rows=[];
  ['first1','first2','second1','second2'].forEach(function(key){if(canonicalNurseName(rostered[key])!==canonicalNurseName(r[key]))rows.push(confirmationChangeRow(labels[key],rostered[key],r[key],allocationBreak(key)))});
  if(r.mode==='5'){var before=rostered.pager+' + '+rostered.reliever;if(canonicalNurseName(rostered.pager)!==canonicalNurseName(r.fullLW)||canonicalNurseName(rostered.reliever)!==canonicalNurseName(r.fullLW))rows.push(confirmationChangeRow('Full-night Labour Ward / Pager',before,r.fullLW,'00:00–07:00'))}
  else ['pager','reliever'].forEach(function(key){if(canonicalNurseName(rostered[key])!==canonicalNurseName(r[key]))rows.push(confirmationChangeRow(labels[key],rostered[key],r[key],labourAssignmentDetail(r[key],order)))});
  if(r.mode==='7'&&canonicalNurseName(rostered.seventh)!==canonicalNurseName(r.seventh))rows.push(confirmationChangeRow(labels.seventh,rostered.seventh,r.seventh,'Break coordinated as required'));
  if(!rows.length){changesFor(base.date).forEach(function(change){rows.push(confirmationChangeRow('Absence',change.absent_name,change.replacement_name||'Not working',change.reason||'Unavailable'))});overtimeFor(base.date).forEach(function(entry){rows.push(confirmationChangeRow('Overtime','Not working',entry.nurse_name,entry.allocation_key?allocationLabel(entry.allocation_key):'Allocation to decide'))})}
  return rows;
}

function confirmationReasonHtml(base){var reasons=[],override=nightRoleOverrides[base.date];if(override&&override.reason)reasons.push(override.reason);changesFor(base.date).forEach(function(change){if(change.reason)reasons.push(change.reason)});reasons=reasons.filter(function(reason,index,list){return list.indexOf(reason)===index});return reasons.length?'<div class="confirmationReason"><span>Reason</span><b>'+esc(reasons.join(' · '))+'</b></div>':''}

function renderConfirmationPreview(base,plan,tasks,confirmNeeded,taskInstruction){
  var host=byId('confirmationPreview');if(!host)return;var r=allocationPreview(base);
  if(!tasks&&!confirmNeeded){host.innerHTML='';return}
  var order=labourOrderDrafts[base.date]||labourOrderFor(r)||(!tasks?{first:r.pager,second:r.reliever}:null),changed=confirmationChangedRows(base,r,order),full=confirmationPlanRows(r,order);
  host.innerHTML=(tasks?'<div class="confirmationWarning">'+esc(taskInstruction||'Complete the remaining allocation')+' before continuing.</div>':'<div class="confirmationReady">Review only what changed before sharing.</div>')+'<div class="confirmationChanges">'+changed.join('')+'</div>'+confirmationReasonHtml(base)+'<details class="confirmationFullPlan"><summary>View full plan</summary><div>'+full.join('')+'</div></details>';
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
    if(plan.count<5)copy.understaffedCount=plan.count;
    return copy;
  }
  if(plan.count===5&&plan.coverageKey){applyFiveVacancy(copy,plan.coverageKey);copy.staffingAdjusted=true;copy.pendingAllocations=[];return copy}
  if(plan.unresolved.length>1){
    plan.unresolved.forEach(function(key){copy[key]='Uncovered • additional cover required'});
    copy.mode='5';copy.staffingAdjusted=true;copy.understaffedCount=plan.count;copy.pendingAllocations=plan.unresolved.slice();
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
  var order=labourOrderFor(r);
  if(!order)return'Labour Ward part and break to decide';
  if(String(order.first_part_name).toLowerCase()===String(name).toLowerCase())return'Labour Ward first part • Second break';
  return'Labour Ward second part • First break';
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
  var nightCopy=selectedNightCopy(base.date);
  if(!name)return{key:'unselected',icon:'night',title:'Choose your name',detail:'See your own role and break at a glance.',period:'Select your name',breakLabel:'Shown after selection',context:'Stored privately on this device',pending:false};
  var absence=changesFor(base.date).find(function(item){return sameNurse(item.absent_name,name)});
  if(absence)return{key:'absence',icon:'absence',title:'Not working for this night',detail:(absence.reason||'Absence')+' recorded',period:nightCopy.label,breakLabel:'Not applicable',context:absence.reason||'Absence recorded',pending:false};
  if(sameNurse(r.first1,name)||sameNurse(r.first2,name)){var firstKey=sameNurse(r.first1,name)?'first1':'first2';return{key:firstKey,icon:'first',title:'First Part theatre',detail:'Position '+(firstKey==='first1'?'1':'2'),period:'00:00–03:30',breakLabel:'Second break',context:'With '+professionalName(firstKey==='first1'?r.first2:r.first1),pending:false}}
  if(sameNurse(r.second1,name)||sameNurse(r.second2,name)){var secondKey=sameNurse(r.second1,name)?'second1':'second2';return{key:secondKey,icon:'second',title:'Second Part theatre',detail:'Position '+(secondKey==='second1'?'1':'2'),period:'03:30–07:00',breakLabel:'First break',context:'With '+professionalName(secondKey==='second1'?r.second2:r.second1),pending:false}}
  if(r.mode==='5'&&sameNurse(r.fullLW,name))return{key:'fullLW',icon:'reliever',title:'Labour Ward / Pager',detail:'Full-night cover',period:'00:00–07:00',breakLabel:'When clinical cover allows',context:'Sole Labour Ward / Pager cover',pending:false};
  if(r.mode!=='5'&&(sameNurse(r.pager,name)||sameNurse(r.reliever,name))){
    var pagerRole=sameNurse(r.pager,name),role=pagerRole?'Pager':'Reliever',other=pagerRole?r.reliever:r.pager,order=labourOrderFor(r);
    if(!order)return{key:pagerRole?'pager':'reliever',icon:pagerRole?'pager':'reliever',title:role,detail:'Labour Ward part pending',period:'To be decided',breakLabel:'Pending',context:'With '+professionalName(other),pending:true,other:other};
    if(sameNurse(order.first_part_name,name))return{key:pagerRole?'pager':'reliever',icon:pagerRole?'pager':'reliever',title:role,detail:'Labour Ward first part',period:'00:00–03:30',breakLabel:'Second break',context:'With '+professionalName(other),pending:false};
    return{key:pagerRole?'pager':'reliever',icon:pagerRole?'pager':'reliever',title:role,detail:'Labour Ward second part',period:'03:30–07:00',breakLabel:'First break',context:'With '+professionalName(other),pending:false};
  }
  if(r.mode==='7'&&sameNurse(r.seventh,name))return{key:'seventh',icon:'seventh',title:'Seventh nurse',detail:'Additional allocation',period:'As allocated',breakLabel:'As required',context:'Supports this night’s team',pending:false};
  return{key:'unallocated',icon:'task',title:'Not allocated for this night',detail:'An assignment may still be under review.',period:'Pending',breakLabel:'Pending',context:'Open Changes to review',pending:false};
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
  var name=myName(),preferred=currentPrivateProfile&&currentPrivateProfile.profile_name||'',jobTitle=currentPrivateProfile&&currentPrivateProfile.job_title||'',displayName=preferred||professionalName(name)||'Choose your name',assignment=personalAllocation(base,r,name),changed=personalAssignmentChanged(base,r,name,assignment),initial=displayName.trim().charAt(0).toUpperCase()||'?',avatar=profileAvatarUrl?'<img src="'+esc(profileAvatarUrl)+'" alt="">':esc(initial),roleClass='personalRole-'+esc(assignment.icon||'task'),action=assignment.key==='absence'?'<button type="button" class="personalContextAction" data-go-absence>Review absence <span aria-hidden="true">›</span></button>':name&&assignment.key!=='unallocated'?'<button type="button" class="personalContextAction" id="viewPersonalRoleBtn">View in night situation <span aria-hidden="true">›</span></button>':'<button type="button" class="personalContextAction" id="choosePersonalNameBtn">Choose your name <span aria-hidden="true">›</span></button>';
  var contextLabel=assignment.key==='absence'||assignment.key==='unallocated'?'Status':assignment.key==='unselected'?'Personal view':assignment.key==='fullLW'?'Coverage':assignment.key==='seventh'?'Team':'Working with',nightCopy=selectedNightCopy(base.date);
  host.innerHTML='<div class="personalIdentity"><div class="personalAvatar '+(profileAvatarUrl?'hasPhoto':'')+'" aria-hidden="true">'+avatar+'<i></i></div><div class="personalIdentityCopy"><b>'+esc(displayName)+'</b>'+(jobTitle?'<small>'+esc(jobTitle)+'</small>':'')+'</div><button type="button" class="personalChangeBtn" id="changePersonalNameBtn" aria-label="Edit your personal Night view">Edit</button></div><div class="personalAssignmentHero '+roleClass+'"><span class="personalRoleIcon">'+interfaceIcon(assignment.icon||'task')+'</span><span class="personalRoleCopy"><small>'+esc(nightCopy.assignment)+'</small><b>'+esc(assignment.title)+'</b><span>'+esc(assignment.detail||'')+'</span></span>'+(changed?'<span class="personalChangedBadge">'+esc(nightCopy.changed)+'</span>':'')+'</div><dl class="personalFacts">'+personalFact('Time',assignment.period)+personalFact('Break',assignment.breakLabel)+personalFact(contextLabel,assignment.context)+'</dl>'+action;
  notice.innerHTML=assignment.pending?'<button type="button" class="personalTaskCard" data-go-allocation><span class="personalTaskIcon">'+interfaceIcon('task')+'</span><span><b>Your allocation is not final yet</b><small>Labour Ward / Pager is shared with '+esc(professionalName(assignment.other))+'.</small><strong>Complete allocation ›</strong></span></button>':'';
  byId('changePersonalNameBtn').onclick=showAccountSheet;
  var choose=byId('choosePersonalNameBtn');if(choose)choose.onclick=showAccountSheet;
  var viewRole=byId('viewPersonalRoleBtn');if(viewRole)viewRole.onclick=function(){var target=document.querySelector('#roles .role.mine,#fiveArrangement .role.mine');if(target){target.scrollIntoView({behavior:'smooth',block:'center'});target.focus({preventScroll:true})}};
  return assignment;
}

function activitySignature(date){
  var records=[];[changesFor(date),overtimeFor(date),changeHistory[date]||[],overtimeHistory[date]||[],roleOverrideHistory[date]||[]].forEach(function(list){list.forEach(function(item){records.push(item.updated_at||item.changed_at||'')})});var status=nightPlanStatuses[date],override=nightRoleOverrides[date],cover=fiveCoverChoices[date],order=labourOrders[date];[status,override,cover,order].forEach(function(item){if(item)records.push(item.updated_at||item.changed_at||JSON.stringify(item))});return records.filter(Boolean).sort().join('|')
}

function renderRecentActivity(date){
  var host=byId('recentActivityList'),chip=byId('changedSinceChip');if(!host||!chip)return;var signature=activitySignature(date),seen={};try{seen=JSON.parse(localStorage.getItem('anaes_seen_night_activity')||'{}')}catch(error){}if(seen[date]&&signature&&seen[date]!==signature)changedSinceSession[date]=true;if(signature){seen[date]=signature;try{localStorage.setItem('anaes_seen_night_activity',JSON.stringify(seen))}catch(error){}}
  chip.classList.toggle('hidden',!changedSinceSession[date]);chip.textContent=changedSinceSession[date]?'Updated since last opened':'Updated';var items=staffingHistoryFor(date).slice(0,5);host.innerHTML=items.length?items.map(function(item,index){return'<button type="button" class="recentActivityRow" data-activity-index="'+index+'" aria-label="View details for '+esc(item.title)+'"><span class="activityType '+esc(item.type)+'">'+esc(item.label)+'</span><span class="recentActivityCopy"><b>'+esc(item.title)+'</b>'+(item.detail?'<small class="recentActivityDetail">'+esc(item.detail)+'</small>':'')+'<small class="recentActivityMeta">'+esc(item.changed_by||'Roster member')+' · '+esc(shortTime(item.changed_at))+'</small></span><i aria-hidden="true">›</i></button>'}).join(''):'<div class="emptyRecentActivity">No staffing changes have been recorded for this night.</div>';Array.prototype.forEach.call(host.querySelectorAll('[data-activity-index]'),function(button){button.onclick=function(){openActivityDetail(items[Number(button.getAttribute('data-activity-index'))],date)}});
}

function openActivityDetail(item,date){var dialog=byId('activityDetailSheet'),type=byId('activityDetailType'),title=byId('activityDetailTitle'),content=byId('activityDetailContent');if(!dialog||!item)return;type.className='activityType '+item.type;type.textContent=item.label;title.textContent=item.title;var rows=[['Night',fmt(date)],['Details',item.detail||'No additional reason was recorded.'],['Recorded by',item.changed_by||'Roster member'],['Recorded',new Date(item.changed_at).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'})]];content.innerHTML=rows.map(function(row){return'<div class="activityDetailRow"><span>'+esc(row[0])+'</span><b>'+esc(row[1])+'</b></div>'}).join('');if(!dialog.open)dialog.showModal()}

function updateScrollChrome(){scrollChromeFrame=null;document.body.classList.toggle('uiScrolled',window.scrollY>18)}
function scheduleScrollChrome(){if(scrollChromeFrame)return;scrollChromeFrame=requestAnimationFrame(updateScrollChrome)}

function failedAction(message,retry){lastFailedAction=retry||null;toast(message,retry?{label:'Retry',run:function(){var action=lastFailedAction;lastFailedAction=null;return action&&action()}}:null)}
function notifyRosterUpdate(type,date){if(window.dispatchRosterPush)window.dispatchRosterPush(type,date)}

function render(){
  if(!R.length||!currentUserProfile)return;
  var base=cur(),plan=staffingPlan(base),r=applyChanges(base),e=effective(r),count=plan.count;
  ensureAutomaticLabourOrder(base,r);
  var labourPending=r.mode!=='5'&&!planIsProvisional(base)&&!labourOrderFor(r);
  var roles=[['bFirst','First Part',r.first1+' + '+r.first2,'Works 00:00–03:30 • Second break'],['bSecond','Second Part',r.second1+' + '+r.second2,'Works 03:30–07:00 • First break']];
  if(r.mode!=='5'){
    roles.push(['bPager','Pager',r.pager,labourRoleDetail(r.pager,r)]);
    roles.push(['bReliever','Reliever',r.reliever,labourRoleDetail(r.reliever,r)]);
  }
  syncDateInputs(base.date);renderMyName();var personal=renderPersonalNight(base,r);renderRecentActivity(base.date);renderHeaderSummary(r);updateSmartNightButtons();
  byId('modeStatus').textContent=count+' nurse'+(count===1?'':'s');
  if(byId('changesModeStatus'))byId('changesModeStatus').textContent=count+' nurse'+(count===1?'':'s');
  byId('breakModeStatus').textContent=count+' nurse'+(count===1?'':'s');
  var alertClass=count<6?'warn':'';
  var decisionTasks=workflowTaskCount(base,plan,r),confirmNeeded=workflowNeedsConfirmation(base,decisionTasks),taskCount=decisionTasks||(confirmNeeded?1:0),absenceCount=changesFor(base.date).length,overtimeCount=overtimeFor(base.date).length,statusRow=byId('nightStatusRow');if(statusRow)statusRow.innerHTML='<div class="statusChip staffingChip informational">'+interfaceIcon('staffing')+'<span><b>'+count+'</b><small>Nurses</small></span></div><button type="button" class="statusChip '+(absenceCount?'absenceChip':'readyChip')+'" data-go-absence>'+interfaceIcon('absence')+'<span><b>'+(absenceCount?absenceCount:'No')+'</b><small>Absence'+(absenceCount===1?'':'s')+'</small></span></button><button type="button" class="statusChip overtimeChip" data-go-overtime>'+interfaceIcon('overtime')+'<span><b>'+overtimeCount+'</b><small>Overtime</small></span></button>'+(taskCount?'<button type="button" class="statusChip taskChip" '+(confirmNeeded&&!decisionTasks?'data-go-confirm':'data-go-allocation')+'>'+interfaceIcon('task')+'<span><b>Review '+taskCount+'</b><small>'+(decisionTasks?'allocation'+(taskCount===1?'':'s'):'confirmation')+'</small></span></button>':'<div class="statusChip readyChip informational">'+interfaceIcon('task')+'<span><b>Ready</b><small>Plan</small></span></div>');
  var firstTask=workflowTaskDetails(base,plan)[0]||'';byId('alerts').innerHTML=(count!==6&&r.mode!=='5'?'<div class="alert compactNotice '+alertClass+'">'+esc(e.alert)+'</div>':'')+(decisionTasks?'<button type="button" class="alert gold taskAlert" data-go-allocation><b>'+esc(firstTask)+'</b><span>Complete now ›</span></button>':'')+(labourPending&&!(personal&&personal.pending)?'<button type="button" class="alert gold taskAlert" data-go-allocation><b>Choose the Labour Ward order</b><span>Complete now ›</span></button>':'');
  if(r.mode==='7')roles.push(['b7','Seventh nurse',r.seventh,'Additional nurse · Break coordinated as required']);
  byId('roles').innerHTML=roles.map(function(c){var iconType=roleIconType(c[0]),icon=iconType==='first'?'<span class="roleOrdinal">1st</span>':iconType==='second'?'<span class="roleOrdinal">2nd</span>':interfaceIcon(iconType);return '<button type="button" class="role '+c[0].replace(/^b/,'r')+' '+(isMine(c[2])?'mine':'')+'" data-go-role-editor aria-label="Change this night’s '+esc(c[1])+' allocation"><span class="roleIcon '+iconType+'">'+icon+'</span><span class="roleCopy"><span class="name">'+esc(professionalNames(c[2]))+'</span><span class="roleMeta"><span class="badge '+c[0]+'">'+esc(c[1])+'</span><span class="time">'+esc(c[3])+'</span></span></span></button>'}).join('');
  var extras=additionalNurses(plan);
  if(extras.length)byId('roles').insertAdjacentHTML('beforeend','<div class="additionalStaff"><b>Additional staff • allocation as required</b>'+extras.map(function(o){return '<span class="additionalName">'+esc(o.nurse_name)+'</span>'}).join('')+'</div>');
  byId('fiveArrangement').innerHTML=fiveArrangementHtml(r);
  localStorage.setItem('anaes_selected_date',base.date);
  renderChanges(base);renderRoster();renderBreaks();bindTaskLinks();
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
  var values=[];try{values=JSON.parse(localStorage.getItem('anaes_recent_overtime_names')||'[]')}catch(error){}
  Object.keys(nightOvertime).forEach(function(date){(nightOvertime[date]||[]).forEach(function(item){values.push(item.nurse_name)})});
  var seen={};return values.map(normaliseNurseName).filter(function(name){var key=name.toLowerCase();if(!name||seen[key])return false;seen[key]=true;return true}).slice(-30).reverse();
}

function rememberOvertimeName(name){var names=recentOvertimeNames().filter(function(item){return item.toLowerCase()!==name.toLowerCase()});names.unshift(name);try{localStorage.setItem('anaes_recent_overtime_names',JSON.stringify(names.slice(0,30)))}catch(error){}}

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

async function saveNightRoleOverride(base){
  if(!requireOnline())return;var draft=nightRoleOverrideDrafts[base.date],reason=normaliseNurseName(draft&&draft.reason||'');
  if(!draft||!validRoleAssignmentsForNight(base,draft.assignments)||!roleAssignmentsDiffer(draft.assignments,currentRoleAssignments(base))){toast('Change a role before saving');return}if(!reason){toast('Add a short reason for the night-only change');var field=byId('nightRoleReason');if(field)field.focus();return}
  var previous=nightRoleOverrides[base.date]?JSON.parse(JSON.stringify(nightRoleOverrides[base.date])):null,button=byId('saveNightRolesBtn');if(button){button.disabled=true;button.textContent='Saving…'}setSync('saving','Saving night-only roles');
  var result=await supa.rpc('apply_night_role_override_v35',{p_roster_date:base.date,p_action:'save',p_assignments:draft.assignments,p_override_reason:reason,p_history_reason:reason,p_changed_by:currentUserProfile.display_name});
  if(missingRpc(result)){setSync('error','Database update required');toast('Seven-nurse night-only changes require the current database update. Nothing was changed.');if(button){button.disabled=false;button.textContent='Save night-only change'}return}if(rpcError(result))return;delete nightRoleOverrideDrafts[base.date];await loadSharedData();notifyRosterUpdate('roles',base.date);toast('Saved for this night only. The permanent rotation is unchanged.',{label:'Undo',run:function(){return undoNightRoleChange(base.date,previous)}});
}

async function resetNightRoleOverride(base){
  if(!requireOnline()||!confirm('Restore the rostered roles for this night?'))return;setSync('saving','Restoring rostered roles');var stored=nightRoleOverrides[base.date]?JSON.parse(JSON.stringify(nightRoleOverrides[base.date])):null,result=await supa.rpc('apply_night_role_override_v35',{p_roster_date:base.date,p_action:'reset',p_assignments:null,p_override_reason:null,p_history_reason:'Restored rostered roles',p_changed_by:currentUserProfile.display_name});if(missingRpc(result)){setSync('error','Database update required');toast('This action requires database schema 36. Nothing was changed.');return}if(rpcError(result))return;delete nightRoleOverrideDrafts[base.date];await loadSharedData();notifyRosterUpdate('roles',base.date);toast('Rostered roles restored',{label:'Undo',run:function(){return undoNightRoleChange(base.date,stored)}});
}

async function undoNightRoleChange(date,previous){
  if(!requireOnline())return;setSync('saving','Undoing role change');var result=await supa.rpc('apply_night_role_override_v35',{p_roster_date:date,p_action:previous?'save':'reset',p_assignments:previous?previous.assignments:null,p_override_reason:previous&&previous.reason||'Previous night-only arrangement',p_history_reason:'Undid the latest role change',p_changed_by:currentUserProfile.display_name});if(missingRpc(result)){setSync('error','Database update required');toast('Undo requires database schema 36. Nothing was changed.');return}if(rpcError(result))return;await loadSharedData();notifyRosterUpdate('roles',date);toast('Role change undone')
}

function updateAllocationSaveControl(base,plan){
  plan=plan||staffingPlan(base);renderNightRoleOverride(base);var hasAllocationChoices=overtimeFor(base.date).length&&plan.availableKeys.length,button=byId('saveAllocationsBtn');
  button.classList.toggle('hidden',!hasAllocationChoices);
  if(!allocationSaveInFlight)button.textContent='Confirm and share changes';
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

function renderChanges(base){
  var changes=changesFor(base.date),absentLower=changes.map(function(c){return c.absent_name.toLowerCase()}),names=activeNames(base).filter(function(n){return absentLower.indexOf(n.toLowerCase())<0});
  var overtime=overtimeFor(base.date),plan=staffingPlan(base),history=staffingHistoryFor(base.date),expanded=!!historyExpandedDates[base.date];
  byId('absentName').innerHTML=names.length?'<option value="">Choose a nurse</option>'+names.map(function(n){return '<option value="'+esc(n)+'">'+esc(professionalName(n))+'</option>'}).join(''):'<option value="">Every rostered nurse is already absent</option>';
  updateStaffingActionAvailability();
  byId('changeList').innerHTML=changes.length?changes.map(function(c){return '<div class="changeItem" data-absence-name="'+esc(c.absent_name)+'"><div><div><b>'+esc(professionalName(c.absent_name))+'</b> <span class="changeArrow">•</span> <b>Absent</b></div><div class="changeMeta">'+esc(c.reason||'Absence')+' • Updated by '+esc(c.updated_by||'Shift member')+' at '+esc(shortTime(c.updated_at))+'</div></div><button type="button" class="recordMoreButton" data-absence-actions="'+esc(c.id)+'" data-record-name="'+esc(c.absent_name)+'" aria-label="More actions for '+esc(professionalName(c.absent_name))+' absence"><span aria-hidden="true">•••</span><small>More</small></button></div>'}).join(''):'<div class="time">No absences recorded for this night.</div>';
  var extraIds=additionalNurses(plan).map(function(o){return o.id});
  byId('overtimeList').innerHTML=overtime.length?overtime.map(function(o){
    var valid=plan.validAssignments.some(function(item){return item.id===o.id}),extra=extraIds.indexOf(o.id)>=0,status=extra?'Additional staff • as required':valid?allocationLabel(o.allocation_key):'Awaiting allocation';
    var added=earliestOvertimeAdd(base.date,o.nurse_name),when=added?added.changed_at:o.updated_at,who=added?added.changed_by:o.updated_by;
    var statusHtml=!valid&&!extra?'<button type="button" class="overtimeStatus taskStatus" data-go-allocation>Awaiting allocation ›</button>':'<span class="overtimeStatus assigned">'+esc(status)+'</span>';
    return '<div class="overtimeItem" data-overtime-name="'+esc(o.nurse_name)+'"><div class="overtimeTop"><div><div class="overtimeName">'+esc(o.nurse_name)+'</div>'+statusHtml+'<div class="changeMeta">Added by '+esc(who||'Shift member')+' at '+esc(shortTime(when))+'</div></div><button type="button" class="recordMoreButton" data-overtime-actions="'+esc(o.id)+'" data-record-name="'+esc(o.nurse_name)+'" aria-label="More actions for '+esc(o.nurse_name)+' overtime record"><span aria-hidden="true">•••</span><small>More</small></button></div></div>';
  }).join(''):'<div class="time">No overtime nurses recorded for this night.</div>';
  byId('fiveCoverStep').innerHTML=fiveCoverHtml(base,plan);
  var extras=additionalNurses(plan),summary,seventhInfo=seventhDecisionCard(plan);
  if(plan.requiresCoverageChoice)summary='<b>'+plan.count+' nurses working this night</b><div class="time">Choose and save the Reliever’s theatre role first. The remaining positions will then appear for overtime nurses.</div>';
  else if(plan.requiresSeventhDecision)summary='<b>Seventh-nurse decision required</b><div class="time">Review the proposed move below. Your choice determines which allocation the overtime nurse will fill.</div>';
  else if(!overtime.length)summary=workflowHasManualPlan(base)?'<b>No allocation decision needed</b><div class="time">This night’s roles are calculated. Review them before sharing the staffing change.</div>':'<b>No allocation changes</b><div class="time">This night’s roles are calculated automatically.</div>';
  else if(plan.unresolved.length)summary='<b>'+plan.count+' nurses working tonight</b><div class="time">'+plan.unresolved.length+' required allocation'+(plan.unresolved.length===1?' remains':'s remain')+' to be decided.</div>';
  else if(extras.length)summary='<b>Core allocations finalised</b><div class="time">'+extras.length+' additional nurse'+(extras.length===1?' remains':'s remain')+' available as required.</div>';
  else summary='<b>Required allocations finalised</b><div class="time">The reliever and overtime allocations are complete.</div>';
  byId('allocationSummary').innerHTML=summary+seventhInfo;
  var allocationDraft=allocationDrafts[base.date]||{};
  byId('allocationList').innerHTML=overtime.length&&plan.availableKeys.length?plan.availableKeys.map(function(key){
    var assigned=plan.validAssignments.find(function(o){return o.allocation_key===key});
    var selectedId=Object.prototype.hasOwnProperty.call(allocationDraft,key)?allocationDraft[key]:(assigned?assigned.id:'');
    var options='<option value="" '+(!selectedId?'selected':'')+'>Choose a nurse</option>'+overtime.map(function(o){return '<option value="'+esc(o.id)+'" '+(selectedId===o.id?'selected':'')+'>'+esc(o.nurse_name)+'</option>'}).join('');
    return '<div class="allocationRow"><div><div class="allocationRole">'+esc(allocationLabel(key))+'</div><div class="allocationBreak">'+esc(allocationBreak(key))+'</div></div><select data-final-allocation="'+esc(key)+'" aria-label="Choose nurse for '+esc(allocationLabel(key))+'">'+options+'</select></div>';
  }).join(''):plan.requiresCoverageChoice?'<div class="time">The overtime choices will appear after the reliever allocation is saved.</div>':plan.requiresSeventhDecision?'<div class="time">Choose the seventh-nurse option above. The correct overtime allocation will then appear here.</div>':'<div class="time">There are no required allocations to finalise.</div>';
  updateAllocationSaveControl(base);renderOvertimeSuggestions();
  var visible=expanded?history:history.slice(0,15);
  byId('changeHistory').innerHTML=history.length?visible.map(function(h){return '<div class="historyItem"><div><span class="historyType '+esc(h.type)+'">'+esc(h.label)+'</span><b>'+esc(h.title)+'</b></div><div class="changeMeta">'+esc(h.detail||'')+' • '+esc(h.changed_by||'Shift member')+' • '+esc(shortTime(h.changed_at))+'</div></div>'}).join('')+(history.length>15?'<button class="historyMore" id="historyMoreBtn" type="button">'+(expanded?'Show recent changes':'Show full history ('+history.length+')')+'</button>':''):'<div class="time">No staffing change history for this night.</div>';
  Array.prototype.forEach.call(document.querySelectorAll('[data-absence-actions]'),function(b){b.onclick=function(){showRecordActions('absence',b.getAttribute('data-absence-actions'),b.getAttribute('data-record-name'))}});
  Array.prototype.forEach.call(document.querySelectorAll('[data-overtime-actions]'),function(b){b.onclick=function(){showRecordActions('overtime',b.getAttribute('data-overtime-actions'),b.getAttribute('data-record-name'))}});
  Array.prototype.forEach.call(document.querySelectorAll('[data-final-allocation]'),function(select){select.onchange=function(){var date=base.date,key=select.getAttribute('data-final-allocation');if(!allocationDrafts[date])allocationDrafts[date]={};allocationDrafts[date][key]=select.value;updateAllocationSaveControl(base);updateChangesWorkflow(base,plan);formMessage('allocationFormMessage','Selections ready to review.','')}});
  Array.prototype.forEach.call(document.querySelectorAll('[data-seventh-decision]'),function(button){button.onclick=function(){chooseSeventhDecision(base,button.getAttribute('data-seventh-decision'))}});
  var coverButton=byId('saveFiveCoverBtn');if(coverButton)coverButton.onclick=saveFiveCover;
  var more=byId('historyMoreBtn');if(more)more.onclick=function(){historyExpandedDates[base.date]=!expanded;renderChanges(base)};
  updateChangesWorkflow(base,plan);
  updateOfflineControls();
}

function updateStaffingActionAvailability(){
  var absence=byId('saveChangeBtn'),absenceName=byId('absentName'),overtime=byId('addOvertimeBtn'),overtimeName=byId('overtimeName'),offline=!navigator.onLine||forcedOfflineSession;
  if(absence)absence.disabled=offline||!absenceName||!absenceName.value;
  if(overtime)overtime.disabled=offline||!overtimeName||!normaliseNurseName(overtimeName.value);
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

function breakData(r){
  var base=baseForDate(r.date),plan=staffingPlan(base);
  if(plan.count<5)return{first:[],second:[],notes:['Breaks cannot be finalised while only '+plan.count+' nurses are recorded. Add sufficient overtime cover and complete the allocations first.']};
  var first=[r.second1,r.second2],second=[r.first1,r.first2],notes=[];
  if(r.mode==='5')notes.push(professionalName(r.fullLW)+' covers Labour Ward / Pager for the full night. Their break is coordinated during the shift when clinical cover allows.');
  else{
    var order=labourOrderFor(r);
    if(order){
      first.push(order.second_part_name);second.push(order.first_part_name);
      notes.push('First part Labour Ward / Pager: '+professionalName(order.first_part_name)+' • Second break.');
      notes.push('Second part Labour Ward / Pager: '+professionalName(order.second_part_name)+' • First break.');
    }else{
      notes.push(professionalName(r.pager)+' and '+professionalName(r.reliever)+' still need to decide who works each part of Labour Ward / Pager.');
      notes.push('Whoever works the first part takes second break. Whoever works the second part takes first break.');
    }
    if(r.mode==='7')notes.push(professionalName(r.seventh)+' is the seventh nurse and coordinates a break as required.');
    var extras=additionalNurses(plan);if(extras.length)notes.push(extras.map(function(o){return o.nurse_name}).join(' + ')+' remain additional staff and take breaks as required.');
  }
  return{first:first,second:second,notes:notes};
}

function renderBreaks(){
  var base=cur(),r=applyChanges(base),plan=staffingPlan(base),staffingPending=planIsProvisional(base),labourPending=r.mode!=='5'&&!labourOrderFor(r),pending=staffingPending||labourPending,count=plan.count,b=staffingPending?{first:[],second:[],notes:['Breaks are pending until the required staffing and allocations are finalised.']}:breakData(r);
  byId('breakDatePick').value=r.date;byId('breakModeStatus').textContent=count+' nurse'+(count===1?'':'s');
  var absenceCount=changesFor(base.date).length,summary=byId('breakSummaryRow');if(summary)summary.innerHTML='<button type="button" class="breakSummaryItem staffing" data-go-staffing>'+interfaceIcon('staffing')+'<b>'+esc(count)+'</b><small>Nurses</small></button><button type="button" class="breakSummaryItem '+(absenceCount?'absence':'ready')+'" data-go-absence>'+interfaceIcon('absence')+'<b>'+(absenceCount?esc(absenceCount):'No')+'</b><small>Absence'+(absenceCount===1?'':'s')+'</small></button>'+(labourPending?'<button type="button" class="breakSummaryItem labour pending" data-go-allocation>'+interfaceIcon('task')+'<b>Action needed</b><small>Review allocation</small></button>':'<div class="breakSummaryItem labour ready informational">'+interfaceIcon('task')+'<b>Automatic</b><small>Labour Ward</small></div>');
  var breakDate=byId('breakDate');breakDate.classList.toggle('hidden',!pending);breakDate.innerHTML=pending?'<b>Break plan pending</b><span>'+(staffingPending?'Complete the remaining staffing allocation.':'Review the Labour Ward allocation.')+'</span><button type="button" class="pendingShortcut" data-go-allocation>Resolve now ›</button>':'';
  byId('breakList').innerHTML='<div class="breakGrid"><div class="breakGroup firstBreak"><h3>First break</h3>'+b.first.map(function(n){return '<div class="breakPerson">'+esc(professionalName(n))+'</div>'}).join('')+(b.first.length?'':'<div class="breakNote">Pending final allocation</div>')+'</div><div class="breakGroup secondBreak"><h3>Second break</h3>'+b.second.map(function(n){return '<div class="breakPerson">'+esc(professionalName(n))+'</div>'}).join('')+(b.second.length?'':'<div class="breakNote">Pending final allocation</div>')+'</div></div><div class="breakGroup lwBreak"><h3>Labour Ward / Pager'+(r.mode==='7'?' and additional staffing':'')+'</h3>'+b.notes.map(function(n){return '<div class="breakNote">'+esc(n)+'</div>'}).join('')+'</div>';
  highlightNamed('breakList','.breakPerson');
}

function renderRoster(){
  var q=(byId('search').value||'').toLowerCase(),f=byId('filter').value||'all';
  byId('range').innerHTML='<b>'+R.length+'</b> published nights • '+fmt(R[0].date)+' to '+fmt(R[R.length-1].date);
  var html='';
  R.forEach(function(original,i){
    var base=Object.assign({},original);base.mode='6';
    var r=applyChanges(base),changes=changesFor(base.date),overtime=overtimeFor(base.date),plan=staffingPlan(base),count=plan.count,extras=additionalNurses(plan),liveCount=changes.length+overtime.length,labourPending=r.mode!=='5'&&!labourOrderFor(r);
    var status=planIsProvisional(base)?'Provisional • staffing decision required':labourPending?'Labour Ward order still required':liveCount?liveCount+' live staffing update'+(liveCount>1?'s':''):'Standard calculated rotation';
    var displayMode=String(Math.max(5,Math.min(7,count)));
    if(!((f==='all'||displayMode===f)&&(JSON.stringify(base)+' '+JSON.stringify(r)+' '+JSON.stringify(changes)+' '+JSON.stringify(overtime)).toLowerCase().indexOf(q)>-1))return;
    html+='<article class="card" role="button" tabindex="0" aria-label="Open roster for '+esc(fmt(r.date))+'" data-i="'+i+'"><div class="ctop"><div><div class="date">'+fmt(r.date)+'</div><div class="time">'+esc(status)+'</div></div><span class="pill mode'+esc(displayMode)+'">'+esc(count)+' nurses</span></div>';
    html+='<div class="row"><div class="lab">First part</div><div><span class="tag tFirst">'+esc(professionalName(r.first1))+'</span><span class="tag tFirst">'+esc(professionalName(r.first2))+'</span></div></div><div class="row"><div class="lab">Second part</div><div><span class="tag tSecond">'+esc(professionalName(r.second1))+'</span><span class="tag tSecond">'+esc(professionalName(r.second2))+'</span></div></div>';
    if(count<5)html+='<div class="row"><div class="lab">Status</div><div><b>Additional overtime cover required</b></div></div>';
    else if(r.mode==='5')html+='<div class="row"><div class="lab">Full-night Labour Ward / Pager</div><div><span class="tag tFull">'+esc(professionalName(r.fullLW))+'</span></div></div>';
    else{var order=labourOrderFor(r)||{first:r.pager,second:r.reliever};html+='<div class="row"><div class="lab">Pager</div><div><span class="tag tPager">'+esc(professionalName(r.pager))+'</span><span class="rowDetail">'+esc(labourAssignmentDetail(r.pager,order))+'</span></div></div><div class="row"><div class="lab">Reliever</div><div><span class="tag tRel">'+esc(professionalName(r.reliever))+'</span><span class="rowDetail">'+esc(labourAssignmentDetail(r.reliever,order))+'</span></div></div>'}
    if(r.mode==='7')html+='<div class="row"><div class="lab">Seventh nurse</div><div><span class="tag t7">'+esc(professionalName(r.seventh))+'</span></div></div>';
    if(extras.length)html+='<div class="row"><div class="lab">Additional</div><div>'+extras.map(function(o){return '<b>'+esc(o.nurse_name)+'</b> • as required'}).join('<br>')+'</div></div>';
    if(changes.length)html+='<div class="row"><div class="lab">Absences</div><div>'+changes.map(function(c){return esc(professionalName(c.absent_name))+' • <b>'+esc(c.reason||'Unavailable')+'</b>'}).join('<br>')+'</div></div>';
    if(overtime.length)html+='<div class="row"><div class="lab">Overtime</div><div>'+overtime.map(function(o){var allocated=plan.availableKeys.indexOf(o.allocation_key)>=0,extra=extras.some(function(x){return x.id===o.id});return '<b>'+esc(o.nurse_name)+'</b> • '+(extra?'as required':allocated?esc(allocationLabel(o.allocation_key)):'allocation to decide')}).join('<br>')+'</div></div>';
    if(r.notes)html+='<div class="row"><div class="lab">Notes</div><div>'+esc(r.notes)+'</div></div>';html+='</article>';
  });
  byId('cards').innerHTML=html||'<div class="notice">No results.</div>';
  Array.prototype.forEach.call(document.querySelectorAll('.card[data-i]'),function(el){var open=function(){idx=Number(el.getAttribute('data-i'));show('today')};el.onclick=open;el.onkeydown=function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}}});highlightNamed('cards','.tag');
}

function requireOnline(){
  if(navigator.onLine&&!forcedOfflineSession)return true;
  setSync('offline','Offline • saved information');toast('The shared roster is unavailable. Your entries remain on screen and can be saved after the connection returns.');return false;
}

function formMessage(id,message,state){
  var el=byId(id);if(!el)return;
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
  var message=(result.error.message||'').toLowerCase();
  setSync('error','Save failed');
  var notice=result.atomicRequired?'The database must be upgraded before this staffing change can be saved safely. No partial record was written.':result.error.code==='42501'||message.indexOf('permission denied')>=0||message.indexOf('row-level security')>=0?'Your signed-in account does not currently have permission to save staffing changes.':message.indexOf('duplicate')>=0||result.error.code==='23505'?'That nurse is already recorded for this night.':'The staffing change could not be saved. Try again, or copy diagnostics for the administrator.';
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
    var result=await timedRequest(supa.rpc('record_night_absence_v25',{p_roster_date:base.date,p_absent_name:absent,p_reason:reason,p_changed_by:currentUserProfile.display_name}));
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

async function undoAddedAbsence(date,name){var item=(nightChanges[date]||[]).find(function(entry){return sameNurse(entry.absent_name,name)});if(!item){toast('That absence has already changed');return}setSync('saving','Undoing absence');var base=baseForDate(date),result=await supa.rpc('remove_night_absence_v25',{p_change_id:item.id,p_allocation_key:allocationKeyForName(base,item.absent_name),p_changed_by:currentUserProfile.display_name});if(missingRpc(result)){setSync('error','Undo unavailable');toast('Undo requires the current database version. The absence was not changed.');return}if(rpcError(result))return;await loadSharedData();notifyRosterUpdate('staffing',date);toast('Absence undone')}

async function undoRemovedAbsence(date,item){setSync('saving','Restoring absence');var result=await supa.rpc('record_night_absence_v25',{p_roster_date:date,p_absent_name:item.absent_name,p_reason:item.reason||'Leave',p_changed_by:currentUserProfile.display_name});if(missingRpc(result)){setSync('error','Undo unavailable');toast('Undo requires the current database version. The absence remains removed.');return}if(rpcError(result))return;await loadSharedData();notifyRosterUpdate('staffing',date);toast('Absence restored')}

async function undoAddedOvertime(date,name){var item=(nightOvertime[date]||[]).find(function(entry){return sameNurse(entry.nurse_name,name)});if(!item){toast('That overtime entry has already changed');return}setSync('saving','Undoing overtime');var result=await supa.rpc('remove_night_overtime_v25',{p_overtime_id:item.id,p_changed_by:currentUserProfile.display_name});if(missingRpc(result)){setSync('error','Undo unavailable');toast('Undo requires the current database version. The overtime record was not changed.');return}if(rpcError(result))return;await loadSharedData();notifyRosterUpdate('staffing',date);toast('Overtime addition undone')}

async function undoRemovedOvertime(date,item){setSync('saving','Restoring overtime nurse');var result=await supa.rpc('add_night_overtime_v25',{p_roster_date:date,p_nurse_name:item.nurse_name,p_changed_by:currentUserProfile.display_name});if(missingRpc(result)){setSync('error','Undo unavailable');toast('Undo requires the current database version. The overtime record remains removed.');return}if(rpcError(result))return;await loadSharedData();notifyRosterUpdate('staffing',date);toast('Overtime nurse restored')}

async function removeNightChange(id,button){
  if(!requireOnline())return;
  if(pendingRemovals[id])return;
  var base=cur(),item=changesFor(base.date).find(function(c){return c.id===id});
  if(!item||!confirm('Remove '+item.absent_name+' from the absence list for '+fmt(base.date)+'?'))return;
  pendingRemovals[id]=true;if(button){button.disabled=true;button.textContent='Removing…'}setSync('saving','Removing absence');
  try{
    var allocationKey=allocationKeyForName(base,item.absent_name);
    var result=await timedRequest(supa.rpc('remove_night_absence_v25',{p_change_id:id,p_allocation_key:allocationKey,p_changed_by:currentUserProfile.display_name}));
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
    var result=await timedRequest(supa.rpc('add_night_overtime_v25',{p_roster_date:base.date,p_nurse_name:name,p_changed_by:currentUserProfile.display_name}));
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
    var result=await timedRequest(supa.rpc('remove_night_overtime_v25',{p_overtime_id:id,p_changed_by:currentUserProfile.display_name}));
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
  var result=await supa.rpc('apply_staffing_allocations_v25',{p_roster_date:base.date,p_action:'reliever',p_coverage_key:key,p_assignments:null,p_changed_by:currentUserProfile.display_name,p_reliever_name:base.reliever});
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
    var atomicResult=await timedRequest(supa.rpc('finalise_night_plan_v26',{p_roster_date:base.date,p_assignments:chosenCount?chosen:{},p_labour_first:null,p_labour_second:null,p_changed_by:currentUserProfile.display_name,p_expected_revision:expectedRevision}));
    if(!missingRpc(atomicResult)){
      if(atomicResult&&atomicResult.error&&/changed on another device|revision conflict/i.test(atomicResult.error.message||'')){formMessage('allocationFormMessage','This night\'s plan changed on another device. The latest version has been loaded, so please review it and confirm again.','error');toast('A newer plan was loaded for review');await loadSharedData();return false}
      if(rpcError(atomicResult,'allocationFormMessage'))return false;
    }else if(confirmationOnly){formMessage('allocationFormMessage','The final confirmation service is unavailable. Ask the administrator to run the V26 database upgrade.','error');toast('Plan confirmation is unavailable');return false
    }else if(chosenCount){
      var result=await timedRequest(supa.rpc('apply_staffing_allocations_v25',{p_roster_date:base.date,p_action:'allocations',p_coverage_key:null,p_assignments:chosen,p_changed_by:currentUserProfile.display_name,p_reliever_name:base.reliever}));
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

async function loadNightHistory(date,renderAfter){
  if(!date||historyLoadingDates[date])return;
  historyLoadingDates[date]=true;
  var results=await Promise.all([supa.from('night_change_history').select('*').eq('roster_date',date).order('changed_at',{ascending:false}),supa.from('night_overtime_history').select('*').eq('roster_date',date).order('changed_at',{ascending:false}),nightRoleOverrideAvailable?supa.from('night_role_override_history').select('*').eq('roster_date',date).order('changed_at',{ascending:false}):Promise.resolve({data:[],error:null})]);
  delete historyLoadingDates[date];
  if(results.some(function(x){return x.error}))return;
  changeHistory[date]=results[0].data||[];overtimeHistory[date]=results[1].data||[];roleOverrideHistory[date]=results[2].data||[];historyLoadedDates[date]=true;
  if(renderAfter!==false&&currentUserProfile&&cur().date===date){renderRecentActivity(date);renderChanges(cur())}
}

function ensureNightHistory(date){if(!historyLoadedDates[date])loadNightHistory(date,true)}

async function loadSharedData(options){
  var background=!!(options&&options.background);
  if(sharedLoadPromise){sharedReloadPending=true;sharedReloadPendingBackground=sharedReloadPendingBackground&&background;return sharedLoadPromise}
  if(!background)document.body.classList.add('dataRefreshing');
  sharedLoadPromise=(async function(){
    try{
      sharedLoadFailureCode='';
      sharedLoadFailureStage='snapshot';setLaunchState('Preparing your night','Opening the shared roster…');
      var snapshot;if(preferCompatibilityStartup()){
        try{sharedLoadFailureStage='snapshot';setLaunchState('Preparing your night','Opening the protected Android roster…');snapshot=await requestStartupWithSessionRecovery(requestStartupSnapshotXhr)}catch(androidTransportError){
          if(androidTransportError&&androidTransportError.startupSessionFailed)throw androidTransportError;
          if(androidTransportError&&androidTransportError.code==='42501')throw androidTransportError;
          console.warn('Protected Android startup was unavailable; using compatibility reads',androidTransportError);
          snapshot=await requestCompatibilityStartup()
        }
      }else try{snapshot=await requestStartupWithSessionRecovery(requestStartupSnapshot)}catch(snapshotError){
        if(snapshotError&&snapshotError.startupSessionFailed)throw snapshotError;
        if(snapshotError&&snapshotError.code==='42501')throw snapshotError;
        console.warn('Protected startup snapshot was unavailable; using compatibility reads',snapshotError);
        snapshot=await requestCompatibilityStartup()
      }
      var profile=snapshot&&snapshot.profile;
      if(!plainSnapshotRecord(snapshot)||!plainSnapshotRecord(profile)||!profile.active||!Array.isArray(snapshot.rotation_versions)||!snapshot.rotation_versions.length||!plainSnapshotRecord(snapshot.roster_settings))throw new Error('The shared roster returned incomplete information.');
      if(currentUser&&String(profile.email||'').toLowerCase()!==String(currentUser.email||'').toLowerCase()){var accessError=new Error('The shared roster returned the wrong account.');accessError.code='42501';throw accessError}
      currentUserProfile=profile;try{localStorage.setItem('anaes_cached_profile',JSON.stringify(profile))}catch(error){}prepareAuthorisedShell(profile);
      nightChanges=rowsGroupedByDate(snapshot.night_changes);nightOvertime=rowsGroupedByDate(snapshot.night_overtime);fiveCoverChoices=rowsIndexedByDate(snapshot.night_five_cover);
      rosterSettings=snapshot.roster_settings;rotationVersions=snapshot.rotation_versions;
      labourOrderAvailable=true;labourOrders=rowsIndexedByDate(snapshot.night_labour_order);
      nightPlanStatuses=rowsIndexedByDate(snapshot.night_plan_status);
      nightRoleOverrideAvailable=true;nightRoleOverrides=rowsIndexedByDate(snapshot.night_role_overrides);
      if(plainSnapshotRecord(snapshot.app_settings)){appSettings=snapshot.app_settings}
      schemaVersion=Number(snapshot.schema_version||0);lastObservedSyncRevision=Number(snapshot.sync_revision||0);
      rebuildCalculatedRoster();
      if(!initialNightChosen){idx=startingIndex();automaticSelectedDate=R[idx].date;initialNightChosen=true}
      else{var selected=localStorage.getItem('anaes_selected_date'),selectedIdx=selected?R.findIndex(function(r){return r.date===selected}):-1;idx=selectedIdx>=0?selectedIdx:Math.min(idx,R.length-1)}
      lastSuccessfulSyncAt=new Date().toISOString();forcedOfflineSession=false;sharedLoadFailureStage='';sharedLoadFailureCode='';saveOfflineSnapshot();setSync('','Live and up to date');render();renderDiagnostics();return true;
    }catch(error){
      console.error('Shared roster startup failed during '+sharedLoadFailureStage,error);
      sharedLoadFailureCode=String(error&&((error.status&&String(error.status))||error.code)||'').replace(/[^A-Za-z0-9_.-]/g,'').slice(0,32);
      if(error&&(error.startupSessionFailed||startupAuthError(error)))sharedLoadFailureStage='session';
      if(error&&error.code==='42501'){sharedLoadFailureStage='access';forcedOfflineSession=false;return false}
      var cached=currentUser&&cachedAllowedProfile(currentUser.email);if(!currentUserProfile&&cached)prepareAuthorisedShell(cached);
      forcedOfflineSession=true;if(cached&&restoreOfflineSnapshot()){updateOfflineControls();return true}forcedOfflineSession=false;
      setSync('error','Shared data unavailable');return false
    }
  })();
  try{return await sharedLoadPromise}finally{if(!background)document.body.classList.remove('dataRefreshing');sharedLoadPromise=null;if(sharedReloadPending){var nextBackground=sharedReloadPendingBackground;sharedReloadPending=false;sharedReloadPendingBackground=true;setTimeout(function(){loadSharedData({background:nextBackground})},120)}}
}

function scheduleSharedReload(background){clearTimeout(reloadTimer);reloadTimer=setTimeout(function(){loadSharedData({background:background!==false})},350)}

async function checkSharedRevision(){
  if(sharedSyncCheckInFlight||forcedOfflineSession||!currentUserProfile||!navigator.onLine||document.visibilityState==='hidden')return;
  sharedSyncCheckInFlight=true;
  try{
    var result=await supa.from('app_sync_state').select('revision').eq('id',1).maybeSingle();
    if(result.error||!result.data){if(Date.now()-new Date(lastSuccessfulSyncAt||0).getTime()>30000)scheduleSharedReload(true);return}
    var revision=Number(result.data.revision||0);
    if(lastObservedSyncRevision===null)lastObservedSyncRevision=revision;
    else if(revision!==lastObservedSyncRevision)scheduleSharedReload(true);
  }finally{sharedSyncCheckInFlight=false}
}

function startSharedSyncMonitor(){if(sharedSyncTimer)return;sharedSyncTimer=setInterval(checkSharedRevision,15000)}

function scheduleRealtimeReconnect(){
  if(realtimeReconnectTimer||forcedOfflineSession||!currentUserProfile||!navigator.onLine)return;
  var delay=Math.min(30000,1000*Math.pow(2,realtimeRetryCount++));
  realtimeReconnectTimer=setTimeout(function(){realtimeReconnectTimer=null;subscribeToChanges()},delay);
}

function subscribeToChanges(){
  var generation=++realtimeGeneration;realtimeSubscribed=false;if(realtimeReconnectTimer){clearTimeout(realtimeReconnectTimer);realtimeReconnectTimer=null}if(changesChannel)supa.removeChannel(changesChannel);
  var tables=['app_sync_state','night_changes','night_overtime','night_change_history','night_overtime_history','night_five_cover','roster_settings','rotation_versions','night_plan_status','app_settings'];if(labourOrderAvailable)tables.push('night_labour_order');if(nightRoleOverrideAvailable)tables.push('night_role_overrides','night_role_override_history');
  changesChannel=supa.channel('roster-live-v37-1');
  tables.forEach(function(table){changesChannel.on('postgres_changes',{event:'*',schema:'public',table:table},function(payload){
    if(table==='night_change_history'||table==='night_overtime_history'||table==='night_role_override_history'){
      var date=(payload.new&&payload.new.roster_date)||(payload.old&&payload.old.roster_date);if(date){historyLoadedDates[date]=false;if(currentUserProfile&&cur().date===date)ensureNightHistory(date)}
    }
    scheduleSharedReload(true);
  })});
  changesChannel.subscribe(function(status){if(generation!==realtimeGeneration)return;if(status==='SUBSCRIBED'){realtimeSubscribed=true;realtimeRetryCount=0;setSync('','Live and up to date');checkSharedRevision()}else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){realtimeSubscribed=false;setSync('error','Reconnecting live updates…');scheduleRealtimeReconnect()}});
}

function resumeSharedSync(){if(forcedOfflineSession||!currentUserProfile||!navigator.onLine)return;if(!realtimeSubscribed)subscribeToChanges();checkSharedRevision();if(Date.now()-new Date(lastSuccessfulSyncAt||0).getTime()>30000)scheduleSharedReload(true)}

function updateOfflineControls(){
  var offline=!navigator.onLine||forcedOfflineSession,ids=['saveAllocationsBtn','saveNightRolesBtn','resetNightRolesBtn','saveTeamVersionBtn','previewExtendBtn','extendBtn','addAccountBtn'];
  ids.forEach(function(id){var el=byId(id);if(el)el.disabled=offline||el.dataset.workflowBlocked==='true'});
  var cover=byId('saveFiveCoverBtn');if(cover)cover.disabled=offline;
  var labour=byId('saveLabourOrderBtn');if(labour)labour.disabled=offline;
  updateStaffingActionAvailability();
}

function updateNetworkStatus(){
  if(!navigator.onLine||forcedOfflineSession)setSync('offline','Offline • saved information');else if(currentUserProfile)setSync('','Live and up to date');
  updateOfflineControls();
}

function chooseDate(inputId){
  var value=byId(inputId).value,previous=idx;if(!value){render();return}
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
  var createdAt=new Date().toISOString();download('roster-data-export-v'+APP_VERSION.replace('.','-')+'.json',JSON.stringify({created_at:createdAt,app_version:APP_VERSION,scope_note:'Roster and administrator data only. Private profile details and profile photos are excluded.',roster_settings:rosterSettings,rotation_versions:rotationVersions,night_changes:nightChanges,night_overtime:nightOvertime,absence_history:allHistory[0].data||[],overtime_history:allHistory[1].data||[],night_role_overrides:Object.values(nightRoleOverrides),night_role_override_history:allHistory[2].data||[],five_nurse_cover:fiveCoverChoices,labour_ward_orders:Object.values(labourOrders),night_plan_statuses:Object.values(nightPlanStatuses),app_settings:appSettings,authorised_accounts:authorisedAccounts},null,2),'application/json');localStorage.setItem('anaes_last_backup_at',createdAt);renderDiagnostics();
}

function fallbackUpdateMeta(){return{version:'',date:'',title:'Night Roster update',summary:'The latest Night Roster improvements are ready to install.',changes:['Reliability, clarity and interface improvements are ready.']}}

function validUpdateMeta(value){return !!(value&&typeof value==='object'&&/^\d+(?:\.\d+)+$/.test(String(value.version||''))&&typeof value.title==='string'&&Array.isArray(value.changes)&&value.changes.length&&value.changes.every(function(item){return typeof item==='string'&&item.trim().length>0}))}

function renderPendingUpdate(){
  var meta=pendingUpdateMeta||fallbackUpdateMeta(),version=meta.version&&meta.version!==APP_VERSION?'Version '+meta.version+(meta.date?' · '+meta.date:''):'New version ready';
  var bannerVersion=byId('updateBannerVersion'),sheetVersion=byId('updateDetailsVersion'),sheetTitle=byId('updateDetailsTitle'),sheetSummary=byId('updateDetailsSummary'),list=byId('updateChangesList');
  if(bannerVersion)bannerVersion.textContent=version;if(sheetVersion)sheetVersion.textContent=version;if(sheetTitle)sheetTitle.textContent=meta.title||'Night Roster update';if(sheetSummary)sheetSummary.textContent=meta.summary||'Review what is changing, then update when convenient.';
  if(list)list.innerHTML=meta.changes.map(function(change){return'<li>'+esc(change)+'</li>'}).join('');
}

async function loadPendingUpdateMeta(){
  pendingUpdateMeta=fallbackUpdateMeta();renderPendingUpdate();
  try{var response=await fetch('./release.json?check='+Date.now(),{cache:'no-store',credentials:'same-origin'});if(!response.ok)throw new Error('Release information unavailable');var value=await response.json();if(validUpdateMeta(value)){pendingUpdateMeta=value;renderPendingUpdate()}}catch(error){}
}

function showUpdate(registration){updateRegistration=registration;renderDiagnostics();if(sessionStorage.getItem('anaes_update_later')==='1')return;pendingUpdateMeta=null;renderPendingUpdate();byId('updateBanner').classList.remove('hidden');loadPendingUpdateMeta()}

function openUpdateDetails(){var dialog=byId('updateDetails');if(!dialog||!dialog.showModal)return;renderPendingUpdate();byId('updateDetailsStatus').textContent='';if(!dialog.open)dialog.showModal()}

function dismissWaitingUpdate(){sessionStorage.setItem('anaes_update_later','1');var banner=byId('updateBanner'),dialog=byId('updateDetails');if(banner)banner.classList.add('hidden');if(dialog&&dialog.open)dialog.close();toast('Update saved for later')}

function applyWaitingUpdate(){if(!updateRegistration||!updateRegistration.waiting){toast('The update is not ready yet');return}var buttons=[byId('applyUpdateBtn'),byId('applyUpdateSheetBtn'),byId('diagnosticUpdateBtn')],status=byId('updateDetailsStatus');reloadForUpdate=true;buttons.forEach(function(button){if(button){button.disabled=true;button.textContent='Updating…'}});if(status)status.textContent='Installing the update. Night Roster will reopen automatically.';updateRegistration.waiting.postMessage({type:'ACTIVATE_UPDATE'})}

function setupPWA(){
  var install=byId('installBtn');
  window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();deferredInstallPrompt=e;install.classList.remove('hidden')});
  install.onclick=async function(){if(deferredInstallPrompt){deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;install.classList.add('hidden');return}showInstallGuide()};
  window.addEventListener('appinstalled',function(){deferredInstallPrompt=null;install.classList.add('hidden');toast('App installed')});
  byId('applyUpdateBtn').onclick=applyWaitingUpdate;byId('applyUpdateSheetBtn').onclick=applyWaitingUpdate;byId('openUpdateDetailsBtn').onclick=openUpdateDetails;byId('laterUpdateBtn').onclick=dismissWaitingUpdate;byId('laterUpdateSheetBtn').onclick=dismissWaitingUpdate;
  if(navigator.serviceWorker&&typeof navigator.serviceWorker.addEventListener==='function'&&typeof navigator.serviceWorker.register==='function'){
    navigator.serviceWorker.addEventListener('message',function(event){if(event.data&&event.data.type==='CACHE_VERSION'){serviceWorkerCacheVersion=event.data.value||'Unknown';renderDiagnostics()}});navigator.serviceWorker.addEventListener('controllerchange',function(){if(reloadForUpdate){reloadForUpdate=false;window.location.reload()}});
    var check=function(){if(updateRegistration&&navigator.onLine)updateRegistration.update().catch(function(){})};
    window.addEventListener('load',async function(){try{updateRegistration=await navigator.serviceWorker.register('./service-worker.js',{updateViaCache:'none'});if(updateRegistration.waiting)showUpdate(updateRegistration);updateRegistration.addEventListener('updatefound',function(){var worker=updateRegistration.installing;if(!worker)return;worker.addEventListener('statechange',function(){if(worker.state==='installed'&&navigator.serviceWorker.controller)showUpdate(updateRegistration)})});await navigator.serviceWorker.ready;if(navigator.serviceWorker.controller)navigator.serviceWorker.controller.postMessage({type:'GET_CACHE_VERSION'});else{serviceWorkerCacheVersion='Not active';renderDiagnostics()}await updateRegistration.update();setInterval(check,900000)}catch(e){serviceWorkerCacheVersion='Not active';renderDiagnostics()}});
    window.addEventListener('focus',check);document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')check()});
  }
  var closeInstall=byId('closeInstallGuide'),closeRelease=byId('closeReleaseNotes'),releaseDialog=byId('releaseNotes');if(closeInstall)closeInstall.onclick=function(){byId('installGuide').close()};if(closeRelease)closeRelease.onclick=function(){releaseDialog.close()};if(releaseDialog&&typeof releaseDialog.addEventListener==='function')releaseDialog.addEventListener('close',function(){releaseNotesQueued=false;showOnboardingIfNeeded()});showReleaseNotesIfNeeded();
  var ios=/iphone|ipad|ipod/i.test(navigator.userAgent),standalone=window.navigator.standalone||(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches);if(ios&&!standalone)install.classList.remove('hidden');
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
  var isAdmin=currentUserProfile&&currentUserProfile.user_role==='admin';
  var profilePromise=Promise.resolve();if(!forcedOfflineSession)profilePromise=withTimeout(loadOwnProfile(),6000,'Profile details did not respond.').catch(function(){profileFeatureAvailable=false;currentPrivateProfile=null});
  if(!forcedOfflineSession)subscribeToChanges();startSharedSyncMonitor();if(isAdmin&&!forcedOfflineSession)withTimeout(loadAccounts(),6000,'Account list did not respond.').catch(function(){});finishLaunch(true);
  await profilePromise;if(attempt!==startupAttempt)return;showOnboardingIfNeeded();
}

function bind(){
  initTheme();launchSlowTimer=setTimeout(function(){setLaunchState('Still connecting','Finishing the shared roster connection…')},12000);prepareChangesView();setupPWA();bindOnboarding();byId('launchRetryBtn').onclick=retryLaunchConnection;byId('launchOfflineBtn').onclick=useSavedRosterAtLaunch;window.addEventListener('online',function(){updateNetworkStatus();if(forcedOfflineSession){loadSharedData({background:true}).then(function(ready){if(ready&&!forcedOfflineSession){subscribeToChanges();startSharedSyncMonitor()}else updateOfflineControls()});return}resumeSharedSync()});window.addEventListener('offline',function(){realtimeSubscribed=false;updateNetworkStatus()});window.addEventListener('focus',function(){applyThemePreference();resumeSharedSync()});window.addEventListener('pageshow',function(){applyThemePreference();resumeSharedSync()});window.addEventListener('scroll',scheduleScrollChrome,{passive:true});document.addEventListener('visibilitychange',function(){refreshAutomaticNightOnReturn();if(document.visibilityState==='visible'){applyThemePreference();if(currentUserProfile&&navigator.onLine){lastResumeRefresh=Date.now();resumeSharedSync()}}});setInterval(refreshAutomaticNightOnReturn,60000);updateScrollChrome();
  byId('loginTab').onclick=function(){setAuthMode('login')};byId('signupTab').onclick=function(){setAuthMode('signup')};byId('authSubmitBtn').onclick=submitAuth;byId('authGoogleBtn').onclick=signInWithGoogle;byId('authPasskeyBtn').onclick=signInWithPasskey;byId('authPasskeyBtn').classList.toggle('hidden',!passkeySupported());byId('forgotPasswordBtn').onclick=requestPasswordReset;byId('cancelRecoveryBtn').onclick=function(){setAuthMode('login')};byId('authPassword').onkeydown=function(e){if(e.key==='Enter')submitAuth()};byId('authPasswordConfirm').onkeydown=function(e){if(e.key==='Enter')submitAuth()};
  byId('accountBtn').onclick=showAccountSheet;byId('closeAccountSheet').onclick=function(){byId('accountSheet').close()};byId('accountSignOutBtn').onclick=function(){byId('accountSheet').close();signOutUser()};byId('saveProfileBtn').onclick=saveProfile;byId('profilePhotoButton').onclick=function(){byId('profilePhotoInput').click()};byId('changeProfilePhoto').onclick=function(){byId('profilePhotoInput').click()};byId('profilePhotoInput').onchange=function(){if(this.files&&this.files[0])chooseProfilePhoto(this.files[0]);this.value=''};byId('removeProfilePhoto').onclick=removeProfilePhoto;byId('addPasskeyBtn').onclick=addPasskey;byId('accountOnboardingBtn').onclick=openOnboardingReplay;byId('accountInstallBtn').onclick=async function(){byId('accountSheet').close();if(deferredInstallPrompt){deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;byId('installBtn').classList.add('hidden')}else showInstallGuide()};byId('accountVersionHistoryBtn').onclick=function(){byId('accountSheet').close();renderReleaseNotes(true);byId('releaseNotes').showModal()};Array.prototype.forEach.call(document.querySelectorAll('[data-theme-choice]'),function(button){button.onclick=function(){setThemePreference(button.getAttribute('data-theme-choice'))}});byId('adminSettingsBtn').onclick=function(){activeAdminTab='overview';show('admin')};byId('closeAdminBtn').onclick=function(){show('today')};var healthRefresh=byId('refreshAdminHealthBtn');if(healthRefresh)healthRefresh.onclick=function(){if(typeof loadAdminHealth==='function')loadAdminHealth(true)};
  ['profileName','profileJobTitle'].forEach(function(id){byId(id).oninput=updateProfileSaveState});byId('profileRosterName').onchange=updateProfileSaveState;
  byId('saveChangeBtn').onclick=saveNightChange;byId('cancelAbsenceEditBtn').onclick=cancelAbsenceEdit;byId('absentName').onchange=function(){markInvalid('absentName',false);formMessage('absenceFormMessage','');updateStaffingActionAvailability()};byId('addOvertimeBtn').onclick=saveOvertime;byId('saveAllocationsBtn').onclick=saveFinalAllocationsV2510;byId('overtimeName').oninput=function(){markInvalid('overtimeName',false);formMessage('overtimeFormMessage','');updateStaffingActionAvailability()};byId('overtimeName').onkeydown=function(e){if(e.key==='Enter'&&!byId('addOvertimeBtn').disabled)saveOvertime()};byId('addAccountBtn').onclick=addAuthorisedAccount;
  byId('themeBtn').onclick=toggleTheme;byId('datePick').onchange=selectByDate;byId('changesDatePick').onchange=function(){chooseDate('changesDatePick')};byId('breakDatePick').onchange=selectBreakDate;byId('teamEffectiveDate').onchange=selectTeamEffectiveDate;byId('extendDate').onchange=selectExtendDate;
  byId('prevNightBtn').onclick=function(){changeNight(-1)};byId('nextNightBtn').onclick=function(){changeNight(1)};byId('changesPrevNightBtn').onclick=function(){changeNight(-1)};byId('changesNextNightBtn').onclick=function(){changeNight(1)};byId('breakPrevNightBtn').onclick=function(){changeNight(-1)};byId('breakNextNightBtn').onclick=function(){changeNight(1)};byId('teamPrevNightBtn').onclick=function(){changeNight(-1)};byId('teamNextNightBtn').onclick=function(){changeNight(1)};byId('extendPrevNightBtn').onclick=function(){changeExtendNight(-1)};byId('extendNextNightBtn').onclick=function(){changeExtendNight(1)};
  byId('myNamePick').onchange=changeMyName;byId('search').oninput=renderRoster;byId('filter').onchange=renderRoster;
  Array.prototype.forEach.call(document.querySelectorAll('[data-admin-tab]'),function(b){b.onclick=function(){switchAdminTab(b.getAttribute('data-admin-tab'))}});Array.prototype.forEach.call(document.querySelectorAll('[data-extend-months]'),function(b){b.onclick=function(){setExtendRange(Number(b.getAttribute('data-extend-months')))}});
  byId('previewExtendBtn').onclick=previewExtension;byId('extendBtn').onclick=extendRoster;byId('saveTeamVersionBtn').onclick=previewTeamChange;byId('exportBtn').onclick=exportCSV;byId('backupBtn').onclick=backup;
  byId('closeScreenInfoSheet').onclick=function(){byId('screenInfoSheet').close()};byId('closeActivityDetailSheet').onclick=function(){byId('activityDetailSheet').close()};Array.prototype.forEach.call(document.querySelectorAll('.bottom button'),function(b){b.onclick=function(){show(b.getAttribute('data-v'))}});updateOfflineControls();
}

bind();
initApplication();
