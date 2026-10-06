from pathlib import Path

# 50.4 intentionally patches the checked-in source modules and the existing single
# product-wide CSS authority. It does not add another presentation layer.

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

apply_start = sync.index('function applyWaitingUpdate(){')
start = sync.index('  updateActivationTimer=setTimeout(async function(){', apply_start)
end_marker = '  },5000);'
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
before_count = css.count('!important')

# Repair the canonical text token used throughout the 50.x product authority. This is
# deliberately a token repair rather than another cascade override layer.
root_needle = ':root {\n  --unified-content-width: 720px;'
assert root_needle in css, 'unified root token block changed unexpectedly'
css = css.replace(root_needle, ':root {\n  --liquid-text: var(--liquid-label);\n  --unified-content-width: 720px;', 1)

# Make the existing shared system visibly more deliberate by tuning its core tokens.
css = css.replace('  --unified-radius-md: 16px;', '  --unified-radius-md: 17px;', 1)
css = css.replace('  --unified-radius-lg: 20px;', '  --unified-radius-lg: 22px;', 1)
css = css.replace('  --unified-border: color-mix(in srgb, var(--liquid-separator) 68%, transparent);', '  --unified-border: color-mix(in srgb, var(--liquid-separator) 76%, transparent);', 1)
css = css.replace('  --unified-soft: color-mix(in srgb, var(--liquid-secondary) 5%, var(--liquid-surface));', '  --unified-soft: color-mix(in srgb, var(--liquid-secondary) 6%, var(--liquid-surface));', 1)
css = css.replace('  --unified-soft-strong: color-mix(in srgb, var(--liquid-secondary) 8%, var(--liquid-surface));', '  --unified-soft-strong: color-mix(in srgb, var(--liquid-secondary) 10%, var(--liquid-surface));', 1)

# Strengthen the shared title hierarchy without creating a second header treatment.
old_title = """  font-size: clamp(28px, 7vw, 32px) !important;
  font-weight: 800 !important;
  line-height: 1.02 !important;
  letter-spacing: -.04em !important;"""
new_title = """  font-size: clamp(29px, 7.4vw, 34px) !important;
  font-weight: 820 !important;
  line-height: 1.01 !important;
  letter-spacing: -.045em !important;"""
assert old_title in css, 'shared title hierarchy changed unexpectedly'
css = css.replace(old_title, new_title, 1)

# The real-phone bug was not a missing date value. The product-owned span was inside a
# deliberately transparent legacy label wrapper, and its canonical text token could be
# unresolved. Give the owned span an explicit visible WebKit-safe paint state.
old_date_text = """  color: var(--liquid-text) !important;
  font-size: 13px !important;
  font-weight: 760 !important;
  line-height: 1.1 !important;
  letter-spacing: -.015em !important;"""
new_date_text = """  opacity: 1 !important;
  visibility: visible !important;
  color: var(--liquid-label) !important;
  -webkit-text-fill-color: var(--liquid-label) !important;
  font-size: 13.5px !important;
  font-weight: 780 !important;
  line-height: 1.1 !important;
  letter-spacing: -.018em !important;"""
assert old_date_text in css, 'roster date text rule changed unexpectedly'
css = css.replace(old_date_text, new_date_text, 1)

# Keep the same selected-night object across Night, Changes and Breaks, but make it read
# as one compound surface rather than two unrelated cards.
old_shell = """  margin: 0 0 12px !important;
  padding: 10px !important;
  border: 1px solid var(--unified-border) !important;
  border-radius: var(--unified-radius-lg) !important;
  background: var(--unified-surface) !important;
  box-shadow: none !important;"""
new_shell = """  margin: 0 0 12px !important;
  padding: 8px !important;
  border: 1px solid var(--unified-border) !important;
  border-radius: var(--unified-radius-lg) !important;
  background: var(--unified-soft-strong) !important;
  box-shadow: 0 8px 24px rgba(0,0,0,.045) !important;"""
assert old_shell in css, 'selected-night shell changed unexpectedly'
css = css.replace(old_shell, new_shell, 1)

