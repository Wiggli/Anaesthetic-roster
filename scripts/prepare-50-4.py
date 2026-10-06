from pathlib import Path

sync_path = Path('src/legacy-ui/sync.js')
sync = sync_path.read_text()

old = """function classifyWaitingUpdate(){
  var incoming=waitingUpdateVersion||(pendingUpdateMeta&&pendingUpdateMeta.version)||'',active=cacheVersionNumber(serviceWorkerCacheVersion);
  if(incoming&&incoming!==APP_VERSION)return'new';
  if(incoming&&active===incoming)return'refresh';
  return'finish';
}"""
new = """function updateControllerIsCurrent(){return cacheVersionNumber(serviceWorkerCacheVersion)===APP_VERSION}
function waitingWorkerIsRedundant(){return !!(waitingUpdateVersion&&waitingUpdateVersion===APP_VERSION&&updateControllerIsCurrent())}
function classifyWaitingUpdate(){
  var incoming=waitingUpdateVersion||(pendingUpdateMeta&&pendingUpdateMeta.version)||'',active=cacheVersionNumber(serviceWorkerCacheVersion);
  if(incoming&&incoming!==APP_VERSION)return'new';
  if(incoming&&incoming===APP_VERSION&&active===APP_VERSION)return'current';
  if(incoming&&active===incoming)return'refresh';
  return'finish';
}"""
assert old in sync, 'classifyWaitingUpdate source changed unexpectedly'
sync = sync.replace(old, new, 1)

old = """async function showUpdate(registration){
  updateRegistration=registration;var waiting=registration&&registration.waiting;if(!waiting){clearUpdateNotice();renderWriteGuardState();renderDiagnostics();return}
  pendingUpdateMeta=null;waitingUpdateVersion=cacheVersionNumber(await workerCacheName(waiting));await loadPendingUpdateMeta();waitingUpdateState=classifyWaitingUpdate();renderPendingUpdate();renderDiagnostics();
  sessionStorage.removeItem('anaes_update_later');
  if(sessionStorage.getItem(waitingUpdateDeferralKey())==='1'&&!updateIsAutomatic()&&!compatibilityNeedsUpdate()){renderWriteGuardState();return}
  var banner=byId('updateBanner');if(banner)banner.classList.remove('hidden');renderWriteGuardState();
}"""
new = """async function showUpdate(registration){
  updateRegistration=registration;var waiting=registration&&registration.waiting;if(!waiting){clearUpdateNotice();renderWriteGuardState();renderDiagnostics();return}
  pendingUpdateMeta=null;waitingUpdateVersion=cacheVersionNumber(await workerCacheName(waiting));await loadPendingUpdateMeta();
  if(navigator.serviceWorker&&navigator.serviceWorker.controller)await refreshControllerCacheVersion();
  waitingUpdateState=classifyWaitingUpdate();
  if(waitingWorkerIsRedundant()||waitingUpdateState==='current'){
    try{waiting.postMessage({type:'ACTIVATE_UPDATE'})}catch(error){}
    finishUpdateActivation();renderWriteGuardState();renderDiagnostics();return
  }
  renderPendingUpdate();renderDiagnostics();
  sessionStorage.removeItem('anaes_update_later');
  if(sessionStorage.getItem(waitingUpdateDeferralKey())==='1'&&!updateIsAutomatic()&&!compatibilityNeedsUpdate()){renderWriteGuardState();return}
  var banner=byId('updateBanner');if(banner)banner.classList.remove('hidden');renderWriteGuardState();
}"""
assert old in sync, 'showUpdate source changed unexpectedly'
sync = sync.replace(old, new, 1)

