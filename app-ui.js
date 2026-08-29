/* Anaesthetic Night Roster V34.1 interface, staffing, allocation and PWA features. */
var historyExpandedDates={};
var historyLoadedDates={};
var historyLoadingDates={};
var sharedLoadPromise=null;
var sharedReloadPending=false;
var reloadTimer=null;
var updateRegistration=null;
var reloadForUpdate=false;
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
var onboardingStep=0;
var onboardingCandidate=!localStorage.getItem('anaes_onboarding_complete_v34');
var releaseNotesQueued=false;
var pendingProfilePhoto=null;
var pendingProfilePhotoUrl='';
var profileSavedSignature='';

var RELEASE_HISTORY=[
  {version:'34.1',date:'29 Aug 2026',title:'A clearer roster, personal account and safer sign-in',changes:['Night, Changes and Breaks now use one consistent Apple-inspired interface with clearer typography, restrained translucent navigation, native-style motion and matching light and dark appearances.','An ordinary six-nurse night stays quiet: Pager automatically works the Labour Ward first part with second break, while Reliever automatically works the second part with first break.','Redundant calculated-plan and duplicate Labour Ward panels have been removed, while the agreed night-only role editor remains available whenever people need to swap roles.','The account button now opens a personal sheet containing an editable preferred name, role, roster highlight, profile photo, appearance settings, installation help and the option to replay the introduction.','Saved photographs, preferred names and role titles now personalise Your night, while the Save profile button appears only after something has actually changed.','Profile photographs are resized on the device and stored privately, while shared roster history continues to use each person’s protected approved-account identity.','Recent absence, overtime and agreed night-only role changes now offer a temporary Undo action that reverses the shared change.','Supported devices can use an optional passkey with fingerprint, face recognition, device PIN or a security key, while password sign-in and password recovery remain available.','The introduction now explains passkey privacy clearly and allows a signed-in user to set one up without suggesting that Night Roster receives or stores biometric information.','Sign in, account creation, onboarding, controls, dialogs and wording have been refined as one coherent mobile experience.','All existing roster calculations, staffing rules, navigation, live data, automatic Labour Ward logic and absence and overtime workflows remain preserved.']},
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

function saveOfflineSnapshot(){
  try{localStorage.setItem('anaes_offline_snapshot',JSON.stringify({saved_at:lastSuccessfulSyncAt||new Date().toISOString(),nightChanges:nightChanges,nightOvertime:nightOvertime,fiveCoverChoices:fiveCoverChoices,rosterSettings:rosterSettings,rotationVersions:rotationVersions,labourOrders:labourOrders,nightRoleOverrides:nightRoleOverrides,nightPlanStatuses:nightPlanStatuses,appSettings:appSettings,schemaVersion:schemaVersion}))}catch(error){}
}

function restoreOfflineSnapshot(){
  try{
    var snapshot=JSON.parse(localStorage.getItem('anaes_offline_snapshot')||'null');if(!snapshot||!snapshot.rotationVersions||!snapshot.rosterSettings)return false;
    nightChanges=snapshot.nightChanges||{};nightOvertime=snapshot.nightOvertime||{};fiveCoverChoices=snapshot.fiveCoverChoices||{};rosterSettings=snapshot.rosterSettings;rotationVersions=snapshot.rotationVersions;labourOrders=snapshot.labourOrders||{};nightRoleOverrides=snapshot.nightRoleOverrides||{};nightPlanStatuses=snapshot.nightPlanStatuses||{};appSettings=snapshot.appSettings||appSettings;EMAIL_RECIPIENTS=appSettings.email_recipients||EMAIL_RECIPIENTS;schemaVersion=snapshot.schemaVersion||0;lastSuccessfulSyncAt=snapshot.saved_at||null;rebuildCalculatedRoster();idx=startingIndex();automaticSelectedDate=R[idx]&&R[idx].date;initialNightChosen=true;setSync('offline','Offline · saved '+(lastSuccessfulSyncAt?shortTime(lastSuccessfulSyncAt):'previously'));render();return true;
  }catch(error){return false}
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
  try{var result=await supa.auth.signInWithPasskey();if(result.error)throw result.error;if(result.data&&result.data.user)await authorizeUser(result.data.user)}
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
  var rosterName=myName();byId('profileRosterName').innerHTML='<option value="">Do not highlight a name</option>'+TEAM.map(function(item){return'<option value="'+esc(item)+'"'+(sameNurse(item,rosterName)?' selected':'')+'>'+esc(item)+'</option>'}).join('');byId('profilePhotoInitial').textContent=(name||'?').charAt(0).toUpperCase();byId('accountVersion').textContent='Night Roster '+APP_VERSION+' · Database '+(schemaVersion||'legacy');profileSavedSignature=profileDraftSignature();showProfileMessage(profileFeatureAvailable?'':'Ask the administrator to run the V32 profile upgrade before saving your profile.','error');updateProfileSaveState();updateAppearanceButtons();applyProfileIdentity();
}

async function showAccountSheet(){var dialog=byId('accountSheet');populateAccountSheet();if(dialog&&dialog.showModal&&!dialog.open){dialog.showModal();await loadPasskeys()}}

function photoBlob(file){
  return new Promise(function(resolve,reject){if(!file||!/^image\/(jpeg|png|webp)$/i.test(file.type)||file.size>8*1024*1024){reject(new Error('Choose a JPEG, PNG or WebP photo smaller than 8 MB.'));return}var image=new Image(),url=URL.createObjectURL(file);image.onload=function(){var size=Math.min(image.naturalWidth,image.naturalHeight),left=(image.naturalWidth-size)/2,top=(image.naturalHeight-size)/2,canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;canvas.getContext('2d').drawImage(image,left,top,size,size,0,0,512,512);URL.revokeObjectURL(url);canvas.toBlob(function(blob){blob?resolve(blob):reject(new Error('The photo could not be prepared.'))},'image/jpeg',.86)};image.onerror=function(){URL.revokeObjectURL(url);reject(new Error('The selected photo could not be opened.'))};image.src=url})
}

async function chooseProfilePhoto(file){try{pendingProfilePhoto=await photoBlob(file);if(pendingProfilePhotoUrl)URL.revokeObjectURL(pendingProfilePhotoUrl);pendingProfilePhotoUrl=URL.createObjectURL(pendingProfilePhoto);applyProfileIdentity();updateProfileSaveState();showProfileMessage('Photo ready to save.','success')}catch(error){showProfileMessage(error.message,'error')}}

async function saveProfile(){
  if(!requireOnline())return;if(!profileFeatureAvailable){showProfileMessage('Run the V32 profile database upgrade first.','error');return}var button=byId('saveProfileBtn'),name=byId('profileName').value.trim(),title=byId('profileJobTitle').value.trim(),rosterName=byId('profileRosterName').value,path=currentPrivateProfile&&currentPrivateProfile.avatar_path||null;button.disabled=true;button.textContent='Saving…';showProfileMessage('Saving your profile…','');
  try{if(pendingProfilePhoto){path=currentUser.id+'/avatar.jpg';var uploaded=await supa.storage.from('profile-photos').upload(path,pendingProfilePhoto,{contentType:'image/jpeg',upsert:true,cacheControl:'3600'});if(uploaded.error)throw uploaded.error}var result=await supa.from('user_profiles').upsert({user_id:currentUser.id,profile_name:name||null,job_title:title||null,avatar_path:path,updated_at:new Date().toISOString()},{onConflict:'user_id'}).select().single();if(result.error)throw result.error;currentPrivateProfile=result.data;pendingProfilePhoto=null;if(pendingProfilePhotoUrl)URL.revokeObjectURL(pendingProfilePhotoUrl);pendingProfilePhotoUrl='';if(rosterName)localStorage.setItem('anaes_my_name',rosterName);else localStorage.removeItem('anaes_my_name');profileSavedSignature=profileDraftSignature();await refreshProfileAvatar();render();updateProfileSaveState();showProfileMessage('Your profile has been saved.','success');toast('Profile saved')}
  catch(error){showProfileMessage('Your profile could not be saved. '+(error.message||'Please try again.'),'error')}
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

function renderReleaseNotes(){
  var dialog=byId('releaseNotes');if(!dialog)return;var latest=RELEASE_HISTORY[0];dialog.classList.add('releaseDialog');
  var intro=dialog.querySelector('.dialogHead .time');if(intro)intro.textContent='Version '+latest.version+' is ready · Full history below';
  var oldList=dialog.querySelector('ul'),history=dialog.querySelector('.releaseHistory');if(!history){history=document.createElement('div');history.className='releaseHistory';history.setAttribute('tabindex','0');history.setAttribute('aria-label','App release history');if(oldList)oldList.replaceWith(history);else dialog.appendChild(history)}
  history.innerHTML=RELEASE_HISTORY.map(function(entry,index){return'<section class="releaseEntry '+(index===0?'latest':'')+'"><div class="releaseVersion"><div><span>Version '+esc(entry.version)+'</span><h3>'+esc(entry.title)+'</h3></div><time>'+esc(entry.date)+'</time></div><ul>'+entry.changes.map(function(change){return'<li>'+esc(change)+'</li>'}).join('')+'</ul></section>'}).join('');history.scrollTop=0;
}

function onboardingPages(){
  var profileName=currentUserProfile&&currentUserProfile.display_name||'',selected=myName()||TEAM.find(function(name){return sameNurse(name,profileName)})||'',passkeyAction=passkeySupported()?'<button type="button" class="soft onboardingPasskeyButton" id="onboardingPasskeyBtn">Set up a passkey now</button><div id="onboardingPasskeyMessage" class="onboardingPasskeyMessage" role="status" aria-live="polite"></div>':'<div class="onboardingCallout"><b>Password sign-in remains available</b><span>This browser does not currently offer passkey setup.</span></div>';
  return[
    '<div class="onboardingVisual welcomeVisual" aria-hidden="true"><span class="onboardingMoon">'+interfaceIcon('first')+'</span></div><span class="onboardingEyebrow">Welcome</span><h2 id="onboardingTitle">Your night comes first.</h2><p>Night Roster opens with your own allocation, followed by the live staffing picture for the whole team.</p><div class="onboardingCallout"><b>One shared roster</b><span>Updates appear across authorised devices.</span></div>',
    '<div class="onboardingVisual workflowVisual" aria-hidden="true"><span>'+interfaceIcon('staffing')+'</span><i></i><span>'+interfaceIcon('overtime')+'</span><i></i><span>'+interfaceIcon('task')+'</span></div><span class="onboardingEyebrow">When plans change</span><h2 id="onboardingTitle">Only act when needed.</h2><p>The normal six-person plan is automatic. Open Changes only for an absence, confirmed overtime, an unresolved allocation or an agreed night-only role swap.</p><div class="onboardingFeatureList"><div><b>Night</b><span>Your allocation and the team plan</span></div><div><b>Changes</b><span>Staffing and agreed exceptions</span></div><div><b>Breaks</b><span>The live break arrangement</span></div></div>',
    '<div class="onboardingVisual passkeyVisual" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="8" cy="12" r="4"></circle><path d="M12 12h9M17 12v3M20 12v2"></path></svg></div><span class="onboardingEyebrow">Optional faster sign-in</span><h2 id="onboardingTitle">Your fingerprint or face stays private.</h2><p>A passkey lets your phone confirm it is you using its normal fingerprint, face recognition or device PIN. Night Roster never receives or stores your biometric information, and your password will still work.</p><div class="onboardingPrivacy"><b>Nothing biometric is uploaded</b><span>Your device approves sign-in without telling Night Roster how you unlocked it.</span></div>'+passkeyAction,
    '<div class="onboardingVisual identityVisual" aria-hidden="true"><span>'+(selected?esc(selected.charAt(0).toUpperCase()):'?')+'</span></div><span class="onboardingEyebrow">Personalise Night</span><h2 id="onboardingTitle">Which nurse are you?</h2><p>Choose your name so your own allocation is highlighted whenever the app opens.</p><label class="onboardingNameLabel"><span>Your name</span><select id="onboardingNamePick"><option value="">Choose your name</option>'+TEAM.map(function(name){return'<option value="'+esc(name)+'" '+(sameNurse(name,selected)?'selected':'')+'>'+esc(name)+'</option>'}).join('')+'</select></label><p class="onboardingFootnote">You can change this later from your account.</p>'
  ];
}

function renderOnboarding(){
  var dialog=byId('onboardingDialog'),content=byId('onboardingContent'),pages=onboardingPages();if(!dialog||!content)return;
  onboardingStep=Math.max(0,Math.min(pages.length-1,onboardingStep));content.innerHTML=pages[onboardingStep];content.classList.remove('onboardingContentIn');void content.offsetWidth;content.classList.add('onboardingContentIn');
  byId('onboardingProgress').innerHTML=pages.map(function(_,index){return'<span class="'+(index===onboardingStep?'active':'')+'" aria-hidden="true"></span>'}).join('');
  byId('onboardingBackBtn').classList.toggle('hidden',onboardingStep===0);byId('onboardingNextBtn').textContent=onboardingStep===pages.length-1?'Open my night':'Continue';byId('onboardingSkipBtn').classList.toggle('hidden',onboardingStep===pages.length-1);
  var select=byId('onboardingNamePick');if(select)select.onchange=function(){var visual=document.querySelector('.identityVisual span');if(visual)visual.textContent=select.value?select.value.charAt(0).toUpperCase():'?'};
  var passkeyButton=byId('onboardingPasskeyBtn');if(passkeyButton)passkeyButton.onclick=addOnboardingPasskey;
}

async function addOnboardingPasskey(){var button=byId('onboardingPasskeyBtn'),message=byId('onboardingPasskeyMessage');if(!button||!message)return;button.disabled=true;button.textContent='Follow your phone’s instructions…';message.textContent='Your device will handle the secure identity check.';try{var result=await supa.auth.registerPasskey();if(result.error)throw result.error;if(result.data&&result.data.id)await supa.auth.passkey.update({passkeyId:result.data.id,friendlyName:'Night Roster on '+(navigator.platform||'this device')});button.textContent='Passkey added';message.textContent='You can use it next time, while your password remains available.';toast('Passkey added')}catch(error){button.disabled=false;button.textContent='Set up a passkey now';message.textContent=/cancel|not allowed/i.test(error.message||'')?'Setup was cancelled. You can continue and add it later from your account.':/disabled|not enabled/i.test(error.message||'')?'Passkeys are not enabled for this roster yet. Continue using your password for now.':'The passkey could not be added. You can continue using your password.'}}

function finishOnboarding(){
  var select=byId('onboardingNamePick');if(select&&select.value)localStorage.setItem('anaes_my_name',select.value);localStorage.setItem('anaes_onboarding_complete_v34','1');onboardingCandidate=false;var dialog=byId('onboardingDialog');if(dialog&&dialog.open)dialog.close();render();toast('Your night is ready');
}

function showOnboardingIfNeeded(){
  if(!currentUserProfile||releaseNotesQueued||!onboardingCandidate||localStorage.getItem('anaes_onboarding_complete_v34'))return;var dialog=byId('onboardingDialog');if(!dialog||!dialog.showModal)return;onboardingStep=0;renderOnboarding();setTimeout(function(){if(!dialog.open)dialog.showModal()},350);
}

function bindOnboarding(){
  var next=byId('onboardingNextBtn'),back=byId('onboardingBackBtn'),skip=byId('onboardingSkipBtn');if(!next||!back||!skip)return;
  next.onclick=function(){var last=onboardingPages().length-1;if(onboardingStep<last){onboardingStep++;renderOnboarding()}else finishOnboarding()};back.onclick=function(){if(onboardingStep>0){onboardingStep--;renderOnboarding()}};skip.onclick=finishOnboarding;
}

function diagnosticsText(){
  var backupAt=localStorage.getItem('anaes_last_backup_at');return['App version: '+APP_VERSION,'Database schema: '+(schemaVersion||'legacy'),'Connection: '+(navigator.onLine?'online':'offline'),'Last successful refresh: '+(lastSuccessfulSyncAt?new Date(lastSuccessfulSyncAt).toLocaleString('en-GB'):'not yet'),'Last administrator backup: '+(backupAt?new Date(backupAt).toLocaleString('en-GB'):'not recorded on this device'),'Published roster until: '+(rosterSettings.published_until||'unknown'),'Calculated nights: '+R.length,'Current account: '+(currentUserProfile?currentUserProfile.email:'not signed in'),'Service worker: '+('serviceWorker' in navigator?'supported':'not supported')].join('\n');
}

function renderDiagnostics(){var el=byId('appDiagnostics');if(!el)return;var backupAt=localStorage.getItem('anaes_last_backup_at'),schemaState=schemaVersion>=EXPECTED_SCHEMA_VERSION?'Current':'Upgrade required';el.innerHTML='<div class="historyItem"><b>App '+esc(APP_VERSION)+'</b><div class="changeMeta">Database schema '+esc(schemaVersion||'legacy')+' · '+esc(schemaState)+' · '+(navigator.onLine?'Online':'Offline')+'</div></div><div class="historyItem"><b>Last successful refresh</b><div class="changeMeta">'+esc(lastSuccessfulSyncAt?new Date(lastSuccessfulSyncAt).toLocaleString('en-GB'):'Not yet available')+'</div></div><div class="historyItem"><b>Last backup on this device</b><div class="changeMeta">'+esc(backupAt?new Date(backupAt).toLocaleString('en-GB'):'Not recorded')+'</div></div><button type="button" class="soft wide" id="copyDiagnosticsBtn">Copy diagnostic report</button>';var button=byId('copyDiagnosticsBtn');if(button)button.onclick=async function(){try{await navigator.clipboard.writeText(diagnosticsText());toast('Diagnostic report copied')}catch(error){toast('Diagnostic report could not be copied')}}}

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
  var today=byId('today'),changes=byId('changes'),roster=byId('roster'),changePanel=today&&today.querySelector('.changePanel'),allocation=changePanel&&changePanel.querySelector('.allocationSection'),action=today&&today.querySelector('.actionPanel'),nav=document.querySelector('.bottom');
  if(!today||!changes||!roster||!changePanel||!allocation||!action||!nav)return;
  var selectedPanel=today.querySelector('.panel'),myNameLabel=selectedPanel&&selectedPanel.querySelector('.myNameLabel'),shortcutRow=document.createElement('div'),statusRow=document.createElement('div'),dateGrid=selectedPanel&&selectedPanel.querySelector('.grid2'),alerts=byId('alerts'),roles=byId('roles'),fiveArrangement=byId('fiveArrangement');
  document.body.setAttribute('data-view','today');selectedPanel.classList.add('nightOverviewPanel');selectedPanel.querySelector('h2').classList.add('srOnly');
  if(dateGrid){var dateShell=document.createElement('div');dateShell.className='nightDateShell';selectedPanel.insertBefore(dateShell,dateGrid);dateShell.appendChild(dateGrid);var dateLabel=dateGrid.querySelector('label');if(dateLabel)dateLabel.classList.add('nightDateLabel')}
  var personal=document.createElement('section');personal.id='personalNight';personal.className='personalNight';personal.setAttribute('aria-labelledby','personalNightHeading');personal.innerHTML='<h2 id="personalNightHeading" class="sectionTitle">Your night</h2><div id="personalNightCard" class="personalNightCard"></div><div id="personalAllocationNotice"></div><div id="personalNamePicker" class="personalNamePicker hidden"><button type="button" class="mini" id="closeNamePickerBtn">Done</button></div>';
  if(dateGrid)dateGrid.parentNode.insertAdjacentElement('afterend',personal);else selectedPanel.insertBefore(personal,selectedPanel.firstChild);
  if(myNameLabel){myNameLabel.firstChild.nodeValue='Choose your name';personal.querySelector('#personalNamePicker').insertBefore(myNameLabel,personal.querySelector('#closeNamePickerBtn'))}
  var summaryTitle=document.createElement('div');summaryTitle.className='sectionHeadingRow nightSummaryTitle';summaryTitle.innerHTML='<h2 class="sectionTitle">Night summary</h2><span>Open any item</span>';statusRow.id='nightStatusRow';statusRow.className='nightStatusRow';personal.insertAdjacentElement('afterend',summaryTitle);summaryTitle.insertAdjacentElement('afterend',statusRow);
  var situationTitle=document.createElement('div');situationTitle.className='sectionHeadingRow';situationTitle.innerHTML='<h2 class="sectionTitle">Night situation</h2><span class="inlineLive"><i></i>Live</span>';if(roles)selectedPanel.insertBefore(situationTitle,roles);
  shortcutRow.className='rosterShortcutRow';shortcutRow.innerHTML='<button type="button" class="rosterShortcutBtn" id="viewRosterBtn"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="14" height="17" rx="2"></rect><path d="M9 4V2h6v2M8 9h8M8 13h8M8 17h5"></path></svg><span>View full roster</span><b aria-hidden="true">›</b></button><button type="button" class="rosterShortcutBtn smartNightBtn" id="smartNightBtn"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 9 9"></path><path d="M12 7v5l3 2M17 3h4v4"></path></svg><span>Return to roster night</span></button>';if(fiveArrangement)fiveArrangement.insertAdjacentElement('afterend',shortcutRow);
  changes.innerHTML='<div class="panel changesDatePanel"><h2>Selected night</h2><div class="grid2"><label>Night<div class="dateNav"><button type="button" id="changesPrevNightBtn" aria-label="Previous roster night">‹</button><input id="changesDatePick" type="date" aria-label="Choose a date to manage staffing changes"><button type="button" id="changesNextNightBtn" aria-label="Next roster night">›</button></div><button type="button" class="dateResetBtn" id="changesSmartNightBtn">Open current / next night</button></label><div class="staffingCount" aria-live="polite"><span>Staffing</span><strong id="changesModeStatus">6 nurses</strong><small>Linked across the app</small></div></div></div>';
  var changesHeader=document.createElement('div');changesHeader.className='screenHeader changesScreenHeader';changesHeader.innerHTML='<div><span class="screenEyebrow">Anaesthetic Night Roster</span><h1>Staffing changes</h1><p><i></i><span id="changesHeaderLive">Live and up to date</span></p></div><button type="button" class="screenInfoButton" aria-label="Staffing changes information">i</button>';changes.insertBefore(changesHeader,changes.firstChild);
  changePanel.querySelector('h2').textContent='Staffing changes';changePanel.querySelector('.ctop .time').textContent='Record staffing changes first, then resolve only the decisions that remain';
  changes.appendChild(changePanel);
  var absence=changePanel.querySelector('.absenceSection'),overtime=changePanel.querySelector('.overtimeSection'),history=changePanel.querySelector('.historyBox'),ctop=changePanel.querySelector('.ctop');
  var workflowNav=document.createElement('div');workflowNav.className='changesWorkflowTabs';workflowNav.setAttribute('role','tablist');workflowNav.innerHTML='<button type="button" class="active" data-changes-step="staffing" role="tab" aria-selected="true"><span>1</span><b>Staffing</b><small id="staffingStepState">Record people</small></button><button type="button" data-changes-step="allocation" role="tab" aria-selected="false"><span>2</span><b>Allocation</b><small id="allocationStepState">Review roles</small></button><button type="button" data-changes-step="confirm" role="tab" aria-selected="false"><span>3</span><b>Confirm</b><small id="confirmStepState">Review plan</small></button>';
  var workflowState=document.createElement('div');workflowState.id='changesWorkflowState';workflowState.className='changesWorkflowState';
  var staffingPane=document.createElement('div');staffingPane.id='changesStaffingPane';staffingPane.className='changesStepPane';
  var allocationPane=document.createElement('div');allocationPane.id='changesAllocationPane';allocationPane.className='changesStepPane hidden';
  var confirmPane=document.createElement('div');confirmPane.id='changesConfirmPane';confirmPane.className='changesStepPane hidden';
  var continueButton=document.createElement('button');continueButton.type='button';continueButton.id='continueToAllocationBtn';continueButton.className='primary wide continueWorkflowBtn';continueButton.textContent='Continue to allocation';
  var confirmButton=document.createElement('button');confirmButton.type='button';confirmButton.id='continueToConfirmBtn';confirmButton.className='primary wide continueWorkflowBtn';confirmButton.textContent='Review changes';
  var fixedBox=document.createElement('details');fixedBox.className='fixedAllocationBox';fixedBox.innerHTML='<summary id="fixedAllocationSummary">Already allocated roles</summary><div id="fixedAllocationList"></div>';
  ctop.insertAdjacentElement('afterend',workflowNav);workflowNav.insertAdjacentElement('afterend',workflowState);workflowState.insertAdjacentElement('afterend',staffingPane);staffingPane.insertAdjacentElement('afterend',allocationPane);allocationPane.insertAdjacentElement('afterend',confirmPane);
  staffingPane.appendChild(absence);staffingPane.appendChild(overtime);staffingPane.appendChild(continueButton);if(history)staffingPane.appendChild(history);
  var roleOverride=document.createElement('div');roleOverride.id='nightRoleOverrideStep';roleOverride.className='nightRoleOverrideStep';allocationPane.appendChild(roleOverride);allocationPane.appendChild(fixedBox);allocationPane.appendChild(allocation);allocationPane.appendChild(confirmButton);confirmPane.innerHTML='<div class="confirmationCard"><div class="stepHeader"><span>3</span><h3>Confirm tonight’s changes</h3></div><div class="time">Check the changed names and roles before sharing them with everyone.</div><div id="confirmationPreview" class="confirmationPreview"></div></div>';
  var saveButton=byId('saveAllocationsBtn'),allocationMessage=byId('allocationFormMessage');confirmPane.querySelector('.confirmationCard').appendChild(saveButton);confirmPane.querySelector('.confirmationCard').appendChild(allocationMessage);confirmPane.insertAdjacentHTML('beforeend','<div class="confirmHint">Night and Breaks update together after the plan is confirmed.</div>');
  var rosterButton=nav.querySelector('[data-v="roster"]'),changesButton=document.createElement('button');changesButton.type='button';changesButton.setAttribute('data-v','changes');changesButton.setAttribute('aria-label','Staffing changes');changesButton.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h11"></path><path d="m13 4 3 3-3 3"></path><path d="M19 17H8"></path><path d="m11 14-3 3 3 3"></path><circle cx="5" cy="17" r="1.5"></circle><circle cx="19" cy="7" r="1.5"></circle></svg><span>Changes</span><em id="changesTaskBadge" class="navTaskBadge hidden">0</em>';
  nav.insertBefore(changesButton,rosterButton);rosterButton.remove();nav.style.gridTemplateColumns='repeat(3,1fr)';nav.querySelector('[data-v="today"]').style.gridColumn='1';changesButton.style.gridColumn='2';nav.querySelector('[data-v="breaks"]').style.gridColumn='3';
  nav.querySelector('[data-v="today"]').innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z"></path><path d="M15.5 7.5h5M18 5v5"></path></svg><span>Night</span>';
  nav.querySelector('[data-v="breaks"]').innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9h12v5a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5Z"></path><path d="M17 11h2a2 2 0 0 1 0 4h-2"></path><path d="M8 6c0-1 1-1 1-2M12 6c0-1 1-1 1-2"></path></svg><span>Breaks</span>';
  var rosterHeader=document.createElement('div');rosterHeader.className='rosterPageHeader';rosterHeader.innerHTML='<h2>Full roster</h2><button type="button" class="mini" id="closeRosterBtn">Back to Night</button>';roster.insertBefore(rosterHeader,roster.firstChild);
  var breaks=byId('breaks'),breakPanel=breaks&&breaks.querySelector('.panel'),breakGrid=breakPanel&&breakPanel.querySelector('.grid2');if(breaks&&breakPanel){var breaksHeader=document.createElement('div');breaksHeader.className='screenHeader breaksScreenHeader';breaksHeader.innerHTML='<div><span class="screenEyebrow">Anaesthetic Night Roster</span><h1>Breaks</h1><p><i></i>Linked to the selected night</p></div><button type="button" class="screenInfoButton" aria-label="Break plan information">i</button>';breaks.insertBefore(breaksHeader,breakPanel);breakPanel.querySelector('h2').textContent='Night summary';var breakSummary=document.createElement('div');breakSummary.id='breakSummaryRow';breakSummary.className='breakSummaryRow';if(breakGrid)breakGrid.insertAdjacentElement('afterend',breakSummary);var breakPlanTitle=document.createElement('div');breakPlanTitle.className='breakPlanTitle';breakPlanTitle.innerHTML='<h2>Break plan</h2><span id="breakPlanLive"><i></i>Live</span>';byId('breakDate').insertAdjacentElement('afterend',breakPlanTitle)}
  var dataPanel=document.querySelector('#adminData .panel');
  if(dataPanel&&!byId('appDiagnostics'))dataPanel.insertAdjacentHTML('beforeend','<details class="advancedBox"><summary>App health and diagnostics</summary><div id="appDiagnostics"></div></details>');
  ['datePick','changesDatePick','breakDatePick'].forEach(enhanceDatePicker);byId('overtimeName').setAttribute('list','overtimeSuggestions');var suggestions=document.createElement('datalist');suggestions.id='overtimeSuggestions';byId('overtimeName').insertAdjacentElement('afterend',suggestions);
  byId('viewRosterBtn').onclick=function(){show('roster')};byId('closeRosterBtn').onclick=function(){show('today')};byId('smartNightBtn').onclick=goToAutomaticNight;byId('changesSmartNightBtn').onclick=goToAutomaticNight;byId('closeNamePickerBtn').onclick=function(){byId('personalNamePicker').classList.add('hidden')};continueButton.onclick=function(){setChangesStep('allocation',true)};confirmButton.onclick=function(){setChangesStep('confirm',true)};changesHeader.querySelector('.screenInfoButton').onclick=function(){toast('Use Changes for absences, overtime or an agreed role swap.')};if(breaksHeader)breaksHeader.querySelector('.screenInfoButton').onclick=function(){toast('Breaks update automatically when staffing or roles change.')};Array.prototype.forEach.call(document.querySelectorAll('[data-changes-step]'),function(button){button.onclick=function(){setChangesStep(button.getAttribute('data-changes-step'),true)}});renderReleaseNotes();changesViewPrepared=true;renderDiagnostics();
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
  var unresolved=plan.availableKeys.filter(function(key){return!selectedAllocationId(base,key)}),preview=allocationPreview(base),draftOrder=labourOrderDrafts[base.date],labourPending=preview.mode!=='5'&&!plan.requiresCoverageChoice&&!plan.requiresSeventhDecision&&!unresolved.length&&!labourOrderFor(preview)&&!(draftOrder&&draftOrder.first&&draftOrder.second);
  return(plan.requiresCoverageChoice?1:0)+(plan.requiresSeventhDecision?1:0)+unresolved.length+(labourPending?1:0);
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
  if(r.mode==='7'&&!plan.requiresSeventhDecision&&plan.availableKeys.indexOf('seventh')<0)rows.push(['7th nurse',r.seventh]);
  return rows.filter(function(row){return row[1]&&String(row[1]).indexOf('allocation to decide')<0}).map(function(row){return'<div class="fixedRoleRow"><span>'+esc(row[0])+'</span><b>'+esc(row[1])+'</b></div>'}).join('');
}

function updateChangesWorkflow(base,plan){
  if(!changesViewPrepared)return;
  var r=applyChanges(base),tasks=workflowTaskCount(base,plan,r),confirmNeeded=workflowNeedsConfirmation(base,tasks),hasManualPlan=workflowHasManualPlan(base),changes=changesFor(base.date),overtime=overtimeFor(base.date),staffingState=byId('staffingStepState'),allocationState=byId('allocationStepState'),confirmState=byId('confirmStepState'),state=byId('changesWorkflowState'),badge=byId('changesTaskBadge');
  staffingState.textContent=changes.length||overtime.length?changes.length+' absent · '+overtime.length+' overtime':'No changes';
  var published=nightPlanStatuses[base.date];allocationState.textContent=tasks?tasks+' task'+(tasks===1?'':'s')+' remaining':'Current roles';confirmState.textContent=tasks?'Resolve tasks':confirmNeeded?'Review changes':published&&published.published_at&&hasManualPlan?'Shared':'Not needed';
  var staffingTab=document.querySelector('[data-changes-step="staffing"]'),allocationTab=document.querySelector('[data-changes-step="allocation"]'),confirmTab=document.querySelector('[data-changes-step="confirm"]');staffingTab.classList.add('complete');allocationTab.classList.toggle('complete',!tasks);allocationTab.classList.toggle('hasTasks',!!tasks);confirmTab.classList.toggle('complete',!confirmNeeded);confirmTab.classList.toggle('hasTasks',!!confirmNeeded);
  state.innerHTML=tasks?'<b>'+tasks+' decision'+(tasks===1?' remains':'s remain')+'</b><span>Resolve the highlighted '+(tasks===1?'item':'items')+', then review the changes.</span>':confirmNeeded?'<b>Ready to review</b><span>Check tonight’s changes before sharing them with everyone.</span>':published&&published.published_at&&hasManualPlan?'<b>Changes shared</b><span>Updated by '+esc(published.published_by||'a shift member')+' at '+esc(shortTime(published.published_at))+'.</span>':'';
  state.classList.toggle('hidden',!tasks&&!confirmNeeded&&!hasManualPlan);
  state.classList.toggle('complete',!confirmNeeded);state.classList.toggle('ready',!tasks&&confirmNeeded);
  var badgeCount=tasks||(confirmNeeded?1:0);badge.textContent=badgeCount;badge.classList.toggle('hidden',!badgeCount);
  byId('continueToAllocationBtn').textContent=tasks?'Resolve '+tasks+' allocation task'+(tasks===1?'':'s'):'Review roles';
  var confirmButton=byId('continueToConfirmBtn');confirmButton.disabled=!!tasks;confirmButton.classList.toggle('hidden',!confirmNeeded);confirmButton.textContent=tasks?'Resolve '+tasks+' task'+(tasks===1?'':'s')+' first':'Review changes';
  var allocationSection=document.querySelector('.allocationSection');if(allocationSection)allocationSection.classList.toggle('hidden',!tasks&&!hasManualPlan);
  var allocationHeading=document.querySelector('.allocationSection .stepHeader h3');if(allocationHeading)allocationHeading.textContent='Finalise tonight’s allocations';
  var confirmationHeading=document.querySelector('#changesConfirmPane .stepHeader h3');if(confirmationHeading)confirmationHeading.textContent=confirmNeeded?'Confirm tonight’s changes':'No confirmation needed';
  var fixed=fixedRolesHtml(base,plan),fixedList=byId('fixedAllocationList');fixedList.innerHTML=fixed||'<div class="time">Roles will appear after the staffing decisions are complete.</div>';byId('fixedAllocationSummary').textContent='Current roles · '+(fixed.match(/fixedRoleRow/g)||[]).length;
  renderConfirmationPreview(base,plan,tasks,confirmNeeded);var save=byId('saveAllocationsBtn');if(save){save.classList.toggle('hidden',!confirmNeeded);save.dataset.workflowBlocked=tasks?'true':'false';save.disabled=!!tasks||!navigator.onLine}
  setChangesStep(activeChangesStep,false);
}

function confirmationRow(label,value,detail){return'<div class="confirmationRow"><div><span>'+esc(label)+'</span>'+(detail?'<small>'+esc(detail)+'</small>':'')+'</div><b>'+esc(value||'To decide')+'</b></div>'}

function renderConfirmationPreview(base,plan,tasks,confirmNeeded){
  var host=byId('confirmationPreview');if(!host)return;var r=allocationPreview(base),rows=[];
  rows.push(confirmationRow('First part theatre',r.first1+' + '+r.first2,'Second break'));rows.push(confirmationRow('Second part theatre',r.second1+' + '+r.second2,'First break'));
  if(r.mode==='5')rows.push(confirmationRow('Full Labour Ward / Pager',r.fullLW,'Break when safe'));
  else{rows.push(confirmationRow('Labour Ward / Pager',r.pager));rows.push(confirmationRow('Labour Ward / Reliever',r.reliever));var order=labourOrderDrafts[base.date]||labourOrderFor(r);if(order){var first=order.first||order.first_part_name,second=order.second||order.second_part_name;rows.push(confirmationRow('Labour Ward first part',first,'Second break'));rows.push(confirmationRow('Labour Ward second part',second,'First break'))}}
  if(r.mode==='7')rows.push(confirmationRow('7th nurse',r.seventh,'Break as required'));
  var published=nightPlanStatuses[base.date];host.innerHTML=(tasks?'<div class="confirmationWarning">Resolve '+tasks+' remaining '+(tasks===1?'item':'items')+' before continuing.</div>':confirmNeeded?'<div class="confirmationReady">The changes are ready. Check the names before sharing them.</div>':published&&published.published_at&&workflowHasManualPlan(base)?'<div class="confirmationReady">Tonight’s changes are shared and up to date.</div>':'<div class="confirmationReady">Nothing has changed, so no confirmation is needed.</div>')+rows.join('');
}

function cur(){
  var base=Object.assign({},localCur());base.mode='6';return applyNightRoleOverride(base);
}

function rawBaseForDate(date){
  var original=R.find(function(r){return r.date===date})||localCur();var base=Object.assign({},original);base.mode='6';return base;
}

function validRoleAssignments(assignments){
  if(!assignments||typeof assignments!=='object')return false;
  var values=CORE_ALLOCATION_KEYS.map(function(key){return String(assignments[key]||'').trim()});
  return values.every(Boolean)&&new Set(values.map(function(name){return name.toLowerCase()})).size===CORE_ALLOCATION_KEYS.length;
}

function applyNightRoleOverride(base){
  var copy=Object.assign({},base),stored=nightRoleOverrides[base.date],assignments=stored&&stored.assignments;
  if(validRoleAssignments(assignments))CORE_ALLOCATION_KEYS.forEach(function(key){copy[key]=assignments[key]});
  return copy;
}

function baseForDate(date){
  return applyNightRoleOverride(rawBaseForDate(date));
}

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
  base=applyNightRoleOverride(base);
  var changes=changesFor(base.date),overtime=overtimeFor(base.date),absentKeys=[],openKeys=[],legacyCover=0;
  changes.forEach(function(c){
    var key=allocationKeyForName(base,c.absent_name);
    if(!key)return;
    if(absentKeys.indexOf(key)<0)absentKeys.push(key);
    if(c.replacement_name)legacyCover++;
    else if(openKeys.indexOf(key)<0)openKeys.push(key);
  });
  var count=6-absentKeys.length+legacyCover+overtime.length;
  var seventhChoice=null,seventhDecision=null,requiresSeventhDecision=false;
  if(count>=7){
    seventhChoice=seventhRotationChoice(base,changes);
    if(seventhChoice.source==='overtime')seventhDecision='overtime';
    else{
      var savedRotation=overtime.some(function(o){return o.allocation_key===seventhChoice.vacatedKey}),savedOvertime=overtime.some(function(o){return o.allocation_key==='seventh'});
      seventhDecision=seventhDecisionDrafts[base.date]||(savedOvertime?'overtime':savedRotation?'rotation':null);
      requiresSeventhDecision=!seventhDecision;
    }
    seventhChoice.decision=seventhDecision;
    if(seventhDecision){
      var seventhOpenKey=seventhDecision==='rotation'?seventhChoice.vacatedKey:'seventh';
      if(openKeys.indexOf(seventhOpenKey)<0)openKeys.push(seventhOpenKey);
    }
  }
  var coverageKey=null,coverageChoices=[],coverageSource='';
  if(count===5&&openKeys.length){
    if(openKeys.indexOf('reliever')>=0){coverageKey='reliever';coverageSource='automatic'}
    else if(openKeys.indexOf('pager')>=0){coverageKey='pager';coverageSource='automatic'}
    else{
      coverageChoices=openKeys.filter(function(key){return['first1','first2','second1','second2'].indexOf(key)>=0});
      var stored=fiveCoverFor(base.date);
      if(coverageChoices.length===1){coverageKey=coverageChoices[0];coverageSource='automatic'}
      else if(stored&&coverageChoices.indexOf(stored.coverage_key)>=0){coverageKey=stored.coverage_key;coverageSource='saved'}
    }
  }
  var requiresCoverageChoice=count===5&&coverageChoices.length>1&&!coverageKey;
  var availableKeys=requiresCoverageChoice?[]:openKeys.filter(function(key){return key!==coverageKey});
  var validAssignments=overtime.filter(function(o){return availableKeys.indexOf(o.allocation_key)>=0});
  var assignedIds=validAssignments.map(function(o){return o.id});
  var unassigned=overtime.filter(function(o){return assignedIds.indexOf(o.id)<0});
  var unresolved=availableKeys.filter(function(key){return !validAssignments.some(function(o){return o.allocation_key===key})});
  var coreComplete=!requiresCoverageChoice&&!requiresSeventhDecision&&unresolved.length===0&&count>=5;
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
  if(count<5)alert=count+' nurses currently recorded: additional overtime cover is required before the allocation and breaks can be finalised.';
  else if(r.mode==='5')alert='5-person model: '+r.fullLW+' covers Labour Ward / Pager 00:00–07:00.';
  else if(count>7)alert=count+' nurses recorded: the core seven-person arrangement is shown, with additional staff allocated as required.';
  else if(r.mode==='7'&&plan.requiresSeventhDecision)alert='7-person model: decide whether '+plan.seventhNurse+' moves from '+allocationLabel(plan.seventhVacatedKey)+' into the seventh position.';
  else if(r.mode==='7'&&plan.seventhChoice&&plan.seventhChoice.source==='permanent'&&plan.seventhDecision==='rotation')alert='7-person model: '+r.seventh+' moves from '+allocationLabel(plan.seventhVacatedKey)+' into the seventh position. Overtime fills the vacated role.';
  else if(r.mode==='7'&&plan.seventhChoice&&plan.seventhChoice.source==='permanent')alert='7-person model: '+plan.seventhNurse+' remains in '+allocationLabel(plan.seventhVacatedKey)+', while an overtime nurse takes the seventh position.';
  else if(r.mode==='7')alert='7-person model: the seventh rotation selected an overtime nurse for the additional role.';
  else alert='6-person model: Labour Ward / Pager is shared between '+r.pager+' and '+r.reliever+'.';
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

function sameNurse(a,b){return String(a||'').trim().toLowerCase()===String(b||'').trim().toLowerCase()}

function interfaceIcon(type){
  var paths={
    staffing:'<path d="M8.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M3 19a5.5 5.5 0 0 1 11 0"/><path d="M16 8a2.5 2.5 0 0 1 0 5"/><path d="M16.5 15.5A4.5 4.5 0 0 1 21 20"/>',
    absence:'<circle cx="12" cy="12" r="8.5"/><path d="m8.5 12 2.2 2.2 4.8-5"/>',
    task:'<rect x="5" y="4" width="14" height="16" rx="2"/><path d="M9 4.5h6V7H9z"/><path d="M9 11h6M9 15h4"/>',
    first:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l-3.5 2"/><path d="M6.5 5.5 8 7"/>',
    second:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/><path d="m16 17 1.5 1.5"/>',
    pager:'<rect x="6" y="4" width="12" height="16" rx="2.5"/><path d="M9 8h6v4H9zM9 16h3M15.5 4V2"/>',
    reliever:'<circle cx="10" cy="8" r="3"/><path d="M4 19a6 6 0 0 1 12 0"/><path d="M17 10a4 4 0 0 1 3 6.5M20 13v3.5h-3.5"/>',
    overtime:'<circle cx="9" cy="8" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0M18 8v6M15 11h6"/>',
    seventh:'<circle cx="12" cy="12" r="8.5"/><path d="M12 8v8M8 12h8"/>'
  };
  return'<svg viewBox="0 0 24 24" aria-hidden="true">'+(paths[type]||paths.task)+'</svg>';
}

function roleIconType(badgeClass){return badgeClass==='bFirst'?'first':badgeClass==='bSecond'?'second':badgeClass==='bPager'?'pager':badgeClass==='bReliever'||badgeClass==='bFull'?'reliever':'seventh'}

function personalAllocation(base,r,name){
  if(!name)return{title:'Choose your name',detail:'See your own role and break at a glance.',pending:false};
  var absence=changesFor(base.date).find(function(item){return sameNurse(item.absent_name,name)});
  if(absence)return{title:'Not working tonight',detail:(absence.reason||'Absence')+' recorded',pending:false};
  if(sameNurse(r.first1,name)||sameNurse(r.first2,name))return{title:'First Part',detail:'00:00–03:30 · Second break',pending:false};
  if(sameNurse(r.second1,name)||sameNurse(r.second2,name))return{title:'Second Part',detail:'03:30–07:00 · First break',pending:false};
  if(r.mode==='5'&&sameNurse(r.fullLW,name))return{title:'Labour Ward / Pager',detail:'Full night · Break when safe',pending:false};
  if(r.mode!=='5'&&(sameNurse(r.pager,name)||sameNurse(r.reliever,name))){
    var role=sameNurse(r.pager,name)?'Pager':'Reliever',other=sameNurse(r.pager,name)?r.reliever:r.pager,order=labourOrderFor(r);
    if(!order)return{title:role,detail:'Labour Ward / Pager pending',pending:true,other:other};
    if(sameNurse(order.first_part_name,name))return{title:role,detail:'Labour Ward first part · Second break',pending:false};
    return{title:role,detail:'Labour Ward second part · First break',pending:false};
  }
  if(r.mode==='7'&&sameNurse(r.seventh,name))return{title:'7th nurse',detail:'Additional allocation · Break as required',pending:false};
  return{title:'Not allocated tonight',detail:'Open Changes if an assignment is still being decided.',pending:false};
}

function renderPersonalNight(base,r){
  var host=byId('personalNightCard'),notice=byId('personalAllocationNotice');if(!host||!notice)return null;
  var name=myName(),preferred=currentPrivateProfile&&currentPrivateProfile.profile_name||'',jobTitle=currentPrivateProfile&&currentPrivateProfile.job_title||'',displayName=preferred||name||'Choose your name',assignment=personalAllocation(base,r,name),initial=displayName.trim().charAt(0).toUpperCase()||'?',avatar=profileAvatarUrl?'<img src="'+esc(profileAvatarUrl)+'" alt="">':esc(initial);
  host.innerHTML='<div class="personalAvatar '+(profileAvatarUrl?'hasPhoto':'')+'" aria-hidden="true">'+avatar+'<i></i></div><div class="personalCopy"><b>'+esc(displayName)+'</b>'+(jobTitle?'<small class="personalProfileTitle">'+esc(jobTitle)+'</small>':'')+'<span>'+esc(assignment.title+(assignment.detail?' · '+assignment.detail:''))+'</span></div><button type="button" class="personalChangeBtn" id="changePersonalNameBtn">Edit <span aria-hidden="true">›</span></button>';
  notice.innerHTML=assignment.pending?'<button type="button" class="personalTaskCard" data-go-allocation><span class="personalTaskIcon">'+interfaceIcon('task')+'</span><span><b>Your allocation is not final yet</b><small>Labour Ward / Pager is shared with '+esc(assignment.other)+'.</small><strong>Complete allocation ›</strong></span></button>':'';
  byId('changePersonalNameBtn').onclick=showAccountSheet;
  return assignment;
}

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
  syncDateInputs(base.date);renderMyName();var personal=renderPersonalNight(base,r);renderHeaderSummary(r);updateSmartNightButtons();
  byId('modeStatus').textContent=count+' nurse'+(count===1?'':'s');
  if(byId('changesModeStatus'))byId('changesModeStatus').textContent=count+' nurse'+(count===1?'':'s');
  byId('breakModeStatus').textContent=count+' nurse'+(count===1?'':'s');
  var alertClass=count<6?'warn':'';
  var decisionTasks=workflowTaskCount(base,plan,r),confirmNeeded=workflowNeedsConfirmation(base,decisionTasks),taskCount=decisionTasks||(confirmNeeded?1:0),absenceCount=changesFor(base.date).length,overtimeCount=overtimeFor(base.date).length,statusRow=byId('nightStatusRow');if(statusRow)statusRow.innerHTML='<button type="button" class="statusChip staffingChip" data-go-staffing>'+interfaceIcon('staffing')+'<span><b>'+count+'</b><small>Nurses</small></span></button><button type="button" class="statusChip '+(absenceCount?'absenceChip':'readyChip')+'" data-go-staffing>'+interfaceIcon('absence')+'<span><b>'+(absenceCount?absenceCount:'No')+'</b><small>Absence'+(absenceCount===1?'':'s')+'</small></span></button><button type="button" class="statusChip overtimeChip" data-go-staffing>'+interfaceIcon('overtime')+'<span><b>'+overtimeCount+'</b><small>Overtime</small></span></button><button type="button" class="statusChip '+(taskCount?'taskChip':'readyChip')+'" '+(confirmNeeded&&!decisionTasks?'data-go-confirm':'data-go-allocation')+'>'+interfaceIcon('task')+'<span><b>'+(taskCount?taskCount:'No')+'</b><small>Task'+(taskCount===1?'':'s')+'</small></span></button>';
  byId('alerts').innerHTML=(count!==6?'<div class="alert compactNotice '+alertClass+'">'+esc(e.alert)+'</div>':'')+(plan.requiresSeventhDecision?'<button type="button" class="alert gold taskAlert" data-go-allocation>Review the proposed seventh-nurse move <span>Complete now ›</span></button>':'')+(plan.unresolved.length?'<button type="button" class="alert gold taskAlert" data-go-allocation>'+plan.unresolved.length+' allocation'+(plan.unresolved.length===1?' requires':'s require')+' a final decision <span>Complete now ›</span></button>':'')+(labourPending&&!(personal&&personal.pending)?'<button type="button" class="alert gold taskAlert" data-go-allocation>Labour Ward order required <span>Complete now ›</span></button>':'');
  if(r.mode==='7')roles.push(['b7','7th nurse',r.seventh,'Additional nurse • Break as required']);
  byId('roles').innerHTML=roles.map(function(c){var iconType=roleIconType(c[0]),icon=iconType==='first'?'<span class="roleOrdinal">1st</span>':iconType==='second'?'<span class="roleOrdinal">2nd</span>':interfaceIcon(iconType);return '<div class="role '+c[0].replace(/^b/,'r')+' '+(isMine(c[2])?'mine':'')+'"><span class="roleIcon '+iconType+'">'+icon+'</span><div class="roleCopy"><div class="name">'+esc(c[2])+'</div><div class="roleMeta"><span class="badge '+c[0]+'">'+esc(c[1])+'</span><span class="time">'+esc(c[3])+'</span></div></div></div>'}).join('');
  var extras=additionalNurses(plan);
  if(extras.length)byId('roles').insertAdjacentHTML('beforeend','<div class="additionalStaff"><b>Additional staff • allocation as required</b>'+extras.map(function(o){return '<span class="additionalName">'+esc(o.nurse_name)+'</span>'}).join('')+'</div>');
  byId('fiveArrangement').innerHTML=fiveArrangementHtml(r);
  localStorage.setItem('anaes_selected_date',base.date);
  renderChanges(base);renderRoster();renderBreaks();setOutputState(base,plan);bindTaskLinks();
  if(currentUserProfile.user_role==='admin')renderAdmin();
  ensureNightHistory(base.date);updateNetworkStatus();save();
}

