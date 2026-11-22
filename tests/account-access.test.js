const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const core=fs.readFileSync('app-core.js','utf8');
const sql=fs.readFileSync('supabase/migrations/20261009051905_account_access_v54.sql','utf8');
const region=core.slice(core.indexOf('function canManageAccountAccess()'),core.indexOf('function switchAdminTab'));
const controls={accountName:{value:'New Nurse'},accountEmail:{value:'new@example.test'},authSubmitBtn:{disabled:false}};
const calls=[];
const context={currentUser:{email:'admin@example.test'},currentUserProfile:{user_role:'admin'},navigator:{onLine:true},forcedOfflineSession:false,accountAccessBusy:false,authorisedAccounts:[{email:'nurse@example.test',display_name:'Nurse',active:true,user_role:'member'}],APP_VERSION:JSON.parse(fs.readFileSync('release.json')).version,renderAccounts(){},toast(){},byId(id){return controls[id]},async loadAccounts(){},supa:{async rpc(name,args){calls.push({name,args});return{data:{email:args.p_email,active:args.p_active,user_role:args.p_role}}},from(){throw new Error('Unexpected direct table write')}},console};
vm.createContext(context);vm.runInContext(region,context);
(async()=>{
 await context.toggleAuthorisedAccount('nurse@example.test');
 assert.equal(calls.length,1);assert.equal(calls[0].name,'set_account_access_v54');assert.equal(calls[0].args.p_active,false);assert.equal(calls[0].args.p_expected_active,true);
 assert.match(context.accountAccessMessage,/no longer has app access/);assert.equal(context.accountAccessBusy,false);
 context.currentUserProfile.user_role='member';await context.toggleAuthorisedAccount('nurse@example.test');assert.equal(calls.length,1);
 context.currentUserProfile.user_role='admin';context.currentUser.email='nurse@example.test';await context.toggleAuthorisedAccount('nurse@example.test');assert.equal(calls.length,1);
 context.currentUser.email='admin@example.test';context.navigator.onLine=false;await context.toggleAuthorisedAccount('nurse@example.test');assert.equal(calls.length,1);context.navigator.onLine=true;
 context.supa.rpc=async()=>({data:null});await context.toggleAuthorisedAccount('nurse@example.test');assert.equal(context.accountAccessError,true);assert.match(context.accountAccessMessage,/could not be saved/);
 context.supa.rpc=async()=>{throw new Error('Network unavailable')};await context.toggleAuthorisedAccount('nurse@example.test');assert.equal(context.accountAccessBusy,false);assert.equal(context.accountAccessError,true);
 context.supa.rpc=async()=>({error:{message:'ACCOUNT_ACCESS_CHANGED'}});await context.changeAuthorisedAccount('nurse@example.test','admin');assert.match(context.accountAccessMessage,/another device/);
 controls.accountEmail.value='NURSE@example.test';await context.addAuthorisedAccount();assert.match(context.accountAccessMessage,/already has an account/);
 // The SQL boundary must reject untrusted callers and stale writes, and protect administrator access even from older clients.
 assert.match(sql,/auth.uid\(\) is null or not public.is_roster_admin\(\)/);
 assert.match(sql,/assert_app_write_compatible_v49\(p_client_version\)/);
 assert.match(sql,/for update/);assert.match(sql,/ACCOUNT_ACCESS_CHANGED/);assert.match(sql,/ACCOUNT_SELF_PROTECTED/);assert.match(sql,/ACCOUNT_LAST_ADMIN/);
 assert.match(sql,/before update or delete on public.allowed_users/);
 assert.match(sql,/revoke all on function public.set_account_access_v54[^;]+from public,anon,authenticated/);
 assert.match(sql,/set version=54/);
 assert.doesNotMatch(core.slice(core.indexOf('async function performAccessApproval'),core.indexOf('function switchAdminTab')),/\.upsert\(/,'adding or approving accounts must never overwrite existing roles');
 assert.match(core,/queryParams:\{prompt:'select_account'\}/);
 console.log('Account access permissions, verified saves, stale changes, duplicate protection and network recovery passed.');
})().catch(error=>{console.error(error);process.exitCode=1});

// Google account photos are a display fallback, separate from access decisions.
(async()=>{
 const account=fs.readFileSync('src/legacy-ui/account.js','utf8');
 const region=account.slice(account.indexOf('function googleProfilePhotoUrl('),account.indexOf('function paintAccountPhoto('));
 let resolvePhoto;
 const c={
  URL,currentUser:{id:'one',app_metadata:{provider:'google'},user_metadata:{avatar_url:'https://lh3.googleusercontent.com/a/example'}},
  currentPrivateProfile:{avatar_path:null},profileFeatureAvailable:true,profileAvatarUrl:'',
  applyProfileIdentity(){},
  supa:{storage:{from(){return{createSignedUrl:async()=>({data:{signedUrl:'https://example.test/private-photo'}})}}}}
 };
 vm.createContext(c);vm.runInContext(region,c);
 await c.refreshProfileAvatar();assert.equal(c.profileAvatarUrl,'https://lh3.googleusercontent.com/a/example');
 c.currentPrivateProfile.avatar_path='one/avatar.jpg';await c.refreshProfileAvatar();
 assert.equal(c.profileAvatarUrl,'https://example.test/private-photo','uploaded photo wins');
 c.currentUser.user_metadata.avatar_url='https://googleusercontent.com.evil.test/photo';
 assert.equal(c.googleProfilePhotoUrl(),'','only Google photo hosts are accepted');
 c.currentUser.user_metadata.avatar_url='javascript:alert(1)';assert.equal(c.googleProfilePhotoUrl(),'');
 c.currentUser.app_metadata.provider='email';c.currentUser.user_metadata.avatar_url='https://lh3.googleusercontent.com/a/example';
 assert.equal(c.googleProfilePhotoUrl(),'','a Google identity is required');
 c.currentUser.identities=[{provider:'google',identity_data:{picture:'https://lh3.googleusercontent.com/a/identity'}}];
 assert.equal(c.googleProfilePhotoUrl(),'https://lh3.googleusercontent.com/a/identity');
 c.supa.storage.from=()=>({createSignedUrl:()=>new Promise(resolve=>{resolvePhoto=resolve})});
 const pending=c.refreshProfileAvatar();
 c.currentUser={id:'two'};c.currentPrivateProfile={avatar_path:null};c.profileAvatarUrl='second-user-photo';
 resolvePhoto({data:{signedUrl:'https://example.test/old-user'}});
 await pending;
 assert.equal(c.profileAvatarUrl,'second-user-photo','late signed URLs cannot overwrite the next account');
 console.log('Google photo fallback, uploaded-photo priority, URL validation and account isolation passed.');
})().catch(error=>{console.error(error);process.exitCode=1});