# Shift identity is one compact shared row, with enough visual identity to be obvious
# without consuming the top half of a phone screen.
css = css.replace('  min-height: 48px !important;\n  grid-template-columns: 38px minmax(0, 1fr) !important;', '  min-height: 54px !important;\n  grid-template-columns: 42px minmax(0, 1fr) !important;', 1)
css = css.replace('  width: 38px !important;\n  min-width: 38px !important;\n  height: 38px !important;\n  min-height: 38px !important;\n  border-radius: 11px !important;', '  width: 42px !important;\n  min-width: 42px !important;\n  height: 42px !important;\n  min-height: 42px !important;\n  border-radius: 13px !important;', 1)
css = css.replace('  font-size: 15px !important;\n  font-weight: 780 !important;', '  font-size: 17px !important;\n  font-weight: 800 !important;', 1)

# Give the selected date a little more breathing room and keep the dock clearly part of
# the same geometry. These replace existing declarations, so they do not grow the
# override budget.
css = css.replace('  min-height: 42px !important;\n  align-items: center !important;', '  min-height: 46px !important;\n  align-items: center !important;', 1)
css = css.replace('  min-height: 68px !important;\n  padding: 4px !important;\n  border: 1px solid var(--unified-border) !important;\n  border-radius: 22px !important;', '  min-height: 70px !important;\n  padding: 4px !important;\n  border: 1px solid var(--unified-border) !important;\n  border-radius: 24px !important;', 1)

# A small final ownership pass covers the surfaces that previously sat outside the
# strongest shared selectors. It is intentionally compact so product-unified.css stays
# within its regression-enforced override budget.
marker = '/* 50.4 targeted real-device and product-coherence finish. */'
if marker not in css:
    css += r'''

/* 50.4 targeted real-device and product-coherence finish. */
#today #personalNightCard > .personalHeroSurface {
  border-radius: 26px !important;
}
#changes .staffingSection,
#breaks .personalBreakSummary,
#breaks .breakScheduleBoard,
#chat .chatRosterContext,
#chat .chatConversationList,
.quickActionsContextBar,
.quickPrimaryAction,
.quickReviewAction,
.quickCompactAction,
.accountSheetHeader,
.personalisationGroup,
.accountGroup {
  border-color: var(--unified-border) !important;
  box-shadow: none !important;
}
#chat .chatRosterContext,
.quickActionsContextBar {
  background: var(--unified-soft) !important;
}
#admin .panel,
#admin .adminPanel,
#admin .adminGroup,
#admin .historyItem,
#admin .contentSurface {
  border: 1px solid var(--unified-border) !important;
  border-radius: var(--unified-radius-md) !important;
  background: var(--unified-surface) !important;
  box-shadow: none !important;
}
#updateBanner {
  padding: 10px !important;
  border: 1px solid var(--unified-border) !important;
  border-radius: 20px !important;
  background: var(--unified-glass) !important;
}
'''

css_path.write_text(css)
after_count = css.count('!important')
print(f'product-unified.css !important budget: {before_count} -> {after_count}')
assert after_count <= 760, f'50.4 product override budget exceeded: {after_count}'

# Extend the existing deterministic contract instead of creating a one-off test file.
test_path = Path('tests/product-layout-contract.test.js')
test = test_path.read_text()
needle = "const coherentShell = fs.readFileSync('src/coherent-shell.ts', 'utf8');"
assert needle in test
test = test.replace(needle, needle + "\nconst syncSource = fs.readFileSync('src/legacy-ui/sync.js', 'utf8');", 1)
test = test.replace("document.documentElement.dataset.productShell = '50.3'", "document.documentElement.dataset.productShell = '50.4'", 1)
test = test.replace("'50.3 product shell marker must identify the startup freeze repair'", "'50.4 product shell marker must identify the visible-date repair'", 1)
log_line = "console.log('50.3 date-shell startup regression checks passed');"
assert log_line in test
test = test.replace(log_line, "assert.ok(css.includes('--liquid-text: var(--liquid-label)'), 'canonical unified text token must resolve to the visible product label token');\nassert.ok(css.includes('-webkit-text-fill-color: var(--liquid-label) !important'), 'selected-night label must explicitly paint visible text in WebKit');\nassert.ok(syncSource.includes(\"return'current'\"), 'same-version active controller must have an explicit current update state');\nassert.ok(syncSource.includes('waitingWorkerIsRedundant()'), 'same-version waiting worker must be dismissed instead of trapping the update banner');\nconsole.log('50.4 date, update and unified-shell regression checks passed');", 1)
test_path.write_text(test)