function goToChanges(target){
  activeChangesStep='allocation';show('changes');
  setTimeout(function(){var el=document.querySelector(target||'#changesAllocationPane');if(el){el.scrollIntoView({behavior:'smooth',block:'start'});var focus=el.querySelector('summary,select,button,input');if(focus)focus.focus({preventScroll:true})}},260);
}

function bindTaskLinks(){
  Array.prototype.forEach.call(document.querySelectorAll('[data-go-allocation]'),function(el){
    el.onclick=function(){goToChanges('#changesAllocationPane')};
    if(el.tagName!=='BUTTON'){el.setAttribute('role','button');el.setAttribute('tabindex','0');el.onkeydown=function(event){if(event.key==='Enter'||event.key===' '){event.preventDefault();goToChanges('#changesAllocationPane')}}}
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-go-staffing]'),function(el){el.onclick=function(){activeChangesStep='staffing';show('changes');setTimeout(function(){var target=document.querySelector('.absenceSection');if(target)target.scrollIntoView({behavior:'smooth',block:'start'})},180)}});
  Array.prototype.forEach.call(document.querySelectorAll('[data-go-confirm]'),function(el){el.onclick=function(){activeChangesStep='confirm';show('changes');setTimeout(function(){var target=byId('changesConfirmPane');if(target)target.scrollIntoView({behavior:'smooth',block:'start'})},180)}});
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

function labourRoleIsReady(base,key){
  var plan=staffingPlan(base);
  if(plan.availableKeys.indexOf(key)>=0)return!!selectedAllocationId(base,key);
  return plan.absentKeys.indexOf(key)<0;
}

function setLabourOrderDraft(base){
  var firstPick=byId('labourFirstPick');if(!firstPick)return;
  var names=JSON.parse(firstPick.getAttribute('data-labour-names')||'[]'),first=firstPick.value,second=names.find(function(name){return name!==first})||'';
  labourOrderDrafts[base.date]={first:first,second:second};
  var firstResult=byId('labourFirstResult'),secondResult=byId('labourSecondResult');if(firstResult)firstResult.innerHTML='<b>First part</b><span>'+esc(first)+' • Second break</span>';if(secondResult)secondResult.innerHTML='<b>Second part</b><span>'+esc(second)+' • First break</span>';
  updateChangesWorkflow(base,staffingPlan(base));formMessage('allocationFormMessage','Allocations and Labour Ward parts are ready to review.','');
}

function roleEditorAssignments(base){
  var draft=nightRoleOverrideDrafts[base.date];if(draft&&validRoleAssignments(draft.assignments))return Object.assign({},draft.assignments);
  var current=baseForDate(base.date),assignments={};CORE_ALLOCATION_KEYS.forEach(function(key){assignments[key]=current[key]});return assignments;
}

function renderNightRoleOverride(base){
  var host=byId('nightRoleOverrideStep');if(!host)return;
  if(!nightRoleOverrideAvailable){host.innerHTML='<div class="nightRoleNotice"><b>Night-only role changes need the V31 database update</b><span>The normal calculated roster remains available.</span></div>';return}
  var stored=nightRoleOverrides[base.date],draft=nightRoleOverrideDrafts[base.date],current=roleEditorAssignments(base),open=!!draft,labels={first1:'First Part · position 1',first2:'First Part · position 2',second1:'Second Part · position 1',second2:'Second Part · position 2',pager:'Pager',reliever:'Reliever'},names=CORE_ALLOCATION_KEYS.map(function(key){return current[key]}),rows='';
  CORE_ALLOCATION_KEYS.forEach(function(key){rows+='<label><span>'+esc(labels[key])+'</span><select data-night-role="'+esc(key)+'">'+names.map(function(name){return'<option value="'+esc(name)+'" '+(current[key]===name?'selected':'')+'>'+esc(name)+'</option>'}).join('')+'</select></label>'});
  host.innerHTML='<details class="nightRoleEditor" '+(open?'open':'')+'><summary><span><b>Change tonight’s roles</b><small>'+(stored?'A night-only arrangement is active':'Optional · permanent rotation is unchanged')+'</small></span><i aria-hidden="true">›</i></summary><div class="nightRoleEditorBody"><div class="nightRoleGuidance">Choose a different nurse in any role. The app swaps the two people automatically, so nobody is duplicated.</div>'+rows+'<label class="nightRoleReason"><span>Reason for the arrangement</span><input id="nightRoleReason" type="text" maxlength="120" placeholder="For example, agreed shift swap" value="'+esc(draft&&draft.reason||'')+'"></label><div class="nightRoleActions"><button type="button" class="primary" id="saveNightRolesBtn">Save for this night only</button>'+(stored?'<button type="button" class="soft" id="resetNightRolesBtn">Reset calculated roles</button>':'')+'</div></div></details>';
  Array.prototype.forEach.call(host.querySelectorAll('[data-night-role]'),function(select){select.onchange=function(){var key=select.getAttribute('data-night-role'),assignments=roleEditorAssignments(base),chosen=select.value,source=CORE_ALLOCATION_KEYS.find(function(candidate){return assignments[candidate]===chosen}),previous=assignments[key];if(source&&source!==key)assignments[source]=previous;assignments[key]=chosen;nightRoleOverrideDrafts[base.date]={assignments:assignments,reason:(byId('nightRoleReason')&&byId('nightRoleReason').value)||''};renderChanges(base)}});
  var reason=byId('nightRoleReason');if(reason)reason.oninput=function(){var currentDraft=nightRoleOverrideDrafts[base.date]||{assignments:roleEditorAssignments(base)};currentDraft.reason=reason.value;nightRoleOverrideDrafts[base.date]=currentDraft};
  var save=byId('saveNightRolesBtn');if(save)save.onclick=function(){saveNightRoleOverride(base)};var reset=byId('resetNightRolesBtn');if(reset)reset.onclick=function(){resetNightRoleOverride(base)};
}

async function saveNightRoleOverride(base){
  if(!requireOnline())return;var draft=nightRoleOverrideDrafts[base.date],reason=normaliseNurseName(draft&&draft.reason||'');
  if(!draft||!validRoleAssignments(draft.assignments)){toast('Choose one nurse for every role');return}if(!reason){toast('Add a short reason for the night-only arrangement');var field=byId('nightRoleReason');if(field)field.focus();return}
  var previous=nightRoleOverrides[base.date]?JSON.parse(JSON.stringify(nightRoleOverrides[base.date])):null,button=byId('saveNightRolesBtn');if(button){button.disabled=true;button.textContent='Saving…'}setSync('saving','Saving night-only roles');
  var now=new Date().toISOString(),who=currentUserProfile.display_name,result=await supa.from('night_role_overrides').upsert({roster_date:base.date,assignments:draft.assignments,reason:reason,updated_by:who,updated_at:now},{onConflict:'roster_date'});
  if(result.error){rpcError(result);return}await supa.from('night_role_override_history').insert({roster_date:base.date,action:'saved',assignments:draft.assignments,reason:reason,changed_by:who,changed_at:now});delete nightRoleOverrideDrafts[base.date];await loadSharedData();toast('Tonight’s role arrangement saved',{label:'Undo',run:function(){return undoNightRoleChange(base.date,previous)}});
}

async function resetNightRoleOverride(base){
  if(!requireOnline()||!confirm('Reset this night to the calculated roster roles?'))return;setSync('saving','Resetting tonight’s roles');var stored=nightRoleOverrides[base.date]?JSON.parse(JSON.stringify(nightRoleOverrides[base.date])):null,who=currentUserProfile.display_name,now=new Date().toISOString(),result=await supa.from('night_role_overrides').delete().eq('roster_date',base.date);if(result.error){rpcError(result);return}await supa.from('night_role_override_history').insert({roster_date:base.date,action:'reset',assignments:stored&&stored.assignments||{},reason:'Reset to calculated roster',changed_by:who,changed_at:now});delete nightRoleOverrideDrafts[base.date];await loadSharedData();toast('Calculated roster roles restored',{label:'Undo',run:function(){return undoNightRoleChange(base.date,stored)}});
}

async function undoNightRoleChange(date,previous){
  if(!requireOnline())return;setSync('saving','Undoing role change');var who=currentUserProfile.display_name,now=new Date().toISOString(),result;if(previous){result=await supa.from('night_role_overrides').upsert({roster_date:date,assignments:previous.assignments,reason:previous.reason||'Previous night-only arrangement',updated_by:who,updated_at:now},{onConflict:'roster_date'})}else result=await supa.from('night_role_overrides').delete().eq('roster_date',date);if(result.error){rpcError(result);return}await supa.from('night_role_override_history').insert({roster_date:date,action:previous?'saved':'reset',assignments:previous&&previous.assignments||{},reason:'Undid the latest role change',changed_by:who,changed_at:now});await loadSharedData();toast('Role change undone')
}

function renderLabourOrder(base,plan){
  var host=byId('labourOrderStep');if(!host)return false;
  host.innerHTML='';
  return false;
}

function updateAllocationSaveControl(base,plan){
  renderNightRoleOverride(base);var labourReady=renderLabourOrder(base,plan),hasAllocationChoices=overtimeFor(base.date).length&&plan.availableKeys.length,button=byId('saveAllocationsBtn');
  button.classList.toggle('hidden',!hasAllocationChoices&&!labourReady);
  if(!allocationSaveInFlight)button.textContent='Confirm and share changes';
  return labourReady;
}

function seventhDecisionCard(plan){
  if(plan.count<7||!plan.seventhChoice)return'';
  var choice=plan.seventhChoice;
  if(choice.source==='overtime')return'<div class="seventhDecisionCard confirmed"><div class="decisionEyebrow">7th nurse rotation</div><h3>Overtime nurse takes the seventh position</h3><div class="time">This is the scheduled overtime turn. Choose the overtime nurse in the seventh-nurse allocation below.</div></div>';
  var original=allocationLabel(choice.vacatedKey),fallback=choice.fallback?'<div class="decisionFallback">'+esc(choice.scheduled)+' is absent, so '+esc(choice.nurse)+' is the next available permanent nurse in the seventh rotation.</div>':'';
  return'<div class="seventhDecisionCard '+(plan.requiresSeventhDecision?'needsDecision':'confirmed')+'"><div class="decisionEyebrow">7th nurse decision</div><h3>'+esc(choice.nurse)+': '+esc(original)+' → seventh nurse</h3>'+fallback+'<div class="decisionRoute"><div><span>If rotation is used</span><b>'+esc(choice.nurse)+' becomes seventh nurse</b><small>Overtime fills '+esc(original)+'</small></div><div><span>If original role is kept</span><b>'+esc(choice.nurse)+' stays in '+esc(original)+'</b><small>Overtime fills the seventh position</small></div></div><div class="decisionButtons"><button type="button" class="'+(plan.seventhDecision==='rotation'?'selected':'')+'" data-seventh-decision="rotation">Use seventh rotation</button><button type="button" class="'+(plan.seventhDecision==='overtime'?'selected':'')+'" data-seventh-decision="overtime">Keep original role</button></div>'+(plan.requiresSeventhDecision?'<div class="decisionPrompt">Choose one option before the seven-person allocation can be finalised.</div>':'<div class="decisionSaved">Decision selected. Save the allocation below to share it with everyone.</div>')+'</div>';
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
  byId('absentName').innerHTML=names.length?'<option value="">Choose a nurse</option>'+names.map(function(n){return '<option value="'+esc(n)+'">'+esc(n)+'</option>'}).join(''):'<option value="">Every rostered nurse is already absent</option>';
  byId('saveChangeBtn').disabled=!names.length||!navigator.onLine;
  byId('changeList').innerHTML=changes.length?changes.map(function(c){return '<div class="changeItem" data-absence-name="'+esc(c.absent_name)+'"><div><div><b>'+esc(c.absent_name)+'</b> <span class="changeArrow">•</span> <b>Absent</b></div><div class="changeMeta">'+esc(c.reason||'Absence')+' • Updated by '+esc(c.updated_by||'Shift member')+' at '+esc(shortTime(c.updated_at))+'</div></div><div><button class="mini editReason" data-edit-change="'+esc(c.id)+'">Edit</button><button class="mini" data-remove-change="'+esc(c.id)+'" aria-label="Remove absence">Remove</button></div></div>'}).join(''):'<div class="time">No absences recorded for this night.</div>';
  var extraIds=additionalNurses(plan).map(function(o){return o.id});
  byId('overtimeList').innerHTML=overtime.length?overtime.map(function(o){
    var valid=plan.availableKeys.indexOf(o.allocation_key)>=0,extra=extraIds.indexOf(o.id)>=0,status=extra?'Additional staff • as required':valid?allocationLabel(o.allocation_key):'Awaiting allocation';
    var added=earliestOvertimeAdd(base.date,o.nurse_name),when=added?added.changed_at:o.updated_at,who=added?added.changed_by:o.updated_by;
    var statusHtml=!valid&&!extra?'<button type="button" class="overtimeStatus taskStatus" data-go-allocation>Awaiting allocation ›</button>':'<span class="overtimeStatus assigned">'+esc(status)+'</span>';
    return '<div class="overtimeItem" data-overtime-name="'+esc(o.nurse_name)+'"><div class="overtimeTop"><div><div class="overtimeName">'+esc(o.nurse_name)+'</div>'+statusHtml+'<div class="changeMeta">Added by '+esc(who||'Shift member')+' at '+esc(shortTime(when))+'</div></div><button class="mini" data-remove-overtime="'+esc(o.id)+'">Remove</button></div></div>';
  }).join(''):'<div class="time">No overtime nurses recorded for this night.</div>';
  byId('fiveCoverStep').innerHTML=fiveCoverHtml(base,plan);
  var extras=additionalNurses(plan),summary,seventhInfo=seventhDecisionCard(plan);
  if(plan.requiresCoverageChoice)summary='<b>'+plan.count+' nurses expected tonight</b><div class="time">Choose and save the reliever allocation first. The remaining positions will then appear for the overtime nurses.</div>';
  else if(plan.requiresSeventhDecision)summary='<b>Seventh-nurse decision required</b><div class="time">Review the proposed move below. Your choice determines which allocation the overtime nurse will fill.</div>';
  else if(!overtime.length)summary='<b>No overtime allocation required yet</b><div class="time">Add overtime nurses only when they are confirmed as available.</div>';
  else if(plan.unresolved.length)summary='<b>'+plan.count+' nurses expected tonight</b><div class="time">'+plan.unresolved.length+' required allocation'+(plan.unresolved.length===1?' remains':'s remain')+' to be decided.</div>';
  else if(extras.length)summary='<b>Core allocations finalised</b><div class="time">'+extras.length+' additional nurse'+(extras.length===1?' remains':'s remain')+' available as required.</div>';
  else summary='<b>Required allocations finalised</b><div class="time">The reliever and overtime allocations are complete.</div>';
  byId('allocationSummary').innerHTML=summary+seventhInfo;
  var allocationDraft=allocationDrafts[base.date]||{};
  byId('allocationList').innerHTML=overtime.length&&plan.availableKeys.length?plan.availableKeys.map(function(key){
    var assigned=plan.validAssignments.find(function(o){return o.allocation_key===key});
    var selectedId=Object.prototype.hasOwnProperty.call(allocationDraft,key)?allocationDraft[key]:(assigned?assigned.id:'');
    var options='<option value="" '+(!selectedId?'selected':'')+'>To decide during the shift</option>'+overtime.map(function(o){return '<option value="'+esc(o.id)+'" '+(selectedId===o.id?'selected':'')+'>'+esc(o.nurse_name)+'</option>'}).join('');
    return '<div class="allocationRow"><div><div class="allocationRole">'+esc(allocationLabel(key))+'</div><div class="allocationBreak">'+esc(allocationBreak(key))+'</div></div><select data-final-allocation="'+esc(key)+'" aria-label="Choose nurse for '+esc(allocationLabel(key))+'">'+options+'</select></div>';
  }).join(''):plan.requiresCoverageChoice?'<div class="time">The overtime choices will appear after the reliever allocation is saved.</div>':plan.requiresSeventhDecision?'<div class="time">Choose the seventh-nurse option above. The correct overtime allocation will then appear here.</div>':'<div class="time">There are no required allocations to finalise.</div>';
  var labourReady=updateAllocationSaveControl(base,plan);renderOvertimeSuggestions();
  var visible=expanded?history:history.slice(0,15);
  byId('changeHistory').innerHTML=history.length?visible.map(function(h){return '<div class="historyItem"><div><span class="historyType '+esc(h.type)+'">'+esc(h.label)+'</span><b>'+esc(h.title)+'</b></div><div class="changeMeta">'+esc(h.detail||'')+' • '+esc(h.changed_by||'Shift member')+' • '+esc(shortTime(h.changed_at))+'</div></div>'}).join('')+(history.length>15?'<button class="historyMore" id="historyMoreBtn" type="button">'+(expanded?'Show recent changes':'Show full history ('+history.length+')')+'</button>':''):'<div class="time">No staffing change history for this night.</div>';
  Array.prototype.forEach.call(document.querySelectorAll('[data-remove-change]'),function(b){b.onclick=function(){removeNightChange(b.getAttribute('data-remove-change'),b)}});
  Array.prototype.forEach.call(document.querySelectorAll('[data-edit-change]'),function(b){b.onclick=function(){editNightChange(b.getAttribute('data-edit-change'))}});
  Array.prototype.forEach.call(document.querySelectorAll('[data-remove-overtime]'),function(b){b.onclick=function(){removeOvertime(b.getAttribute('data-remove-overtime'),b)}});
  Array.prototype.forEach.call(document.querySelectorAll('[data-final-allocation]'),function(select){select.onchange=function(){var date=base.date,key=select.getAttribute('data-final-allocation');if(!allocationDrafts[date])allocationDrafts[date]={};allocationDrafts[date][key]=select.value;updateAllocationSaveControl(base,plan);updateChangesWorkflow(base,plan);formMessage('allocationFormMessage',byId('labourFirstPick')?'Allocations and Labour Ward parts are ready to review.':'Selections ready to review.','')}});
  Array.prototype.forEach.call(document.querySelectorAll('[data-seventh-decision]'),function(button){button.onclick=function(){chooseSeventhDecision(base,button.getAttribute('data-seventh-decision'))}});
  var coverButton=byId('saveFiveCoverBtn');if(coverButton)coverButton.onclick=saveFiveCover;
  var more=byId('historyMoreBtn');if(more)more.onclick=function(){historyExpandedDates[base.date]=!expanded;renderChanges(base)};
  updateChangesWorkflow(base,plan);
  updateOfflineControls();
}

function editNightChange(id){
  var item=changesFor(cur().date).find(function(c){return c.id===id});
  if(!item)return;
  var option=document.createElement('option');option.value=item.absent_name;option.textContent=item.absent_name+' • edit existing';
  byId('absentName').prepend(option);byId('absentName').value=item.absent_name;byId('changeReason').value=item.reason||'Leave';
  byId('saveChangeBtn').disabled=!navigator.onLine;byId('saveChangeBtn').textContent='Update absence';
  byId('absentName').scrollIntoView({behavior:'smooth',block:'center'});
}

function breakData(r){
  var base=baseForDate(r.date),plan=staffingPlan(base);
  if(plan.count<5)return{first:[],second:[],notes:['Breaks cannot be finalised while only '+plan.count+' nurses are recorded. Add sufficient overtime cover and complete the allocations first.']};
  var first=[r.second1,r.second2],second=[r.first1,r.first2],notes=[];
  if(r.mode==='5')notes.push(r.fullLW+' covers Labour Ward / Pager for the full night and decides their own break when safe.');
  else{
    var order=labourOrderFor(r);
    if(order){
      first.push(order.second_part_name);second.push(order.first_part_name);
      notes.push('First part Labour Ward / Pager: '+order.first_part_name+' • Second break.');
      notes.push('Second part Labour Ward / Pager: '+order.second_part_name+' • First break.');
    }else{
      notes.push(r.pager+' and '+r.reliever+' still need to decide who works each part of Labour Ward / Pager.');
      notes.push('Whoever works the first part takes second break. Whoever works the second part takes first break.');
    }
    if(r.mode==='7')notes.push(r.seventh+' is the 7th nurse and takes a break as required.');
    var extras=additionalNurses(plan);if(extras.length)notes.push(extras.map(function(o){return o.nurse_name}).join(' + ')+' remain additional staff and take breaks as required.');
  }
  return{first:first,second:second,notes:notes};
}

function renderBreaks(){
  var base=cur(),r=applyChanges(base),plan=staffingPlan(base),staffingPending=planIsProvisional(base),labourPending=r.mode!=='5'&&!labourOrderFor(r),pending=staffingPending||labourPending,count=plan.count,b=staffingPending?{first:[],second:[],notes:['Breaks are pending until the required staffing and allocations are finalised.']}:breakData(r);
  byId('breakDatePick').value=r.date;byId('breakModeStatus').textContent=count+' nurse'+(count===1?'':'s');
  var absenceCount=changesFor(base.date).length,summary=byId('breakSummaryRow');if(summary)summary.innerHTML='<button type="button" class="breakSummaryItem staffing" data-go-staffing>'+interfaceIcon('staffing')+'<b>'+esc(count)+'</b><small>Nurses</small></button><button type="button" class="breakSummaryItem '+(absenceCount?'absence':'ready')+'" data-go-staffing>'+interfaceIcon('absence')+'<b>'+(absenceCount?esc(absenceCount):'No')+'</b><small>Absence'+(absenceCount===1?'':'s')+'</small></button><button type="button" class="breakSummaryItem labour '+(labourPending?'pending':'ready')+'" data-go-allocation>'+interfaceIcon('task')+'<b>Labour Ward</b><small>'+(labourPending?'Order pending':'Order complete')+'</small></button>';
  byId('breakDate').innerHTML='<b>'+fmt(r.date)+'</b> • '+esc(count)+' nurses'+(pending?' • <span class="provisionalFlag">'+(labourPending&&!staffingPending?'Labour Ward order pending':'Pending')+'</span><button type="button" class="pendingShortcut" data-go-allocation>Resolve pending tasks ›</button>':'');
  byId('breakList').innerHTML='<div class="breakGrid"><div class="breakGroup firstBreak"><h3>First break</h3>'+b.first.map(function(n){return '<div class="breakPerson">'+esc(n)+'</div>'}).join('')+(b.first.length?'':'<div class="breakNote">Pending final allocation</div>')+'</div><div class="breakGroup secondBreak"><h3>Second break</h3>'+b.second.map(function(n){return '<div class="breakPerson">'+esc(n)+'</div>'}).join('')+(b.second.length?'':'<div class="breakNote">Pending final allocation</div>')+'</div></div><div class="breakGroup lwBreak"><h3>Labour Ward / Pager'+(r.mode==='7'?' and additional staffing':'')+'</h3>'+b.notes.map(function(n){return '<div class="breakNote">'+esc(n)+'</div>'}).join('')+'</div>';
  highlightNamed('breakList','.breakPerson');
}

function setOutputState(base,plan){
  var r=applyChanges(base),pending=planIsProvisional(base)||(r.mode!=='5'&&!labourOrderFor(r));
  Array.prototype.forEach.call(document.querySelectorAll('.emailRosterBtn'),function(button){var span=button.querySelector('span');if(span)span.textContent=pending?'Email provisional roster':'Email roster and breaks';button.classList.toggle('buttonPending',pending)});
  var copy=byId('copyBreaksBtn');if(copy){var span=copy.querySelector('span');if(span)span.textContent=pending?'Copy breaks pending':'Copy breaks';copy.classList.toggle('buttonPending',pending)}
}

async function copyBreaks(){
  var base=cur(),r=applyChanges(base),plan=staffingPlan(base),staffingPending=planIsProvisional(base),pending=staffingPending||(r.mode!=='5'&&!labourOrderFor(r)),b=staffingPending?{first:[],second:[],notes:['Breaks pending until staffing and allocations are finalised.']}:breakData(r);
  var txt=(pending?'PROVISIONAL • ':'')+fmt(r.date)+' Breaks • '+plan.count+' nurses\nFirst break: '+(b.first.join(' + ')||'Pending')+'\nSecond break: '+(b.second.join(' + ')||'Pending')+'\n'+b.notes.join('\n');
  try{await navigator.clipboard.writeText(txt);toast(pending?'Pending break plan copied':'Breaks copied')}catch(e){alert(txt)}
}

function emailRoster(){
  var base=cur(),r=applyChanges(base),b=breakData(r),changes=changesFor(r.date),overtime=overtimeFor(r.date),plan=staffingPlan(base),staffingPending=planIsProvisional(base),pending=staffingPending||(r.mode!=='5'&&!labourOrderFor(r)),extras=additionalNurses(plan);
  if(pending&&!confirm('Some staffing or allocations are still undecided. Open a clearly marked provisional email anyway?'))return;
  if(staffingPending)b={first:[],second:[],notes:['Breaks pending until staffing and allocations are finalised.']};
  var subject=(pending?'PROVISIONAL - ':'')+'Anaesthetic Night Roster - '+fmt(r.date),lines=[pending?'PROVISIONAL ANAESTHETIC NIGHT ROSTER':'ANAESTHETIC NIGHT ROSTER',fmt(r.date)+' • '+plan.count+' nurses','','ROSTER','First part theatres: '+r.first1+' + '+r.first2,'Second part theatres: '+r.second1+' + '+r.second2];
  if(plan.count<5)lines.push('Allocation incomplete: additional overtime cover required');else if(r.mode==='5')lines.push('Full Labour Ward / Pager 00:00–07:00: '+r.fullLW);else{lines.push('Pager: '+r.pager,'Reliever: '+r.reliever);var lwOrder=labourOrderFor(r);if(lwOrder)lines.push('Labour Ward first part: '+lwOrder.first_part_name,'Labour Ward second part: '+lwOrder.second_part_name)}
  if(r.mode==='7'){
    lines.push('7th nurse: '+r.seventh);
    if(plan.requiresSeventhDecision)lines.push('7th rotation decision: not yet confirmed');
    else if(plan.seventhChoice&&plan.seventhChoice.source==='permanent'&&plan.seventhDecision==='rotation')lines.push('7th rotation: '+plan.seventhNurse+' moved from '+allocationLabel(plan.seventhVacatedKey)+'; overtime fills the vacated role');
    else if(plan.seventhChoice&&plan.seventhChoice.source==='permanent')lines.push('7th rotation not used: '+plan.seventhNurse+' remains in '+allocationLabel(plan.seventhVacatedKey)+'; overtime fills the seventh position');
  }
  if(extras.length)lines.push('Additional staff as required: '+extras.map(function(o){return o.nurse_name}).join(' + '));
  if(changes.length){lines.push('','ABSENCES');changes.forEach(function(c){lines.push(c.absent_name+' • Unavailable')})}
  if(overtime.length){lines.push('','OVERTIME NURSES');overtime.forEach(function(o){var allocated=plan.availableKeys.indexOf(o.allocation_key)>=0,extra=extras.some(function(x){return x.id===o.id});lines.push(o.nurse_name+' • '+(extra?'additional staff as required':allocated?allocationLabel(o.allocation_key):'allocation to decide'))})}
  lines.push('','BREAKS','First break: '+(b.first.join(' + ')||'Pending'),'Second break: '+(b.second.join(' + ')||'Pending'));Array.prototype.push.apply(lines,b.notes);
  if(r.notes)lines.push('','Notes: '+r.notes);
  window.location.href='mailto:?bcc='+encodeURIComponent(EMAIL_RECIPIENTS.join(','))+'&subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(lines.join('\n'));
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
    html+='<div class="row"><div class="lab">First part</div><div><span class="tag tFirst">'+esc(r.first1)+'</span><span class="tag tFirst">'+esc(r.first2)+'</span></div></div><div class="row"><div class="lab">Second part</div><div><span class="tag tSecond">'+esc(r.second1)+'</span><span class="tag tSecond">'+esc(r.second2)+'</span></div></div>';
    if(count<5)html+='<div class="row"><div class="lab">Status</div><div><b>Additional overtime cover required</b></div></div>';
    else if(r.mode==='5')html+='<div class="row"><div class="lab">Full LW / Pager</div><div><span class="tag tFull">'+esc(r.fullLW)+'</span></div></div>';
    else{html+='<div class="row"><div class="lab">Pager</div><div><span class="tag tPager">'+esc(r.pager)+'</span></div></div><div class="row"><div class="lab">Reliever</div><div><span class="tag tRel">'+esc(r.reliever)+'</span></div></div>';var order=labourOrderFor(r);if(order)html+='<div class="row"><div class="lab">LW first part</div><div><b>'+esc(order.first_part_name)+'</b> • Second break</div></div><div class="row"><div class="lab">LW second part</div><div><b>'+esc(order.second_part_name)+'</b> • First break</div></div>'}
    if(r.mode==='7')html+='<div class="row"><div class="lab">7th nurse</div><div><span class="tag t7">'+esc(r.seventh)+'</span></div></div>';
    if(extras.length)html+='<div class="row"><div class="lab">Additional</div><div>'+extras.map(function(o){return '<b>'+esc(o.nurse_name)+'</b> • as required'}).join('<br>')+'</div></div>';
    if(changes.length)html+='<div class="row"><div class="lab">Absences</div><div>'+changes.map(function(c){return esc(c.absent_name)+' • <b>'+esc(c.reason||'Unavailable')+'</b>'}).join('<br>')+'</div></div>';
    if(overtime.length)html+='<div class="row"><div class="lab">Overtime</div><div>'+overtime.map(function(o){var allocated=plan.availableKeys.indexOf(o.allocation_key)>=0,extra=extras.some(function(x){return x.id===o.id});return '<b>'+esc(o.nurse_name)+'</b> • '+(extra?'as required':allocated?esc(allocationLabel(o.allocation_key)):'allocation to decide')}).join('<br>')+'</div></div>';
    if(r.notes)html+='<div class="row"><div class="lab">Notes</div><div>'+esc(r.notes)+'</div></div>';html+='</article>';
  });
  byId('cards').innerHTML=html||'<div class="notice">No results.</div>';
  Array.prototype.forEach.call(document.querySelectorAll('.card[data-i]'),function(el){var open=function(){idx=Number(el.getAttribute('data-i'));show('today')};el.onclick=open;el.onkeydown=function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}}});highlightNamed('cards','.tag');
}

