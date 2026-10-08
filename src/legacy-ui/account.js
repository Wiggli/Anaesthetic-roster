/* Account and Personalisation Studio source. Generated into app-ui.js by scripts/generate-runtime.mjs. */

var PERSONAL_ACCENT_COLOURS={teal:'#087970',blue:'#2563c4',violet:'#6748c8',rose:'#b33663',amber:'#945b0b',graphite:'#59616c'};
function normaliseAccentKey(value){value=String(value||'teal').toLowerCase();return PERSONAL_ACCENT_COLOURS[value]?value:'teal'}
function accentColourFor(value){return PERSONAL_ACCENT_COLOURS[normaliseAccentKey(value)]}
function shiftSymbolGlyph(value){return{spark:'✦',moon:'☾',cross:'✚',diamond:'◆',dot:'●',star:'★'}[String(value||'spark')]||'✦'}
window.shiftSymbolGlyph=shiftSymbolGlyph;
function identityInitials(value){
  var words=String(value||'').trim().split(/\s+/).filter(Boolean);
  if(!words.length)return'AT';
  if(words.length===1)return words[0].slice(0,2).toUpperCase();
  return(words[0].charAt(0)+words[words.length-1].charAt(0)).toUpperCase()
}
function nightTeamNickname(date){
  var row=nightTeamIdentityFor(date),value=row&&typeof row.nickname==='string'?row.nickname.trim():'';
  return value.slice(0,28)
}
window.nightTeamNickname=nightTeamNickname;
function shiftIdentityModel(date){
  var row=nightTeamIdentityFor(date),name=nightTeamNickname(date)||'Anaesthetic Team';
  return{name:name,tagline:row&&row.tagline||'',avatarPath:row&&row.avatar_path||'',accentKey:normaliseAccentKey(row&&row.accent_key),symbol:row&&row.symbol||'spark',initials:identityInitials(name),updatedBy:row&&row.updated_by||'',updatedAt:row&&row.updated_at||'',photoUrl:shiftAvatarUrl}
}
window.shiftIdentityModel=shiftIdentityModel;
window.shiftIdentityPhotoUrl=function(){return shiftAvatarUrl};
async function refreshShiftAvatar(){
  shiftAvatarUrl='';
  var row=nightTeamIdentityFor(''),path=row&&row.avatar_path;
  if(path&&supa&&currentUser&&navigator.onLine!==false){
    try{var result=await supa.storage.from('shift-identity').createSignedUrl(path,3600);if(!result.error&&result.data)shiftAvatarUrl=result.data.signedUrl||''}catch(error){}
  }
  return shiftAvatarUrl
}
window.refreshShiftAvatar=refreshShiftAvatar;
function renderNightTeamIdentityContext(date){
  var nickname=nightTeamNickname(date),row=nightTeamIdentityFor(date),model=shiftIdentityModel(date);
  Array.prototype.forEach.call(document.querySelectorAll('[data-night-team-identity]'),function(node){
    node.classList.toggle('hidden',!nickname);
    node.dataset.shiftAccent=model.accentKey;
    node.style.setProperty('--shift-identity-accent',accentColourFor(model.accentKey));
    node.textContent='';
    if(nickname){
      var mark=document.createElement('span');mark.className='shiftIdentityMark';
      if(shiftAvatarUrl){var image=document.createElement('img');image.src=shiftAvatarUrl;image.alt='';mark.appendChild(image)}
      else mark.textContent=shiftSymbolGlyph(model.symbol);
      var copy=document.createElement('span');copy.className='shiftIdentityCopy';
      var strong=document.createElement('strong');strong.textContent=nickname;copy.appendChild(strong);
      if(model.tagline){var small=document.createElement('small');small.textContent=model.tagline;copy.appendChild(small)}
      node.appendChild(mark);node.appendChild(copy);
    }
    node.title=nickname?(row&&row.updated_by?'Shift identity · shared across every roster night · updated by '+row.updated_by:'Shift identity · shared across every roster night'):'';
  });
  if(window.dispatchEvent&&typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('roster:night-team-identity',{detail:{date:date,nickname:nickname,tagline:model.tagline,accentKey:model.accentKey,symbol:model.symbol,photoUrl:shiftAvatarUrl,updatedBy:model.updatedBy,updatedAt:model.updatedAt}}))
}

