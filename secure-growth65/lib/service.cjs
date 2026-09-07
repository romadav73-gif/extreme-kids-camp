'use strict';
const crypto=require('node:crypto');
const M=require('./model.cjs'),P=require('./policy.cjs'),A=require('./auth.cjs');const {hash,cleanup,audit}=require('./store.cjs');
function error(status,code,message){return Object.assign(Error(message),{status,code})}
const assert=(v,status,code,message)=>{if(!v)throw error(status,code,message)};
const username=s=>typeof s==='string'?s.trim().toLowerCase():'';
const validUser=s=>/^[a-z0-9][a-z0-9_.-]{2,63}$/.test(s);
function authenticate(d,token){const sess=d.sessions[hash(token||'')],user=sess&&Object.values(d.users).find(u=>u.id===sess.userId);assert(sess&&sess.expiresAt>Date.now()&&user?.active&&user.authVersion===sess.authVersion,401,'AUTH_REQUIRED','Войдите в свой кабинет.');return{user,sess}}
function current(d,cookie,csrf){const c=authenticate(d,cookie);assert(A.equalSecret(c.sess.csrf,csrf),403,'CSRF','Обновите страницу и повторите действие.');return c}
function workspace(d,user){const w=d.workspaces[user.workspaceId];assert(w,404,'NOT_FOUND','Рабочая база не найдена.');return w}
function view(w,user){return{actor:P.publicActor(user),views:P.VIEWS[user.role],revision:w.revision,state:P.projection(w.data,user)}}
function session(d,user){const token=A.token(),csrf=A.token();const prior=Object.entries(d.sessions).filter(([,s])=>s.userId===user.id).sort((a,b)=>a[1].expiresAt-b[1].expiresAt);for(const[k]of prior.slice(0,Math.max(0,prior.length-4)))delete d.sessions[k];d.sessions[hash(token)]={userId:user.id,authVersion:user.authVersion,csrf,expiresAt:Date.now()+12*3600000};return{cookie:token,csrf,actor:P.publicActor(user)}}
function cleanImport(raw){const s=M.clean(raw.growthOS||raw);M.validateJson(s);assert(s.version===6&&Array.isArray(s.groups)&&Array.isArray(s.tasks)&&M.obj(s.months)&&M.obj(s.settings),422,'FORMAT','Неверный формат экспорта 6.5.');return{...M.emptyState(s.settings.currentMonth),...s,meta:{revision:0,updatedAt:new Date().toISOString()}}}
class Service{
 constructor(store,{securityKey,now=()=>Date.now()}={}){assert(typeof securityKey==='string'&&securityKey.length>=32,500,'CONFIG','Server security key is not configured');this.store=store;this.key=securityKey;this.now=now}
 async bootstrap({username:name,personId='roman',displayName='Роман',data,password}){
  name=username(name);assert(validUser(name),422,'USERNAME','Некорректный логин.');const passwordHash=password?await A.hashPassword(password):null;
  return this.store.tx(d=>{assert(!d.users[name],409,'EXISTS','Логин уже существует.');const id=crypto.randomUUID(),wid=crypto.randomUUID(),s=cleanImport(data);assert(s.people.some(p=>p.id===personId),422,'PERSON','Сотрудник отсутствует в импорте.');
   const user={id,workspaceId:wid,username:name,personId,displayName,role:'owner',scopes:[],passwordHash,active:true,authVersion:1};d.users[name]=user;d.workspaces[wid]={id:wid,revision:1,name:s.settings.clubName,data:s};audit(d,user,'workspace.bootstrap',{sourceSha256:hash(JSON.stringify(data))},this.key);
   let invite;if(!passwordHash){invite=A.token();d.invites[hash(invite)]={userId:id,expiresAt:Date.now()+3600000}}
   return{workspaceId:wid,userId:id,...(invite?{invite}:{})};});
 }
 async login(body,rateIdentity='local'){
  const name=username(body?.username),password=body?.password;assert(typeof password==='string'&&password.length<=128,401,'BAD_CREDENTIALS','Неверный логин или пароль.');
  const candidate=await this.store.tx(d=>{cleanup(d);for(const bucket of ['user:'+name,'source:'+rateIdentity]){const k=hash(bucket),r=d.rates[k]||{n:0,until:Date.now()+15*60000};r.n++;d.rates[k]=r;assert(r.n<=(bucket.startsWith('user:')?8:50),429,'RATE_LIMIT','Слишком много попыток. Повторите позже.')}const u=d.users[name];return u?{passwordHash:u.passwordHash,authVersion:u.authVersion}:null});
  const good=await A.verifyPassword(password,candidate?.passwordHash||undefined);
  return this.store.tx(d=>{const u=d.users[name];if(!good||!u?.active||!u.passwordHash||u.authVersion!==candidate?.authVersion){audit(d,null,'login.failed',{loginHash:hash(name)},this.key);return{error:{status:401,code:'BAD_CREDENTIALS',message:'Неверный логин или пароль.'}}}const result=session(d,u);audit(d,u,'login.ok',{},this.key);return result}).then(r=>{if(r.error)throw error(r.error.status,r.error.code,r.error.message);return r});
 }
 async activate(body){
  assert(typeof body?.token==='string'&&body.token.length<=128,400,'INVITE','Некорректное приглашение.');A.validPassword(body.password);
  const invite=await this.store.tx(d=>{const i=d.invites[hash(body.token)];assert(i&&!i.used&&i.expiresAt>Date.now(),401,'INVITE','Приглашение истекло или уже использовано.');return i});
  const passwordHash=await A.hashPassword(body.password);
  return this.store.tx(d=>{const i=d.invites[hash(body.token)],u=Object.values(d.users).find(u=>u.id===invite.userId);assert(i&&!i.used&&i.expiresAt>Date.now()&&u?.active,401,'INVITE','Приглашение истекло или уже использовано.');i.used=true;u.passwordHash=passwordHash;u.authVersion++;for(const [k,s] of Object.entries(d.sessions))if(s.userId===u.id)delete d.sessions[k];audit(d,u,'account.activated',{},this.key);return session(d,u)});
 }
 async getSession(cookie){return this.store.tx(d=>{const{user,sess}=authenticate(d,cookie);return{actor:P.publicActor(user),csrf:sess.csrf,views:P.VIEWS[user.role],cacheKey:crypto.createHmac('sha256',this.key).update('ek65-cache:'+user.id).digest('base64url')}})}
 async logout(cookie,csrf){return this.store.tx(d=>{const{user}=current(d,cookie,csrf);delete d.sessions[hash(cookie)];audit(d,user,'logout',{},this.key);return{ok:true}})}
 async getState(cookie){return this.store.tx(d=>{const{user}=authenticate(d,cookie);return view(workspace(d,user),user)})}
 async patch(cookie,csrf,body){
  assert(body&&/^[0-9a-f-]{36}$/i.test(body.requestId||'')&&Array.isArray(body.changes)&&body.changes.length>0&&body.changes.length<=300,400,'PATCH','Неверный пакет изменений.');try{M.validateJson(body)}catch{throw error(400,'PATCH','Некорректная структура пакета.')}const digest=hash(M.canonical(body));
  return this.store.tx(d=>{const{user}=current(d,cookie,csrf),w=workspace(d,user);cleanup(d);const rid=user.id+':'+body.requestId,existing=d.requests[rid];
   if(existing){assert(existing.hash===digest,409,'IDEMPOTENCY','Нельзя повторно использовать идентификатор для другой операции.');return{...view(w,user),replayed:true}}
   const data=M.clone(w.data),readable=M.clean(P.projection(data,user));const applied=[];
   for(const c of body.changes){
    assert(['set','remove'].includes(c.op)&&c.previous&&typeof c.previous.exists==='boolean',400,'PATCH','Неверная операция.');try{M.validPath(c.path);if(c.op==='set')M.validateJson(c.value)}catch{throw error(400,'PATCH','Некорректная операция.')} 
    let permitted;try{permitted=P.permission(data,user,c)}catch{throw error(400,'PATH','Неверный путь записи.')}assert(permitted,403,'FORBIDDEN','Нет прав на это изменение.');
    // Hidden fields cannot be guessed by comparing the server's error responses.
    let actual,visible;try{actual=M.lookup(M.clean(data),c.path);visible=M.lookup(readable,c.path)}catch{throw error(400,'PATH','Неверный путь записи.')} 
    assert(!actual.exists||visible.exists,403,'FORBIDDEN','Нет прав на эту запись.');
    const deletionKey=w.id+':'+M.canonical(c.path);
    assert(!(c.op==='set'&&!c.previous.exists&&d.tombstones[deletionKey]),409,'DELETED','Эта запись была удалена. Автовосстановление заблокировано.');
    const expected=c.previous.exists?{exists:true,value:M.clean(c.previous.value)}:{exists:false};
    // Desired value already present is an idempotent no-op, not a lost update.
    if(c.op==='set'&&actual.exists&&M.equal(actual.value,M.clean(c.value)))continue;
    assert(M.equal(actual,expected),409,'CONFLICT','Запись изменилась на другом устройстве. Ваши изменения сохранены локально.');
    try{M.change(data,c);M.change(readable,c)}catch{throw error(422,'STRUCTURE','Неверная структура записи или отсутствует родитель.')}applied.push(c);
    if(c.op==='remove'&&c.path.at(-1).startsWith('@'))d.tombstones[deletionKey]={at:new Date().toISOString(),userId:user.id};
   }
   P.validateState(data,applied);
   if(applied.length){w.revision++;data.meta={...(data.meta||{}),revision:w.revision,updatedAt:new Date().toISOString()};w.data=data;audit(d,user,'state.patch',{requestId:body.requestId,revision:w.revision,paths:applied.map(c=>c.path),sha256:hash(M.canonical(data))},this.key)}
   d.requests[rid]={hash:digest,revision:w.revision,expiresAt:Date.now()+7*86400000};return view(w,user);
  });
 }
 async listUsers(cookie){return this.store.tx(d=>{const{user}=authenticate(d,cookie);assert(user.role==='owner',403,'FORBIDDEN','Доступ только собственнику.');return Object.values(d.users).filter(x=>x.workspaceId===user.workspaceId).map(x=>({...P.publicActor(x),active:x.active,activated:!!x.passwordHash}))})}
 async invite(cookie,csrf,b){return this.store.tx(d=>{const{user}=current(d,cookie,csrf);assert(user.role==='owner',403,'FORBIDDEN','Доступ только собственнику.');const name=username(b.username);assert(validUser(name)&&!d.users[name],422,'USERNAME','Логин занят или некорректен.');assert(P.ROLES.includes(b.role)&&b.role!=='owner',422,'ROLE','Недопустимая роль.');const person=workspace(d,user).data.people.find(p=>p.id===b.personId&&p.active!==false&&!p.deletedAt);assert(person,422,'PERSON','Сотрудник не найден.');assert(!Object.values(d.users).some(u=>u.workspaceId===user.workspaceId&&u.personId===b.personId&&u.active),409,'EXISTS','У сотрудника уже есть активная учётная запись.');const u={id:crypto.randomUUID(),username:name,workspaceId:user.workspaceId,personId:person.id,displayName:person.name,role:b.role,scopes:b.management===true&&b.role==='mentor'?['management']:[],active:true,authVersion:1,passwordHash:null};d.users[name]=u;const t=A.token();d.invites[hash(t)]={userId:u.id,expiresAt:Date.now()+86400000};audit(d,user,'account.invited',{userId:u.id,role:u.role},this.key);return{user:P.publicActor(u),token:t,expiresIn:86400}})}
 async disableUser(cookie,csrf,b){return this.store.tx(d=>{const{user}=current(d,cookie,csrf);assert(user.role==='owner',403,'FORBIDDEN','Доступ только собственнику.');const u=Object.values(d.users).find(u=>u.id===b.userId&&u.workspaceId===user.workspaceId);assert(u&&u.id!==user.id&&u.role!=='owner',422,'USER','Нельзя отключить эту запись.');u.active=false;u.authVersion++;for(const[k,s]of Object.entries(d.sessions))if(s.userId===u.id)delete d.sessions[k];for(const[k,i]of Object.entries(d.invites))if(i.userId===u.id)delete d.invites[k];audit(d,user,'account.disabled',{userId:u.id},this.key);return{ok:true}})}
 async changePassword(cookie,csrf,b){const c=await this.store.tx(d=>current(d,cookie,csrf));assert(await A.verifyPassword(b.oldPassword,c.user.passwordHash),401,'BAD_CREDENTIALS','Неверный текущий пароль.');const h=await A.hashPassword(b.password);return this.store.tx(d=>{const{user}=current(d,cookie,csrf);assert(user.authVersion===c.user.authVersion,409,'CONFLICT','Учётная запись изменилась.');user.passwordHash=h;user.authVersion++;for(const[k,s]of Object.entries(d.sessions))if(s.userId===user.id)delete d.sessions[k];audit(d,user,'password.changed',{},this.key);return session(d,user)})}
 async auditLog(cookie){return this.store.tx(d=>{const{user}=authenticate(d,cookie);assert(user.role==='owner',403,'FORBIDDEN','Доступ только собственнику.');return d.audit.filter(x=>x.workspaceId===user.workspaceId).slice(-200)})}
 async exportState(cookie){return this.store.tx(d=>{const{user}=authenticate(d,cookie);assert(user.role==='owner',403,'FORBIDDEN','Доступ только собственнику.');const w=workspace(d,user),data=M.clone(w.data);return{format:'ek65-backup-v1',workspaceId:w.id,revision:w.revision,createdAt:new Date().toISOString(),sha256:hash(M.canonical(data)),data}})}
}
module.exports={Service,error,authenticate,cleanImport};