function requireOnline(){
  if(navigator.onLine)return true;
  setSync('offline','Offline');toast('You are offline. Your entries remain on screen and can be saved after reconnecting.');return false;
}

function formMessage(id,message,state){
  var el=byId(id);if(!el)return;
  el.textContent=message||'';el.className='formMessage'+(state?' '+state:'');
}

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

async function saveAbsenceCompatibility(base,absent,reason){
  var now=new Date().toISOString(),who=currentUserProfile.display_name;
  var saved=await supa.from('night_changes').upsert({roster_date:base.date,absent_name:absent,replacement_name:null,reason:reason,updated_by:who,updated_at:now},{onConflict:'roster_date,absent_name'});
  if(saved.error)return saved;
  var history=await supa.from('night_change_history').insert({roster_date:base.date,action:'saved',absent_name:absent,replacement_name:null,reason:reason,changed_by:who,changed_at:now});
  if(history.error)return{error:history.error,partial:true};
  return{error:null,compatibility:true};
}

async function saveOvertimeCompatibility(base,name){
  var now=new Date().toISOString(),who=currentUserProfile.display_name;
  var saved=await supa.from('night_overtime').insert({roster_date:base.date,nurse_name:name,allocation_key:null,updated_by:who,updated_at:now});
  if(saved.error)return saved;
  var history=await supa.from('night_overtime_history').insert({roster_date:base.date,action:'added',nurse_name:name,previous_allocation_key:null,allocation_key:null,changed_by:who,changed_at:now});
  if(history.error)return{error:history.error,partial:true};
  return{error:null,compatibility:true};
}