start = sync.index("  updateActivationTimer=setTimeout(async function(){", sync.index("function applyWaitingUpdate(){"))
end_marker = "  },5000);"
end = sync.index(end_marker, start) + len(end_marker)
new_timeout = """  updateActivationTimer=setTimeout(async function(){
    if(!reloadForUpdate)return;
    var activeCache='';
    try{if(updateRegistration)await updateRegistration.update();activeCache=await refreshControllerCacheVersion()}catch(error){}
    var waiting=updateRegistration&&updateRegistration.waiting,incoming=waitingUpdateVersion||(pendingUpdateMeta&&pendingUpdateMeta.version)||'',activeVersion=cacheVersionNumber(activeCache||serviceWorkerCacheVersion);
    if(activeVersion&&incoming&&activeVersion===incoming){finishUpdateActivation();reloadForUpdate=false;window.location.reload();return}
    if(updateRegistration&&!waiting){finishUpdateActivation();reloadForUpdate=false;window.location.reload();return}
    if(waiting&&incoming===APP_VERSION){
      try{waiting.postMessage({type:'ACTIVATE_UPDATE'})}catch(error){}
      reloadForUpdate=false;resetUpdateButtons();waitingUpdateState='current';clearUpdateNotice();renderDiagnostics();
      if(status)status.textContent='This release is already open. The cached shell will finish synchronising quietly.';
      toast('Night Roster is current. Cache synchronisation will finish quietly.');return
    }
    reloadForUpdate=false;resetUpdateButtons();if(status)status.textContent='The newer update is still waiting. Close and reopen Night Roster, then try once more.';toast('Update is still waiting to activate');
  },8000);"""
sync = sync[:start] + new_timeout + sync[end:]
sync_path.write_text(sync)