function privateProfileName(){return currentPrivateProfile&&currentPrivateProfile.profile_name||currentUserProfile&&currentUserProfile.display_name||''}
function profileInitialText(name){
  var words=String(name||'').trim().split(/\s+/).filter(Boolean);
  if(!words.length)return'?';
  if(words.length===1)return words[0].slice(0,2).toUpperCase();
  return(words[0].charAt(0)+words[words.length-1].charAt(0)).toUpperCase()
}
function profileAvatarStyle(){var value=currentPrivateProfile&&currentPrivateProfile.avatar_style||'photo';return['photo','monogram','spark'].indexOf(value)>=0?value:'photo'}
function applyPersonalProfilePreferences(){
  var profile=currentPrivateProfile||{},accent=normaliseAccentKey(profile.accent_key),scale=['standard','large','xlarge'].indexOf(profile.text_scale)>=0?profile.text_scale:'standard',motion=profile.motion_pref==='reduced'?'reduced':'system';
  document.documentElement.style.setProperty('--personal-accent',accentColourFor(accent));
  document.body.setAttribute('data-personal-accent',accent);
  document.body.setAttribute('data-text-scale',scale);
  document.body.classList.toggle('personalMotionReduced',motion==='reduced');
}
window.applyPersonalProfilePreferences=applyPersonalProfilePreferences;

async function refreshProfileAvatar(){
  profileAvatarUrl='';var path=currentPrivateProfile&&currentPrivateProfile.avatar_path;
  if(path&&profileFeatureAvailable){var result=await supa.storage.from('profile-photos').createSignedUrl(path,3600);if(!result.error&&result.data)profileAvatarUrl=result.data.signedUrl||''}
  applyProfileIdentity();
}

function applyProfileIdentity(){
  if(!currentUserProfile)return;
  var name=privateProfileName(),style=profileAvatarStyle(),fallback=style==='spark'?'✦':profileInitialText(name||currentUserProfile.display_name||currentUserProfile.email||'?'),headerImage=byId('accountAvatar'),headerInitial=byId('accountInitial'),previewUrl=pendingProfilePhotoUrl||profileAvatarUrl,showPhoto=style==='photo'&&!!profileAvatarUrl;
  headerInitial.textContent=fallback;headerImage.classList.toggle('hidden',!showPhoto);headerInitial.classList.toggle('hidden',showPhoto);if(showPhoto)headerImage.src=profileAvatarUrl;
  byId('accountBtn').title=name+' · Open account';byId('accountBtn').style.setProperty('--personal-accent',accentColourFor(currentPrivateProfile&&currentPrivateProfile.accent_key));syncPrimaryHeaderActions();
  var preview=byId('profilePhotoPreview'),previewInitial=byId('profilePhotoInitial'),showPreview=style==='photo'&&!!previewUrl;
  if(preview){preview.classList.toggle('hidden',!showPreview);previewInitial.classList.toggle('hidden',showPreview);previewInitial.textContent=fallback;if(showPreview)preview.src=previewUrl}
  var remove=byId('removeProfilePhoto');if(remove){remove.classList.toggle('hidden',!profileAvatarUrl&&!pendingProfilePhoto);remove.textContent=pendingProfilePhoto?'Cancel photo':'Remove photo'}
  var homeAvatar=byId('accountHomeAvatar');if(homeAvatar)homeAvatar.textContent=fallback;
  applyPersonalProfilePreferences()
}