function rpcError(result,messageId){
  if(!result||!result.error)return false;
  var message=(result.error.message||'').toLowerCase();
  setSync('error','Save failed');
  var notice=result.partial?'The staffing entry was saved, but its history entry failed. Please tell the administrator.':result.error.code==='42501'||message.indexOf('permission denied')>=0||message.indexOf('row-level security')>=0?'Your signed-in account does not currently have permission to save staffing changes.':message.indexOf('duplicate')>=0||result.error.code==='23505'?'That nurse is already recorded for this night.':'The database rejected the change: '+(result.error.message||'unknown database error');
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
    if(missingRpc(result))result=await timedRequest(saveAbsenceCompatibility(base,absent,reason));
    if(rpcError(result,'absenceFormMessage'))return;
    byId('absentName').value='';formMessage('absenceFormMessage',absent+' saved as absent.','success');
    try{await loadSharedData()}catch(refreshError){scheduleSharedReload()}
    formMessage('absenceFormMessage',absent+' saved as absent.','success');highlightSavedItem('changeList',absent,'data-absence-name');toast('Absence saved for '+absent,{label:'Undo',run:function(){return undoAddedAbsence(base.date,absent)}});
  }catch(error){setSync('error','Save failed');formMessage('absenceFormMessage','No response was received. Your selection is still here, so tap Save again.','error');toast('Absence was not saved. Please try again.');}
  finally{byId('saveChangeBtn').textContent='Save absence';updateOfflineControls()}
}

