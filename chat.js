(function(){
'use strict';

var PRIVATE_PAGE_SIZE=40;
var TEAM_PAGE_SIZE=30;
var OVERVIEW_TTL=15000;
var DELETE_WINDOW_MS=10*60*1000;
var CHAT_MESSAGE_FIELDS='id,conversation_id,sender_id,sender_display_name,body,created_at,deleted_at,reply_to_message_id';

var chatState={
  startedFor:null,
  members:[],
  membersById:{},
  directory:[],
  directoryByPerson:{},
  conversations:[],
  latestByConversation:{},
  unreadByConversation:{},
  readStateByConversation:{},
  overviewLoadedAt:0,
  overviewRefreshTimer:null,
  teamMessages:[],
  teamOldestMessageId:null,
  teamHasOlder:false,
  teamLoading:false,
  teamLoadedAt:0,
  teamUnreadAnchor:null,
  teamHadUnread:false,
  teamNewBelow:0,
  activeConversationId:null,
  messages:[],
  oldestMessageId:null,
  hasOlder:false,
  loadingThread:false,
  threadToken:0,
  privateUnreadAnchor:null,
  privateHadUnread:false,
  privateNewBelow:0,
  channel:null,
  reconnectTimer:null,
  reconnectAttempt:0,
  authSubscription:null,
  startTimer:null,
  actionMessage:null,
  actionKind:null,
  replyTargets:{},
  teamReplyMessage:null,
  privateReplyMessage:null,
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
function chatCreate(tag,className,text){
  var node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;
}
function chatClock(value){
  if(!value)return'';
  return new Date(value).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
}
function chatTime(value){
  if(!value)return'';
  var d=new Date(value),now=new Date(),same=d.toDateString()===now.toDateString();
  if(same)return d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
  return d.toLocaleDateString('en-GB',{day:'numeric',month:'short'})+' · '+d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
}
function chatDateKey(value){var d=new Date(value);return[d.getFullYear(),d.getMonth()+1,d.getDate()].join('-')}
function chatDateLabel(value){
  var d=new Date(value),today=new Date(),yesterday=new Date();yesterday.setDate(today.getDate()-1);
  if(d.toDateString()===today.toDateString())return'Today';
  if(d.toDateString()===yesterday.toDateString())return'Yesterday';
  return d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'long'});
}
function chatSetStatus(message,error){
  var el=chatEl('chatStatus');if(!el)return;el.textContent=message||'';el.classList.toggle('error',!!error);el.classList.toggle('hidden',!message);
}
function chatSetPrivateStatus(message,error){
  var el=chatEl('chatComposerStatus');if(!el)return;el.textContent=message||'';el.classList.toggle('error',!!error);
}
function chatSetTeamStatus(message,error){
  var el=chatEl('chatTeamComposerStatus');if(!el)return;el.textContent=message||'';el.classList.toggle('error',!!error);
}
function chatSetConnection(state){
  var live=chatEl('chatLiveStatus'),dot=document.querySelector('.chatLiveDot');if(!live)return;
  if(state==='live'){live.textContent='Live';live.classList.remove('error');if(dot)dot.classList.remove('error')}
  else if(state==='offline'){live.textContent='Offline';live.classList.add('error');if(dot)dot.classList.add('error')}
  else{live.textContent='Reconnecting';live.classList.add('error');if(dot)dot.classList.add('error')}
}
function chatShowFallback(message){
  var fallback=chatEl('chatModuleFallback');if(fallback){fallback.classList.remove('hidden');fallback.textContent=message||'Chat is temporarily unavailable. Night, Changes and Breaks are unaffected.'}
}
function chatHideFallback(){var fallback=chatEl('chatModuleFallback');if(fallback)fallback.classList.add('hidden')}
function chatSamePerson(userId){
  var sender=chatState.membersById[userId],mine=chatCurrentPersonKey();
  return !!(sender&&mine&&sender.person_key===mine);
}
function chatOwnMessage(message){return !!message&&(message.sender_id===chatCurrentId()||chatSamePerson(message.sender_id))}
function chatIsNumericId(id){return /^\d+$/.test(String(id||''))}
function chatCanDelete(message){
  if(!message||message.failed||message.deleted_at||!chatOwnMessage(message)||!chatIsNumericId(message.id))return false;
  return Date.now()-new Date(message.created_at).getTime()<=DELETE_WINDOW_MS;
}
function chatIsDuplicate(list,id){return list.some(function(item){return String(item.id)===String(id)})}
function chatTeamConversation(){return chatState.conversations.find(function(item){return item.kind==='group'})||null}
function chatRosterContains(personKey){return chatRosterKeys().indexOf(personKey)>=0}
function chatOtherMember(conversation){
  if(!conversation||conversation.kind!=='direct')return null;
  var mine=chatCurrentPersonKey(),a=chatState.membersById[conversation.user_a],b=chatState.membersById[conversation.user_b];
  if(a&&a.person_key===mine)return b||null;
  if(b&&b.person_key===mine)return a||null;
  if(conversation.user_a===chatCurrentId())return b||null;
  if(conversation.user_b===chatCurrentId())return a||null;
  return null;
}
function chatDirectConversations(){
  return chatState.conversations.filter(function(item){
    if(item.kind!=='direct')return false;
    var other=chatOtherMember(item);
    return !!(other&&chatRosterContains(other.person_key));
  });
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
  var al=chatState.latestByConversation[a.id],bl=chatState.latestByConversation[b.id],ai=al&&chatIsNumericId(al.id)?Number(al.id):0,bi=bl&&chatIsNumericId(bl.id)?Number(bl.id):0;
  if(ai!==bi)return bi-ai;
  return new Date(b.created_at||0)-new Date(a.created_at||0);
}
function chatUpdateNavBadge(){
  var total=Object.keys(chatState.unreadByConversation).reduce(function(sum,key){return sum+Number(chatState.unreadByConversation[key]||0)},0),badge=chatEl('chatUnreadBadge');
  if(!badge)return;badge.textContent=chatCap(total,99);badge.classList.toggle('hidden',!total);badge.setAttribute('aria-label',total?total+' unread chat message'+(total===1?'':'s'):'No unread chat messages');
}
function chatUnreadDivider(){
  var node=chatCreate('div','chatUnreadDivider');node.dataset.chatUnread='true';node.appendChild(chatCreate('span','','New messages'));return node;
}
function chatDateSeparator(label){return chatCreate('div','chatDateSeparator',label)}
function chatShouldInsertUnread(message,anchor,hadUnread,inserted){
  return !inserted&&hadUnread&&chatIsNumericId(message.id)&&Number(message.id)>Number(anchor||0);
}
function chatShowNewButton(kind,count){
  var button=chatEl(kind==='team'?'chatTeamNewMessages':'chatPrivateNewMessages');if(!button)return;
  button.textContent=count>1?count+' new messages':'New message ↓';button.classList.toggle('hidden',!count);
}
function chatScrollToUnread(host){
  if(!host)return false;
  var marker=host.querySelector('[data-chat-unread="true"]');
  if(!marker)return false;
  requestAnimationFrame(function(){host.scrollTop=Math.max(0,marker.offsetTop-host.clientHeight*.28)});
  return true;
}
function chatNearBottom(host){return !host||host.scrollHeight-host.scrollTop-host.clientHeight<72}
function chatScrollToBottom(host){if(host)requestAnimationFrame(function(){host.scrollTop=host.scrollHeight})}
function chatBindMessageActions(node,message,kind){
  if(!node||!message||message.failed)return;
  node.tabIndex=0;node.setAttribute('aria-label',(message.deleted_at?'Deleted message':(chatOwnMessage(message)?'Your message':'Message from '+chatDisplayName(message.sender_display_name)))+'. Long press for actions.');
  var timer=null,startX=0,startY=0;
  function cancel(){if(timer){clearTimeout(timer);timer=null}}
  node.addEventListener('pointerdown',function(event){startX=event.clientX;startY=event.clientY;cancel();timer=setTimeout(function(){timer=null;chatOpenMessageActions(message,kind)},520)});
  node.addEventListener('pointermove',function(event){if(Math.abs(event.clientX-startX)>8||Math.abs(event.clientY-startY)>8)cancel()});
  node.addEventListener('pointerup',cancel);node.addEventListener('pointercancel',cancel);node.addEventListener('pointerleave',cancel);
  node.addEventListener('contextmenu',function(event){event.preventDefault();cancel();chatOpenMessageActions(message,kind)});
  node.addEventListener('keydown',function(event){if(event.key==='ContextMenu'||(event.shiftKey&&event.key==='F10')){event.preventDefault();chatOpenMessageActions(message,kind)}});
}
function chatMessageBodyText(message){return message.deleted_at?'Message deleted':String(message.body||'')}
function chatReplyTarget(message){return message&&message.reply_to_message_id?chatState.replyTargets[String(message.reply_to_message_id)]||null:null}
function chatReplyPreviewNode(message){
  var target=chatReplyTarget(message);if(!target)return null;
  var node=chatCreate('div','chatReplyQuote'),name=chatCreate('b','',target.expired?'Earlier message':(chatOwnMessage(target)?'You':chatDisplayName(target.sender_display_name))),text=chatCreate('span','');
  text.textContent=target.expired?'This message is no longer available.':(target.deleted_at?'Message deleted':String(target.body||'').slice(0,100));
  node.appendChild(name);node.appendChild(text);return node;
}
async function chatLoadReplyTargets(messages){
  var client=chatClient();if(!client)return;
  (messages||[]).forEach(function(message){if(chatIsNumericId(message.id))chatState.replyTargets[String(message.id)]=message});
  var ids=[];(messages||[]).forEach(function(message){var id=message.reply_to_message_id;if(id&&!chatState.replyTargets[String(id)]&&ids.indexOf(Number(id))<0)ids.push(Number(id))});
  if(!ids.length)return;
  var result=await client.from('chat_messages').select('id,sender_id,sender_display_name,body,created_at,deleted_at,reply_to_message_id').in('id',ids);
  if(result.error)return;
  var found={};(result.data||[]).forEach(function(row){found[String(row.id)]=true;chatState.replyTargets[String(row.id)]=row});
  ids.forEach(function(id){if(!found[String(id)])chatState.replyTargets[String(id)]={id:id,expired:true}});
}
function chatMessageMentionsMe(message){
  var mine=String(chatCurrentPersonKey()||'').trim().toLocaleLowerCase();if(!mine||!message||message.deleted_at)return false;
  return String(message.body||'').toLocaleLowerCase().indexOf('@'+mine)>=0;
}
function chatRenderReplyComposer(kind){
  var message=kind==='team'?chatState.teamReplyMessage:chatState.privateReplyMessage;
  var root=chatEl(kind==='team'?'chatTeamReplyPreview':'chatPrivateReplyPreview'),name=chatEl(kind==='team'?'chatTeamReplyName':'chatPrivateReplyName'),text=chatEl(kind==='team'?'chatTeamReplyText':'chatPrivateReplyText');
  if(!root)return;root.classList.toggle('hidden',!message);if(!message)return;
  if(name)name.textContent='Reply to '+(chatOwnMessage(message)?'your message':chatDisplayName(message.sender_display_name));
  if(text)text.textContent=message.deleted_at?'Message deleted':String(message.body||'').slice(0,120);
}
function chatClearReply(kind){
  if(kind==='team')chatState.teamReplyMessage=null;else chatState.privateReplyMessage=null;chatRenderReplyComposer(kind);
}
function chatStartReply(message,kind){
  if(!message||message.failed)return;if(kind==='team')chatState.teamReplyMessage=message;else chatState.privateReplyMessage=message;
  chatRenderReplyComposer(kind);var dialog=chatEl('chatMessageActionSheet');if(dialog&&dialog.open)dialog.close();
  var input=chatEl(kind==='team'?'chatTeamInput':'chatMessageInput');if(input)input.focus();
}
function chatMentionQuery(textarea){
  if(!textarea)return null;var caret=typeof textarea.selectionStart==='number'?textarea.selectionStart:textarea.value.length,left=textarea.value.slice(0,caret),at=left.lastIndexOf('@');
  if(at<0)return null;var prefix=at?left.charAt(at-1):'';if(prefix&&!/\s/.test(prefix))return null;
  var query=left.slice(at+1);if(query.indexOf('\n')>=0||query.length>40)return null;
  return{at:at,caret:caret,query:query};
}
function chatHideMentionMenu(){var menu=chatEl('chatMentionMenu');if(menu){menu.classList.add('hidden');menu.textContent=''}}
function chatInsertMention(textarea,match,entry){
  var right=textarea.value.slice(match.caret),token='@'+entry.person_key+' ',next=textarea.value.slice(0,match.at)+token+right;textarea.value=next;
  var caret=match.at+token.length;textarea.setSelectionRange(caret,caret);chatAutoGrow(textarea);chatHideMentionMenu();textarea.focus();
}
function chatRenderMentionMenu(textarea){
  var menu=chatEl('chatMentionMenu'),match=chatMentionQuery(textarea);if(!menu)return;
  if(!match){chatHideMentionMenu();return}
  var q=match.query.trim().toLocaleLowerCase(),entries=chatRosterDirectory().filter(function(entry){
    if(!entry.registered)return false;var key=String(entry.person_key||'').toLocaleLowerCase(),display=String(entry.display_name||'').toLocaleLowerCase();return !q||key.indexOf(q)>=0||display.indexOf(q)>=0;
  }).slice(0,6);
  if(!entries.length){chatHideMentionMenu();return}
  menu.textContent='';entries.forEach(function(entry){
    var button=chatCreate('button','chatMentionChoice');button.type='button';button.setAttribute('role','option');
    button.appendChild(chatCreate('b','',entry.display_name));button.appendChild(chatCreate('small','', '@'+entry.person_key));
    button.onmousedown=function(event){event.preventDefault()};button.onclick=function(){chatInsertMention(textarea,match,entry)};menu.appendChild(button);
  });menu.classList.remove('hidden');
}
function chatEnsureEnhancedUi(){
  var actions=document.querySelector('#chatMessageActionSheet .chatMessageActionButtons'),copy=chatEl('chatMessageCopyBtn');
  if(actions&&copy&&!chatEl('chatMessageReplyBtn')){var reply=chatCreate('button','','Reply');reply.type='button';reply.id='chatMessageReplyBtn';actions.insertBefore(reply,copy)}
  function ensureReply(kind,formId){
    var form=chatEl(formId);if(!form)return;var id=kind==='team'?'chatTeamReplyPreview':'chatPrivateReplyPreview';if(chatEl(id))return;
    var root=chatCreate('div','chatComposerReply hidden');root.id=id;var copyWrap=chatCreate('span',''),name=chatCreate('b',''),text=chatCreate('small',''),cancel=chatCreate('button','','×');
    name.id=kind==='team'?'chatTeamReplyName':'chatPrivateReplyName';text.id=kind==='team'?'chatTeamReplyText':'chatPrivateReplyText';cancel.id=kind==='team'?'chatTeamReplyCancel':'chatPrivateReplyCancel';cancel.type='button';cancel.setAttribute('aria-label','Cancel reply');
    copyWrap.appendChild(name);copyWrap.appendChild(text);root.appendChild(copyWrap);root.appendChild(cancel);form.parentNode.insertBefore(root,form);
  }
  ensureReply('team','chatTeamComposer');ensureReply('private','chatComposer');
  var teamForm=chatEl('chatTeamComposer');if(teamForm&&!chatEl('chatMentionMenu')){var menu=chatCreate('div','chatMentionMenu hidden');menu.id='chatMentionMenu';menu.setAttribute('role','listbox');menu.setAttribute('aria-label','Mention a roster colleague');teamForm.parentNode.insertBefore(menu,teamForm)}
  var safety=document.querySelector('.chatSafetyNotice span');if(safety&&!safety.querySelector('.chatRetentionNote')){var note=chatCreate('small','chatRetentionNote','Messages are automatically removed after 14 days.');safety.appendChild(note)}
}
function chatTeamLineNode(message){
  var own=chatOwnMessage(message),line=chatCreate('div','chatTeamLine'+(own?' own':'')+(message.failed?' failed':'')+(message.deleted_at?' deleted':'')+(chatMessageMentionsMe(message)?' mentioned':'')),time=chatCreate('span','chatTeamLineTime','['+chatClock(message.created_at)+']'),name=chatCreate('b','chatTeamLineName',(own?'You':chatDisplayName(message.sender_display_name))+':'),body=chatCreate('span','chatTeamLineBody');
  var quote=chatReplyPreviewNode(message);if(quote)line.appendChild(quote);
  body.textContent=chatMessageBodyText(message);line.appendChild(time);line.appendChild(name);line.appendChild(body);
  if(message.failed){var retry=chatCreate('button','chatRetryBtn','Retry');retry.type='button';retry.onclick=function(){chatRetryFailed(message,'team')};line.appendChild(retry)}
  else chatBindMessageActions(line,message,'team');
  return line;
}
function chatPrivateMessageNode(message){
  var own=chatOwnMessage(message),row=chatCreate('div','chatMessageRow'+(own?' own':'')+(message.failed?' failed':'')+(message.deleted_at?' deleted':'')),bubble=chatCreate('div','chatBubble'),meta=chatCreate('div','chatMessageMeta'),name=chatCreate('b','',own?'You':chatDisplayName(message.sender_display_name)),time=chatCreate('span','',message.failed?'Not sent':chatTime(message.created_at));
  meta.appendChild(name);meta.appendChild(time);var quote=chatReplyPreviewNode(message),body=chatCreate('div','chatMessageBody');body.textContent=chatMessageBodyText(message);bubble.appendChild(meta);if(quote)bubble.appendChild(quote);bubble.appendChild(body);
  if(message.failed){var retry=chatCreate('button','chatRetryBtn','Retry');retry.type='button';retry.onclick=function(){chatRetryFailed(message,'private')};bubble.appendChild(retry)}
  row.appendChild(bubble);if(!message.failed)chatBindMessageActions(bubble,message,'private');return row;
}
function chatRenderMessageSequence(host,messages,kind,anchor,hadUnread){
  if(!host)return;host.textContent='';
  if(!messages.length){
    var empty=chatCreate('div',kind==='team'?'chatTeamEmpty':'chatThreadEmpty');empty.appendChild(chatCreate('b','','No messages yet'));empty.appendChild(chatCreate('span','',kind==='team'?'Start the Anaesthetic Team chat below.':'Start the private conversation with a text message.'));host.appendChild(empty);return;
  }
  var previousDate='',unreadInserted=false;
  messages.forEach(function(message){
    var dateKey=chatDateKey(message.created_at);
    if(dateKey!==previousDate){host.appendChild(chatDateSeparator(chatDateLabel(message.created_at)));previousDate=dateKey}
    if(chatShouldInsertUnread(message,anchor,hadUnread,unreadInserted)){host.appendChild(chatUnreadDivider());unreadInserted=true}
    host.appendChild(kind==='team'?chatTeamLineNode(message):chatPrivateMessageNode(message));
  });
}
function chatRenderTeamMessages(){chatRenderMessageSequence(chatEl('chatTeamMessages'),chatState.teamMessages,'team',chatState.teamUnreadAnchor,chatState.teamHadUnread)}
function chatRenderPrivateMessages(){chatRenderMessageSequence(chatEl('chatMessages'),chatState.messages,'private',chatState.privateUnreadAnchor,chatState.privateHadUnread)}
function chatRenderTeamHeader(){
  var count=chatEl('chatTeamMemberCount'),unread=chatEl('chatTeamUnread'),team=chatTeamConversation(),rosterCount=chatRosterKeys().length;
  if(count)count.textContent=rosterCount+' roster member'+(rosterCount===1?'':'s');
  if(unread&&team){var number=Number(chatState.unreadByConversation[team.id]||0);unread.textContent=chatCap(number,99);unread.classList.toggle('hidden',!number)}
}
function chatRenderConversationList(){
  var host=chatEl('chatConversationList');if(!host)return;host.textContent='';
  var list=chatDirectConversations().slice().sort(chatConversationSort);
  if(!list.length){
    var empty=chatCreate('div','chatListEmpty');empty.appendChild(chatCreate('b','','No private chats yet'));empty.appendChild(chatCreate('span','','Tap New message to start a one-to-one conversation.'));host.appendChild(empty);return;
  }
  list.forEach(function(conversation){
    var button=chatCreate('button','chatConversationItem'+(conversation.id===chatState.activeConversationId?' active':''));button.type='button';button.dataset.chatConversation=conversation.id;
    var title=chatConversationTitle(conversation),avatar=chatCreate('span','chatConversationAvatar',chatInitial(title)),content=chatCreate('span','chatConversationContent'),top=chatCreate('span','chatConversationTop'),name=chatCreate('b','',title),latest=chatState.latestByConversation[conversation.id],when=chatCreate('small','',latest?chatTime(latest.created_at):'');
    top.appendChild(name);top.appendChild(when);
    var previewText=latest?((chatOwnMessage(latest)?'You':chatDisplayName(latest.sender_display_name))+': '+chatMessageBodyText(latest)):'Private conversation';
    content.appendChild(top);content.appendChild(chatCreate('span','chatConversationPreview',previewText));button.appendChild(avatar);button.appendChild(content);
    var unread=Number(chatState.unreadByConversation[conversation.id]||0);if(unread)button.appendChild(chatCreate('em','chatConversationBadge',chatCap(unread,99)));
    button.onclick=function(){chatOpenPrivateConversation(conversation.id)};host.appendChild(button);
  });
}
function chatRenderHome(){chatRenderTeamHeader();chatRenderConversationList();chatRenderNewConversationMembers()}
function chatSetThreadHeader(conversation){
  var title=chatEl('chatThreadTitle'),subtitle=chatEl('chatThreadSubtitle');if(title)title.textContent=chatConversationTitle(conversation);if(subtitle)subtitle.textContent='Private conversation';
}
async function chatEnsureOwnMember(){
  var client=chatClient(),user=chatUser(),profile=chatProfile();if(!client||!user||!profile)return false;
  var existing=await client.from('chat_members').select('user_id').eq('user_id',user.id).maybeSingle();if(existing.data)return true;
  var inserted=await client.from('chat_members').insert({display_name:profile.display_name});return !inserted.error||inserted.error.code==='23505';
}
function chatApplyOverview(data){
  data=data||{};chatState.members=Array.isArray(data.members)?data.members:[];chatState.membersById={};chatState.members.forEach(function(member){chatState.membersById[member.user_id]=member});
  chatState.directory=Array.isArray(data.directory)?data.directory:[];chatState.directoryByPerson={};chatState.directory.forEach(function(entry){chatState.directoryByPerson[entry.person_key]=entry});
  chatState.conversations=Array.isArray(data.conversations)?data.conversations:[];
  chatState.latestByConversation={};(Array.isArray(data.latest)?data.latest:[]).forEach(function(item){if(item&&item.message)chatState.latestByConversation[item.conversation_id]=item.message});
  chatState.unreadByConversation={};(Array.isArray(data.unread)?data.unread:[]).forEach(function(item){chatState.unreadByConversation[item.conversation_id]=Number(item.unread_count||0)});
  chatState.readStateByConversation={};(Array.isArray(data.read_state)?data.read_state:[]).forEach(function(item){chatState.readStateByConversation[item.conversation_id]=Number(item.last_read_message_id||0)});
  chatState.overviewLoadedAt=Date.now();chatUpdateNavBadge();chatRenderHome();
}
async function chatFetchOverview(force){
  if(!force&&chatState.overviewLoadedAt&&Date.now()-chatState.overviewLoadedAt<OVERVIEW_TTL)return true;
  var client=chatClient();if(!client)throw new Error('Chat connection unavailable');
  var result=await client.rpc('chat_overview_v2');if(result.error)throw result.error;chatApplyOverview(result.data);return true;
}
async function chatRefreshUnreadCounts(){
  var client=chatClient();if(!client||!chatProfile()||!chatOnline())return;
  var result=await client.rpc('chat_unread_counts');if(result.error)return;
  var next={};(result.data||[]).forEach(function(row){next[row.conversation_id]=Number(row.unread_count||0)});chatState.unreadByConversation=next;chatUpdateNavBadge();if(chatVisible())chatRenderHome();
}
function chatScheduleOverviewRefresh(){
  clearTimeout(chatState.overviewRefreshTimer);chatState.overviewRefreshTimer=setTimeout(function(){if(chatUser()&&chatProfile()&&chatOnline())chatFetchOverview(true).catch(function(){})},250);
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
  chatState.readStateByConversation[conversationId]=Number(messageId);chatState.unreadByConversation[conversationId]=0;chatUpdateNavBadge();chatRenderHome();
}
async function chatReadTeamIfAtBottom(){
  var team=chatTeamConversation(),host=chatEl('chatTeamMessages');if(!team||!host||!chatNearBottom(host)||!chatState.teamMessages.length)return;
  var last=chatState.teamMessages.filter(function(m){return chatIsNumericId(m.id)}).slice(-1)[0];if(!last)return;
  chatState.teamNewBelow=0;chatShowNewButton('team',0);await chatMarkRead(team.id,Number(last.id));
}
async function chatReadPrivateIfAtBottom(){
  var host=chatEl('chatMessages');if(!chatState.activeConversationId||!host||!chatNearBottom(host)||!chatState.messages.length)return;
  var last=chatState.messages.filter(function(m){return chatIsNumericId(m.id)}).slice(-1)[0];if(!last)return;
  chatState.privateNewBelow=0;chatShowNewButton('private',0);await chatMarkRead(chatState.activeConversationId,Number(last.id));
}
async function chatLoadTeamMessages(older,force){
  var team=chatTeamConversation(),client=chatClient();if(!team||!client||chatState.teamLoading)return;
  if(!older&&!force&&chatState.teamMessages.length&&Date.now()-chatState.teamLoadedAt<30000){chatRenderTeamMessages();chatRenderTeamHeader();return}
  chatState.teamLoading=true;var button=chatEl('chatTeamLoadOlder');if(button){button.disabled=true;button.textContent=older?'Loading…':'Recent messages'}
  try{
    if(!older){
      chatState.teamUnreadAnchor=Number(chatState.readStateByConversation[team.id]||0);
      chatState.teamHadUnread=Number(chatState.unreadByConversation[team.id]||0)>0;
      chatState.teamNewBelow=0;chatShowNewButton('team',0);
    }
    var query=client.from('chat_messages').select(CHAT_MESSAGE_FIELDS).eq('conversation_id',team.id).order('id',{ascending:false}).limit(TEAM_PAGE_SIZE);
    if(older&&chatState.teamOldestMessageId)query=query.lt('id',chatState.teamOldestMessageId);
    var result=await query;if(result.error)throw result.error;var rows=(result.data||[]).slice().reverse();await chatLoadReplyTargets(rows);
    if(older){
      var host=chatEl('chatTeamMessages'),beforeHeight=host?host.scrollHeight:0;chatState.teamMessages=rows.concat(chatState.teamMessages);if(rows.length)chatState.teamOldestMessageId=Number(rows[0].id);chatState.teamHasOlder=(result.data||[]).length===TEAM_PAGE_SIZE;chatRenderTeamMessages();if(host)host.scrollTop=host.scrollHeight-beforeHeight;
    }else{
      var failed=chatState.teamMessages.filter(function(m){return m.failed});chatState.teamMessages=rows.concat(failed);chatState.teamOldestMessageId=rows.length?Number(rows[0].id):null;chatState.teamHasOlder=(result.data||[]).length===TEAM_PAGE_SIZE;chatState.teamLoadedAt=Date.now();if(rows.length)chatState.latestByConversation[team.id]=rows[rows.length-1];chatRenderTeamMessages();
      var teamHost=chatEl('chatTeamMessages');if(!(chatState.teamHadUnread&&chatScrollToUnread(teamHost)))chatScrollToBottom(teamHost);
      if(!chatState.teamHadUnread&&rows.length)await chatMarkRead(team.id,Number(rows[rows.length-1].id));
    }
  }catch(error){chatSetTeamStatus('Group messages could not be loaded. Try again in a moment.',true)}
  finally{chatState.teamLoading=false;if(button){button.disabled=false;button.textContent='Load older';button.classList.toggle('hidden',!chatState.teamHasOlder)}chatRenderTeamHeader()}
}
function chatRosterDirectory(){
  var mine=chatCurrentPersonKey();
  return chatRosterKeys().filter(function(personKey){return personKey!==mine}).map(function(personKey){
    var entry=chatState.directoryByPerson[personKey]||{person_key:personKey,display_name:personKey,preferred_user_id:null,registered:false,active:true};
    return{person_key:personKey,display_name:chatDisplayName(personKey),preferred_user_id:entry.preferred_user_id||null,registered:!!entry.registered};
  });
}
function chatRenderNewConversationMembers(){
  var host=chatEl('chatMemberPicker');if(!host)return;host.textContent='';var entries=chatRosterDirectory();
  if(!entries.length){host.appendChild(chatCreate('p','chatMemberPickerEmpty','No other nurses are currently in the roster.'));return}
  entries.forEach(function(entry){
    var available=!!(entry.registered&&entry.preferred_user_id),button=chatCreate('button','chatMemberChoice'+(available?'':' awaiting'));button.type='button';button.dataset.chatPerson=entry.person_key;
    button.appendChild(chatCreate('span','chatMemberAvatar',chatInitial(entry.display_name)));var text=chatCreate('span','chatMemberChoiceText');text.appendChild(chatCreate('b','',entry.display_name));text.appendChild(chatCreate('small','',available?'Available for private chat':'Has not registered in Night Roster yet'));button.appendChild(text);
    var status=chatCreate('span','chatMemberStatus '+(available?'available':'waiting'),available?'Available':'Not registered');button.appendChild(status);
    if(available)button.onclick=function(){chatStartPrivate(entry.person_key)};else{button.disabled=true;button.setAttribute('aria-disabled','true')}host.appendChild(button);
  });
}
async function chatOpenView(options){
  options=options||{};chatHideFallback();chatSetStatus('',false);chatSetTeamStatus('',false);
  if(!chatOnline()){chatShowFallback('Chat needs an internet connection. Night, Changes and Breaks continue to work normally.');chatSetConnection('offline');return}
  if(!chatProfile()||!chatUser()){chatShowFallback('Chat will be available after the roster account finishes signing in.');return}
  try{
    await chatFetchOverview(!!options.force);
    var team=chatTeamConversation();
    if(team&&(!options.targetConversation||options.targetConversation===team.id))await chatLoadTeamMessages(false,!!options.force);
  }catch(error){chatShowFallback('Chat is temporarily unavailable. Night, Changes and Breaks are unaffected.');chatSetStatus('Could not connect to chat. Try again in a moment.',true)}
}
async function chatOpenPrivateConversation(conversationId,options){
  options=options||{};var conversation=chatState.conversations.find(function(item){return item.id===conversationId&&item.kind==='direct'});if(!conversation)return;
  chatState.activeConversationId=conversationId;chatState.messages=[];chatState.oldestMessageId=null;chatState.hasOlder=false;chatState.loadingThread=true;chatState.privateNewBelow=0;chatShowNewButton('private',0);var token=++chatState.threadToken;
  chatState.privateUnreadAnchor=Number(chatState.readStateByConversation[conversationId]||0);chatState.privateHadUnread=Number(chatState.unreadByConversation[conversationId]||0)>0;
  var root=chatEl('chat');if(root)root.classList.add('chat-thread-open');var thread=chatEl('chatThread');if(thread)thread.classList.remove('hidden');chatSetThreadHeader(conversation);chatRenderHome();chatSetPrivateStatus('');
  var messages=chatEl('chatMessages');if(messages){messages.textContent='';messages.appendChild(chatCreate('div','chatThreadLoading','Loading recent messages…'))}
  var result=await chatClient().from('chat_messages').select(CHAT_MESSAGE_FIELDS).eq('conversation_id',conversationId).order('id',{ascending:false}).limit(PRIVATE_PAGE_SIZE);
  if(token!==chatState.threadToken)return;chatState.loadingThread=false;if(result.error){chatSetPrivateStatus('This conversation could not be opened.',true);return}
  var rows=(result.data||[]).slice().reverse();await chatLoadReplyTargets(rows);chatState.messages=rows;chatState.oldestMessageId=rows.length?Number(rows[0].id):null;chatState.hasOlder=(result.data||[]).length===PRIVATE_PAGE_SIZE;var older=chatEl('chatLoadOlder');if(older)older.classList.toggle('hidden',!chatState.hasOlder);chatRenderPrivateMessages();
  var host=chatEl('chatMessages');if(!(chatState.privateHadUnread&&chatScrollToUnread(host)))chatScrollToBottom(host);
  if(!chatState.privateHadUnread&&rows.length)await chatMarkRead(conversationId,Number(rows[rows.length-1].id));
}
async function chatLoadOlderPrivate(){
  if(!chatState.activeConversationId||!chatState.hasOlder||chatState.loadingThread||!chatState.oldestMessageId)return;
  chatState.loadingThread=true;var button=chatEl('chatLoadOlder');if(button){button.disabled=true;button.textContent='Loading…'}var host=chatEl('chatMessages'),beforeHeight=host?host.scrollHeight:0;
  var result=await chatClient().from('chat_messages').select(CHAT_MESSAGE_FIELDS).eq('conversation_id',chatState.activeConversationId).lt('id',chatState.oldestMessageId).order('id',{ascending:false}).limit(PRIVATE_PAGE_SIZE);
  chatState.loadingThread=false;if(button){button.disabled=false;button.textContent='Load older messages'}if(result.error){chatSetPrivateStatus('Older messages could not be loaded.',true);return}
  var rows=(result.data||[]).slice().reverse();await chatLoadReplyTargets(rows);chatState.hasOlder=(result.data||[]).length===PRIVATE_PAGE_SIZE;if(button)button.classList.toggle('hidden',!chatState.hasOlder);if(!rows.length)return;chatState.oldestMessageId=Number(rows[0].id);chatState.messages=rows.concat(chatState.messages);chatRenderPrivateMessages();if(host)host.scrollTop=host.scrollHeight-beforeHeight;
}
function chatFailedMessage(body,conversationId,replyId){
  return{id:'failed-'+Date.now()+'-'+Math.random().toString(36).slice(2),conversation_id:conversationId,sender_id:chatCurrentId(),sender_display_name:chatCurrentPersonKey(),body:body,created_at:new Date().toISOString(),deleted_at:null,reply_to_message_id:replyId||null,failed:true};
}
function chatRemoveFailed(message,kind){
  var list=kind==='team'?chatState.teamMessages:chatState.messages,index=list.findIndex(function(item){return String(item.id)===String(message.id)});if(index>=0)list.splice(index,1);
}
function chatAddFailed(body,conversationId,kind,replyId){
  var failed=chatFailedMessage(body,conversationId,replyId);if(kind==='team'){chatState.teamMessages.push(failed);chatRenderTeamMessages();chatScrollToBottom(chatEl('chatTeamMessages'))}else{chatState.messages.push(failed);chatRenderPrivateMessages();chatScrollToBottom(chatEl('chatMessages'))}
}
async function chatSendToConversation(conversationId,body,replyId){
  var row={conversation_id:conversationId,body:body};if(replyId)row.reply_to_message_id=Number(replyId);
  return chatClient().from('chat_messages').insert(row).select(CHAT_MESSAGE_FIELDS).single();
}
async function chatCompleteSend(result,kind){
  if(kind==='team'){
    if(!chatIsDuplicate(chatState.teamMessages,result.data.id))chatState.teamMessages.push(result.data);chatState.latestByConversation[result.data.conversation_id]=result.data;chatRenderTeamMessages();chatScrollToBottom(chatEl('chatTeamMessages'));
  }else{
    if(!chatIsDuplicate(chatState.messages,result.data.id))chatState.messages.push(result.data);chatState.latestByConversation[result.data.conversation_id]=result.data;chatRenderPrivateMessages();chatScrollToBottom(chatEl('chatMessages'));chatRenderConversationList();
  }
  await chatMarkRead(result.data.conversation_id,Number(result.data.id));if(window.dispatchChatPush)window.dispatchChatPush(result.data.id);
}
async function chatRetryFailed(message,kind){
  if(!message||!message.failed||!chatOnline())return;
  var result=await chatSendToConversation(message.conversation_id,message.body,message.reply_to_message_id);
  if(result.error){kind==='team'?chatSetTeamStatus('Still not sent. Check the connection and retry.',true):chatSetPrivateStatus('Still not sent. Check the connection and retry.',true);return}
  chatRemoveFailed(message,kind);await chatCompleteSend(result,kind);
}
async function chatSendTeamMessage(event){
  if(event)event.preventDefault();var team=chatTeamConversation(),textarea=chatEl('chatTeamInput'),button=chatEl('chatTeamSendBtn');if(!team||!textarea||!button)return;
  var body=textarea.value.trim(),reply=chatState.teamReplyMessage,replyId=reply&&chatIsNumericId(reply.id)?Number(reply.id):null;if(!body)return;if(body.length>2000){chatSetTeamStatus('Keep messages under 2,000 characters.',true);return}
  if(!chatOnline()){textarea.value='';chatAddFailed(body,team.id,'team',replyId);chatClearReply('team');chatHideMentionMenu();chatSetTeamStatus('Not sent. Retry when the connection returns.',true);return}
  button.disabled=true;textarea.disabled=true;chatSetTeamStatus('');
  try{
    var result=await chatSendToConversation(team.id,body,replyId);if(result.error)throw result.error;textarea.value='';chatAutoGrow(textarea);chatClearReply('team');chatHideMentionMenu();await chatCompleteSend(result,'team');
  }catch(error){textarea.value='';chatAutoGrow(textarea);chatAddFailed(body,team.id,'team',replyId);chatClearReply('team');chatHideMentionMenu();chatSetTeamStatus('Message not sent. Tap Retry on the message.',true)}
  finally{button.disabled=false;textarea.disabled=false;textarea.focus()}
}
async function chatSendPrivateMessage(event){
  if(event)event.preventDefault();var textarea=chatEl('chatMessageInput'),button=chatEl('chatSendBtn'),conversationId=chatState.activeConversationId;if(!textarea||!conversationId)return;
  var body=textarea.value.trim(),reply=chatState.privateReplyMessage,replyId=reply&&chatIsNumericId(reply.id)?Number(reply.id):null;if(!body)return;if(body.length>2000){chatSetPrivateStatus('Keep messages under 2,000 characters.',true);return}
  if(!chatOnline()){textarea.value='';chatAddFailed(body,conversationId,'private',replyId);chatClearReply('private');chatSetPrivateStatus('Not sent. Retry when the connection returns.',true);return}
  button.disabled=true;textarea.disabled=true;chatSetPrivateStatus('');
  try{
    var result=await chatSendToConversation(conversationId,body,replyId);if(result.error)throw result.error;textarea.value='';chatAutoGrow(textarea);chatClearReply('private');await chatCompleteSend(result,'private');
  }catch(error){textarea.value='';chatAutoGrow(textarea);chatAddFailed(body,conversationId,'private',replyId);chatClearReply('private');chatSetPrivateStatus('Message not sent. Tap Retry on the message.',true)}
  finally{button.disabled=false;textarea.disabled=false;textarea.focus()}
}
function chatAutoGrow(textarea){if(!textarea)return;textarea.style.height='auto';textarea.style.height=Math.min(textarea.scrollHeight,120)+'px'}
async function chatStartPrivate(otherPersonKey){
  var mine=chatCurrentPersonKey(),selfEntry=chatState.directoryByPerson[mine],otherEntry=chatState.directoryByPerson[otherPersonKey];if(!mine||!selfEntry||!selfEntry.preferred_user_id||!otherEntry||!otherEntry.preferred_user_id||mine===otherPersonKey)return;
  var pair=[selfEntry.preferred_user_id,otherEntry.preferred_user_id].sort(),existing=chatState.conversations.find(function(item){return item.kind==='direct'&&item.user_a===pair[0]&&item.user_b===pair[1]});
  if(!existing){
    var client=chatClient(),found=await client.from('chat_conversations').select('id,kind,title,user_a,user_b,created_by,created_at').eq('kind','direct').eq('user_a',pair[0]).eq('user_b',pair[1]).maybeSingle();
    if(found.data)existing=found.data;
    else{
      var created=await client.from('chat_conversations').insert({kind:'direct',user_a:pair[0],user_b:pair[1],created_by:selfEntry.preferred_user_id}).select('id,kind,title,user_a,user_b,created_by,created_at').single();
      if(created.error&&created.error.code==='23505'){
        var retry=await client.from('chat_conversations').select('id,kind,title,user_a,user_b,created_by,created_at').eq('kind','direct').eq('user_a',pair[0]).eq('user_b',pair[1]).single();if(retry.error){chatSetStatus('Private chat could not be opened.',true);return}existing=retry.data;
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
function chatCloseThread(){var root=chatEl('chat');if(root)root.classList.remove('chat-thread-open');chatState.activeConversationId=null;chatRenderHome()}
function chatOpenMessageActions(message,kind){
  if(!message||message.failed)return;chatState.actionMessage=message;chatState.actionKind=kind;var dialog=chatEl('chatMessageActionSheet'),preview=chatEl('chatMessageActionPreview'),deleteBtn=chatEl('chatMessageDeleteBtn'),replyBtn=chatEl('chatMessageReplyBtn');
  if(preview)preview.textContent=message.deleted_at?'Message deleted':String(message.body||'').slice(0,120);
  if(deleteBtn)deleteBtn.classList.toggle('hidden',!chatCanDelete(message));if(replyBtn)replyBtn.classList.toggle('hidden',!!message.deleted_at);
  if(dialog&&dialog.showModal&&!dialog.open)dialog.showModal();
}
function chatReplyActionMessage(){var message=chatState.actionMessage,kind=chatState.actionKind;if(message&&!message.deleted_at)chatStartReply(message,kind)}
async function chatCopyActionMessage(){
  var message=chatState.actionMessage;if(!message||message.deleted_at)return;
  try{await navigator.clipboard.writeText(String(message.body||''));if(typeof toast==='function')toast('Message copied')}catch(error){if(typeof toast==='function')toast('Message could not be copied')}
  var dialog=chatEl('chatMessageActionSheet');if(dialog&&dialog.open)dialog.close();
}
async function chatDeleteActionMessage(){
  var message=chatState.actionMessage,kind=chatState.actionKind;if(!chatCanDelete(message))return;
  var result=await chatClient().from('chat_messages').update({body:'Message deleted',deleted_at:new Date().toISOString()}).eq('id',Number(message.id)).eq('sender_id',chatCurrentId()).select(CHAT_MESSAGE_FIELDS).maybeSingle();
  if(result.error||!result.data){if(typeof toast==='function')toast('Message can no longer be deleted');return}
  chatApplyMessageUpdate(result.data);var dialog=chatEl('chatMessageActionSheet');if(dialog&&dialog.open)dialog.close();if(typeof toast==='function')toast('Message deleted');
}
function chatApplyMessageUpdate(message){
  [chatState.teamMessages,chatState.messages].forEach(function(list){var index=list.findIndex(function(item){return String(item.id)===String(message.id)});if(index>=0)list[index]=message});
  if(chatState.latestByConversation[message.conversation_id]&&String(chatState.latestByConversation[message.conversation_id].id)===String(message.id))chatState.latestByConversation[message.conversation_id]=message;
  chatRenderTeamMessages();chatRenderPrivateMessages();chatRenderConversationList();
}
function chatAcceptIncoming(message){
  var team=chatTeamConversation(),own=chatOwnMessage(message);
  chatState.latestByConversation[message.conversation_id]=message;
  if(team&&message.conversation_id===team.id){
    var host=chatEl('chatTeamMessages'),near=chatNearBottom(host),active=chatVisible()&&document.visibilityState!=='hidden';
    if(!chatIsDuplicate(chatState.teamMessages,message.id))chatState.teamMessages.push(message);chatRenderTeamMessages();
    if(active&&near){chatScrollToBottom(host);chatMarkRead(team.id,Number(message.id))}
    else if(!own){chatState.unreadByConversation[team.id]=Number(chatState.unreadByConversation[team.id]||0)+1;if(active){chatState.teamNewBelow+=1;chatShowNewButton('team',chatState.teamNewBelow)}}
    chatUpdateNavBadge();chatRenderTeamHeader();return;
  }
  var activePrivate=chatState.activeConversationId===message.conversation_id&&chatVisible()&&document.visibilityState!=='hidden',privateHost=chatEl('chatMessages'),nearPrivate=chatNearBottom(privateHost);
  if(activePrivate){if(!chatIsDuplicate(chatState.messages,message.id))chatState.messages.push(message);chatRenderPrivateMessages();if(nearPrivate){chatScrollToBottom(privateHost);chatMarkRead(message.conversation_id,Number(message.id))}else if(!own){chatState.unreadByConversation[message.conversation_id]=Number(chatState.unreadByConversation[message.conversation_id]||0)+1;chatState.privateNewBelow+=1;chatShowNewButton('private',chatState.privateNewBelow)}}
  else if(!own)chatState.unreadByConversation[message.conversation_id]=Number(chatState.unreadByConversation[message.conversation_id]||0)+1;
  chatUpdateNavBadge();chatRenderConversationList();
}
function chatHandleIncomingMessage(payload){var message=payload&&payload.new;if(message&&message.conversation_id){if(message.reply_to_message_id)chatLoadReplyTargets([message]).then(function(){chatRenderTeamMessages();chatRenderPrivateMessages()});chatAcceptIncoming(message)}}
function chatHandleUpdatedMessage(payload){var message=payload&&payload.new;if(message&&message.id)chatApplyMessageUpdate(message)}
function chatHandleConversationChange(payload){var conversation=payload&&payload.new;if(conversation&&conversation.id&&!chatState.conversations.some(function(item){return item.id===conversation.id}))chatState.conversations.push(conversation);chatScheduleOverviewRefresh()}
function chatHandleDirectoryChange(){chatState.overviewLoadedAt=0;chatScheduleOverviewRefresh()}
function chatScheduleRealtimeReconnect(){
  clearTimeout(chatState.reconnectTimer);if(!chatOnline()||!chatUser()||!chatProfile())return;chatState.reconnectAttempt+=1;var delay=Math.min(10000,1500*Math.pow(2,Math.min(chatState.reconnectAttempt,3)));chatState.reconnectTimer=setTimeout(chatSubscribeRealtime,delay);
}
function chatSubscribeRealtime(){
  var client=chatClient(),user=chatUser();if(!client||!user||!chatOnline()){chatSetConnection('offline');return}
  clearTimeout(chatState.reconnectTimer);if(chatState.channel){client.removeChannel(chatState.channel);chatState.channel=null}
  chatSetConnection('reconnecting');
  var channel=client.channel('anaesthetic-chat-v4-'+user.id)
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'chat_messages'},chatHandleIncomingMessage)
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'chat_messages'},chatHandleUpdatedMessage)
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'chat_conversations'},chatHandleConversationChange)
    .on('postgres_changes',{event:'*',schema:'public',table:'chat_members'},chatHandleDirectoryChange)
    .on('postgres_changes',{event:'*',schema:'public',table:'chat_directory'},chatHandleDirectoryChange);
  chatState.channel=channel;channel.subscribe(function(status){
    if(status==='SUBSCRIBED'){chatState.reconnectAttempt=0;chatSetConnection('live');chatRefreshUnreadCounts();return}
    if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){chatSetConnection(chatOnline()?'reconnecting':'offline');chatScheduleRealtimeReconnect()}
  });
}
function chatTeardownSession(){
  var client=chatClient();clearTimeout(chatState.reconnectTimer);clearTimeout(chatState.overviewRefreshTimer);if(client&&chatState.channel)client.removeChannel(chatState.channel);
  chatState.channel=null;chatState.startedFor=null;chatState.members=[];chatState.membersById={};chatState.directory=[];chatState.directoryByPerson={};chatState.conversations=[];chatState.latestByConversation={};chatState.unreadByConversation={};chatState.readStateByConversation={};chatState.teamMessages=[];chatState.messages=[];chatState.replyTargets={};chatState.teamReplyMessage=null;chatState.privateReplyMessage=null;chatState.overviewLoadedAt=0;chatState.activeConversationId=null;chatUpdateNavBadge();chatRenderReplyComposer('team');chatRenderReplyComposer('private');chatHideMentionMenu();
}
async function chatStartSession(){
  var user=chatUser(),profile=chatProfile(),client=chatClient();if(!user||!profile||!client||!chatOnline())return false;
  if(chatState.startedFor===user.id&&chatState.channel)return true;chatState.startedFor=user.id;
  try{var ready=await chatEnsureOwnMember();if(!ready){chatState.startedFor=null;return false}await chatRefreshUnreadCounts();chatSubscribeRealtime();return true}catch(error){chatState.startedFor=null;return false}
}
function chatScheduleSessionStart(){
  clearTimeout(chatState.startTimer);chatState.startTimer=setTimeout(async function(){if(chatUser()&&chatProfile()&&chatOnline()){await chatStartSession();return}if(chatUser()&&chatOnline())chatScheduleSessionStart()},400);
}
async function chatOpenFromPush(conversationId){
  if(!conversationId||!chatUser()||!chatProfile())return;if(typeof show==='function')show('chat');
  await chatFetchOverview(true);var conversation=chatState.conversations.find(function(item){return item.id===conversationId});if(!conversation)return;
  if(conversation.kind==='direct'){await chatOpenPrivateConversation(conversationId,{fromPush:true});return}
  var root=chatEl('chat');if(root)root.classList.remove('chat-thread-open');chatState.activeConversationId=null;await chatLoadTeamMessages(false,true);
}
window.openChatFromPush=chatOpenFromPush;
window.refreshChatUnreadFromPush=function(){return chatRefreshUnreadCounts()};
function chatBindUi(){
  chatEnsureEnhancedUi();
  var nav=document.querySelector('.bottom button[data-v="chat"]');if(nav)nav.onclick=function(){if(typeof show==='function')show('chat');chatOpenView()};
  var newButton=chatEl('chatNewPrivateBtn');if(newButton)newButton.onclick=chatOpenNewConversation;
  var closePicker=chatEl('chatCloseNewConversation');if(closePicker)closePicker.onclick=function(){var dialog=chatEl('chatNewConversationSheet');if(dialog&&dialog.open)dialog.close()};
  var back=chatEl('chatBackBtn');if(back)back.onclick=chatCloseThread;
  var older=chatEl('chatLoadOlder');if(older)older.onclick=chatLoadOlderPrivate;
  var teamOlder=chatEl('chatTeamLoadOlder');if(teamOlder)teamOlder.onclick=function(){chatLoadTeamMessages(true,true)};
  var teamForm=chatEl('chatTeamComposer');if(teamForm)teamForm.onsubmit=chatSendTeamMessage;
  var privateForm=chatEl('chatComposer');if(privateForm)privateForm.onsubmit=chatSendPrivateMessage;
  var teamInput=chatEl('chatTeamInput');if(teamInput){teamInput.addEventListener('input',function(){chatAutoGrow(teamInput);chatRenderMentionMenu(teamInput)});teamInput.addEventListener('keydown',function(event){if(event.key==='Escape')chatHideMentionMenu()});teamInput.addEventListener('blur',function(){setTimeout(chatHideMentionMenu,160)})}
  var privateInput=chatEl('chatMessageInput');if(privateInput)privateInput.addEventListener('input',function(){chatAutoGrow(privateInput)});
  var teamHost=chatEl('chatTeamMessages');if(teamHost)teamHost.addEventListener('scroll',function(){if(chatNearBottom(teamHost))chatReadTeamIfAtBottom()},{passive:true});
  var privateHost=chatEl('chatMessages');if(privateHost)privateHost.addEventListener('scroll',function(){if(chatNearBottom(privateHost))chatReadPrivateIfAtBottom()},{passive:true});
  var teamNew=chatEl('chatTeamNewMessages');if(teamNew)teamNew.onclick=function(){chatScrollToBottom(teamHost);chatReadTeamIfAtBottom()};
  var privateNew=chatEl('chatPrivateNewMessages');if(privateNew)privateNew.onclick=function(){chatScrollToBottom(privateHost);chatReadPrivateIfAtBottom()};
  var replyAction=chatEl('chatMessageReplyBtn');if(replyAction)replyAction.onclick=chatReplyActionMessage;
  var teamCancel=chatEl('chatTeamReplyCancel');if(teamCancel)teamCancel.onclick=function(){chatClearReply('team')};var privateCancel=chatEl('chatPrivateReplyCancel');if(privateCancel)privateCancel.onclick=function(){chatClearReply('private')};
  var copy=chatEl('chatMessageCopyBtn');if(copy)copy.onclick=chatCopyActionMessage;
  var del=chatEl('chatMessageDeleteBtn');if(del)del.onclick=chatDeleteActionMessage;
  var cancel=chatEl('chatMessageCancelBtn');if(cancel)cancel.onclick=function(){var dialog=chatEl('chatMessageActionSheet');if(dialog&&dialog.open)dialog.close()};
  window.addEventListener('online',function(){chatSetConnection('reconnecting');chatScheduleSessionStart();chatFetchOverview(true).catch(function(){});if(chatVisible())chatOpenView({force:true})});
  window.addEventListener('offline',function(){chatSetConnection('offline');if(chatVisible())chatShowFallback('Chat needs an internet connection. Night, Changes and Breaks continue to work normally.')});
  document.addEventListener('visibilitychange',function(){
    if(document.visibilityState==='visible'&&chatUser()&&chatProfile()){
      chatRefreshUnreadCounts();chatFetchOverview(true).catch(function(){});
      if(chatVisible()){chatReadTeamIfAtBottom();chatReadPrivateIfAtBottom()}
    }
  });
}
function chatInit(){
  if(chatState.started)return;chatState.started=true;chatBindUi();chatHideFallback();var client=chatClient();
  if(client&&client.auth&&typeof client.auth.onAuthStateChange==='function'){
    var subscription=client.auth.onAuthStateChange(function(event){if(event==='SIGNED_OUT'){chatTeardownSession();return}if(event==='SIGNED_IN'||event==='INITIAL_SESSION'||event==='TOKEN_REFRESHED')chatScheduleSessionStart()});chatState.authSubscription=subscription&&subscription.data&&subscription.data.subscription||null;
  }
  chatScheduleSessionStart();
}
try{chatInit()}catch(error){chatShowFallback('Chat is temporarily unavailable. Night, Changes and Breaks are unaffected.')}
})();