async function loadOwnProfile(){
  if(!currentUser)return;var result=await supa.from('user_profiles').select('user_id,profile_name,job_title,avatar_path,accent_key,text_scale,motion_pref,avatar_style,greeting_enabled,updated_at').eq('user_id',currentUser.id).maybeSingle();
  if(result.error){profileFeatureAvailable=false;currentPrivateProfile=null;applyPersonalProfilePreferences();return}
  profileFeatureAvailable=true;currentPrivateProfile=result.data||{user_id:currentUser.id,profile_name:'',job_title:'',avatar_path:null,accent_key:'teal',text_scale:'standard',motion_pref:'system',avatar_style:'photo',greeting_enabled:true};
  await refreshProfileAvatar();applyPersonalProfilePreferences();
}

function showProfileMessage(message,type){var el=byId('profileMessage');if(!el)return;el.textContent=message||'';el.className='formMessage'+(type?' '+type:'')}

function profileDraftSignature(){return JSON.stringify([(byId('profileName')&&byId('profileName').value||'').trim(),(byId('profileJobTitle')&&byId('profileJobTitle').value||'').trim(),byId('profileRosterName')&&byId('profileRosterName').value||'',byId('profileAccentKey')&&byId('profileAccentKey').value||'teal',byId('profileTextScale')&&byId('profileTextScale').value||'standard',byId('profileMotionPref')&&byId('profileMotionPref').value||'system',byId('profileAvatarStyle')&&byId('profileAvatarStyle').value||'photo',byId('profileGreetingEnabled')&&byId('profileGreetingEnabled').value||'1'])}

function updateProfileSaveState(){var button=byId('saveProfileBtn');if(!button)return;var changed=!!pendingProfilePhoto||profileDraftSignature()!==profileSavedSignature;button.classList.toggle('hidden',!changed);if(changed&&byId('profileMessage').classList.contains('success')&&!pendingProfilePhoto)showProfileMessage('')}