function recordAlreadyRemoved(result){
  if(!result||!result.error)return false;
  var message=(result.error.message||'').toLowerCase();
  return message.indexOf('no longer exists')>=0||message.indexOf('not found')>=0;
}

async function undoAddedAbsence(date,name){var item=(nightChanges[date]||[]).find(function(entry){return sameNurse(entry.absent_name,name)});if(!item){toast('That absence has already changed');return}setSync('saving','Undoing absence');var base=baseForDate(date),result=await supa.rpc('remove_night_absence_v25',{p_change_id:item.id,p_allocation_key:allocationKeyForName(base,item.absent_name),p_changed_by:currentUserProfile.display_name});if(missingRpc(result))result=await supa.from('night_changes').delete().eq('id',item.id);if(rpcError(result))return;await loadSharedData();toast('Absence undone')}

async function undoRemovedAbsence(date,item){setSync('saving','Restoring absence');var result=await supa.rpc('record_night_absence_v25',{p_roster_date:date,p_absent_name:item.absent_name,p_reason:item.reason||'Leave',p_changed_by:currentUserProfile.display_name});if(missingRpc(result))result=await saveAbsenceCompatibility(baseForDate(date),item.absent_name,item.reason||'Leave');if(rpcError(result))return;await loadSharedData();toast('Absence restored')}

