(function(){
'use strict';

var PRIVATE_PAGE_SIZE=40;
var TEAM_PAGE_SIZE=30;
var chatState={
  startedFor:null,
  members:[],
  membersById:{},
  directory:[],
  directoryByPerson:{},
  conversations:[],
  latestByConversation:{},
  unreadByConversation:{},
  teamMessages:[],
  teamOldestMessageId:null,
  teamHasOlder:false,
  teamLoading:false,
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
function chatRosterKeys(){
  var list=typeof TEAM!=='undefined'&&Array.isArray(TEAM)?TEAM:[];
  return list.filter(function(name){return name&&name!=='OT Nurse'});
}
function chatDisplayName(personKey){
  var value=String(personKey||'').trim();
  if(!value)return'Team member';
  return typeof professionalName==='function'?professionalName(value):value;
}
function chatCurrentPersonKey(){
  var member=chatState.membersById[chatCurrentId()];
  if(member&&member.person_key)return member.person_key;
  var profile=chatProfile();
  return profile&&(profile.roster_name||profile.display_name)||'';
}
function chatCap(value,max){value=Number(value||0);return value>max?max+'+':String(value)}
function chatInitial(name){return String(name||'?').trim().charAt(0).toUpperCase()||'?'}
function chatTime(value){
  if(!value)return'';
  var d=new Date(value),now=new Date(),same=d.toDateString()===now.toDateString();
  if(same)return d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
  return d.toLocaleDateString('en-GB',{day:'numeric',month:'short'})+' · '+d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
}
function chatClock(value){
  if(!value)return'';
  return new Date(value).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
}
function chatCreate(tag,className,text){
  var node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;
}
function chatSetStatus(message,error){
  var el=chatEl('chatStatus');if(!el)return;
  el.textContent=message||'';el.classList.toggle('error',!!error);el.classList.toggle('hidden',!message);
}
function chatSetPrivateStatus(message,error){
  var el=chatEl('chatComposerStatus');if(!el)return;
  el.textContent=message||'';el.classList.toggle('error',!!error);
}
function chatSetTeamStatus(message,error){
  var el=chatEl('chatTeamComposerStatus');if(!el)return;
  el.textContent=message||'';el.classList.toggle('error',!!error);
}
function chatShowFallback(message){
  var fallback=chatEl('chatModuleFallback');if(fallback){fallback.classList.remove('hidden');fallback.textContent=message||'Chat is temporarily unavailable. Night, Changes and Breaks are unaffected.'}
}
function chatHideFallback(){var fallback=chatEl('chatModuleFallback');if(fallback)fallback.classList.add('hidden')}
function chatSamePerson(userId){
  var sender=chatState.membersById[userId],mine=chatCurrentPersonKey();
  return !!(sender&&mine&&sender.person_key===mine);
}
function chatIsDuplicatePrivateMessage(id){return chatState.messages.some(function(item){return Number(item.id)===Number(id)})}
function chatIsDuplicateTeamMessage(id){return chatState.teamMessages.some(function(item){return Number(item.id)===Number(id)})}
function chatTeamConversation(){return chatState.conversations.find(function(item){return item.kind==='group'})||null}
function chatRosterContains(personKey){return chatRosterKeys().indexOf(personKey)>=0}
function chatDirectConversations(){
  return chatState.conversations.filter(function(item){
    if(item.kind!=='direct')return false;
    var other=chatOtherMember(item);
    return !!(other&&chatRosterContains(other.person_key));
  });
}
function chatUpdateNavBadge(){
  var total=Object.keys(chatState.unreadByConversation).reduce(function(sum,key){return sum+Number(chatState.unreadByConversation[key]||0)},0);
  var badge=chatEl('chatUnreadBadge');if(!badge)return;
  badge.textContent=chatCap(total,99);badge.classList.toggle('hidden',!total);
  badge.setAttribute('aria-label',total?total+' unread chat message'+(total===1?'':'s'):'No unread chat messages');
}
function chatOtherMember(conversation){
  if(!conversation||conversation.kind!=='direct')return null;
  var mine=chatCurrentPersonKey(),a=chatState.membersById[conversation.user_a],b=chatState.membersById[conversation.user_b];
  if(a&&a.person_key===mine)return b||null;
  if(b&&b.person_key===mine)return a||null;
  if(conversation.user_a===chatCurrentId())return b||null;
  if(conversation.user_b===chatCurrentId())return a||null;
  return null;
}
function chatConversationTitle(conversation){
  if(!conversation)return'Chat';
  if(conversation.kind==='group')return'Anaesthetic Team';
  var other=chatOtherMember(conversation);
  if(other)return chatDisplayName(other.person_key||other.display_name);
  var latest=chatState.latestByConversation[conversation.id];
  return latest?chatDisplayName(latest.sender_display_name):'Private chat';
}
function chatConversationSort(a,b){
  var al=chatState.latestByConversation[a.id],bl=chatState.latestByConversation[b.id],ai=al?Number(al.id):0,bi=bl?Number(bl.id):0;
  if(ai!==bi)return bi-ai;
  return new Date(b.created_at||0)-new Date(a.created_at||0);
}
function chatTeamLineNode(message){
  var own=message.sender_id===chatCurrentId()||chatSamePerson(message.sender_id),line=chatCreate('div','chatTeamLine'+(own?' own':'')),time=chatCreate('span','chatTeamLineTime','['+chatClock(message.created_at)+']'),name=chatCreate('b','chatTeamLineName',chatDisplayName(message.sender_display_name)+':'),body=chatCreate('span','chatTeamLineBody');
  body.textContent=message.body||'';
  line.appendChild(time);line.appendChild(name);line.appendChild(body);return line;
}
function chatRenderTeamMessages(){
  var host=chatEl('chatTeamMessages');if(!host)return;host.textContent='';
  if(!chatState.teamMessages.length){
    var empty=chatCreate('div','chatTeamEmpty');
    empty.appendChild(chatCreate('b','','No messages yet'));
    empty.appendChild(chatCreate('span','','Start the Anaesthetic Team chat below.'));
    host.appendChild(empty);return;
  }
  chatState.teamMessages.forEach(function(message){host.appendChild(chatTeamLineNode(message))});
}
function chatTeamNearBottom(){
  var host=chatEl('chatTeamMessages');if(!host)return true;
  return host.scrollHeight-host.scrollTop-host.clientHeight<72;
}
function chatScrollTeamToBottom(){
  var host=chatEl('chatTeamMessages');if(host)requestAnimationFrame(function(){host.scrollTop=host.scrollHeight});
}
function chatPrivateMessageNode(message){
  var own=message.sender_id===chatCurrentId()||chatSamePerson(message.sender_id),row=chatCreate('div','chatMessageRow'+(own?' own':'')),bubble=chatCreate('div','chatBubble');
  var meta=chatCreate('div','chatMessageMeta'),name=chatCreate('b','',own?'You':chatDisplayName(message.sender_display_name)),time=chatCreate('span','',chatTime(message.created_at));
  meta.appendChild(name);meta.appendChild(time);
  var body=chatCreate('div','chatMessageBody');body.textContent=message.body||'';
  bubble.appendChild(meta);bubble.appendChild(body);row.appendChild(bubble);return row;
}
function chatRenderPrivateMessages(){
  var host=chatEl('chatMessages');if(!host)return;host.textContent='';
  if(!chatState.messages.length){
    var empty=chatCreate('div','chatThreadEmpty');
    empty.appendChild(chatCreate('b','','No messages yet'));
    empty.appendChild(chatCreate('span','','Start the private conversation with a text message.'));
    host.appendChild(empty);return;
  }
  chatState.messages.forEach(function(message){host.appendChild(chatPrivateMessageNode(message))});
}
function chatScrollPrivateToBottom(){var host=chatEl('chatMessages');if(host)requestAnimationFrame(function(){host.scrollTop=host.scrollHeight})}
function chatRenderTeamHeader(){
  var count=chatEl('chatTeamMemberCount'),unread=chatEl('chatTeamUnread'),team=chatTeamConversation();
  var rosterCount=chatRosterKeys().length;
  if(count)count.textContent=rosterCount+' roster member'+(rosterCount===1?'':'s');
  if(unread&&team){
    var number=Number(chatState.unreadByConversation[team.id]||0);
    unread.textContent=chatCap(number,99);unread.classList.toggle('hidden',!number);
  }
}
function chatRenderConversationList(){
  var host=chatEl('chatConversationList');if(!host)return;host.textContent='';
  var list=chatDirectConversations().slice().sort(chatConversationSort);
  if(!list.length){
    var empty=chatCreate('div','chatListEmpty');
    empty.appendChild(chatCreate('b','','No private chats yet'));
    empty.appendChild(chatCreate('span','','Tap New message to start a one-to-one conversation.'));
    host.appendChild(empty);return;
  }
  list.forEach(function(conversation){
    var button=chatCreate('button','chatConversationItem'+(conversation.id===chatState.activeConversationId?' active':''));button.type='button';button.dataset.chatConversation=conversation.id;
    var title=chatConversationTitle(conversation),avatar=chatCreate('span','chatConversationAvatar',chatInitial(title));
    var content=chatCreate('span','chatConversationContent'),top=chatCreate('span','chatConversationTop'),name=chatCreate('b','',title),latest=chatState.latestByConversation[conversation.id],when=chatCreate('small','',latest?chatTime(latest.created_at):'');
    top.appendChild(name);top.appendChild(when);
    var previewText=latest?((latest.sender_id===chatCurrentId()||chatSamePerson(latest.sender_id)?'You':chatDisplayName(latest.sender_display_name))+': '+latest.body):'Private conversation';
    content.appendChild(top);content.appendChild(chatCreate('span','chatConversationPreview',previewText));
    button.appendChild(avatar);button.appendChild(content);
    var unread=Number(chatState.unreadByConversation[conversation.id]||0);
    if(unread)button.appendChild(chatCreate('em','chatConversationBadge',chatCap(unread,99)));
    button.onclick=function(){chatOpenPrivateConversation(conversation.id)};
    host.appendChild(button);
  });
}
function chatRenderHome(){chatRenderTeamHeader();chatRenderConversationList();chatRenderNewConversationMembers()}
function chatSetThreadHeader(conversation){
  var title=chatEl('chatThreadTitle'),subtitle=chatEl('chatThreadSubtitle');
  if(title)title.textContent=chatConversationTitle(conversation);
  if(subtitle)subtitle.textContent='Private conversation';
}
async function chatEnsureOwnMember(){
  var client=chatClient(),user=chatUser(),profile=chatProfile();if(!client||!user||!profile)return false;
  var existing=await client.from('chat_members').select('user_id').eq('user_id',user.id).maybeSingle();
  if(existing.data)return true;
  var inserted=await client.from('chat_members').insert({display_name:profile.display_name});
  return !inserted.error||inserted.error.code==='23505';
}
async function chatRefreshUnreadCounts(){
  var client=chatClient();if(!client||!chatProfile()||!chatOnline())return;
  var result=await client.rpc('chat_unread_counts');if(result.error)return;
  var next={};(result.data||[]).forEach(function(row){next[row.conversation_id]=Number(row.unread_count||0)});
  chatState.unreadByConversation=next;chatUpdateNavBadge();if(chatVisible())chatRenderHome();
}
async function chatFetchOverview(){
  var client=chatClient();if(!client)throw new Error('Chat connection unavailable');
  var results=await Promise.all([
    client.from('chat_members').select('user_id,display_name,person_key,active').eq('active',true).order('display_name',{ascending:true}),
    client.from('chat_directory').select('person_key,display_name,preferred_user_id,registered,active').eq('active',true),
    client.from('chat_conversations').select('id,kind,title,user_a,user_b,created_by,created_at').order('created_at',{ascending:true}),
    client.rpc('chat_unread_counts')
  ]);
  if(results[0].error||results[1].error||results[2].error)throw new Error('Chat could not be loaded');
  chatState.members=results[0].data||[];chatState.membersById={};chatState.members.forEach(function(member){chatState.membersById[member.user_id]=member});
  chatState.directory=results[1].data||[];chatState.directoryByPerson={};chatState.directory.forEach(function(entry){chatState.directoryByPerson[entry.person_key]=entry});
  chatState.conversations=results[2].data||[];
  if(!results[3].error){
    var unread={};(results[3].data||[]).forEach(function(row){unread[row.conversation_id]=Number(row.unread_count||0)});chatState.unreadByConversation=unread;
  }
  var directs=chatDirectConversations();
  var latestPairs=await Promise.all(directs.map(async function(conversation){
    var latest=await client.from('chat_messages').select('id,conversation_id,sender_id,sender_display_name,body,created_at').eq('conversation_id',conversation.id).order('id',{ascending:false}).limit(1).maybeSingle();
    return[conversation.id,latest.error?null:latest.data];
  }));
  chatState.latestByConversation={};latestPairs.forEach(function(pair){if(pair[1])chatState.latestByConversation[pair[0]]=pair[1]});
  chatUpdateNavBadge();chatRenderHome();
}
async function chatLoadTeamMessages(older){
  var team=chatTeamConversation(),client=chatClient();if(!team||!client||chatState.teamLoading)return;
  chatState.teamLoading=true;var button=chatEl('chatTeamLoadOlder');if(button){button.disabled=true;button.textContent=older?'Loading…':'Recent messages'}
  try{
    var query=client.from('chat_messages').select('id,conversation_id,sender_id,sender_display_name,body,created_at').eq('conversation_id',team.id).order('id',{ascending:false}).limit(TEAM_PAGE_SIZE);
    if(older&&chatState.teamOldestMessageId)query=query.lt('id',chatState.teamOldestMessageId);
    var result=await query;if(result.error)throw result.error;
    var rows=(result.data||[]).slice().reverse();
    if(older){
      var host=chatEl('chatTeamMessages'),beforeHeight=host?host.scrollHeight:0;
      chatState.teamMessages=rows.concat(chatState.teamMessages);
      if(rows.length)chatState.teamOldestMessageId=Number(rows[0].id);
      chatState.teamHasOlder=(result.data||[]).length===TEAM_PAGE_SIZE;
      chatRenderTeamMessages();
      if(host)host.scrollTop=host.scrollHeight-beforeHeight;
    }else{
      chatState.teamMessages=rows;
      chatState.teamOldestMessageId=rows.length?Number(rows[0].id):null;
      chatState.teamHasOlder=(result.data||[]).length===TEAM_PAGE_SIZE;
      if(rows.length)chatState.latestByConversation[team.id]=rows[rows.length-1];
      chatRenderTeamMessages();chatScrollTeamToBottom();
      if(rows.length){
        await chatMarkRead(team.id,Number(rows[rows.length-1].id));
        chatState.unreadByConversation[team.id]=0;chatUpdateNavBadge();
      }
    }
  }catch(error){
    chatSetTeamStatus('Group messages could not be loaded. Try again in a moment.',true);
  }finally{
    chatState.teamLoading=false;
    if(button){button.disabled=false;button.textContent='Load older';button.classList.toggle('hidden',!chatState.teamHasOlder)}
    chatRenderTeamHeader();
  }
}
function chatRosterDirectory(){
  var mine=chatCurrentPersonKey();
  return chatRosterKeys().filter(function(personKey){return personKey!==mine}).map(function(personKey){
    var entry=chatState.directoryByPerson[personKey]||{person_key:personKey,display_name:personKey,preferred_user_id:null,registered:false,active:true};
    return{person_key:personKey,display_name:chatDisplayName(personKey),preferred_user_id:entry.preferred_user_id||null,registered:!!entry.registered};
  });
}
function chatRenderNewConversationMembers(){
  var host=chatEl('chatMemberPicker');if(!host)return;host.textContent='';
  var entries=chatRosterDirectory();
  if(!entries.length){host.appendChild(chatCreate('p','chatMemberPickerEmpty','No other nurses are currently in the roster.'));return}
  entries.forEach(function(entry){
    var available=!!(entry.registered&&entry.preferred_user_id),button=chatCreate('button','chatMemberChoice'+(available?'':' awaiting'));button.type='button';button.dataset.chatPerson=entry.person_key;
    button.appendChild(chatCreate('span','chatMemberAvatar',chatInitial(entry.display_name)));
    var text=chatCreate('span','chatMemberChoiceText');text.appendChild(chatCreate('b','',entry.display_name));text.appendChild(chatCreate('small','',available?'Private chat available':'Not registered yet'));button.appendChild(text);
    var status=chatCreate('span','chatMemberStatus '+(available?'available':'waiting'),available?'Available':'Not registered');button.appendChild(status);
    if(available)button.onclick=function(){chatStartPrivate(entry.person_key)};
    else{button.disabled=true;button.setAttribute('aria-disabled','true')}
    host.appendChild(button);
  });
}
async function chatOpenView(){
  chatHideFallback();chatSetStatus('',false);chatSetTeamStatus('',false);
  if(!chatOnline()){chatShowFallback('Chat needs an internet connection. Night, Changes and Breaks continue to work normally.');return}
  if(!chatProfile()||!chatUser()){chatShowFallback('Chat will be available after the roster account finishes signing in.');return}
  try{
    await chatFetchOverview();
    await chatLoadTeamMessages(false);
  }catch(error){
    chatShowFallback('Chat is temporarily unavailable. Night, Changes and Breaks are unaffected.');
    chatSetStatus('Could not connect to chat. Try again in a moment.',true);
  }
}
async function chatOpenPrivateConversation(conversationId){
  var conversation=chatState.conversations.find(function(item){return item.id===conversationId&&item.kind==='direct'});if(!conversation)return;
  chatState.activeConversationId=conversationId;chatState.messages=[];chatState.oldestMessageId=null;chatState.hasOlder=false;chatState.loadingThread=true;var token=++chatState.threadToken;
  var root=chatEl('chat');if(root)root.classList.add('chat-thread-open');
  var thread=chatEl('chatThread');if(thread)thread.classList.remove('hidden');
  chatSetThreadHeader(conversation);chatRenderHome();chatSetPrivateStatus('');
  var messages=chatEl('chatMessages');if(messages){messages.textContent='';messages.appendChild(chatCreate('div','chatThreadLoading','Loading recent messages…'))}
  var result=await chatClient().from('chat_messages').select('id,conversation_id,sender_id,sender_display_name,body,created_at').eq('conversation_id',conversationId).order('id',{ascending:false}).limit(PRIVATE_PAGE_SIZE);
  if(token!==chatState.threadToken)return;chatState.loadingThread=false;
  if(result.error){chatSetPrivateStatus('This conversation could not be opened.',true);return}
  var rows=(result.data||[]).slice().reverse();chatState.messages=rows;chatState.oldestMessageId=rows.length?Number(rows[0].id):null;chatState.hasOlder=(result.data||[]).length===PRIVATE_PAGE_SIZE;
  var older=chatEl('chatLoadOlder');if(older)older.classList.toggle('hidden',!chatState.hasOlder);
  chatRenderPrivateMessages();chatScrollPrivateToBottom();
  if(rows.length)await chatMarkRead(conversationId,Number(rows[rows.length-1].id));
  chatState.unreadByConversation[conversationId]=0;chatUpdateNavBadge();chatRenderHome();
}
async function chatLoadOlderPrivate(){
  if(!chatState.activeConversationId||!chatState.hasOlder||chatState.loadingThread||!chatState.oldestMessageId)return;
  chatState.loadingThread=true;var button=chatEl('chatLoadOlder');if(button){button.disabled=true;button.textContent='Loading…'}
  var host=chatEl('chatMessages'),beforeHeight=host?host.scrollHeight:0;
  var result=await chatClient().from('chat_messages').select('id,conversation_id,sender_id,sender_display_name,body,created_at').eq('conversation_id',chatState.activeConversationId).lt('id',chatState.oldestMessageId).order('id',{ascending:false}).limit(PRIVATE_PAGE_SIZE);
  chatState.loadingThread=false;if(button){button.disabled=false;button.textContent='Load older messages'}
  if(result.error){chatSetPrivateStatus('Older messages could not be loaded.',true);return}
  var rows=(result.data||[]).slice().reverse();chatState.hasOlder=(result.data||[]).length===PRIVATE_PAGE_SIZE;if(button)button.classList.toggle('hidden',!chatState.hasOlder);
  if(!rows.length)return;
  chatState.oldestMessageId=Number(rows[0].id);chatState.messages=rows.concat(chatState.messages);chatRenderPrivateMessages();
  if(host)host.scrollTop=host.scrollHeight-beforeHeight;
}
async function chatMarkRead(conversationId,messageId){
  if(!conversationId||!messageId||!chatOnline())return;
  var client=chatClient(),updated=await client.from('chat_read_state').update({last_read_message_id:messageId}).eq('conversation_id',conversationId).select('conversation_id').maybeSingle();
  if(updated.error)return;
  if(!updated.data){
    var inserted=await client.from('chat_read_state').insert({conversation_id:conversationId,last_read_message_id:messageId});
    if(inserted.error&&inserted.error.code!=='23505')return;
    if(inserted.error&&inserted.error.code==='23505')await client.from('chat_read_state').update({last_read_message_id:messageId}).eq('conversation_id',conversationId);
  }
}
function chatAcceptPrivateMessage(message,scroll){
  if(!message||!message.id||chatIsDuplicatePrivateMessage(message.id))return;
  chatState.messages.push(message);chatState.messages.sort(function(a,b){return Number(a.id)-Number(b.id)});chatRenderPrivateMessages();if(scroll)chatScrollPrivateToBottom();
}
function chatAcceptTeamMessage(message,scroll){
  if(!message||!message.id||chatIsDuplicateTeamMessage(message.id))return;
  chatState.teamMessages.push(message);chatState.teamMessages.sort(function(a,b){return Number(a.id)-Number(b.id)});chatRenderTeamMessages();if(scroll)chatScrollTeamToBottom();
}
async function chatSendToConversation(conversationId,body){
  return chatClient().from('chat_messages').insert({conversation_id:conversationId,body:body}).select('id,conversation_id,sender_id,sender_display_name,body,created_at').single();
}
async function chatSendTeamMessage(event){
  if(event)event.preventDefault();
  var team=chatTeamConversation(),textarea=chatEl('chatTeamInput'),button=chatEl('chatTeamSendBtn');if(!team||!textarea||!button)return;
  var body=textarea.value.trim();if(!body)return;if(body.length>2000){chatSetTeamStatus('Keep messages under 2,000 characters.',true);return}
  if(!chatOnline()){chatSetTeamStatus('Chat needs an internet connection to send messages.',true);return}
  button.disabled=true;textarea.disabled=true;chatSetTeamStatus('');
  try{
    var result=await chatSendToConversation(team.id,body);if(result.error)throw result.error;
    textarea.value='';chatAutoGrow(textarea);chatAcceptTeamMessage(result.data,true);chatState.latestByConversation[team.id]=result.data;chatState.unreadByConversation[team.id]=0;
    await chatMarkRead(team.id,Number(result.data.id));chatUpdateNavBadge();chatRenderTeamHeader();if(window.dispatchChatPush)window.dispatchChatPush(result.data.id);
  }catch(error){chatSetTeamStatus('Message could not be sent.',true)}
  finally{button.disabled=false;textarea.disabled=false;textarea.focus()}
}
async function chatSendPrivateMessage(event){
  if(event)event.preventDefault();
  var textarea=chatEl('chatMessageInput'),button=chatEl('chatSendBtn'),conversationId=chatState.activeConversationId;if(!textarea||!conversationId)return;
  var body=textarea.value.trim();if(!body)return;if(body.length>2000){chatSetPrivateStatus('Keep messages under 2,000 characters.',true);return}
  if(!chatOnline()){chatSetPrivateStatus('Chat needs an internet connection to send messages.',true);return}
  button.disabled=true;textarea.disabled=true;chatSetPrivateStatus('');
  try{
    var result=await chatSendToConversation(conversationId,body);if(result.error)throw result.error;
    textarea.value='';chatAutoGrow(textarea);chatAcceptPrivateMessage(result.data,true);chatState.latestByConversation[conversationId]=result.data;chatState.unreadByConversation[conversationId]=0;
    await chatMarkRead(conversationId,Number(result.data.id));chatUpdateNavBadge();chatRenderHome();if(window.dispatchChatPush)window.dispatchChatPush(result.data.id);
  }catch(error){chatSetPrivateStatus('Message could not be sent. The other account may no longer be active.',true)}
  finally{button.disabled=false;textarea.disabled=false;textarea.focus()}
}
function chatAutoGrow(textarea){if(!textarea)return;textarea.style.height='auto';textarea.style.height=Math.min(textarea.scrollHeight,120)+'px'}
async function chatStartPrivate(otherPersonKey){
  var mine=chatCurrentPersonKey(),selfEntry=chatState.directoryByPerson[mine],otherEntry=chatState.directoryByPerson[otherPersonKey];
  if(!mine||!selfEntry||!selfEntry.preferred_user_id||!otherEntry||!otherEntry.preferred_user_id||mine===otherPersonKey)return;
  var pair=[selfEntry.preferred_user_id,otherEntry.preferred_user_id].sort(),existing=chatState.conversations.find(function(item){return item.kind==='direct'&&item.user_a===pair[0]&&item.user_b===pair[1]});
  if(!existing){
    var client=chatClient(),found=await client.from('chat_conversations').select('id,kind,title,user_a,user_b,created_by,created_at').eq('kind','direct').eq('user_a',pair[0]).eq('user_b',pair[1]).maybeSingle();
    if(found.data)existing=found.data;
    else{
      var created=await client.from('chat_conversations').insert({kind:'direct',user_a:pair[0],user_b:pair[1],created_by:selfEntry.preferred_user_id}).select('id,kind,title,user_a,user_b,created_by,created_at').single();
      if(created.error&&created.error.code==='23505'){
        var retry=await client.from('chat_conversations').select('id,kind,title,user_a,user_b,created_by,created_at').eq('kind','direct').eq('user_a',pair[0]).eq('user_b',pair[1]).single();
        if(retry.error){chatSetStatus('Private chat could not be opened.',true);return}existing=retry.data;
      }else if(created.error){chatSetStatus('Private chat could not be opened.',true);return}else existing=created.data;
    }
    if(existing&&!chatState.conversations.some(function(item){return item.id===existing.id}))chatState.conversations.push(existing);
  }
  var dialog=chatEl('chatNewConversationSheet');if(dialog&&dialog.open)dialog.close();chatRenderHome();await chatOpenPrivateConversation(existing.id);
}
function chatOpenNewConversation(){
  if(!chatOnline()){chatSetStatus('Connect to the internet to start a private chat.',true);return}
  chatRenderNewConversationMembers();var dialog=chatEl('chatNewConversationSheet');if(dialog&&dialog.showModal&&!dialog.open)dialog.showModal();
}
function chatCloseThread(){
  var root=chatEl('chat');if(root)root.classList.remove('chat-thread-open');chatState.activeConversationId=null;chatRenderHome();
}
function chatHandleIncomingMessage(payload){
  var message=payload&&payload.new;if(!message||!message.conversation_id)return;
  var team=chatTeamConversation(),own=message.sender_id===chatCurrentId()||chatSamePerson(message.sender_id);
  chatState.latestByConversation[message.conversation_id]=message;
  if(team&&message.conversation_id===team.id){
    var activeTeam=chatVisible()&&document.visibilityState!=='hidden';
    chatAcceptTeamMessage(message,activeTeam&&chatTeamNearBottom());
    if(activeTeam){chatMarkRead(team.id,Number(message.id));chatState.unreadByConversation[team.id]=0}
    else if(!own)chatState.unreadByConversation[team.id]=Number(chatState.unreadByConversation[team.id]||0)+1;
    chatUpdateNavBadge();chatRenderTeamHeader();return;
  }
  var activePrivate=chatState.activeConversationId===message.conversation_id&&chatVisible()&&document.visibilityState!=='hidden';
  if(activePrivate){chatAcceptPrivateMessage(message,true);chatMarkRead(message.conversation_id,Number(message.id));chatState.unreadByConversation[message.conversation_id]=0}
  else if(!own)chatState.unreadByConversation[message.conversation_id]=Number(chatState.unreadByConversation[message.conversation_id]||0)+1;
  chatUpdateNavBadge();if(chatVisible())chatRenderConversationList();
}
function chatHandleIncomingConversation(payload){
  var conversation=payload&&payload.new;if(!conversation||!conversation.id)return;
  if(!chatState.conversations.some(function(item){return item.id===conversation.id}))chatState.conversations.push(conversation);
  if(chatVisible())chatRenderHome();
}
function chatSubscribeRealtime(){
  var client=chatClient(),user=chatUser();if(!client||!user||!chatOnline())return;
  if(chatState.channel){client.removeChannel(chatState.channel);chatState.channel=null}
  var channel=client.channel('anaesthetic-chat-v3-'+user.id)
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
  chatState.channel=null;chatState.startedFor=null;chatState.members=[];chatState.membersById={};chatState.directory=[];chatState.directoryByPerson={};chatState.conversations=[];chatState.latestByConversation={};chatState.unreadByConversation={};chatState.teamMessages=[];chatState.teamOldestMessageId=null;chatState.teamHasOlder=false;chatState.activeConversationId=null;chatState.messages=[];chatUpdateNavBadge();
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
  var nav=document.querySelector('.bottom button[data-v="chat"]');if(nav)nav.onclick=function(){if(typeof show==='function')show('chat');chatOpenView()};
  var newButton=chatEl('chatNewPrivateBtn');if(newButton)newButton.onclick=chatOpenNewConversation;
  var closePicker=chatEl('chatCloseNewConversation');if(closePicker)closePicker.onclick=function(){var dialog=chatEl('chatNewConversationSheet');if(dialog&&dialog.open)dialog.close()};
  var back=chatEl('chatBackBtn');if(back)back.onclick=chatCloseThread;
  var older=chatEl('chatLoadOlder');if(older)older.onclick=chatLoadOlderPrivate;
  var teamOlder=chatEl('chatTeamLoadOlder');if(teamOlder)teamOlder.onclick=function(){chatLoadTeamMessages(true)};
  var teamForm=chatEl('chatTeamComposer');if(teamForm)teamForm.onsubmit=chatSendTeamMessage;
  var privateForm=chatEl('chatComposer');if(privateForm)privateForm.onsubmit=chatSendPrivateMessage;
  var teamInput=chatEl('chatTeamInput');if(teamInput)teamInput.addEventListener('input',function(){chatAutoGrow(teamInput)});
  var privateInput=chatEl('chatMessageInput');if(privateInput)privateInput.addEventListener('input',function(){chatAutoGrow(privateInput)});
  window.addEventListener('online',function(){chatScheduleSessionStart();if(chatVisible())chatOpenView()});
  window.addEventListener('offline',function(){
    var live=chatEl('chatLiveStatus');if(live){live.textContent='Offline';live.classList.add('error')}
    if(chatVisible())chatShowFallback('Chat needs an internet connection. Night, Changes and Breaks continue to work normally.');
  });
  document.addEventListener('visibilitychange',function(){
    if(document.visibilityState==='visible'&&chatUser()&&chatProfile()){
      chatRefreshUnreadCounts();
      if(chatVisible()){
        var team=chatTeamConversation();
        if(team&&chatState.teamMessages.length){
          var lastTeam=chatState.teamMessages[chatState.teamMessages.length-1];chatMarkRead(team.id,Number(lastTeam.id));chatState.unreadByConversation[team.id]=0;
        }
        if(chatState.activeConversationId&&chatState.messages.length){
          var last=chatState.messages[chatState.messages.length-1];chatMarkRead(chatState.activeConversationId,Number(last.id));chatState.unreadByConversation[chatState.activeConversationId]=0;
        }
        chatUpdateNavBadge();chatRenderHome();
      }
    }
  });
}
async function chatOpenFromPush(conversationId){
  if(!conversationId||!chatUser()||!chatProfile())return;
  if(typeof show==='function')show('chat');
  await chatOpenView();
  var conversation=chatState.conversations.find(function(item){return item.id===conversationId});
  if(!conversation)return;
  if(conversation.kind==='direct'){await chatOpenPrivateConversation(conversationId);return}
  var root=chatEl('chat');if(root)root.classList.remove('chat-thread-open');
  chatState.activeConversationId=null;chatScrollTeamToBottom();
  if(chatState.teamMessages.length){
    var last=chatState.teamMessages[chatState.teamMessages.length-1];
    await chatMarkRead(conversationId,Number(last.id));
    chatState.unreadByConversation[conversationId]=0;chatUpdateNavBadge();chatRenderTeamHeader();
  }
}
window.openChatFromPush=chatOpenFromPush;
window.refreshChatUnreadFromPush=function(){return chatRefreshUnreadCounts()};

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