css_path = Path('src/product-unified.css')
css = css_path.read_text()
marker = '/* 50.4 visibly unified clinical product system. */'
if marker not in css:
    css += r'''

/* 50.4 visibly unified clinical product system. */
/* This remains the single final product-wide authority. The rules below make the
   shared system deliberately obvious on real phones while retaining the established
   clinical information hierarchy and semantic state colours. */
:root{
  --liquid-text:var(--liquid-label);
  --unified-content-width:720px;
  --unified-gutter:clamp(12px,3.7vw,16px);
  --unified-space-1:4px;
  --unified-space-2:8px;
  --unified-space-3:12px;
  --unified-space-4:16px;
  --unified-space-5:24px;
  --unified-radius-lg:22px;
  --unified-radius-xl:26px;
  --unified-fast:180ms;
  --unified-ease:cubic-bezier(.2,.8,.2,1);
  --unified-rule:color-mix(in srgb,var(--liquid-separator) 82%,transparent);
  --unified-soft-surface:color-mix(in srgb,var(--liquid-secondary) 5%,var(--liquid-surface));
  --unified-raised:color-mix(in srgb,var(--liquid-bg-alt) 26%,var(--liquid-surface));
}

body:not(.authPending){
  background:var(--liquid-bg)!important;
  color:var(--liquid-label)!important;
  letter-spacing:-.008em;
}

#today,#changes,#breaks,#chat,#roster{
  width:min(100%,var(--unified-content-width))!important;
  margin-inline:auto!important;
  padding-inline:max(var(--unified-gutter),var(--app-safe-left,0px),var(--app-safe-right,0px))!important;
}

/* One compact institution edge and one title hierarchy on every primary destination. */
#today #appHeader,
#changes .appScreenHeader,
#breaks .appScreenHeader,
#chat .appScreenHeader{
  position:relative!important;
  top:auto!important;
  width:100%!important;
  margin:0!important;
  padding:calc(var(--app-safe-top,0px) + 8px) 2px 0!important;
  border:0!important;
  border-radius:0!important;
  background:transparent!important;
  box-shadow:none!important;
  -webkit-backdrop-filter:none!important;
  backdrop-filter:none!important;
}
#today .hospitalStrip,
#changes .primaryInstitution,
#breaks .primaryInstitution,
#chat .primaryInstitution{
  min-height:46px!important;
  display:flex!important;
  align-items:center!important;
  gap:8px!important;
  margin:0!important;
  padding:0 2px 8px!important;
  border-bottom:1px solid var(--unified-rule)!important;
  background:transparent!important;
}
#today .hospitalStrip img,
#changes .primaryInstitutionBrand img,
#breaks .primaryInstitutionBrand img,
#chat .primaryInstitutionBrand img{
  width:auto!important;
  max-width:118px!important;
  max-height:27px!important;
  object-fit:contain!important;
}
#today .hospitalStrip span,
#changes .primaryInstitutionBrand>span,
#breaks .primaryInstitutionBrand>span,
#chat .primaryInstitutionBrand>span{
  color:var(--liquid-secondary)!important;
  font-size:10px!important;
  font-weight:760!important;
  letter-spacing:.055em!important;
  text-transform:uppercase!important;
}
#today .head{min-height:0!important;padding:0!important;margin:0!important}
#today .headerTitle,#today .motto,#today .headerChips{display:none!important}
#today .headActions{position:absolute!important;top:calc(var(--app-safe-top,0px) + 10px)!important;right:2px!important;z-index:5!important}
#today .accountBtn,
#changes .primaryHeaderAccount,
#breaks .primaryHeaderAccount,
#chat .primaryHeaderAccount{
  width:40px!important;min-width:40px!important;height:40px!important;min-height:40px!important;
  padding:0!important;border:1px solid var(--unified-rule)!important;border-radius:50%!important;
  background:var(--unified-soft-surface)!important;box-shadow:none!important;
}
#today .nightSectionIdentity,
#changes .primaryScreenTitleRow,
#breaks .primaryScreenTitleRow,
#chat .primaryScreenTitleRow{
  min-height:0!important;margin:0!important;padding:15px 2px 11px!important;
}
#today .nightWelcomeEyebrow{
  margin:0 0 5px!important;color:var(--liquid-secondary)!important;font-size:10.5px!important;
  font-weight:800!important;letter-spacing:.07em!important;text-transform:uppercase!important;
}
#today .nightUnifiedHero .nightSectionIdentity h1,
#changes .primaryScreenTitleRow h1,
#breaks .primaryScreenTitleRow h1,
#chat .primaryScreenTitleRow h1{
  margin:0!important;color:var(--liquid-label)!important;font-size:clamp(29px,7.8vw,34px)!important;
  font-weight:820!important;line-height:1.01!important;letter-spacing:-.047em!important;
}
#today #nightWelcomeSubtitle{display:none!important}
#changes .primaryScreenTitleRow p,#breaks .primaryScreenTitleRow p,#chat .primaryScreenTitleRow p{
  margin:5px 0 0!important;color:var(--liquid-secondary)!important;font-size:12.5px!important;line-height:1.36!important;
}

/* The same selected-night object now looks and behaves the same on Night, Changes and Breaks. */
#today .nightDateShell,
#changes .changesDatePanel,
#breaks .breaksContextPanel{
  overflow:hidden!important;margin:0 0 12px!important;padding:8px!important;
  border:1px solid var(--unified-rule)!important;border-radius:var(--unified-radius-lg)!important;
  background:var(--unified-raised)!important;box-shadow:0 8px 24px rgba(0,0,0,.045)!important;
}
.nightTeamIdentityContext,
#today .nightTeamIdentityContext,
#changes .nightTeamIdentityContext,
#breaks .nightTeamIdentityContext{
  min-height:58px!important;display:grid!important;grid-template-columns:44px minmax(0,1fr)!important;
  align-items:center!important;gap:11px!important;margin:0!important;padding:7px 8px!important;
  border:0!important;border-radius:15px!important;background:color-mix(in srgb,var(--shift-identity-accent,var(--liquid-accent)) 6%,transparent)!important;
  box-shadow:none!important;
}
.nightTeamIdentityContext.hidden{display:none!important}
.nightTeamIdentityContext .shiftIdentityMark{
  width:44px!important;min-width:44px!important;height:44px!important;min-height:44px!important;
  border-radius:14px!important;overflow:hidden!important;
}
.nightTeamIdentityContext .shiftIdentityCopy strong{
  color:var(--liquid-label)!important;font-size:18px!important;font-weight:800!important;line-height:1.08!important;
  letter-spacing:-.025em!important;white-space:nowrap!important;text-overflow:ellipsis!important;overflow:hidden!important;
}
.nightTeamIdentityContext .shiftIdentityCopy small{
  margin-top:3px!important;color:var(--liquid-secondary)!important;font-size:11px!important;line-height:1.25!important;
  white-space:nowrap!important;text-overflow:ellipsis!important;overflow:hidden!important;
}
#today .dateNav.rosterDateControl,
#changes .nightContextPanel .dateNav.rosterDateControl,
#breaks .nightContextPanel .dateNav.rosterDateControl{
  position:relative!important;display:grid!important;grid-template-columns:38px minmax(0, 1fr) 38px!important;
  gap:4px!important;align-items:center!important;width:100%!important;min-width:0!important;min-height:48px!important;
  margin:7px 0 0!important;padding:3px!important;border:1px solid var(--unified-rule)!important;border-radius:15px!important;
  background:var(--liquid-surface)!important;box-shadow:none!important;
}
#today .dateNav.rosterDateControl::before,
#changes .nightContextPanel .dateNav.rosterDateControl::before,
#breaks .nightContextPanel .dateNav.rosterDateControl::before{
  content:attr(data-date-label);grid-column:2;grid-row:1;align-self:center;overflow:hidden;
  color:var(--liquid-label)!important;-webkit-text-fill-color:var(--liquid-label)!important;
  font-size:14px!important;font-weight:790!important;line-height:1.12!important;letter-spacing:-.02em!important;
  text-align:center!important;text-overflow:ellipsis!important;white-space:nowrap!important;pointer-events:none!important;
}
.rosterDateControl:has(.rosterDateText)::before{display:none!important}
#today .rosterDateText,
#changes .rosterDateText,
#breaks .rosterDateText,
.rosterDateText{
  z-index:2!important;grid-column:2!important;grid-row:1!important;display:flex!important;min-width:0!important;height:40px!important;
  align-items:center!important;justify-content:center!important;overflow:hidden!important;padding:0 6px!important;
  opacity:1!important;visibility:visible!important;color:var(--liquid-label)!important;-webkit-text-fill-color:var(--liquid-label)!important;
  font-size:14px!important;font-weight:790!important;line-height:1.12!important;letter-spacing:-.02em!important;
  text-align:center!important;text-overflow:ellipsis!important;white-space:nowrap!important;cursor:pointer!important;
}
#today .dateNav.rosterDateControl button,
#changes .nightContextPanel .dateNav.rosterDateControl button,
#breaks .nightContextPanel .dateNav.rosterDateControl button{
  width:38px!important;min-width:38px!important;height:38px!important;min-height:38px!important;
  margin:0!important;padding:0!important;border:0!important;border-radius:12px!important;background:transparent!important;
  color:var(--liquid-accent-strong)!important;font-size:22px!important;box-shadow:none!important;
}
#today .dateNav.rosterDateControl input[type="date"],
#changes .nightContextPanel .dateNav.rosterDateControl input[type="date"],
#breaks .nightContextPanel .dateNav.rosterDateControl input[type="date"]{
  position:absolute!important;width:1px!important;min-width:1px!important;height:1px!important;min-height:1px!important;
  opacity:0!important;color:transparent!important;-webkit-text-fill-color:transparent!important;appearance:none!important;-webkit-appearance:none!important;
  clip:rect(0 0 0 0)!important;clip-path:inset(50%)!important;white-space:nowrap!important;pointer-events:none!important;
}
#today .dateNav.rosterDateControl input[type="date"]::-webkit-datetime-edit,
#changes .nightContextPanel .dateNav.rosterDateControl input[type="date"]::-webkit-datetime-edit,
#breaks .nightContextPanel .dateNav.rosterDateControl input[type="date"]::-webkit-datetime-edit{
  overflow:hidden!important;width:1px!important;color:transparent!important;-webkit-text-fill-color:transparent!important;white-space:nowrap!important;
}
.dateResetBtn{min-height:30px!important;margin:4px 0 0!important;padding:4px 8px!important;color:var(--liquid-secondary)!important;font-size:10.5px!important;font-weight:700!important;white-space:nowrap!important}

/* Night is clearly the personal command surface, not another stack of dashboard cards. */
#today .nightContextCapsule,#today .nightSignalState{display:none!important}
#today .nightContextLine{
  min-height:32px!important;margin:0 1px 8px!important;padding:0 1px!important;display:flex!important;align-items:center!important;justify-content:space-between!important;
}
#today #personalNightCard>.personalHeroSurface{
  overflow:hidden!important;padding:16px!important;border:1px solid color-mix(in srgb,var(--liquid-accent) 16%,var(--unified-rule))!important;
  border-radius:var(--unified-radius-xl)!important;box-shadow:0 14px 34px rgba(0,0,0,.14)!important;
}
#today .personalAssignmentHeroCompact{min-height:68px!important;margin-bottom:10px!important}
#today .personalRoleIcon{width:50px!important;min-width:50px!important;height:50px!important;min-height:50px!important;border-radius:15px!important}
#today .personalRoleCopy b{font-size:clamp(24px,6.4vw,29px)!important;font-weight:820!important;letter-spacing:-.04em!important}
#today .personalHeroFactGrid{overflow:hidden!important;gap:0!important;border:1px solid rgba(255,255,255,.075)!important;border-radius:18px!important}
#today .personalHeroFact{min-height:86px!important;padding:12px!important;border-radius:0!important}
#today .nightSignalPrimary,#today .nightTeamDetails,#today .recentActivityPanel{
  border:1px solid var(--unified-rule)!important;border-radius:var(--unified-radius-lg)!important;background:var(--liquid-surface)!important;box-shadow:none!important;
}

/* Changes uses the same shell, then one calm numbered workflow and one grouped task surface. */
#changes .changePanel{margin:0!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important}
#changes .workflowSteps,#changes .changesWorkflowTabs{
  display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:4px!important;
  margin:0 0 14px!important;padding:4px!important;border:1px solid var(--unified-rule)!important;border-radius:17px!important;
  background:var(--unified-soft-surface)!important;box-shadow:none!important;
}
#changes .workflowSteps button,#changes .changesWorkflowTabs button{min-height:48px!important;border-radius:13px!important;box-shadow:none!important}
#changes .workflowGuidance{margin:0 0 12px!important;padding:12px 14px!important;border:1px solid var(--unified-rule)!important;border-radius:17px!important;background:var(--liquid-surface)!important;box-shadow:none!important}
#changes .staffingSection,#changes .confirmationCard,#changes .changesRecordGroup,#changes .changesAllocationGroup{
  margin:0!important;padding:14px!important;border:1px solid var(--unified-rule)!important;background:var(--liquid-surface)!important;box-shadow:none!important;
}
#changes .absenceSection{border-radius:22px 22px 0 0!important}
#changes .overtimeSection{border-top:0!important;border-radius:0 0 22px 22px!important}
#changes .staffingActionRow,#changes .allocationRow{min-height:64px!important}
#changes .continueWorkflowBtn{min-height:48px!important;margin-top:12px!important;border-radius:15px!important}

/* Breaks uses the same selected-night shell and the same grouped surface geometry. */
#breaks .personalBreakSummary{
  margin:0 0 12px!important;padding:16px!important;border:1px solid var(--unified-rule)!important;border-radius:var(--unified-radius-lg)!important;
  background:var(--liquid-surface)!important;box-shadow:none!important;
}
#breaks .personalBreakMain h2{font-size:clamp(27px,7vw,32px)!important;font-weight:820!important;letter-spacing:-.045em!important}
#breaks .breakSummaryRow{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:0!important;margin-top:12px!important;border-top:1px solid var(--unified-rule)!important}
#breaks .breakSummaryItem{padding:11px 8px 0!important;text-align:center!important}
#breaks .breakScheduleBoard{overflow:hidden!important;border:1px solid var(--unified-rule)!important;border-radius:var(--unified-radius-lg)!important;background:var(--liquid-surface)!important;box-shadow:none!important}
#breaks .breakScheduleSection{border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important}
#breaks .breakScheduleSection+.breakScheduleSection{border-top:1px solid var(--unified-rule)!important}
#breaks .breakNurseRow,#breaks .breakPerson{min-height:56px!important}

/* Chat now shares the same hierarchy and surface rhythm instead of reading as a separate app. */
#chat .chatRosterContext{
  margin:0 0 10px!important;padding:10px 12px!important;border:1px solid var(--unified-rule)!important;border-radius:17px!important;background:var(--unified-soft-surface)!important;box-shadow:none!important;
}
#chat .chatInboxTeamRow{
  min-height:88px!important;margin:0 0 14px!important;padding:13px 14px!important;border:1px solid color-mix(in srgb,var(--shift-identity-accent,var(--liquid-accent)) 20%,var(--unified-rule))!important;
  border-radius:var(--unified-radius-lg)!important;background:color-mix(in srgb,var(--shift-identity-accent,var(--liquid-accent)) 6%,var(--liquid-surface))!important;box-shadow:none!important;
}
#chat .chatConversationList{overflow:hidden!important;margin:0 0 16px!important;border:1px solid var(--unified-rule)!important;border-radius:var(--unified-radius-lg)!important;background:var(--liquid-surface)!important;box-shadow:none!important}
#chat .chatConversationRow,#chat .chatInboxRow{min-height:72px!important;padding:12px 14px!important}
#chat .chatConversationRow+.chatConversationRow,#chat .chatInboxRow+.chatInboxRow{border-top:1px solid var(--unified-rule)!important}
#chat .chatEssentials,#chat .chatSafetyPanel,#chat .chatSettingsPanel{border:1px solid var(--unified-rule)!important;border-radius:17px!important;background:var(--unified-soft-surface)!important;box-shadow:none!important;opacity:.9!important}
#chat .chatComposerGlass{border-radius:24px!important}

/* Actions and Account are part of the same product system, not floating legacy utilities. */
.quickActionsExperience{display:grid!important;gap:10px!important}
.quickActionsContextBar,.quickPrimaryAction,.quickReviewAction,.quickCompactAction{
  border:1px solid var(--unified-rule)!important;border-radius:18px!important;background:var(--liquid-surface)!important;box-shadow:none!important;
}
.quickActionsContextBar{background:var(--unified-soft-surface)!important}
.quickPrimaryAction,.quickCompactAction{min-height:66px!important}
.quickReviewAction{min-height:70px!important}
#accountSheet{border-color:var(--unified-rule)!important;background:var(--liquid-bg-alt)!important}
.accountSheetHeader{border-color:var(--unified-rule)!important;border-radius:var(--unified-radius-lg)!important;background:color-mix(in srgb,var(--liquid-surface) 92%,transparent)!important;box-shadow:none!important}
.accountHomeHub,.personalisationGroup,.accountGroup{border-color:var(--unified-rule)!important;border-radius:var(--unified-radius-lg)!important;box-shadow:none!important}
.accountHubList{overflow:hidden!important;border:1px solid var(--unified-rule)!important;border-radius:var(--unified-radius-lg)!important;background:var(--liquid-surface)!important}
.accountHubRow{min-height:64px!important;border-radius:0!important;background:transparent!important}
.accountHubRow+.accountHubRow{border-top:1px solid var(--unified-rule)!important}
.personalisationGroup,.accountGroup{padding:15px!important;background:var(--liquid-surface)!important}

/* Administrator utilities use the same grouped clinical surfaces without changing permissions or actions. */
#admin .panel,#admin .adminPanel,#admin .adminGroup,#admin .historyItem,#admin .contentSurface{
  border-color:var(--unified-rule)!important;border-radius:18px!important;background:var(--liquid-surface)!important;box-shadow:none!important;
}
#admin input,#admin select,#admin textarea{border-color:var(--unified-rule)!important;border-radius:13px!important;background:var(--unified-soft-surface)!important}

/* The update prompt is compact, legible and visually subordinate to the active task. */
#updateBanner{
  width:min(calc(100vw - 20px - var(--app-safe-left,0px) - var(--app-safe-right,0px)),620px)!important;
  padding:11px!important;border:1px solid var(--unified-rule)!important;border-radius:20px!important;
  background:color-mix(in srgb,var(--liquid-surface) 94%,transparent)!important;box-shadow:0 16px 42px rgba(0,0,0,.18)!important;
  -webkit-backdrop-filter:blur(22px) saturate(145%)!important;backdrop-filter:blur(22px) saturate(145%)!important;
}
#updateBanner .primary,#updateBanner button{min-height:44px!important;border-radius:14px!important}

/* One dock geometry and interaction weight everywhere. */
.bottom.reactTabs{
  width:min(calc(100vw - 16px - var(--app-safe-left,0px) - var(--app-safe-right,0px)),520px)!important;
  min-height:70px!important;padding:4px!important;border:1px solid var(--unified-rule)!important;border-radius:23px!important;
  background:color-mix(in srgb,var(--liquid-surface) 86%,transparent)!important;box-shadow:0 12px 34px rgba(0,0,0,.16)!important;
  -webkit-backdrop-filter:blur(24px) saturate(150%)!important;backdrop-filter:blur(24px) saturate(150%)!important;
}
.bottom.reactTabs button:not(.quickRudder){min-height:60px!important;border-radius:18px!important}
body[data-view] .bottom.reactTabs .tabSlidingIndicator{border:0!important;border-radius:18px!important;background:color-mix(in srgb,var(--liquid-accent) 10%,var(--liquid-surface))!important;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--liquid-accent) 18%,var(--unified-rule))!important}
.bottom.reactTabs .quickRudderDisc{width:42px!important;height:42px!important;border:1px solid color-mix(in srgb,var(--liquid-accent) 22%,var(--unified-rule))!important;border-radius:14px!important;background:color-mix(in srgb,var(--liquid-accent) 10%,var(--liquid-surface))!important;color:var(--liquid-accent-strong)!important;box-shadow:none!important}

:is(button,[role="button"],summary):focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,.rosterDateText:focus-visible{
  outline:3px solid color-mix(in srgb,var(--liquid-accent) 38%,transparent)!important;outline-offset:2px!important;
}

@media (max-width:430px){
  #today,#changes,#breaks,#chat,#roster{padding-inline:max(10px,var(--app-safe-left,0px),var(--app-safe-right,0px))!important}
  #today .hospitalStrip img,#changes .primaryInstitutionBrand img,#breaks .primaryInstitutionBrand img,#chat .primaryInstitutionBrand img{max-width:106px!important;max-height:24px!important}
  #today .nightDateShell,#changes .changesDatePanel,#breaks .breaksContextPanel{padding:7px!important}
  .nightTeamIdentityContext,#today .nightTeamIdentityContext,#changes .nightTeamIdentityContext,#breaks .nightTeamIdentityContext{min-height:54px!important;grid-template-columns:42px minmax(0,1fr)!important;padding:6px!important}
  .nightTeamIdentityContext .shiftIdentityMark{width:42px!important;min-width:42px!important;height:42px!important;min-height:42px!important}
  .nightTeamIdentityContext .shiftIdentityCopy strong{font-size:17px!important}
  #today .rosterDateText,#changes .rosterDateText,#breaks .rosterDateText,.rosterDateText{font-size:13.5px!important}
  #today #personalNightCard>.personalHeroSurface{padding:14px!important}
}
@media (max-width:390px){
  :root{--unified-gutter:10px}
  #today .nightUnifiedHero .nightSectionIdentity h1,#changes .primaryScreenTitleRow h1,#breaks .primaryScreenTitleRow h1,#chat .primaryScreenTitleRow h1{font-size:28px!important}
  #today .dateNav.rosterDateControl,#changes .nightContextPanel .dateNav.rosterDateControl,#breaks .nightContextPanel .dateNav.rosterDateControl{grid-template-columns:38px minmax(0, 1fr) 38px!important}
  #today .rosterDateText,#changes .rosterDateText,#breaks .rosterDateText,.rosterDateText{font-size:13px!important}
}
@media (prefers-reduced-transparency:reduce){
  .bottom.reactTabs,#updateBanner,.accountSheetHeader{background:var(--liquid-surface)!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important}
}
@media (prefers-reduced-motion:reduce){
  :is(button,[role="button"],summary),.bottom.reactTabs,.bottom.reactTabs *{transition:none!important;animation:none!important}
}
@media (prefers-contrast:more){
  #today .nightDateShell,#changes .changesDatePanel,#breaks .breaksContextPanel,#today #personalNightCard>.personalHeroSurface,
  #changes .staffingSection,#breaks .personalBreakSummary,#breaks .breakScheduleBoard,#chat .chatRosterContext,#chat .chatInboxTeamRow,
  #chat .chatConversationList,.quickActionsContextBar,.quickPrimaryAction,.quickReviewAction,.quickCompactAction,.personalisationGroup,.accountGroup{border-color:currentColor!important}
}
'''
    css_path.write_text(css)