async function undoAddedOvertime(date,name){var item=(nightOvertime[date]||[]).find(function(entry){return sameNurse(entry.nurse_name,name)});if(!item){toast('That overtime entry has already changed');return}setSync('saving','Undoing overtime');var result=await supa.rpc('remove_night_overtime_v25',{p_overtime_id:item.id,p_changed_by:currentUserProfile.display_name});if(missingRpc(result))result=await supa.from('night_overtime').delete().eq('id',item.id);if(rpcError(result))return;await loadSharedData();toast('Overtime addition undone')}

async function undoRemovedOvertime(date,item){setSync('saving','Restoring overtime nurse');var result=await supa.rpc('add_night_overtime_v25',{p_roster_date:date,p_nurse_name:item.nurse_name,p_changed_by:currentUserProfile.display_name});if(missingRpc(result))result=await saveOvertimeCompatibility(baseForDate(date),item.nurse_name);if(rpcError(result))return;await loadSharedData();toast('Overtime nurse restored')}

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
    await loadSharedData();if(recordAlreadyRemoved(result))toast('Absence was already removed and the list has been refreshed');else toast('Absence removed',{label:'Undo',run:function(){return undoRemovedAbsence(base.date,item)}});
  }catch(error){setSync('error','Remove failed');toast('The absence could not be removed. Please try again.');}
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
    if(missingRpc(result))result=await timedRequest(saveOvertimeCompatibility(base,name));
    if(rpcError(result,'overtimeFormMessage'))return;
    byId('overtimeName').value='';rememberOvertimeName(name);formMessage('overtimeFormMessage',name+' added for overtime.','success');
    try{await loadSharedData()}catch(refreshError){scheduleSharedReload()}
    formMessage('overtimeFormMessage',name+' added for overtime.','success');highlightSavedItem('overtimeList',name,'data-overtime-name');toast(name+' added for overtime',{label:'Undo',run:function(){return undoAddedOvertime(base.date,name)}});
  }catch(error){setSync('error','Save failed');formMessage('overtimeFormMessage','No response was received. The name remains here, so tap Add overtime again.','error');toast('Overtime nurse was not saved. Please try again.');}
  finally{byId('addOvertimeBtn').textContent='Add overtime';updateOfflineControls()}
}

