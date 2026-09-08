'use strict';
const crypto=require('node:crypto'),M=require('./model.cjs'),P=require('./policy.cjs'),A=require('./auth.cjs'),I=require('./integrity.cjs');
const{hash,audit}=require('./store.cjs');let installed=false;
const err=(status,code,message)=>Object.assign(Error(message),{status,code});
function revoke(d,u){u.authVersion++;for(const[k,s]of Object.entries(d.sessions))if(s.userId===u.id)delete d.sessions[k];for(const[k,i]of Object.entries(d.invites))if(i.userId===u.id)delete d.invites[k]}
function reconcileUsers(d,actor,w,data,key){
 for(const u of Object.values(d.users).filter(u=>u.active&&u.workspaceId===w.id)){
  const person=data.people.find(p=>p.id===u.personId);
  if(!person||person.active===false||person.deletedAt||person.archivedAt){
   if(u.role==='owner')throw err(422,'OWNER_PROTECTED','Нельзя архивировать действующего собственника.');
   u.active=false;revoke(d,u);audit(d,actor,'account.directory_disabled',{userId:u.id},key);
  }
 }
}
function install({Service,authenticate}){
 if(installed)return;installed=true;
 const permission=P.permission,validate=P.validateState;
 P.permission=(s,a,c)=>!I.immutableId(c)&&permission(s,a,c);
 P.validateState=(s,changes)=>{validate(s,changes);I.validate(s)};
 const bootstrap=Service.prototype.bootstrap;
 Service.prototype.bootstrap=async function(b){I.validate(require('./service.cjs').cleanImport(b.data));return bootstrap.call(this,b)};
 const login=Service.prototype.login;
 Service.prototype.login=async function(b,identity){
  if(typeof b?.username!=='string'||!/^[a-z0-9][a-z0-9_.-]{2,63}$/i.test(b.username.trim())||typeof b?.password!=='string'||b.password.length>128)throw err(401,'BAD_CREDENTIALS','Неверный логин или пароль.');
  return login.call(this,b,identity);
 };
 Service.prototype.getSession=function(cookie){return this.store.tx(d=>{const{user,sess}=authenticate(d,cookie);const epoch=user.authVersion;return{actor:{...P.publicActor(user),securityEpoch:epoch},csrf:sess.csrf,views:P.VIEWS[user.role],cacheKey:crypto.createHmac('sha256',this.key).update('ek65-cache:'+user.id+':'+epoch).digest('base64url')}})};
 const changePassword=Service.prototype.changePassword;
 Service.prototype.changePassword=async function(cookie,csrf,b){
  const u=await this.store.tx(d=>{const c=authenticate(d,cookie);if(!A.equalSecret(c.sess.csrf,csrf))throw err(403,'CSRF','Обновите страницу.');const key=hash('password:'+c.user.id);const n=Date.now();const r=d.rates[key]&&d.rates[key].until>n?d.rates[key]:{n:0,until:n+900000};if(r.n>=8)throw err(429,'RATE_LIMIT','Слишком много попыток смены пароля.');r.n++;d.rates[key]=r;return c.user.id});
  if(typeof b?.oldPassword!=='string'||b.oldPassword.length>128)throw err(401,'BAD_CREDENTIALS','Неверный текущий пароль.');
  const r=await changePassword.call(this,cookie,csrf,b);await this.store.tx(d=>{delete d.rates[hash('password:'+u)]});return r;
 };
 function owner(d,cookie,csrf){const c=authenticate(d,cookie);if(!A.equalSecret(c.sess.csrf,csrf))throw err(403,'CSRF','Обновите страницу.');if(c.user.role!=='owner')throw err(403,'FORBIDDEN','Доступ только собственнику.');return c.user}
 function target(d,actor,b){const u=Object.values(d.users).find(u=>u.id===b?.userId&&u.workspaceId===actor.workspaceId);if(!u||u.id===actor.id||u.role==='owner')throw err(422,'USER','Эту учётную запись изменять нельзя.');return u}
 Service.prototype.setAccess=function(cookie,csrf,b){return this.store.tx(d=>{
  const actor=owner(d,cookie,csrf),u=target(d,actor,b);
  if(!P.ROLES.includes(b.role)||b.role==='owner'||typeof b.management!=='boolean')throw err(422,'ROLE','Некорректная роль.');
  if(!u.active)throw err(422,'USER','Сначала перевыпустите приглашение для отключённой записи.');
  const before={role:u.role,scopes:u.scopes};u.role=b.role;u.scopes=b.role==='mentor'&&b.management?['management']:[];revoke(d,u);audit(d,actor,'account.access_changed',{userId:u.id,before,after:{role:u.role,scopes:u.scopes}},this.key);return{ok:true,user:P.publicActor(u),sessionsRevoked:true};
 })};
 Service.prototype.reissueInvite=function(cookie,csrf,b){return this.store.tx(d=>{
  const actor=owner(d,cookie,csrf),u=target(d,actor,b),w=d.workspaces[actor.workspaceId];
  if(!w.data.people.some(p=>p.id===u.personId&&p.active!==false&&!p.deletedAt&&!p.archivedAt))throw err(422,'PERSON','Сначала восстановите карточку сотрудника.');
  if(Object.values(d.users).some(x=>x.id!==u.id&&x.active&&x.workspaceId===u.workspaceId&&x.personId===u.personId))throw err(409,'EXISTS','У сотрудника уже есть другая активная учётная запись.');
  revoke(d,u);u.active=true;u.passwordHash=null;const token=A.token();d.invites[hash(token)]={userId:u.id,expiresAt:Date.now()+86400000};audit(d,actor,'account.invitation_reissued',{userId:u.id},this.key);return{user:P.publicActor(u),token,expiresIn:86400};
 })};
}
module.exports={install,reconcileUsers};