test_path = Path('tests/product-layout-contract.test.js')
test = test_path.read_text()
test = test.replace("const coherentShell = fs.readFileSync('src/coherent-shell.ts', 'utf8');", "const coherentShell = fs.readFileSync('src/coherent-shell.ts', 'utf8');\nconst syncSource = fs.readFileSync('src/legacy-ui/sync.js', 'utf8');")
test = test.replace("document.documentElement.dataset.productShell = '50.3'", "document.documentElement.dataset.productShell = '50.4'")
test = test.replace("'50.3 product shell marker must identify the startup freeze repair'", "'50.4 product shell marker must identify the visible-date repair'")
test = test.replace("console.log('50.3 date-shell startup regression checks passed');", "assert.ok(css.includes('--liquid-text:var(--liquid-label)'), 'final product system must bridge the canonical visible text token');\nassert.ok(css.includes('-webkit-text-fill-color:var(--liquid-label)!important'), 'selected-night label must override transparent legacy WebKit text state');\nassert.ok(syncSource.includes(\"return'current'\"), 'same-version active controller must have an explicit current update state');\nassert.ok(syncSource.includes(\"waitingWorkerIsRedundant()\"), 'same-version waiting worker must be dismissed instead of trapping the update banner');\nconsole.log('50.4 date, update and unified-shell regression checks passed');")
test_path.write_text(test)