var accountPresentationPages={};
function accountElement(id){
  var node=document.getElementById(id);if(node)return node;
  var pages=Object.keys(accountPresentationPages);
  for(var i=0;i<pages.length;i++){var page=accountPresentationPages[pages[i]];if(page.id===id)return page;node=page.querySelector('[id="'+id+'"]');if(node)return node}
  return null
}
window.accountPresentationElement=accountElement;
function prepareAccountInformationArchitecture(){
  var dialog=byId('accountSheet'),scroll=dialog&&dialog.querySelector('.accountSheetScroll'),header=dialog&&dialog.querySelector('.accountSheetHeader');
  if(!dialog||!scroll||!header)return;
  if(accountPresentationPages.home)return;
  var profile=byId('profileExperience'),appearance=byId('appearanceExperience'),actions=byId('accountActionsExperience'),passkeys=byId('passkeyList');
  var panes={profile:profile,preferences:appearance&&appearance.closest('.accountGroup'),help:actions&&actions.closest('.accountGroup'),security:passkeys&&passkeys.closest('.accountGroup')};
  Object.keys(panes).forEach(function(key){var pane=panes[key];if(pane){pane.classList.add('accountDetailPane','accountPage');pane.classList.remove('hidden');pane.setAttribute('data-account-pane',key);accountPresentationPages[key]=pane}});
  var home=byId('accountHomeHub');
  if(home){
    var signOut=byId('accountSignOutBtn'),version=byId('accountVersion');if(signOut)home.appendChild(signOut);if(version)home.appendChild(version);
    Array.prototype.forEach.call(home.querySelectorAll('[data-account-section]'),function(button){button.onclick=function(){showAccountSection(button.getAttribute('data-account-section'))}});
    Array.prototype.forEach.call(home.querySelectorAll('[data-account-shortcut]'),function(button){button.onclick=function(){
      var action=button.getAttribute('data-account-shortcut');
      if(action==='notifications'){showAccountSection('notifications');return}
      if(action==='admin'){
        var account=byId('accountSheet');if(account&&account.open)account.close();
        var admin=byId('adminSettingsBtn');if(admin)admin.click();
        var close=byId('closeAdminBtn');if(close){close.textContent='Back to Account';close.onclick=function(){show('today');showAccountSheet()}}
      }
    }});
  }
  accountPresentationPages.home=home;
  var notifications=document.createElement('section');notifications.className='accountPage accountNotificationPage';notifications.setAttribute('data-account-pane','notifications');
  var card=document.getElementById('pushNotificationCard');if(card)notifications.appendChild(card);
  accountPresentationPages.notifications=notifications;
  var disclosure=document.querySelector('#chat .chatNotificationDisclosure');
  if(disclosure){var shortcut=document.createElement('button');shortcut.type='button';shortcut.className='chatNotificationShortcut';shortcut.textContent='Notification settings';shortcut.onclick=function(){showAccountSheet();showAccountSection('notifications')};disclosure.replaceWith(shortcut)}
  var outlet=document.createElement('div');outlet.id='accountPageOutlet';outlet.className='accountPageOutlet';
  scroll.replaceChildren(outlet);outlet.appendChild(home);
  if(!byId('accountBackBtn')){
    var back=document.createElement('button');back.type='button';back.id='accountBackBtn';back.className='accountBackBtn hidden';back.setAttribute('aria-label','Back to Account');back.textContent='‹';back.onclick=function(){showAccountSection('home')};header.insertBefore(back,header.firstChild)
  }
}
function showAccountSection(section){
  prepareAccountInformationArchitecture();
  var labels={profile:'Profile & shift',preferences:'Appearance',notifications:'Notifications',security:'Sign-in & security',help:'Help & sharing'},key=accountPresentationPages[section]?section:'home';
  var target=accountPresentationPages[key],outlet=byId('accountPageOutlet'),back=byId('accountBackBtn'),close=byId('closeAccountSheet'),title=byId('accountSheetTitle'),eyebrow=document.querySelector('#accountSheet .accountSheetHeader>div>span');
  if(outlet&&target)outlet.replaceChildren(target);
  var dialog=byId('accountSheet');if(dialog)dialog.dataset.accountPage=key;
  if(back)back.classList.toggle('hidden',key==='home');
  if(close)close.classList.toggle('hidden',key!=='home');
  if(title)title.textContent=key==='home'?'Account':labels[key];
  if(eyebrow)eyebrow.textContent=key==='home'?'Night Roster':'Account';
  var scroll=document.querySelector('#accountSheet .accountSheetScroll');if(scroll)scroll.scrollTop=0;
  if(key==='notifications'&&window.refreshPushSettings)window.refreshPushSettings();
  if(key!=='home'&&title){title.setAttribute('tabindex','-1');title.focus({preventScroll:true})}
}

