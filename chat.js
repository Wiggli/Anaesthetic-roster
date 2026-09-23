(function(){
'use strict';

var PAGE_SIZE=40;
var chatState={
  startedFor:null,
  members:[],
  membersById:{},
  conversations:[],
  latestByConversation:{},
  unreadByConversation:{},
  activeConversationId:null,
  messages:[],
  oldestMessageId:null,
  hasOlder:false,
  loadingThread:false,
  threadToken:0,
  channel:null,
  authSubscription:null,
  startTimer:null,
  started:false
};

function chatEl(id){return document.getElementById(id)}
function chatUser(){return typeof currentUser!=='undefined'?currentUser:null}
function chatProfile(){return typeof currentUserProfile!=='undefined'?currentUserProfile:null}
function chatClient(){return typeof supa!=='undefined'?supa:null}
function chatVisible(){return document.body.getAttribute('data-view')==='chat'}
function chatOnline(){return navigator.onLine!==false}
function chatCurrentId(){var user=chatUser();return user&&user.id||''}
function chatCap(value,max){value=Number(value||0);return value>max?max+'+':String(value)}
function chatInitial(name){return String(name||'?').trim().charAt(0).toUpperCase()||'?'}
function chatTime(value){
  if(!value)return'';
  var d=new Date(value),now=new Date(),same=d.toDateString()===now.toDateString();
  if(same)return d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
  return d.toLocaleDateString('en-GB',{day:'numeric',month:'short'})+' · '+d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
}
function chatIsDuplicateMessage(id){return chatState.messages.some(function(item){return Number(item.id)===Number(id)})}
function chatSetStatus(message,error){
  var el=chatEl('chatStatus');if(!el)return;
  el.textContent=message||'';el.classList.toggle('error',!!error);el.classList.toggle('hidden',!message);
}
function chatSetComposerStatus(message,error){
  var el=chatEl('chatComposerStatus');if(!el)return;
  el.textContent=message||'';el.classList.toggle('error',!!error);
}
function chatShowFallback(message){
  var fallback=chatEl('chatModuleFallback');if(fallback){fallback.classList.remove('hidden');fallback.textContent=message||'Chat is temporarily unavailable. Night, Changes and Breaks are unaffected.'}
}
function chatHideFallback(){var fallback=chatEl('chatModuleFallback');if(fallback)fallback.classList.add('hidden')}
function chatUpdateNavBadge(){
  var total=Object.keys(chatState.unreadByConversation).reduce(function(sum,key){return sum+Number(chatState.unreadByConversation[key]||0)},0);
  var badge=chatEl('chatUnreadBadge');if(!badge)return;
  badge.textContent=chatCap(total,99);badge.classList.toggle('hidden',!total);badge.setAttribute('aria-label',total?total+' unread chat message'+(total===1?'':'s'):'No unread chat messages');
}
function chatConversationTitle(conversation){
  if(!conversation)return'Chat';
  if(conversation.kind==='group')return conversation.title||'Anaesthetic Team';
  var me=chatCurrentId(),other=conversation.user_a===me?conversation.user_b:conversation.user_a,member=chatState.membersById[other];
  if(member)return member.display_name;
  var latest=chatState.latestByConversation[conversation.id];
  if(latest&&latest.sender_id===other&&latest.sender_display_name)return latest.sender_display_name;
  return'Private chat';
}
function chatConversationSubtitle(conversation){
  return conversation&&conversation.kind==='group'?'All active authorised staff':'Private conversation';
}
function chatConversationSort(a,b){
  if(a.kind==='group'&&b.kind!=='group')return-1;
  if(b.kind==='group'&&a.kind!=='group')return 1;
  var al=chatState.latestByConversation[a.id],bl=chatState.latestByConversation[b.id],ai=al?Number(al.id):0,bi=bl?Number(bl.id):0;
  if(ai!==bi)return bi-ai;
  return new Date(b.created_at||0)-new Date(a.created_at||0);
}
function chatCreate(tag,className,text){
  var node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;
}
function chatMessageNode(message){
  var own=message.sender_id===chatCurrentId(),row=chatCreate('div','chatMessageRow'+(own?' own':'')),bubble=chatCreate('div','chatBubble');
  var meta=chatCreate('div','chatMessageMeta'),name=chatCreate('b','',message.sender_display_name||'Team member'),time=chatCreate('span','',chatTime(message.created_at));
  meta.appendChild(name);meta.appendChild(time);
  var body=chatCreate('div','chatMessageBody');body.textContent=message.body||'';
  bubble.appendChild(meta);bubble.appendChild(body);row.appendChild(bubble);return row;
}
function chatRenderMessages(){
  var host=chatEl('chatMessages');if(!host)return;host.textContent='';
  if(!chatState.messages.length){
    var empty=chatCreate('div','chatThreadEmpty');
    empty.appendChild(chatCreate('b','', 'No messages yet'));
    empty.appendChild(chatCreate('span','', 'Start the conversation with a normal text message.'));
    host.appendChild(empty);return;
  }
  chatState.messages.forEach(function(message){host.appendChild(chatMessageNode(message))});
}
function chatScrollToBottom(){
  var host=chatEl('chatMessages');if(host)requestAnimationFrame(function(){host.scrollTop=host.scrollHeight});
}
function chatRenderConversationList(){
  var host=chatEl('chatConversationList');if(!host)return;host.textContent='';
  var list=chatState.conversations.slice().sort(chatConversationSort);
  if(!list.length){
    var empty=chatCreate('div','chatListEmpty');
    empty.appendChild(chatCreate('b','', 'No conversations yet'));
    empty.appendChild(chatCreate('span','', 'The Anaesthetic Team chat will appear here.'));
    host.appendChild(empty);return;
  }
  list.forEach(function(conversation){
    var button=chatCreate('button','chatConversationItem'+(conversation.id===chatState.activeConversationId?' active':''));button.type='button';button.dataset.chatConversation=conversation.id;
    var title=chatConversationTitle(conversation),avatar=chatCreate('span','chatConversationAvatar',conversation.kind==='group'?'AT':chatInitial(title));
    if(conversation.kind==='group')avatar.classList.add('team');
    var content=chatCreate('span','chatConversationContent'),top=chatCreate('span','chatConversationTop'),name=chatCreate('b','',title),latest=chatState.latestByConversation[conversation.id],when=chatCreate('small','',latest?chatTime(latest.created_at):'');
    top.appendChild(name);top.appendChild(when);
    var previewText=latest?((latest.sender_id===chatCurrentId()?'You':latest.sender_display_name)+': '+latest.body):chatConversationSubtitle(conversation);
    var preview=chatCreate('span','chatConversationPreview',previewText);
    content.appendChild(top);content.appendChild(preview);button.appendChild(avatar);button.appendChild(content);
    var unread=Number(chatState.unreadByConversation[conversation.id]||0);
    if(unread){var badge=chatCreate('em','chatConversationBadge',chatCap(unread,99));button.appendChild(badge)}
    button.onclick=function(){chatOpenConversation(conversation.id)};
    host.appendChild(button);
  });
}
function chatSetThreadHeader(conversation){
  var title=chatEl('chatThreadTitle'),subtitle=chatEl('chatThreadSubtitle');
  if(title)title.textContent=chatConversationTitle(conversation);
  if(subtitle)subtitle.textContent=chatConversationSubtitle(conversation);
}
async function chatEnsureOwnMember(){
  var client=chatClient(),user=chatUser(),profile=chatProfile();if(!client||!user||!profile)return false;
  var existing=await client.from('chat_members').select('user_id').eq('user_id',user.id).maybeSingle();
  if(existing.data)return true;
  var inserted=await client.from('chat_members').insert({display_name:profile.display_name});
  if(!inserted.error||inserted.error.code==='23505')return true;
  return false;
}
async function chatRefreshUnreadCounts(){
  var client=chatClient();if(!client||!chatProfile()||!chatOnline())return;
  var result=await client.rpc('chat_unread_counts');
  if(result.error)return;
  var next={};(result.data||[]).forEach(function(row){next[row.conversation_id]=Number(row.unread_count||0)});
  chatState.unreadByConversation=next;chatUpdateNavBadge();if(chatVisible())chatRenderConversationList();
}
async function chatFetchOverview(){
  var client=chatClient();if(!client)throw new Error('Chat connection unavailable');
  var results=await Promise.all([
    client.from('chat_members').select('user_id,display_name,active').eq('active',true).order('display_name',{ascending:true}),
    client.from('chat_conversations').select('id,kind,title,user_a,user_b,created_by,created_at').order('created_at',{ascending:true}),
    client.from('chat_read_state').select('conversation_id,last_read_message_id'),
    client.rpc('chat_unread_counts')
  ]);
  if(results[0].error||results[1].error)throw new Error('Chat could not be loaded');
  chatState.members=results[0].data||[];chatState.membersById={};chatState.members.forEach(function(member){chatState.membersById[member.user_id]=member});
  chatState.conversations=results[1].data||[];
  if(!results[3].error){var unread={};(results[3].data||[]).forEach(function(row){unread[row.conversation_id]=Number(row.unread_count||0)});chatState.unreadByConversation=unread}
  var latestPairs=await Promise.all(chatState.conversations.map(async function(conversation){
    var latest=await client.from('chat_messages').select('id,conversation_id,sender_id,sender_display_name,body,created_at').eq('conversation_id',conversation.id).order('id',{ascending:false}).limit(1).maybeSingle();
    return[conversation.id,latest.error?null:latest.data];
  }));
  chatState.latestByConversation={};latestPairs.forEach(function(pair){if(pair[1])chatState.latestByConversation[pair[0]]=pair[1]});
  chatUpdateNavBadge();chatRenderConversationList();chatRenderNewConversationMembers();
}
function chatRenderNewConversationMembers(){
  var host=chatEl('chatMemberPicker');if(!host)return;host.textContent='';
  var me=chatCurrentId(),others=chatState.members.filter(function(member){return member.user_id!==me});
  if(!others.length){host.appendChild(chatCreate('p','chatMemberPickerEmpty','No other registered active users are available yet.'));return}
  others.forEach(function(member){
    var button=chatCreate('button','chatMemberChoice');button.type='button';button.dataset.chatMember=member.user_id;
    button.appendChild(chatCreate('span','chatMemberAvatar',chatInitial(member.display_name)));
    var text=chatCreate('span','');text.appendChild(chatCreate('b','',member.display_name));text.appendChild(chatCreate('small','','Start or open a private chat'));button.appendChild(text);
    button.onclick=function(){chatStartPrivate(member.user_id)};
    host.appendChild(button);
  });
}
async function chatOpenView(){
  chatHideFallback();chatSetStatus('',false);
  if(!chatOnline()){
    chatShowFallback('Chat needs an internet connection. Night, Changes and Breaks continue to work normally.');
    return;
  }
  if(!chatProfile()||!chatUser()){
    chatShowFallback('Chat will be available after the roster account finishes signing in.');
    return;
  }
  var list=chatEl('chatConversationList');if(list)list.textContent='';
  try{
    await chatFetchOverview();
    if(!chatState.activeConversationId){
      var team=chatState.conversations.find(function(item){return item.kind==='group'});
      if(team&&window.matchMedia&&window.matchMedia('(min-width: 760px)').matches)await chatOpenConversation(team.id);
    }
  }catch(error){
    chatShowFallback('Chat is temporarily unavailable. Night, Changes and Breaks are unaffected.');
    chatSetStatus('Could not connect to chat. Try again in a moment.',true);
  }
}
async function chatOpenConversation(conversationId){
  var conversation=chatState.conversations.find(function(item){return item.id===conversationId});if(!conversation)return;
  chatState.activeConversationId=conversationId;chatState.messages=[];chatState.oldestMessageId=null;chatState.hasOlder=false;chatState.loadingThread=true;var token=++chatState.threadToken;
  var root=chatEl('chat');if(root)root.classList.add('chat-thread-open');
  var thread=chatEl('chatThread'),empty=chatEl('chatEmptyState');if(thread)thread.classList.remove('hidden');if(empty)empty.classList.add('hidden');
  chatSetThreadHeader(conversation);chatRenderConversationList();chatSetComposerStatus('');
  var messages=chatEl('chatMessages');if(messages){messages.textContent='';messages.appendChild(chatCreate('div','chatThreadLoading','Loading recent messages…'))}
  var client=chatClient(),result=await client.from('chat_messages').select('id,conversation_id,sender_id,sender_display_name,body,created_at').eq('conversation_id',conversationId).order('id',{ascending:false}).limit(PAGE_SIZE);
  if(token!==chatState.threadToken)return;
  chatState.loadingThread=false;
  if(result.error){chatSetComposerStatus('This conversation could not be opened.',true);return}
  var rows=(result.data||[]).slice().reverse();chatState.messages=rows;chatState.oldestMessageId=rows.length?Number(rows[0].id):null;chatState.hasOlder=(result.data||[]).length===PAGE_SIZE;
  var older=chatEl('chatLoadOlder');if(older)older.classList.toggle('hidden',!chatState.hasOlder);
  chatRenderMessages();chatScrollToBottom();
  if(rows.length)await chatMarkRead(conversationId,Number(rows[rows.length-1].id));
  chatState.unreadByConversation[conversationId]=0;chatUpdateNavBadge();chatRenderConversationList();
}
async function chatLoadOlder(){
  if(!chatState.activeConversationId||!chatState.hasOlder||chatState.loadingThread||!chatState.oldestMessageId)return;
  chatState.loadingThread=true;var button=chatEl('chatLoadOlder');if(button){button.disabled=true;button.textContent='Loading…'}
  var host=chatEl('chatMessages'),beforeHeight=host?host.scrollHeight:0,client=chatClient();
  var result=await client.from('chat_messages').select('id,conversation_id,sender_id,sender_display_name,body,created_at').eq('conversation_id',chatState.activeConversationId).lt('id',chatState.oldestMessageId).order('id',{ascending:false}).limit(PAGE_SIZE);
  chatState.loadingThread=false;if(button){button.disabled=false;button.textContent='Load older messages'}
  if(result.error){chatSetComposerStatus('Older messages could not be loaded.',true);return}
  var rows=(result.data||[]).slice().reverse();chatState.hasOlder=(result.data||[]).length===PAGE_SIZE;if(button)button.classList.toggle('hidden',!chatState.hasOlder);
  if(!rows.length)return;
  chatState.oldestMessageId=Number(rows[0].id);chatState.messages=rows.concat(chatState.messages);chatRenderMessages();
  if(host)host.scrollTop=host.scrollHeight-beforeHeight;
}
async function chatMarkRead(conversationId,messageId){
  if(!conversationId||!messageId||!chatOnline())return;
  var client=chatClient();
  var updated=await client.from('chat_read_state').update({last_read_message_id:messageId}).eq('conversation_id',conversationId).select('conversation_id').maybeSingle();
  if(updated.error)return;
  if(!updated.data){
    var inserted=await client.from('chat_read_state').insert({conversation_id:conversationId,last_read_message_id:messageId});
    if(inserted.error&&inserted.error.code!=='23505')return;
    if(inserted.error&&inserted.error.code==='23505')await client.from('chat_read_state').update({last_read_message_id:messageId}).eq('conversation_id',conversationId);
  }
}
function chatAcceptMessage(message,scroll){
  if(!message||!message.id||chatIsDuplicateMessage(message.id))return;
  chatState.messages.push(message);chatState.messages.sort(function(a,b){return Number(a.id)-Number(b.id)});chatRenderMessages();if(scroll)chatScrollToBottom();
}
async function chatSendMessage(event){
  if(event)event.preventDefault();
  var textarea=chatEl('chatMessageInput'),button=chatEl('chatSendBtn'),conversationId=chatState.activeConversationId;
  if(!textarea||!conversationId)return;
  var body=textarea.value.trim();if(!body)return;if(body.length>2000){chatSetComposerStatus('Keep messages under 2,000 characters.',true);return}
  if(!chatOnline()){chatSetComposerStatus('Chat needs an internet connection to send messages.',true);return}
  button.disabled=true;textarea.disabled=true;chatSetComposerStatus('');
  try{
    var result=await chatClient().from('chat_messages').insert({conversation_id:conversationId,body:body}).select('id,conversation_id,sender_id,sender_display_name,body,created_at').single();
    if(result.error)throw result.error;
    textarea.value='';chatAutoGrow(textarea);chatAcceptMessage(result.data,true);chatState.latestByConversation[conversationId]=result.data;chatState.unreadByConversation[conversationId]=0;await chatMarkRead(conversationId,Number(result.data.id));chatUpdateNavBadge();chatRenderConversationList();
  }catch(error){
    chatSetComposerStatus('Message could not be sent. If this is a private chat, the other account may no longer be active.',true);
  }finally{button.disabled=false;textarea.disabled=false;textarea.focus()}
}
function chatAutoGrow(textarea){
  if(!textarea)return;textarea.style.height='auto';textarea.style.height=Math.min(textarea.scrollHeight,120)+'px';
}
async function chatStartPrivate(otherUserId){
  var me=chatCurrentId();if(!me||!otherUserId||otherUserId===me)return;
  var pair=[me,otherUserId].sort(),existing=chatState.conversations.find(function(item){return item.kind==='direct'&&item.user_a===pair[0]&&item.user_b===pair[1]});
  if(!existing){
    var client=chatClient(),found=await client.from('chat_conversations').select('id,kind,title,user_a,user_b,created_by,created_at').eq('kind','direct').eq('user_a',pair[0]).eq('user_b',pair[1]).maybeSingle();
    if(found.data)existing=found.data;
    else{
      var created=await client.from('chat_conversations').insert({kind:'direct',user_a:pair[0],user_b:pair[1],created_by:me}).select('id,kind,title,user_a,user_b,created_by,created_at').single();
      if(created.error&&created.error.code==='23505'){
        var retry=await client.from('chat_conversations').select('id,kind,title,user_a,user_b,created_by,created_at').eq('kind','direct').eq('user_a',pair[0]).eq('user_b',pair[1]).single();if(retry.error){chatSetStatus('Private chat could not be opened.',true);return}existing=retry.data;
      }else if(created.error){chatSetStatus('Private chat could not be opened.',true);return}else existing=created.data;
    }
    if(existing&&!chatState.conversations.some(function(item){return item.id===existing.id}))chatState.conversations.push(existing);
  }
  var dialog=chatEl('chatNewConversationSheet');if(dialog&&dialog.open)dialog.close();chatRenderConversationList();await chatOpenConversation(existing.id);
}
function chatOpenNewConversation(){
  if(!chatOnline()){chatSetStatus('Connect to the internet to start a private chat.',true);return}
  chatRenderNewConversationMembers();var dialog=chatEl('chatNewConversationSheet');if(dialog&&dialog.showModal&&!dialog.open)dialog.showModal();
}
function chatCloseThread(){
  var root=chatEl('chat');if(root)root.classList.remove('chat-thread-open');chatState.activeConversationId=null;chatRenderConversationList();
}
function chatHandleIncomingMessage(payload){
  var message=payload&&payload.new;if(!message||!message.conversation_id)return;
  chatState.latestByConversation[message.conversation_id]=message;
  var own=message.sender_id===chatCurrentId(),active=chatState.activeConversationId===message.conversation_id&&chatVisible()&&document.visibilityState!=='hidden';
  if(active){chatAcceptMessage(message,true);chatMarkRead(message.conversation_id,Number(message.id));chatState.unreadByConversation[message.conversation_id]=0}
  else if(!own)chatState.unreadByConversation[message.conversation_id]=Number(chatState.unreadByConversation[message.conversation_id]||0)+1;
  chatUpdateNavBadge();if(chatVisible())chatRenderConversationList();
}
function chatHandleIncomingConversation(payload){
  var conversation=payload&&payload.new;if(!conversation||!conversation.id)return;
  if(!chatState.conversations.some(function(item){return item.id===conversation.id}))chatState.conversations.push(conversation);
  if(chatVisible())chatRenderConversationList();
}
function chatSubscribeRealtime(){
  var client=chatClient(),user=chatUser();if(!client||!user||!chatOnline())return;
  if(chatState.channel){client.removeChannel(chatState.channel);chatState.channel=null}
  var channel=client.channel('anaesthetic-chat-v1-'+user.id)
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'chat_messages'},chatHandleIncomingMessage)
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'chat_conversations'},chatHandleIncomingConversation);
  chatState.channel=channel;channel.subscribe(function(status){
    var live=chatEl('chatLiveStatus');if(!live)return;
    if(status==='SUBSCRIBED'){live.textContent='Live';live.classList.remove('error')}
    else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){live.textContent='Reconnecting';live.classList.add('error')}
    else if(status==='CLOSED'){live.textContent='Offline';live.classList.add('error')}
  });
}
function chatTeardownSession(){
  var client=chatClient();if(client&&chatState.channel)client.removeChannel(chatState.channel);
  chatState.channel=null;chatState.startedFor=null;chatState.members=[];chatState.membersById={};chatState.conversations=[];chatState.latestByConversation={};chatState.unreadByConversation={};chatState.activeConversationId=null;chatState.messages=[];chatUpdateNavBadge();
}
async function chatStartSession(){
  var user=chatUser(),profile=chatProfile(),client=chatClient();if(!user||!profile||!client||!chatOnline())return false;
  if(chatState.startedFor===user.id&&chatState.channel)return true;
  chatState.startedFor=user.id;
  try{
    var memberReady=await chatEnsureOwnMember();if(!memberReady){chatState.startedFor=null;return false}
    await chatRefreshUnreadCounts();chatSubscribeRealtime();return true;
  }catch(error){chatState.startedFor=null;return false}
}
function chatScheduleSessionStart(){
  clearTimeout(chatState.startTimer);chatState.startTimer=setTimeout(async function(){
    if(chatUser()&&chatProfile()&&chatOnline()){await chatStartSession();return}
    if(chatUser()&&chatOnline())chatScheduleSessionStart();
  },400);
}
function chatBindUi(){
  var nav=document.querySelector('.bottom button[data-v="chat"]');
  if(nav)nav.onclick=function(){if(typeof show==='function')show('chat');chatOpenView()};
  var newButton=chatEl('chatNewPrivateBtn');if(newButton)newButton.onclick=chatOpenNewConversation;
  var closePicker=chatEl('chatCloseNewConversation');if(closePicker)closePicker.onclick=function(){var dialog=chatEl('chatNewConversationSheet');if(dialog&&dialog.open)dialog.close()};
  var back=chatEl('chatBackBtn');if(back)back.onclick=chatCloseThread;
  var older=chatEl('chatLoadOlder');if(older)older.onclick=chatLoadOlder;
  var form=chatEl('chatComposer');if(form)form.onsubmit=chatSendMessage;
  var input=chatEl('chatMessageInput');if(input)input.addEventListener('input',function(){chatAutoGrow(input)});
  window.addEventListener('online',function(){chatScheduleSessionStart();if(chatVisible())chatOpenView()});
  window.addEventListener('offline',function(){var live=chatEl('chatLiveStatus');if(live){live.textContent='Offline';live.classList.add('error')}if(chatVisible())chatShowFallback('Chat needs an internet connection. Night, Changes and Breaks continue to work normally.')});
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible'&&chatUser()&&chatProfile()){chatRefreshUnreadCounts();if(chatVisible()&&chatState.activeConversationId&&chatState.messages.length){var last=chatState.messages[chatState.messages.length-1];chatMarkRead(chatState.activeConversationId,Number(last.id));chatState.unreadByConversation[chatState.activeConversationId]=0;chatUpdateNavBadge()}}});
}
function chatInit(){
  if(chatState.started)return;chatState.started=true;chatBindUi();chatHideFallback();
  var client=chatClient();
  if(client&&client.auth&&typeof client.auth.onAuthStateChange==='function'){
    var subscription=client.auth.onAuthStateChange(function(event){
      if(event==='SIGNED_OUT'){chatTeardownSession();return}
      if(event==='SIGNED_IN'||event==='INITIAL_SESSION'||event==='TOKEN_REFRESHED')chatScheduleSessionStart();
    });
    chatState.authSubscription=subscription&&subscription.data&&subscription.data.subscription||null;
  }
  chatScheduleSessionStart();
}

try{chatInit()}catch(error){chatShowFallback('Chat is temporarily unavailable. Night, Changes and Breaks are unaffected.')}
})();