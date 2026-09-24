(function(){
'use strict';

var VAPID_PUBLIC_KEY='BFF3dFdZyd_b_NTfoilYbHZKlfBctyp1Cgm4U4lKTLvyrLNWQZE6_2L2q2GCCXw13QOyq2sf9al2vuf674pQUq0';
var pushState={
  started:false,
  startedFor:null,
  subscription:null,
  preferences:null,
  devices:[],
  startTimer:null,
  promptTimer:null,
  promptAttempts:0,
  busy:false
};

function pushEl(id){return document.getElementById(id)}
function pushClient(){return typeof supa!=='undefined'?supa:null}
function pushUser(){return typeof currentUser!=='undefined'?currentUser:null}
function pushProfile(){return typeof currentUserProfile!=='undefined'?currentUserProfile:null}
function pushSupported(){return 'Notification'in window&&'serviceWorker'in navigator&&'PushManager'in window}
function pushIsIos(){return /iPad|iPhone|iPod/.test(navigator.userAgent)}
function pushIsAndroid(){return /Android/i.test(navigator.userAgent)}
function pushIsStandalone(){return window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true}
function pushBase64ToUint8(value){
  var padding='='.repeat((4-value.length%4)%4),base64=(value+padding).replace(/-/g,'+').replace(/_/g,'/'),raw=atob(base64),out=new Uint8Array(raw.length);
  for(var i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);
  return out;
}
function pushEscape(value){
  return String(value==null?'':value).replace(/[&<>"']/g,function(ch){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]});
}
function pushSetStatus(text,error){
  var el=pushEl('pushStatusText');if(!el)return;el.textContent=text||'';el.classList.toggle('error',!!error);
}
function pushSetBusy(busy){
  pushState.busy=!!busy;
  ['pushEnableBtn','pushDisableBtn','pushTeamToggle','pushPrivateToggle','pushMentionToggle','pushRosterToggle','pushAccessRequestToggle'].forEach(function(id){var el=pushEl(id);if(el)el.disabled=!!busy});
  Array.prototype.forEach.call(document.querySelectorAll('[data-push-mute]'),function(button){button.disabled=!!busy});
}
function pushPromptKey(){return'anaes_push_prompt_v37_25'}
function pushPromptDialog(){return pushEl('pushPromptDialog')}
function pushMarkPromptSeen(){try{localStorage.setItem(pushPromptKey(),'1')}catch(error){}}
function pushPromptSeen(){try{return!!localStorage.getItem(pushPromptKey())}catch(error){return false}}
function pushClosePrompt(){var dialog=pushPromptDialog();if(dialog&&dialog.open)dialog.close()}
function pushDismissPrompt(){pushMarkPromptSeen();pushClosePrompt()}
function pushEnableFromPrompt(){pushMarkPromptSeen();pushClosePrompt();pushEnable()}
function pushCanPrompt(){
  if(!pushSupported()||!pushUser()||!pushProfile()||pushPromptSeen())return false;
  if(Notification.permission!=='default'||pushState.subscription)return false;
  if(pushIsIos()&&!pushIsStandalone())return false;
  if(document.visibilityState==='hidden')return false;
  return true;
}
function pushMaybePrompt(){
  clearTimeout(pushState.promptTimer);
  if(!pushCanPrompt())return;
  var openDialog=document.querySelector('dialog[open]');
  if(openDialog){
    pushState.promptAttempts+=1;
    if(pushState.promptAttempts<40)pushState.promptTimer=setTimeout(pushMaybePrompt,1500);
    return;
  }
  pushState.promptAttempts=0;
  var dialog=pushPromptDialog();if(dialog&&dialog.showModal&&!dialog.open)dialog.showModal();
}
function pushSchedulePrompt(){
  clearTimeout(pushState.promptTimer);pushState.promptAttempts=0;
  pushState.promptTimer=setTimeout(pushMaybePrompt,1200);
}
function pushMutedUntil(){
  var value=pushState.preferences&&pushState.preferences.team_muted_until;
  if(!value)return null;
  var date=new Date(value);
  return Number.isFinite(date.getTime())&&date.getTime()>Date.now()?date:null;
}
function pushMuteSummary(){
  var prefs=pushState.preferences||{};
  if(prefs.team_enabled===false)return'Muted until you turn it back on';
  var until=pushMutedUntil();
  if(!until)return'';
  return'Muted until '+until.toLocaleString('en-GB',{weekday:'short',hour:'2-digit',minute:'2-digit'});
}
function pushBlockedInstructions(){
  if(pushIsIos())return'Open Settings → Notifications → Night Roster and allow notifications.';
  if(pushIsAndroid())return'Open Night Roster app info → Notifications and allow notifications.';
  return'Open your browser or system notification settings and allow notifications for Night Roster.';
}
function pushDeviceLabel(userAgent){
  var ua=String(userAgent||'');
  if(/iPhone/i.test(ua))return'iPhone';
  if(/iPad/i.test(ua))return'iPad';
  if(/Android/i.test(ua))return'Android device';
  if(/Macintosh|Mac OS X/i.test(ua))return'Mac';
  if(/Windows/i.test(ua))return'Windows device';
  return'Browser device';
}
function pushCurrentEndpoint(){
  try{return pushState.subscription&&pushState.subscription.endpoint||''}catch(error){return''}
}
function pushRenderDevices(){
  var host=pushEl('pushDeviceList');if(!host)return;
  host.textContent='';
  var endpoint=pushCurrentEndpoint(),devices=pushState.devices||[];
  if(!devices.length){
    var empty=document.createElement('p');empty.className='pushDeviceEmpty';empty.textContent='No notification devices are registered yet.';host.appendChild(empty);return;
  }
  devices.forEach(function(device){
    var row=document.createElement('div');row.className='pushDeviceRow';
    var copy=document.createElement('span');copy.className='pushDeviceCopy';
    var name=document.createElement('b');name.textContent=pushDeviceLabel(device.user_agent)+(device.endpoint===endpoint?' · This device':'');
    var meta=document.createElement('small');meta.textContent='Last active '+new Date(device.updated_at||device.created_at).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
    copy.appendChild(name);copy.appendChild(meta);
    var remove=document.createElement('button');remove.type='button';remove.className='pushDeviceRemove';remove.textContent='Remove';remove.setAttribute('aria-label','Remove '+name.textContent+' from notifications');
    remove.onclick=function(){pushRemoveDevice(device.id,device.endpoint)};
    row.appendChild(copy);row.appendChild(remove);host.appendChild(row);
  });
}
function pushPreferenceDefaults(){
  return{chat_enabled:true,team_enabled:true,private_enabled:true,team_muted_until:null,mentions_enabled:true,roster_enabled:true,access_request_enabled:true};
}
function pushCreatePreferenceRow(id,title,detail){
  var label=document.createElement('label');label.id=id+'Row';
  var copy=document.createElement('span'),strong=document.createElement('b'),small=document.createElement('small'),input=document.createElement('input');
  strong.textContent=title;small.textContent=detail;copy.appendChild(strong);copy.appendChild(small);
  input.id=id;input.type='checkbox';input.checked=true;input.setAttribute('aria-label',title+' notifications');
  label.appendChild(copy);label.appendChild(input);return label;
}
function pushEnsurePreferenceUi(){
  var settings=pushEl('pushPreferenceRows');if(!settings)return;
  var heading=document.querySelector('#pushNotificationCard .chatNotificationCopy b');if(heading)heading.textContent='Notifications';
  var details=settings.querySelector('.pushDeviceDetails');
  if(!pushEl('pushMentionToggle'))settings.insertBefore(pushCreatePreferenceRow('pushMentionToggle','Mentions','Alert me when someone @mentions me, even if Team chat is muted'),details);
  if(!pushEl('pushRosterToggle'))settings.insertBefore(pushCreatePreferenceRow('pushRosterToggle','Roster updates','Staffing, allocation and night-only role changes'),details);
  if(!pushEl('pushAccessRequestToggle')){var row=pushCreatePreferenceRow('pushAccessRequestToggle','Access requests','Administrator alert when someone requests roster access');row.classList.add('hidden');settings.insertBefore(row,details)}
}
function pushCleanDeepLink(params){
  var clean=new URL(location.href);['view','conversation','date','tab'].forEach(function(key){clean.searchParams.delete(key)});history.replaceState(null,'',clean.pathname+clean.search+clean.hash);
}
function pushRender(){
  pushEnsurePreferenceUi();
  var card=pushEl('pushNotificationCard'),button=pushEl('pushEnableBtn'),settings=pushEl('pushPreferenceRows'),team=pushEl('pushTeamToggle'),priv=pushEl('pushPrivateToggle'),mention=pushEl('pushMentionToggle'),roster=pushEl('pushRosterToggle'),access=pushEl('pushAccessRequestToggle'),accessRow=pushEl('pushAccessRequestToggleRow'),stateBadge=pushEl('pushStateBadge'),muteStatus=pushEl('pushMuteStatus'),blockedHelp=pushEl('pushBlockedHelp');
  if(!card||!button)return;
  if(accessRow)accessRow.classList.toggle('hidden',!(pushProfile()&&pushProfile().user_role==='admin'));
  if(blockedHelp)blockedHelp.classList.add('hidden');
  if(!pushSupported()){
    button.classList.add('hidden');if(settings)settings.classList.add('hidden');if(stateBadge)stateBadge.textContent='Unavailable';
    pushSetStatus(pushIsIos()&&!pushIsStandalone()?'Add Night Roster to your Home Screen to use notifications.':'Notifications are not supported on this device.',false);return;
  }
  var permission=Notification.permission,enabled=permission==='granted'&&!!pushState.subscription;
  button.classList.remove('hidden');button.textContent=enabled?'Active':'Enable';button.classList.toggle('enabled',enabled);button.disabled=pushState.busy||permission==='denied';
  if(stateBadge){stateBadge.textContent=enabled?'Active on this device':permission==='denied'?'Blocked':'Off';stateBadge.className='pushStateBadge '+(enabled?'active':permission==='denied'?'blocked':'off')}
  if(settings)settings.classList.toggle('hidden',!enabled);
  if(enabled){
    pushSetStatus('Chat and roster alerts can reach this device when Night Roster is closed or in the background.',false);
    var prefs=Object.assign(pushPreferenceDefaults(),pushState.preferences||{});
    if(team)team.checked=prefs.team_enabled!==false;
    if(priv)priv.checked=prefs.private_enabled!==false;
    if(mention)mention.checked=prefs.mentions_enabled!==false;
    if(roster)roster.checked=prefs.roster_enabled!==false;
    if(access)access.checked=prefs.access_request_enabled!==false;
    if(muteStatus){var summary=pushMuteSummary();muteStatus.textContent=summary||'Group chat alerts are on';muteStatus.classList.toggle('muted',!!summary)}
    pushRenderDevices();
  }else if(permission==='denied'){
    pushSetStatus('Notifications are blocked in your phone or browser settings.',true);button.textContent='Blocked';
    if(blockedHelp){blockedHelp.textContent=pushBlockedInstructions();blockedHelp.classList.remove('hidden')}
  }else{
    pushSetStatus('Enable optional alerts for chat, mentions and roster updates.',false);
  }
}
async function pushRegister(subscription){
  var client=pushClient();if(!client||!subscription)return false;
  var json=subscription.toJSON(),keys=json.keys||{};
  if(!json.endpoint||!keys.p256dh||!keys.auth)return false;
  var result=await client.rpc('register_push_subscription',{
    p_endpoint:json.endpoint,
    p_p256dh:keys.p256dh,
    p_auth_key:keys.auth,
    p_user_agent:navigator.userAgent
  });
  return !result.error;
}
async function pushLoadPreferences(){
  var client=pushClient(),user=pushUser();if(!client||!user)return;
  var result=await client.from('push_preferences').select('chat_enabled,team_enabled,private_enabled,team_muted_until,mentions_enabled,roster_enabled,access_request_enabled').eq('user_id',user.id).maybeSingle();
  if(!result.error&&result.data)pushState.preferences=Object.assign(pushPreferenceDefaults(),result.data);
}
async function pushLoadDevices(){
  var client=pushClient(),user=pushUser();if(!client||!user)return;
  var result=await client.from('push_subscriptions').select('id,endpoint,user_agent,created_at,updated_at,enabled').eq('user_id',user.id).eq('enabled',true).order('updated_at',{ascending:false});
  if(!result.error)pushState.devices=result.data||[];
}
async function pushRefreshState(){
  if(!pushSupported()){pushRender();return}
  try{
    var registration=await navigator.serviceWorker.ready;
    pushState.subscription=await registration.pushManager.getSubscription();
    if(pushState.subscription&&Notification.permission==='granted'&&pushUser()&&pushProfile())await pushRegister(pushState.subscription);
    await Promise.all([pushLoadPreferences(),pushLoadDevices()]);
  }catch(error){}
  pushRender();
}
async function pushEnable(){
  if(!pushSupported())return pushRender();
  if(pushIsIos()&&!pushIsStandalone()){
    pushSetStatus('On iPhone or iPad, add Night Roster to your Home Screen first, then enable notifications.',false);return;
  }
  pushSetBusy(true);
  try{
    var permission=Notification.permission==='granted'?'granted':await Notification.requestPermission();
    if(permission!=='granted'){pushRender();return}
    var registration=await navigator.serviceWorker.ready,subscription=await registration.pushManager.getSubscription();
    if(!subscription)subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:pushBase64ToUint8(VAPID_PUBLIC_KEY)});
    if(!await pushRegister(subscription))throw new Error('registration failed');
    pushState.subscription=subscription;
    await Promise.all([pushLoadPreferences(),pushLoadDevices()]);
    pushSetStatus('Notifications are active on this device.',false);
  }catch(error){pushSetStatus('Notifications could not be enabled on this device.',true)}
  finally{pushSetBusy(false);pushRender()}
}
async function pushDisable(){
  var subscription=pushState.subscription;if(!subscription)return;
  pushSetBusy(true);
  try{
    var json=subscription.toJSON(),client=pushClient();
    if(client&&json.endpoint)await client.rpc('unregister_push_subscription',{p_endpoint:json.endpoint});
    await subscription.unsubscribe();pushState.subscription=null;
    await pushLoadDevices();pushSetStatus('Notifications are off on this device.',false);
  }catch(error){pushSetStatus('Notifications could not be turned off. Try again.',true)}
  finally{pushSetBusy(false);pushRender()}
}
async function pushSavePreference(field,value){
  var client=pushClient(),user=pushUser();if(!client||!user)return false;
  var patch={};patch[field]=value;
  var result=await client.from('push_preferences').update(patch).eq('user_id',user.id);
  if(result.error){pushSetStatus('Notification preference could not be saved.',true);return false}
  if(!pushState.preferences)pushState.preferences=pushPreferenceDefaults();
  pushState.preferences[field]=value;pushSetStatus('Notification preference saved.',false);pushRender();return true;
}
function pushTonightUntil(){
  var date=new Date();date.setHours(7,0,0,0);if(date.getTime()<=Date.now())date.setDate(date.getDate()+1);return date;
}
async function pushMuteTeam(mode){
  if(pushState.busy)return;pushSetBusy(true);
  try{
    var client=pushClient(),user=pushUser();if(!client||!user)return;
    var patch={};
    if(mode==='hour'){patch.team_enabled=true;patch.team_muted_until=new Date(Date.now()+60*60*1000).toISOString()}
    else if(mode==='tonight'){patch.team_enabled=true;patch.team_muted_until=pushTonightUntil().toISOString()}
    else if(mode==='until_on'){patch.team_enabled=false;patch.team_muted_until=null}
    else{patch.team_enabled=true;patch.team_muted_until=null}
    var result=await client.from('push_preferences').update(patch).eq('user_id',user.id);
    if(result.error)throw result.error;
    if(!pushState.preferences)pushState.preferences=pushPreferenceDefaults();
    Object.keys(patch).forEach(function(key){pushState.preferences[key]=patch[key]});
    pushSetStatus(mode==='off'?'Anaesthetic Team notifications are back on.':'Anaesthetic Team notification setting saved.',false);
  }catch(error){pushSetStatus('Group notification setting could not be saved.',true)}
  finally{pushSetBusy(false);pushRender()}
}
async function pushRemoveDevice(id,endpoint){
  var client=pushClient();if(!client||!id||pushState.busy)return;
  pushSetBusy(true);
  try{
    var user=pushUser();if(!user)throw new Error('Authentication required');
    var result=await client.from('push_subscriptions').delete().eq('id',id).eq('user_id',user.id);if(result.error)throw result.error;
    if(endpoint&&endpoint===pushCurrentEndpoint()&&pushState.subscription){
      try{await pushState.subscription.unsubscribe()}catch(error){}
      pushState.subscription=null;
    }
    await pushLoadDevices();pushSetStatus('Notification device removed.',false);
  }catch(error){pushSetStatus('That notification device could not be removed.',true)}
  finally{pushSetBusy(false);pushRender()}
}
function pushScheduleStart(){
  clearTimeout(pushState.startTimer);pushState.startTimer=setTimeout(async function(){
    if(pushUser()&&pushProfile()){await pushStartSession();return}
    if(pushUser())pushScheduleStart();
  },450);
}
async function pushStartSession(){
  var user=pushUser();if(!user)return;
  if(pushState.startedFor!==user.id){
    pushState.startedFor=user.id;pushState.subscription=null;pushState.preferences=null;pushState.devices=[];
  }
  await pushRefreshState();
  pushOpenFromUrl();
  pushSchedulePrompt();
}
function pushOpenNotification(data){
  data=data||{};var notificationType=data.notificationType||data.type;
  if(notificationType==='chat'&&data.conversationId&&window.openChatFromPush){window.openChatFromPush(data.conversationId);return}
  if(notificationType==='roster'){
    if(data.rosterDate&&typeof chooseDate==='function'){var input=pushEl('datePick');if(input){input.value=data.rosterDate;chooseDate('datePick')}}
    if(typeof show==='function')show('today');
    if(typeof loadSharedData==='function')loadSharedData({background:true}).catch(function(){});
    return;
  }
  if(notificationType==='access_request'&&pushProfile()&&pushProfile().user_role==='admin'){
    if(typeof show==='function')show('admin');
    if(typeof switchAdminTab==='function')switchAdminTab('access',false);
    if(typeof loadAccounts==='function')loadAccounts().catch(function(){});
  }
}
function pushOpenFromUrl(){
  try{
    var params=new URLSearchParams(location.search),view=params.get('view'),conversation=params.get('conversation'),date=params.get('date'),tab=params.get('tab');
    if(view==='chat'){
      if(typeof show==='function')show('chat');
      if(conversation&&window.openChatFromPush)window.openChatFromPush(conversation);
      else if(window.openChatView)window.openChatView({force:true});
    }
    else if(view==='night'){
      if(date&&typeof chooseDate==='function'){var input=pushEl('datePick');if(input){input.value=date;chooseDate('datePick')}}
      if(typeof show==='function')show('today');
    }else if(view==='admin'&&pushProfile()&&pushProfile().user_role==='admin'){
      if(typeof show==='function')show('admin');if(tab&&typeof switchAdminTab==='function')switchAdminTab(tab,false);
    }else return;
    pushCleanDeepLink(params);
  }catch(error){}
}
window.dispatchChatPush=function(messageId){
  var client=pushClient();if(!client||!messageId)return;
  client.functions.invoke('notify-chat-message',{body:{message_id:Number(messageId)}}).catch(function(){});
};
window.dispatchRosterPush=function(eventType,rosterDate){
  var client=pushClient();if(!client||!eventType||!rosterDate||!navigator.onLine)return;
  client.rpc('queue_roster_push_event',{p_roster_date:rosterDate,p_event_type:eventType}).then(function(result){
    if(result.error||!result.data)return;
    return client.functions.invoke('notify-chat-message',{body:{kind:'roster_update',event_id:result.data}});
  }).catch(function(){});
};
window.dispatchAccessRequestPush=function(userId){
  var client=pushClient();if(!client||!userId||!navigator.onLine)return Promise.resolve();
  return client.functions.invoke('notify-chat-message',{body:{kind:'access_request',request_user_id:userId}}).then(function(){}).catch(function(){});
};
window.refreshPushSettings=function(){return pushRefreshState()};
function pushBind(){
  pushEnsurePreferenceUi();
  var enable=pushEl('pushEnableBtn');if(enable)enable.onclick=pushEnable;
  var promptEnable=pushEl('pushPromptEnableBtn');if(promptEnable)promptEnable.onclick=pushEnableFromPrompt;
  var promptLater=pushEl('pushPromptLaterBtn');if(promptLater)promptLater.onclick=pushDismissPrompt;
  var promptDialog=pushPromptDialog();if(promptDialog&&typeof promptDialog.addEventListener==='function')promptDialog.addEventListener('cancel',function(event){event.preventDefault();pushDismissPrompt()});
  var disable=pushEl('pushDisableBtn');if(disable)disable.onclick=pushDisable;
  var team=pushEl('pushTeamToggle');if(team)team.onchange=function(){pushMuteTeam(team.checked?'off':'until_on')};
  var priv=pushEl('pushPrivateToggle');if(priv)priv.onchange=function(){pushSavePreference('private_enabled',priv.checked)};
  var mention=pushEl('pushMentionToggle');if(mention)mention.onchange=function(){pushSavePreference('mentions_enabled',mention.checked)};
  var roster=pushEl('pushRosterToggle');if(roster)roster.onchange=function(){pushSavePreference('roster_enabled',roster.checked)};
  var access=pushEl('pushAccessRequestToggle');if(access)access.onchange=function(){pushSavePreference('access_request_enabled',access.checked)};
  Array.prototype.forEach.call(document.querySelectorAll('[data-push-mute]'),function(button){button.onclick=function(){pushMuteTeam(button.getAttribute('data-push-mute'))}});
  if(navigator.serviceWorker)navigator.serviceWorker.addEventListener('message',function(event){
    if(!event.data)return;
    if(event.data.type==='OPEN_APP_NOTIFICATION')pushOpenNotification(event.data);
    if(event.data.type==='OPEN_CHAT_NOTIFICATION'&&window.openChatFromPush)window.openChatFromPush(event.data.conversationId||'');
    if(event.data.type==='CHAT_PUSH_RECEIVED'&&window.refreshChatUnreadFromPush){window.refreshChatUnreadFromPush();setTimeout(function(){if(window.syncAppBadge)window.syncAppBadge()},350)}
    if(event.data.type==='ROSTER_PUSH_RECEIVED'&&typeof loadSharedData==='function')loadSharedData({background:true}).catch(function(){});
    if(event.data.type==='ACCESS_REQUEST_PUSH_RECEIVED'&&pushProfile()&&pushProfile().user_role==='admin'&&typeof loadAccounts==='function')loadAccounts().catch(function(){});
  });
}
function pushInit(){
  if(pushState.started)return;pushState.started=true;pushBind();pushRender();
  var client=pushClient();
  if(client&&client.auth&&typeof client.auth.onAuthStateChange==='function')client.auth.onAuthStateChange(function(event){
    if(event==='SIGNED_OUT'){
      clearTimeout(pushState.promptTimer);pushState.startedFor=null;pushState.subscription=null;pushState.preferences=null;pushState.devices=[];pushState.promptAttempts=0;pushClosePrompt();pushRender();if(window.clearAppBadge)window.clearAppBadge();return;
    }
    if(event==='SIGNED_IN'||event==='INITIAL_SESSION'||event==='TOKEN_REFRESHED')pushScheduleStart();
  });
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible'){pushSchedulePrompt();if(pushUser()&&pushProfile())pushRefreshState()}});
  pushScheduleStart();
}
try{pushInit()}catch(error){}
})();