async function removeOvertime(id,button){
  if(!requireOnline())return;
  if(pendingRemovals[id])return;
  var base=cur(),entry=overtimeFor(base.date).find(function(o){return o.id===id});
  if(!entry||!confirm('Remove '+entry.nurse_name+' from tonight\'s overtime list?'))return;
  pendingRemovals[id]=true;if(button){button.disabled=true;button.textContent='Removing…'}setSync('saving','Removing overtime nurse');
  try{
    var result=await timedRequest(supa.rpc('remove_night_overtime_v25',{p_overtime_id:id,p_changed_by:currentUserProfile.display_name}));
    if(result&&result.error&&!recordAlreadyRemoved(result)){rpcError(result);return}
    await loadSharedData();if(recordAlreadyRemoved(result))toast(entry.nurse_name+' was already removed and the list has been refreshed');else toast(entry.nurse_name+' removed from overtime',{label:'Undo',run:function(){return undoRemovedOvertime(base.date,entry)}});
  }catch(error){setSync('error','Remove failed');toast('The overtime nurse could not be removed. Please try again.');}
  finally{delete pendingRemovals[id];if(button&&button.isConnected){button.disabled=false;button.textContent='Remove'}}
}

async function saveFiveCover(){
  if(!requireOnline())return;
  var base=cur(),plan=staffingPlan(base),pick=byId('fiveCoverPick'),key=pick&&pick.value;
  if(!key||plan.coverageChoices.indexOf(key)<0){toast('Choose the allocation the reliever will cover');return}
  setSync('saving','Saving reliever allocation');
  var result=await supa.rpc('apply_staffing_allocations_v25',{p_roster_date:base.date,p_action:'reliever',p_coverage_key:key,p_assignments:null,p_changed_by:currentUserProfile.display_name,p_reliever_name:base.reliever});
  if(rpcError(result))return;await loadSharedData();toast(base.reliever+' saved before the overtime allocations');
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

async function saveAllocationsCompatibility(base,chosen,writeHistory){
  var who=currentUserProfile.display_name,now=new Date().toISOString(),before=overtimeFor(base.date).slice(),desired=desiredAllocationsById(chosen);
  var cleared=await supa.from('night_overtime').update({allocation_key:null,updated_by:who,updated_at:now}).eq('roster_date',base.date);
  if(cleared.error)return cleared;
  for(var key in chosen){
    var saved=await supa.from('night_overtime').update({allocation_key:key,updated_by:who,updated_at:now}).eq('id',chosen[key]).eq('roster_date',base.date);
    if(saved.error)return saved;
  }
  var check=await readStoredAllocations(base.date,chosen);
  if(check.error)return check;
  if(!check.matches)return{error:{message:'The database did not retain the selected allocation values.'}};
  if(writeHistory){
    var audit=before.filter(function(o){return(o.allocation_key||null)!==(desired[o.id]||null)}).map(function(o){var next=desired[o.id]||null,action=o.allocation_key&&next?'reallocated':next?'allocated':'unallocated';return{roster_date:base.date,action:action,nurse_name:o.nurse_name,previous_allocation_key:o.allocation_key||null,allocation_key:next,changed_by:who,changed_at:now}});
    if(audit.length){var history=await supa.from('night_overtime_history').insert(audit);if(history.error)return{error:history.error,partial:true}}
  }
  return{error:null,compatibility:true};
}

async function saveFinalAllocationsV2510(event){
  if(event&&event.preventDefault)event.preventDefault();
  if(allocationSaveInFlight)return false;
  var button=byId('saveAllocationsBtn'),base,chosen={},used={},chosenCount=0,labourChoice=null,confirmationOnly=false;
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
    var firstPick=byId('labourFirstPick');
    if(firstPick){
      var labourNames=JSON.parse(firstPick.getAttribute('data-labour-names')||'[]'),first=firstPick.value,second=labourNames.find(function(name){return name!==first})||'';
      if(!first||!second||first===second){formMessage('allocationFormMessage','Choose who works the Labour Ward first part.','error');toast('Complete the Labour Ward order before saving');return false}
      labourChoice={first:first,second:second};
    }
    confirmationOnly=!chosenCount&&!labourChoice&&currentPlan.coreComplete&&!currentPlan.requiresCoverageChoice&&!currentPlan.requiresSeventhDecision&&!currentPlan.unresolved.length;
    if(!chosenCount&&!labourChoice&&!confirmationOnly){formMessage('allocationFormMessage','Complete the remaining allocation decisions before confirming the plan.','error');toast('The plan is not ready to confirm');return false}
    allocationSaveInFlight=true;setSync('saving','Saving tonight\'s allocations');button.disabled=true;button.textContent='Saving…';formMessage('allocationFormMessage',labourChoice?'Saving allocations and Labour Ward parts…':'Saving '+chosenCount+' allocation'+(chosenCount===1?'':'s')+'…','');
    var expectedRevision=nightPlanStatuses[base.date]?Number(nightPlanStatuses[base.date].revision||0):0;
    var atomicResult=await timedRequest(supa.rpc('finalise_night_plan_v26',{p_roster_date:base.date,p_assignments:chosenCount?chosen:{},p_labour_first:labourChoice?labourChoice.first:null,p_labour_second:labourChoice?labourChoice.second:null,p_changed_by:currentUserProfile.display_name,p_expected_revision:expectedRevision}));
    if(!missingRpc(atomicResult)){
      if(atomicResult&&atomicResult.error&&/changed on another device|revision conflict/i.test(atomicResult.error.message||'')){formMessage('allocationFormMessage','Tonight\'s plan changed on another device. The latest version has been loaded, so please review it and confirm again.','error');toast('A newer plan was loaded for review');await loadSharedData();return false}
      if(rpcError(atomicResult,'allocationFormMessage'))return false;
    }else if(confirmationOnly){formMessage('allocationFormMessage','The final confirmation service is unavailable. Ask the administrator to run the V26 database upgrade.','error');toast('Plan confirmation is unavailable');return false
    }else if(chosenCount){
      var result=await timedRequest(supa.rpc('apply_staffing_allocations_v25',{p_roster_date:base.date,p_action:'allocations',p_coverage_key:null,p_assignments:chosen,p_changed_by:currentUserProfile.display_name,p_reliever_name:base.reliever}));
      var usedCompatibility=false;
      if(missingRpc(result)){result=await timedRequest(saveAllocationsCompatibility(base,chosen,true));usedCompatibility=true}
      if(rpcError(result,'allocationFormMessage'))return false;
      if(!usedCompatibility){
        var check=await timedRequest(readStoredAllocations(base.date,chosen));
        if(check.error){rpcError(check,'allocationFormMessage');return false}
        if(!check.matches){
          result=await timedRequest(saveAllocationsCompatibility(base,chosen,false));
          if(rpcError(result,'allocationFormMessage'))return false;
        }
      }
    }
    if(missingRpc(atomicResult)&&labourChoice){
      var labourResult=await timedRequest(supa.from('night_labour_order').upsert({roster_date:base.date,first_part_name:labourChoice.first,second_part_name:labourChoice.second,updated_by:currentUserProfile.display_name,updated_at:new Date().toISOString()},{onConflict:'roster_date'}));
      if(rpcError(labourResult,'allocationFormMessage'))return false;
    }
    delete allocationDrafts[base.date];delete labourOrderDrafts[base.date];delete seventhDecisionDrafts[base.date];await loadSharedData();var plan=staffingPlan(baseForDate(base.date)),saved=chosenCount-plan.unresolved.filter(function(key){return Object.prototype.hasOwnProperty.call(chosen,key)}).length;
    var success=plan.unresolved.length?(saved?saved+' allocation'+(saved===1?'':'s')+' saved':'Labour Ward parts saved')+' • '+plan.unresolved.length+' still to decide':confirmationOnly?'Tonight\'s plan confirmed for everyone':labourChoice&&chosenCount?'Tonight\'s plan published for everyone':labourChoice?'Labour Ward order published for everyone':additionalNurses(plan).length?'Core plan published; additional staff remain as required':'Tonight\'s plan published for everyone';
    formMessage('allocationFormMessage',success,'success');toast(success);return false;
  }catch(error){setSync('error','Save failed');formMessage('allocationFormMessage','Save stopped: '+(error&&error.message==='timeout'?'the connection timed out. Your selections are still here, so please try again.':'the allocations could not be confirmed. Your selections are still here, so please try again.'),'error');toast('The allocations could not be saved. Your selections remain available to retry.');return false}
  finally{allocationSaveInFlight=false;if(button&&button.isConnected){button.disabled=false;button.textContent='Confirm and share changes'}updateOfflineControls()}
}

async function loadNightHistory(date,renderAfter){
  if(!date||historyLoadingDates[date])return;
  historyLoadingDates[date]=true;
  var results=await Promise.all([supa.from('night_change_history').select('*').eq('roster_date',date).order('changed_at',{ascending:false}),supa.from('night_overtime_history').select('*').eq('roster_date',date).order('changed_at',{ascending:false}),nightRoleOverrideAvailable?supa.from('night_role_override_history').select('*').eq('roster_date',date).order('changed_at',{ascending:false}):Promise.resolve({data:[],error:null})]);
  delete historyLoadingDates[date];
  if(results.some(function(x){return x.error}))return;
  changeHistory[date]=results[0].data||[];overtimeHistory[date]=results[1].data||[];roleOverrideHistory[date]=results[2].data||[];historyLoadedDates[date]=true;
  if(renderAfter!==false&&currentUserProfile&&cur().date===date)renderChanges(cur());
}

function ensureNightHistory(date){if(!historyLoadedDates[date])loadNightHistory(date,true)}

async function loadSharedData(){
  if(sharedLoadPromise){sharedReloadPending=true;return sharedLoadPromise}
  document.body.classList.add('dataRefreshing');
  sharedLoadPromise=(async function(){
    var results=await Promise.all([supa.from('night_changes').select('*').order('updated_at',{ascending:true}),supa.from('night_overtime').select('*').order('updated_at',{ascending:true}),supa.from('night_five_cover').select('*'),supa.from('roster_settings').select('*').eq('id',1).maybeSingle(),supa.from('rotation_versions').select('*').order('effective_from',{ascending:true}),supa.from('night_labour_order').select('*'),supa.from('app_settings').select('*').eq('id',1).maybeSingle(),supa.from('night_plan_status').select('*'),supa.from('app_schema_version').select('*').eq('id',1).maybeSingle(),supa.from('night_role_overrides').select('*')]);
    if(results.slice(0,5).some(function(x){return x.error})){if(!navigator.onLine&&restoreOfflineSnapshot())return;setSync('error','Shared data unavailable');toast('The shared roster could not be refreshed. Your last saved view remains available.');restoreOfflineSnapshot();return}
    nightChanges={};(results[0].data||[]).forEach(function(c){(nightChanges[c.roster_date]||(nightChanges[c.roster_date]=[])).push(c)});
    nightOvertime={};(results[1].data||[]).forEach(function(o){(nightOvertime[o.roster_date]||(nightOvertime[o.roster_date]=[])).push(o)});
    fiveCoverChoices={};(results[2].data||[]).forEach(function(c){fiveCoverChoices[c.roster_date]=c});
    if(results[3].data)rosterSettings=results[3].data;if((results[4].data||[]).length)rotationVersions=results[4].data;
    labourOrderAvailable=!results[5].error;labourOrders={};if(labourOrderAvailable)(results[5].data||[]).forEach(function(order){labourOrders[order.roster_date]=order});
    if(!results[6].error&&results[6].data){appSettings=results[6].data;EMAIL_RECIPIENTS=appSettings.email_recipients||EMAIL_RECIPIENTS}
    nightPlanStatuses={};if(!results[7].error)(results[7].data||[]).forEach(function(status){nightPlanStatuses[status.roster_date]=status});
    schemaVersion=!results[8].error&&results[8].data?Number(results[8].data.version||0):0;
    nightRoleOverrideAvailable=!results[9].error;nightRoleOverrides={};if(nightRoleOverrideAvailable)(results[9].data||[]).forEach(function(item){nightRoleOverrides[item.roster_date]=item});
    rebuildCalculatedRoster();
    if(!initialNightChosen){idx=startingIndex();automaticSelectedDate=R[idx].date;initialNightChosen=true}
    else{var selected=localStorage.getItem('anaes_selected_date'),selectedIdx=selected?R.findIndex(function(r){return r.date===selected}):-1;idx=selectedIdx>=0?selectedIdx:Math.min(idx,R.length-1)}
    await loadNightHistory(R[idx].date,false);lastSuccessfulSyncAt=new Date().toISOString();saveOfflineSnapshot();setSync('','Live and up to date');render();renderDiagnostics();
  })();
  try{await sharedLoadPromise}finally{document.body.classList.remove('dataRefreshing');sharedLoadPromise=null;if(sharedReloadPending){sharedReloadPending=false;setTimeout(loadSharedData,120)}}
}

function scheduleSharedReload(){clearTimeout(reloadTimer);reloadTimer=setTimeout(loadSharedData,350)}