function populateAccountSheet(){
  prepareAccountInformationArchitecture();
  var profile=currentPrivateProfile||{},name=privateProfileName(),rosterName=myName(),shift=shiftIdentityModel(cur&&cur().date);
  profileSavedSignature=JSON.stringify([(profile.profile_name||'').trim(),(profile.job_title||'').trim(),rosterName||'',profile.accent_key||'teal',profile.text_scale||'standard',profile.motion_pref||'system',profile.avatar_style||'photo',profile.greeting_enabled===false?'0':'1']);
  var accountVersion=byId('accountVersion');if(accountVersion)accountVersion.textContent='Night Roster '+APP_VERSION;
  var homeName=byId('accountHomeName'),homeRole=byId('accountHomeRole'),homeEmail=byId('accountHomeEmail'),homeAvatar=byId('accountHomeAvatar'),adminRow=byId('accountAdminHubRow');
  if(adminRow)adminRow.classList.toggle('hidden',!(currentUserProfile&&currentUserProfile.user_role==='admin'));
  if(homeName)homeName.textContent=name||currentUserProfile.display_name||'Your account';if(homeRole){homeRole.textContent=profile.job_title||'';homeRole.hidden=!profile.job_title;}if(homeEmail)homeEmail.textContent=currentUserProfile.email||'';if(homeAvatar)homeAvatar.textContent=profile.avatar_style==='spark'?'✦':profileInitialText(name||currentUserProfile.display_name||currentUserProfile.email||'?');
  showProfileMessage(profileFeatureAvailable?'':'Personal profile storage is not available yet.','error');updateProfileSaveState();updateAppearanceButtons();applyProfileIdentity();
  if(window.dispatchEvent&&typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('roster:account',{detail:{
    theme:themePreference(),installed:isStandaloneApp(),newRelease:releaseNeedsAttention(),version:APP_VERSION,
    profile:{name:profile.profile_name||'',jobTitle:profile.job_title||'',rosterName:rosterName||'',approvedName:currentUserProfile.display_name||'',email:currentUserProfile.email||'',options:TEAM.map(function(item){return{value:item,label:professionalName(item)}}),initial:profileInitialText(name||currentUserProfile.email||'?'),photoUrl:pendingProfilePhotoUrl||profileAvatarUrl||'',featureAvailable:profileFeatureAvailable,pendingPhoto:!!pendingProfilePhoto,message:profileFeatureAvailable?'':'Personal profile storage is not available yet.',messageType:profileFeatureAvailable?'':'error',changed:false,accentKey:normaliseAccentKey(profile.accent_key),textScale:['standard','large','xlarge'].indexOf(profile.text_scale)>=0?profile.text_scale:'standard',motionPref:profile.motion_pref==='reduced'?'reduced':'system',avatarStyle:profileAvatarStyle(),greetingEnabled:profile.greeting_enabled!==false},
    shift:{name:shift.name,tagline:shift.tagline,accentKey:shift.accentKey,symbol:shift.symbol,initials:shift.initials,photoUrl:pendingShiftPhotoUrl||shiftAvatarUrl||'',pendingPhoto:!!pendingShiftPhoto,featureAvailable:!!(rosterCapabilities().personalisationStudio&&!forcedOfflineSession),updatedBy:shift.updatedBy||'',message:'',messageType:''}
  }}));
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

function validIdentityPhoto(file){
  return !!(file&&/^image\/(jpeg|png|webp)$/i.test(file.type)&&file.size<=8*1024*1024)
}
function closePhotoCropper(){
  var dialog=byId('photoCropDialog');if(dialog&&dialog.open)dialog.close();
  if(photoCropState.url)URL.revokeObjectURL(photoCropState.url);
  photoCropState={file:null,url:'',target:'profile',image:null}
}
function updatePhotoCropPreview(){
  var image=byId('photoCropImage'),zoom=Number(byId('photoCropZoom')&&byId('photoCropZoom').value||100)/100,x=Number(byId('photoCropX')&&byId('photoCropX').value||0),y=Number(byId('photoCropY')&&byId('photoCropY').value||0);
  if(!image)return;
  image.style.transform='scale('+zoom+')';
  image.style.objectPosition=((x+100)/2)+'% '+((y+100)/2)+'%'
}
function openPhotoCropper(file,target){
  if(!validIdentityPhoto(file)){
    var message='Choose a JPEG, PNG or WebP photo smaller than 8 MB.';
    if(target==='shift')showShiftStudioMessage(message,'error');else showProfileMessage(message,'error');
    return
  }
  if(photoCropState.url)URL.revokeObjectURL(photoCropState.url);
  var url=URL.createObjectURL(file),image=byId('photoCropImage'),dialog=byId('photoCropDialog'),title=byId('photoCropTitle');
  photoCropState={file:file,url:url,target:target==='shift'?'shift':'profile',image:null};
  if(title)title.textContent=target==='shift'?'Position the shift picture':'Position your profile picture';
  if(byId('photoCropZoom'))byId('photoCropZoom').value='100';if(byId('photoCropX'))byId('photoCropX').value='0';if(byId('photoCropY'))byId('photoCropY').value='0';
  if(image){image.onload=function(){photoCropState.image=image;updatePhotoCropPreview()};image.src=url}
  if(dialog&&dialog.showModal&&!dialog.open)dialog.showModal()
}
function croppedPhotoBlob(){
  return new Promise(function(resolve,reject){
    var image=photoCropState.image||byId('photoCropImage'),file=photoCropState.file;
    if(!file||!image||!image.naturalWidth||!image.naturalHeight){reject(new Error('The selected photo is not ready yet.'));return}
    var zoom=Math.max(1,Math.min(2.5,Number(byId('photoCropZoom')&&byId('photoCropZoom').value||100)/100)),x=Math.max(-100,Math.min(100,Number(byId('photoCropX')&&byId('photoCropX').value||0))),y=Math.max(-100,Math.min(100,Number(byId('photoCropY')&&byId('photoCropY').value||0)));
    var naturalW=image.naturalWidth,naturalH=image.naturalHeight,cropSize=Math.min(naturalW,naturalH)/zoom,maxX=Math.max(0,(naturalW-cropSize)/2),maxY=Math.max(0,(naturalH-cropSize)/2),centerX=naturalW/2+(x/100)*maxX,centerY=naturalH/2+(y/100)*maxY,sx=Math.max(0,Math.min(naturalW-cropSize,centerX-cropSize/2)),sy=Math.max(0,Math.min(naturalH-cropSize,centerY-cropSize/2));
    var canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;var context=canvas.getContext('2d');if(!context){reject(new Error('The photo editor is not available on this device.'));return}
    context.drawImage(image,sx,sy,cropSize,cropSize,0,0,512,512);
    canvas.toBlob(function(blob){blob?resolve(blob):reject(new Error('The photo could not be prepared.'))},'image/jpeg',.86)
  })
}
async function applyPhotoCrop(){
  var target=photoCropState.target;
  try{
    var blob=await croppedPhotoBlob();
    if(target==='shift'){
      pendingShiftPhoto=blob;if(pendingShiftPhotoUrl)URL.revokeObjectURL(pendingShiftPhotoUrl);pendingShiftPhotoUrl=URL.createObjectURL(blob);
      updateShiftStudioPhotoPreview(pendingShiftPhotoUrl,nightTeamIdentityFor(cur().date));var shiftSave=byId('saveShiftPersonalisationBtn');if(shiftSave)shiftSave.classList.remove('hidden');showShiftStudioMessage('Picture ready to share with the shift.','success')
    }else{
      pendingProfilePhoto=blob;if(pendingProfilePhotoUrl)URL.revokeObjectURL(pendingProfilePhotoUrl);pendingProfilePhotoUrl=URL.createObjectURL(blob);applyProfileIdentity();var onboardingPhoto=byId('onboardingPhotoBtn');if(onboardingPhoto)onboardingPhoto.innerHTML='<img id="onboardingPhotoPreview" src="'+esc(pendingProfilePhotoUrl)+'" alt=""><i aria-hidden="true">+</i>';updateProfileSaveState();showProfileMessage('Photo ready to save.','success')
    }
    closePhotoCropper()
  }catch(error){
    if(target==='shift')showShiftStudioMessage(error.message||'The picture could not be prepared.','error');else showProfileMessage(error.message||'The photo could not be prepared.','error')
  }
}
async function chooseProfilePhoto(file){openPhotoCropper(file,'profile')}

async function saveProfile(){
  if(!requireOnline())return;if(!profileFeatureAvailable){showProfileMessage('Personal profile storage is not available yet.','error');return}
  var button=byId('saveProfileBtn'),name=byId('profileName').value.trim(),title=byId('profileJobTitle').value.trim(),rosterName=byId('profileRosterName').value,path=currentPrivateProfile&&currentPrivateProfile.avatar_path||null,accent=normaliseAccentKey(byId('profileAccentKey')&&byId('profileAccentKey').value),textScale=byId('profileTextScale')&&byId('profileTextScale').value||'standard',motionPref=byId('profileMotionPref')&&byId('profileMotionPref').value||'system',avatarStyle=byId('profileAvatarStyle')&&byId('profileAvatarStyle').value||'photo',greetingEnabled=!(byId('profileGreetingEnabled')&&byId('profileGreetingEnabled').value==='0');
  if(['standard','large','xlarge'].indexOf(textScale)<0)textScale='standard';if(['system','reduced'].indexOf(motionPref)<0)motionPref='system';if(['photo','monogram','spark'].indexOf(avatarStyle)<0)avatarStyle='photo';
  button.disabled=true;button.textContent='Saving…';showProfileMessage('Saving your personalisation…','');
  try{
    if(pendingProfilePhoto){path=currentUser.id+'/avatar.jpg';var uploaded=await supa.storage.from('profile-photos').upload(path,pendingProfilePhoto,{contentType:'image/jpeg',upsert:true,cacheControl:'3600'});if(uploaded.error)throw uploaded.error}
    var result=await supa.from('user_profiles').upsert({user_id:currentUser.id,profile_name:name||null,job_title:title||null,avatar_path:path,accent_key:accent,text_scale:textScale,motion_pref:motionPref,avatar_style:avatarStyle,greeting_enabled:greetingEnabled,updated_at:new Date().toISOString()},{onConflict:'user_id'}).select().single();
    if(result.error)throw result.error;currentPrivateProfile=result.data;pendingProfilePhoto=null;if(pendingProfilePhotoUrl)URL.revokeObjectURL(pendingProfilePhotoUrl);pendingProfilePhotoUrl='';
    if(rosterName)appStorage.setItem('anaes_my_name',rosterName);else appStorage.removeItem('anaes_my_name');
    profileSavedSignature=profileDraftSignature();await refreshProfileAvatar();applyPersonalProfilePreferences();render();updateProfileSaveState();showProfileMessage('Your personalisation has been saved.','success');toast('Personalisation saved')
  }catch(error){showProfileMessage('Your personalisation could not be saved. Check your connection and try again.','error')}
  finally{button.disabled=false;button.textContent='Save my personalisation';updateProfileSaveState()}
}

async function removeProfilePhoto(){
  if(!profileFeatureAvailable)return;if(pendingProfilePhoto){pendingProfilePhoto=null;if(pendingProfilePhotoUrl)URL.revokeObjectURL(pendingProfilePhotoUrl);pendingProfilePhotoUrl='';applyProfileIdentity();updateProfileSaveState();showProfileMessage('Photo change cancelled.');return}var path=currentPrivateProfile&&currentPrivateProfile.avatar_path;if(path){var removed=await supa.storage.from('profile-photos').remove([path]);if(removed.error){showProfileMessage('The photo could not be removed.','error');return}var updated=await supa.from('user_profiles').update({avatar_path:null,updated_at:new Date().toISOString()}).eq('user_id',currentUser.id);if(updated.error){showProfileMessage('The photo record could not be updated.','error');return}currentPrivateProfile.avatar_path=null}profileAvatarUrl='';applyProfileIdentity();updateProfileSaveState();render();showProfileMessage('Profile photo removed.','success')
}

function showShiftStudioMessage(message,type){var el=byId('shiftStudioMessage');if(!el)return;el.textContent=message||'';el.className='formMessage'+(type?' '+type:'')}
function updateShiftStudioPhotoPreview(url,row){
  var wrap=byId('shiftStudioPhotoPreviewWrap');if(!wrap)return;wrap.textContent='';
  if(url){var image=document.createElement('img');image.id='shiftStudioPhotoPreview';image.src=url;image.alt='Shift identity';wrap.appendChild(image)}
  else{var fallback=document.createElement('b');fallback.id='shiftStudioPhotoFallback';fallback.textContent=shiftSymbolGlyph(row&&row.symbol||'spark');wrap.appendChild(fallback)}
  var remove=byId('removeShiftPhotoBtn');if(remove){remove.classList.toggle('hidden',!url&&!pendingShiftPhoto);remove.textContent=pendingShiftPhoto?'Cancel picture':'Remove picture'}
}
async function chooseShiftPhoto(file){openPhotoCropper(file,'shift')}
async function saveShiftPersonalisation(){
  if(!requireOnline())return;if(!rosterCapabilities().personalisationStudio){showShiftStudioMessage('Update Night Roster before changing shared shift styling.','error');return}
  if(sharedWritesBlocked()){showShiftStudioMessage('Update Night Roster before changing the shared shift identity.','error');return}
  var button=byId('saveShiftPersonalisationBtn'),name=String(byId('shiftStudioName')&&byId('shiftStudioName').value||'').trim().replace(/\s+/g,' '),tagline=String(byId('shiftStudioTagline')&&byId('shiftStudioTagline').value||'').trim().replace(/\s+/g,' '),accent=normaliseAccentKey(byId('shiftStudioAccentKey')&&byId('shiftStudioAccentKey').value),symbol=String(byId('shiftStudioSymbol')&&byId('shiftStudioSymbol').value||'spark'),row=nightTeamIdentityFor(cur().date),avatarPath=row&&row.avatar_path||null;
  if(!name||name.length>28){showShiftStudioMessage('Choose a shift name up to 28 characters.','error');return}if(tagline.length>56){showShiftStudioMessage('Keep the tagline to 56 characters or fewer.','error');return}
  if(['spark','moon','cross','diamond','dot','star'].indexOf(symbol)<0)symbol='spark';
  if(button){button.disabled=true;button.textContent='Saving…'}showShiftStudioMessage('Saving for everyone…','');
  try{
    if(pendingShiftPhoto){avatarPath='shift/avatar.jpg';var uploaded=await supa.storage.from('shift-identity').upload(avatarPath,pendingShiftPhoto,{contentType:'image/jpeg',upsert:true,cacheControl:'3600'});if(uploaded.error)throw uploaded.error}
    var result=await supa.rpc('set_shift_identity_v53',{p_nickname:name,p_tagline:tagline,p_accent_key:accent,p_symbol:symbol,p_avatar_path:avatarPath,p_client_version:APP_VERSION});
    if(result.error)throw result.error;
    pendingShiftPhoto=null;if(pendingShiftPhotoUrl)URL.revokeObjectURL(pendingShiftPhotoUrl);pendingShiftPhotoUrl='';
    await loadSharedData({background:true});await refreshShiftAvatar();renderNightTeamIdentityContext(cur().date);if(window.chatRefreshCurrentContext)window.chatRefreshCurrentContext();
    updateShiftStudioPhotoPreview(shiftAvatarUrl,nightTeamIdentityFor(cur().date));showShiftStudioMessage('Shared shift identity saved.','success');if(button)button.classList.add('hidden');toast('Shift identity updated for everyone')
  }catch(error){recordAppDiagnostic('team-identity','personalise',error&&error.code||'failed');showShiftStudioMessage('The shared shift identity could not be saved. Try again.','error')}
  finally{if(button){button.disabled=false;button.textContent='Save for everyone'}}
}
async function removeShiftPhoto(){
  var row=nightTeamIdentityFor(cur().date);
  if(pendingShiftPhoto){pendingShiftPhoto=null;if(pendingShiftPhotoUrl)URL.revokeObjectURL(pendingShiftPhotoUrl);pendingShiftPhotoUrl='';updateShiftStudioPhotoPreview(shiftAvatarUrl,row);showShiftStudioMessage('Picture change cancelled.');return}
  if(!row||!row.avatar_path)return;if(!confirm('Remove the shared shift picture for everyone?'))return;
  if(sharedWritesBlocked()||!requireOnline())return;
  try{
    var removed=await supa.storage.from('shift-identity').remove([row.avatar_path]);if(removed.error)throw removed.error;
    var result=await supa.rpc('set_shift_identity_v53',{p_nickname:row.nickname,p_tagline:row.tagline||'',p_accent_key:normaliseAccentKey(row.accent_key),p_symbol:row.symbol||'spark',p_avatar_path:null,p_client_version:APP_VERSION});if(result.error)throw result.error;
    await loadSharedData({background:true});shiftAvatarUrl='';renderNightTeamIdentityContext(cur().date);updateShiftStudioPhotoPreview('',nightTeamIdentityFor(cur().date));showShiftStudioMessage('Shared shift picture removed.','success');toast('Shift picture removed')
  }catch(error){showShiftStudioMessage('The shared shift picture could not be removed.','error')}
}
