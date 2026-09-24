(function(){
'use strict';

var VAPID_PUBLIC_KEY='BFF3dFdZyd_b_NTfoilYbHZKlfBctyp1Cgm4U4lKTLvyrLNWQZE6_2L2q2GCCXw13QOyq2sf9al2vuf674pQUq0';
var pushState={started:false,startedFor:null,subscription:null,preferences:null,startTimer:null};

function pushEl(id){return document.getElementById(id)}
function pushClient(){return typeof supa!=='undefined'?supa:null}
function pushUser(){return typeof currentUser!=='undefined'?currentUser:null}
function pushProfile(){return typeof currentUserProfile!=='undefined'?currentUserProfile:null}
function pushSupported(){return 'Notification'in window&&'serviceWorker'in navigator&&'PushManager'in window}
function pushIsIos(){return /iPad|iPhone|iPod/.test(navigator.userAgent)}
function pushIsStandalone(){return window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true}
function pushBase64ToUint8(value){
  var padding='='.repeat((4-value.length%4)%4),base64=(value+padding).replace(/-/g,'+').replace(/_/g,'/'),raw=atob(base64),out=new Uint8Array(raw.length);
  for(var i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);
  return out;
}
function pushSetStatus(text,error){
  var el=pushEl('pushStatusText');if(!el)return;el.textContent=text||'';el.classList.toggle('error',!!error);
}
function pushSetBusy(busy){
  var enable=pushEl('pushEnableBtn'),disable=pushEl('pushDisableBtn');if(enable)enable.disabled=!!busy;if(disable)disable.disabled=!!busy;
}
function pushRender(){
  var card=pushEl('pushNotificationCard'),button=pushEl('pushEnableBtn'),settings=pushEl('pushPreferenceRows'),team=pushEl('pushTeamToggle'),priv=pushEl('pushPrivateToggle');
  if(!card||!button)return;
  if(!pushSupported()){
    button.classList.add('hidden');if(settings)settings.classList.add('hidden');
    pushSetStatus(pushIsIos()&&!pushIsStandalone()?'Add Night Roster to your Home Screen to use notifications.':'Notifications are not supported on this device.',false);return;
  }
  var permission=Notification.permission,enabled=permission==='granted'&&!!pushState.subscription;
  button.classList.remove('hidden');button.textContent=enabled?'Enabled':'Enable';button.classList.toggle('enabled',enabled);
  if(settings)settings.classList.toggle('hidden',!enabled);
  if(enabled){
    pushSetStatus('Get alerts for new chat messages when Night Roster is closed or in the background.',false);
    var prefs=pushState.preferences||{team_enabled:true,private_enabled:true};if(team)team.checked=prefs.team_enabled!==false;if(priv)priv.checked=prefs.private_enabled!==false;
  }else if(permission==='denied'){
    pushSetStatus('Notifications are blocked in your browser or phone settings.',true);button.textContent='Blocked';button.disabled=true;
  }else{
    pushSetStatus('Enable alerts for new Anaesthetic Team and private messages.',false);button.disabled=false;
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
  var result=await client.from('push_preferences').select('chat_enabled,team_enabled,private_enabled').eq('user_id',user.id).maybeSingle();
  if(!result.error&&result.data)pushState.preferences=result.data;
}
async function pushRefreshState(){
  if(!pushSupported()){pushRender();return}
  try{
    var registration=await navigator.serviceWorker.ready;
    pushState.subscription=await registration.pushManager.getSubscription();
    if(pushState.subscription&&Notification.permission==='granted'&&pushUser()&&pushProfile())await pushRegister(pushState.subscription);
    await pushLoadPreferences();
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
    pushState.subscription=subscription;await pushLoadPreferences();pushSetStatus('Message notifications are enabled on this device.',false);
  }catch(error){pushSetStatus('Notifications could not be enabled on this device.',true)}
  finally{pushSetBusy(false);pushRender()}
}
async function pushDisable(){
  var subscription=pushState.subscription;if(!subscription)return;
  pushSetBusy(true);
  try{
    var json=subscription.toJSON(),client=pushClient();
    if(client&&json.endpoint)await client.rpc('unregister_push_subscription',{p_endpoint:json.endpoint});
    await subscription.unsubscribe();pushState.subscription=null;pushSetStatus('Notifications are off on this device.',false);
  }catch(error){pushSetStatus('Notifications could not be turned off. Try again.',true)}
  finally{pushSetBusy(false);pushRender()}
}
async function pushSavePreference(field,value){
  var client=pushClient(),user=pushUser();if(!client||!user)return;
  var patch={};patch[field]=!!value;
  var result=await client.from('push_preferences').update(patch).eq('user_id',user.id);
  if(result.error){pushSetStatus('Notification preference could not be saved.',true);return}
  if(!pushState.preferences)pushState.preferences={chat_enabled:true,team_enabled:true,private_enabled:true};pushState.preferences[field]=!!value;
  pushSetStatus('Notification preference saved.',false);
}
function pushScheduleStart(){
  clearTimeout(pushState.startTimer);pushState.startTimer=setTimeout(async function(){
    if(pushUser()&&pushProfile()){await pushStartSession();return}
    if(pushUser())pushScheduleStart();
  },450);
}
async function pushStartSession(){
  var user=pushUser();if(!user)return;
  if(pushState.startedFor!==user.id){pushState.startedFor=user.id;pushState.subscription=null;pushState.preferences=null}
  await pushRefreshState();
  pushOpenFromUrl();
}
function pushOpenFromUrl(){
  try{
    var params=new URLSearchParams(location.search),view=params.get('view'),conversation=params.get('conversation');
    if(view!=='chat'||!conversation||!window.openChatFromPush)return;
    window.openChatFromPush(conversation);
    var clean=new URL(location.href);clean.searchParams.delete('view');clean.searchParams.delete('conversation');history.replaceState(null,'',clean.pathname+clean.search+clean.hash);
  }catch(error){}
}
window.dispatchChatPush=function(messageId){
  var client=pushClient();if(!client||!messageId)return;
  client.functions.invoke('notify-chat-message',{body:{message_id:Number(messageId)}}).catch(function(){});
};
function pushBind(){
  var enable=pushEl('pushEnableBtn');if(enable)enable.onclick=pushEnable;
  var disable=pushEl('pushDisableBtn');if(disable)disable.onclick=pushDisable;
  var team=pushEl('pushTeamToggle');if(team)team.onchange=function(){pushSavePreference('team_enabled',team.checked)};
  var priv=pushEl('pushPrivateToggle');if(priv)priv.onchange=function(){pushSavePreference('private_enabled',priv.checked)};
  if(navigator.serviceWorker)navigator.serviceWorker.addEventListener('message',function(event){
    if(!event.data)return;
    if(event.data.type==='OPEN_CHAT_NOTIFICATION'&&window.openChatFromPush)window.openChatFromPush(event.data.conversationId||'');
    if(event.data.type==='CHAT_PUSH_RECEIVED'&&window.refreshChatUnreadFromPush)window.refreshChatUnreadFromPush();
  });
}
function pushInit(){
  if(pushState.started)return;pushState.started=true;pushBind();pushRender();
  var client=pushClient();
  if(client&&client.auth&&typeof client.auth.onAuthStateChange==='function')client.auth.onAuthStateChange(function(event){
    if(event==='SIGNED_OUT'){pushState.startedFor=null;pushState.subscription=null;pushState.preferences=null;pushRender();return}
    if(event==='SIGNED_IN'||event==='INITIAL_SESSION'||event==='TOKEN_REFRESHED')pushScheduleStart();
  });
  pushScheduleStart();
}
try{pushInit()}catch(error){}
})();