function subscribeToChanges(){
  if(changesChannel)supa.removeChannel(changesChannel);
  var tables=['night_changes','night_overtime','night_change_history','night_overtime_history','night_five_cover','roster_settings','rotation_versions','night_plan_status','app_settings'];if(labourOrderAvailable)tables.push('night_labour_order');if(nightRoleOverrideAvailable)tables.push('night_role_overrides','night_role_override_history');
  changesChannel=supa.channel('roster-live-v31');
  tables.forEach(function(table){changesChannel.on('postgres_changes',{event:'*',schema:'public',table:table},function(payload){
    if(table==='night_change_history'||table==='night_overtime_history'||table==='night_role_override_history'){
      var date=(payload.new&&payload.new.roster_date)||(payload.old&&payload.old.roster_date);if(date){historyLoadedDates[date]=false;if(currentUserProfile&&cur().date===date)ensureNightHistory(date)}
    }else scheduleSharedReload();
  })});
  changesChannel.subscribe(function(status){if(status==='SUBSCRIBED')setSync('','Live and up to date');else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')setSync('error','Connection problem')});
}

function updateOfflineControls(){
  var offline=!navigator.onLine,ids=['saveChangeBtn','addOvertimeBtn','saveAllocationsBtn','saveNightRolesBtn','resetNightRolesBtn','saveTeamVersionBtn','previewExtendBtn','extendBtn','addAccountBtn'];
  ids.forEach(function(id){var el=byId(id);if(el)el.disabled=offline||el.dataset.workflowBlocked==='true'});
  var cover=byId('saveFiveCoverBtn');if(cover)cover.disabled=offline;
  var labour=byId('saveLabourOrderBtn');if(labour)labour.disabled=offline;
}

function updateNetworkStatus(){
  if(!navigator.onLine)setSync('offline','Offline • entries stay on screen');else if(currentUserProfile)setSync('','Live and up to date');
  updateOfflineControls();
}

function chooseDate(inputId){
  var value=byId(inputId).value;if(!value){render();return}
  if(value<R[0].date){idx=0;toast('The published roster begins on '+fmt(R[0].date));render();return}
  if(value>R[R.length-1].date){idx=R.length-1;toast('The roster is currently published only until '+fmt(R[R.length-1].date));render();return}
  var i=R.findIndex(function(r){return r.date>=value});idx=i<0?R.length-1:i;if(R[idx].date!==value)toast('Next rostered night: '+fmt(R[idx].date));render();
}

function csvCell(value){return '"'+String(value==null?'':value).replaceAll('"','""')+'"'}

function exportCSV(){
  var headers=['Date','Actual nurse count','Status','First part','Second part','Pager','Reliever','Full LW / Pager','7th nurse','Additional staff','Absences','Overtime','Reliever cover choice','Notes'];
  var rows=R.map(function(original){
    var base=Object.assign({},original);base.mode='6';var r=applyChanges(base),plan=staffingPlan(base),extras=additionalNurses(plan),changes=changesFor(base.date),overtime=overtimeFor(base.date);
    return[base.date,plan.count,planIsProvisional(base)?'Provisional':extras.length?'Core finalised; additional staff as required':'Final',r.first1+' + '+r.first2,r.second1+' + '+r.second2,r.mode==='5'?'':r.pager,r.mode==='5'?'':r.reliever,r.mode==='5'?r.fullLW:'',r.mode==='7'?r.seventh:'',extras.map(function(o){return o.nurse_name}).join(' + '),changes.map(function(c){return c.absent_name+' ('+(c.reason||'Unavailable')+')'}).join('; '),overtime.map(function(o){return o.nurse_name+' ('+(o.allocation_key?allocationLabel(o.allocation_key):'Awaiting allocation')+')'}).join('; '),plan.coverageKey?allocationLabel(plan.coverageKey):'',r.notes||''].map(csvCell).join(',');
  });
  download('anaesthetic-roster-v26.csv',headers.map(csvCell).join(',')+'\n'+rows.join('\n'),'text/csv');
}

async function backup(){
  if(!requireOnline())return;
  toast('Preparing complete backup');
  var allHistory=await Promise.all([supa.from('night_change_history').select('*').order('changed_at',{ascending:false}),supa.from('night_overtime_history').select('*').order('changed_at',{ascending:false})]);
  if(allHistory.some(function(x){return x.error})){toast('The complete backup could not be prepared');return}
  var createdAt=new Date().toISOString();download('roster-backup-v26.json',JSON.stringify({created_at:createdAt,app_version:APP_VERSION,roster_settings:rosterSettings,rotation_versions:rotationVersions,night_changes:nightChanges,night_overtime:nightOvertime,absence_history:allHistory[0].data||[],overtime_history:allHistory[1].data||[],five_nurse_cover:fiveCoverChoices,labour_ward_orders:Object.values(labourOrders),night_plan_statuses:Object.values(nightPlanStatuses),app_settings:appSettings,authorised_accounts:authorisedAccounts},null,2),'application/json');localStorage.setItem('anaes_last_backup_at',createdAt);renderDiagnostics();
}

function showUpdate(registration){updateRegistration=registration;byId('updateBanner').classList.remove('hidden')}

function setupPWA(){
  var install=byId('installBtn');
  window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();deferredInstallPrompt=e;install.classList.remove('hidden')});
  install.onclick=async function(){if(deferredInstallPrompt){deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;install.classList.add('hidden');return}showInstallGuide()};
  window.addEventListener('appinstalled',function(){deferredInstallPrompt=null;install.classList.add('hidden');toast('App installed')});
  byId('applyUpdateBtn').onclick=function(){if(updateRegistration&&updateRegistration.waiting){reloadForUpdate=true;updateRegistration.waiting.postMessage({type:'ACTIVATE_UPDATE'})}};
  if('serviceWorker' in navigator){
    navigator.serviceWorker.addEventListener('controllerchange',function(){if(reloadForUpdate)window.location.reload()});
    var check=function(){if(updateRegistration&&navigator.onLine)updateRegistration.update().catch(function(){})};
    window.addEventListener('load',async function(){try{updateRegistration=await navigator.serviceWorker.register('./service-worker.js',{updateViaCache:'none'});if(updateRegistration.waiting)showUpdate(updateRegistration);updateRegistration.addEventListener('updatefound',function(){var worker=updateRegistration.installing;if(!worker)return;worker.addEventListener('statechange',function(){if(worker.state==='installed'&&navigator.serviceWorker.controller)showUpdate(updateRegistration)})});await updateRegistration.update();setInterval(check,900000)}catch(e){}});
    window.addEventListener('focus',check);document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')check()});
  }
  var closeInstall=byId('closeInstallGuide'),closeRelease=byId('closeReleaseNotes'),releaseDialog=byId('releaseNotes');if(closeInstall)closeInstall.onclick=function(){byId('installGuide').close()};if(closeRelease)closeRelease.onclick=function(){releaseDialog.close()};if(releaseDialog)releaseDialog.addEventListener('close',function(){releaseNotesQueued=false;showOnboardingIfNeeded()});showReleaseNotesIfNeeded();
  var ios=/iphone|ipad|ipod/i.test(navigator.userAgent),standalone=window.navigator.standalone||(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches);if(ios&&!standalone)install.classList.remove('hidden');
}

async function authorizeUser(user){
  if(!user)return showAuth();currentUser=user;
  var result=await supa.from('allowed_users').select('email,display_name,user_role,active').eq('email',user.email.toLowerCase()).maybeSingle();
  if(result.error&&!navigator.onLine){try{var cached=JSON.parse(localStorage.getItem('anaes_cached_profile')||'null');if(cached&&cached.email===user.email.toLowerCase()&&cached.active)result={data:cached,error:null}}catch(error){}}
  if(result.error||!result.data||!result.data.active){await supa.auth.signOut();currentUser=null;currentUserProfile=null;showAuth(result.error?'Night Roster could not check your access. Reconnect and try again.':'This email has not been approved for Night Roster. Ask the roster administrator to add it.',true);return}
  try{localStorage.setItem('anaes_cached_profile',JSON.stringify(result.data))}catch(error){}
  currentUserProfile=result.data;byId('authGate').classList.add('hidden');document.body.classList.remove('authPending');
  var isAdmin=result.data.user_role==='admin';byId('adminSettingsBtn').classList.toggle('hidden',!isAdmin);document.querySelector('.bottom').style.gridTemplateColumns='repeat(3,minmax(0,1fr))';
  byId('accountBtn').title=result.data.display_name+' · Open account';byId('accountInitial').textContent=(result.data.display_name||result.data.email).charAt(0).toUpperCase();
  await Promise.all([loadSharedData(),loadOwnProfile()]);subscribeToChanges();if(isAdmin)await loadAccounts();showOnboardingIfNeeded();
}

function bind(){
  initTheme();prepareChangesView();setupPWA();bindOnboarding();window.addEventListener('online',function(){updateNetworkStatus();scheduleSharedReload()});window.addEventListener('offline',updateNetworkStatus);document.addEventListener('visibilitychange',function(){refreshAutomaticNightOnReturn();if(document.visibilityState==='visible'&&currentUserProfile&&navigator.onLine&&Date.now()-lastResumeRefresh>30000){lastResumeRefresh=Date.now();scheduleSharedReload()}});setInterval(refreshAutomaticNightOnReturn,60000);
  byId('loginTab').onclick=function(){setAuthMode('login')};byId('signupTab').onclick=function(){setAuthMode('signup')};byId('authSubmitBtn').onclick=submitAuth;byId('authPasskeyBtn').onclick=signInWithPasskey;byId('authPasskeyBtn').classList.toggle('hidden',!passkeySupported());byId('forgotPasswordBtn').onclick=requestPasswordReset;byId('cancelRecoveryBtn').onclick=function(){setAuthMode('login')};byId('authPassword').onkeydown=function(e){if(e.key==='Enter')submitAuth()};byId('authPasswordConfirm').onkeydown=function(e){if(e.key==='Enter')submitAuth()};
  byId('accountBtn').onclick=showAccountSheet;byId('closeAccountSheet').onclick=function(){byId('accountSheet').close()};byId('accountSignOutBtn').onclick=function(){byId('accountSheet').close();signOutUser()};byId('saveProfileBtn').onclick=saveProfile;byId('profilePhotoButton').onclick=function(){byId('profilePhotoInput').click()};byId('changeProfilePhoto').onclick=function(){byId('profilePhotoInput').click()};byId('profilePhotoInput').onchange=function(){if(this.files&&this.files[0])chooseProfilePhoto(this.files[0]);this.value=''};byId('removeProfilePhoto').onclick=removeProfilePhoto;byId('addPasskeyBtn').onclick=addPasskey;byId('accountOnboardingBtn').onclick=function(){byId('accountSheet').close();localStorage.removeItem('anaes_onboarding_complete_v34');onboardingCandidate=true;onboardingStep=0;renderOnboarding();byId('onboardingDialog').showModal()};byId('accountInstallBtn').onclick=async function(){byId('accountSheet').close();if(deferredInstallPrompt){deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;byId('installBtn').classList.add('hidden')}else showInstallGuide()};Array.prototype.forEach.call(document.querySelectorAll('[data-theme-choice]'),function(button){button.onclick=function(){setThemePreference(button.getAttribute('data-theme-choice'))}});byId('adminSettingsBtn').onclick=function(){activeAdminTab='overview';show('admin')};byId('closeAdminBtn').onclick=function(){show('today')};
  ['profileName','profileJobTitle'].forEach(function(id){byId(id).oninput=updateProfileSaveState});byId('profileRosterName').onchange=updateProfileSaveState;
  byId('saveChangeBtn').onclick=saveNightChange;byId('absentName').onchange=function(){markInvalid('absentName',false);formMessage('absenceFormMessage','');updateOfflineControls()};byId('addOvertimeBtn').onclick=saveOvertime;byId('saveAllocationsBtn').onclick=saveFinalAllocationsV2510;byId('overtimeName').oninput=function(){markInvalid('overtimeName',false);formMessage('overtimeFormMessage','')};byId('overtimeName').onkeydown=function(e){if(e.key==='Enter')saveOvertime()};byId('addAccountBtn').onclick=addAuthorisedAccount;
  byId('themeBtn').onclick=toggleTheme;byId('datePick').onchange=selectByDate;byId('changesDatePick').onchange=function(){chooseDate('changesDatePick')};byId('breakDatePick').onchange=selectBreakDate;byId('teamEffectiveDate').onchange=selectTeamEffectiveDate;byId('extendDate').onchange=selectExtendDate;
  byId('prevNightBtn').onclick=function(){changeNight(-1)};byId('nextNightBtn').onclick=function(){changeNight(1)};byId('changesPrevNightBtn').onclick=function(){changeNight(-1)};byId('changesNextNightBtn').onclick=function(){changeNight(1)};byId('breakPrevNightBtn').onclick=function(){changeNight(-1)};byId('breakNextNightBtn').onclick=function(){changeNight(1)};byId('teamPrevNightBtn').onclick=function(){changeNight(-1)};byId('teamNextNightBtn').onclick=function(){changeNight(1)};byId('extendPrevNightBtn').onclick=function(){changeExtendNight(-1)};byId('extendNextNightBtn').onclick=function(){changeExtendNight(1)};
  byId('myNamePick').onchange=changeMyName;byId('search').oninput=renderRoster;byId('filter').onchange=renderRoster;byId('copyBreaksBtn').onclick=copyBreaks;
  Array.prototype.forEach.call(document.querySelectorAll('.emailRosterBtn'),function(b){b.onclick=emailRoster});Array.prototype.forEach.call(document.querySelectorAll('[data-admin-tab]'),function(b){b.onclick=function(){switchAdminTab(b.getAttribute('data-admin-tab'))}});Array.prototype.forEach.call(document.querySelectorAll('[data-admin-open]'),function(b){b.onclick=function(){switchAdminTab(b.getAttribute('data-admin-open'))}});Array.prototype.forEach.call(document.querySelectorAll('[data-extend-months]'),function(b){b.onclick=function(){setExtendRange(Number(b.getAttribute('data-extend-months')))}});
  byId('previewExtendBtn').onclick=previewExtension;byId('extendBtn').onclick=extendRoster;byId('saveTeamVersionBtn').onclick=previewTeamChange;byId('exportBtn').onclick=exportCSV;byId('backupBtn').onclick=backup;
  Array.prototype.forEach.call(document.querySelectorAll('.bottom button'),function(b){b.onclick=function(){show(b.getAttribute('data-v'))}});updateOfflineControls();
}

bind();
initApplication();
