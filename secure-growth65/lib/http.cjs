'use strict';
const {readFile}=require('node:fs/promises');const path=require('node:path');const crypto=require('node:crypto');
const {error}=require('./service.cjs');
const ROOT=path.resolve(__dirname,'..');
function headers(res){res.setHeader('Cache-Control','no-store, private');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'")}
function json(res,status,value){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(value))}
function cookie(req,secure){const name=secure?'__Host-ek65':'ek65_dev';const bits=(req.headers.cookie||'').split(';').map(x=>x.trim()).filter(x=>x.startsWith(name+'='));if(bits.length!==1)return'';return bits[0].slice(name.length+1)}
function setCookie(res,value,secure,clear=false){res.setHeader('Set-Cookie',`${secure?'__Host-ek65':'ek65_dev'}=${clear?'':value}; Path=/; HttpOnly; SameSite=Strict; ${secure?'Secure; ':''}Max-Age=${clear?0:43200}`)}
async function body(req){if(!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json'))throw error(415,'CONTENT_TYPE','Ожидался JSON.');const cap=2100000;let n=0,parts=[];if(req.body!==undefined){const raw=typeof req.body==='string'?req.body:JSON.stringify(req.body);if(Buffer.byteLength(raw)>cap)throw error(413,'SIZE','Слишком большой пакет.');try{return typeof req.body==='string'?JSON.parse(req.body):req.body}catch{throw error(400,'JSON','Некорректный JSON.')}}for await(const buf of req){n+=buf.length;if(n>cap)throw error(413,'SIZE','Слишком большой пакет.');parts.push(buf)}try{return JSON.parse(Buffer.concat(parts).toString('utf8'))}catch{throw error(400,'JSON','Некорректный JSON.')}}
function handler(service,{origin,secure=true}={}){
 if(!origin||secure&&!origin.startsWith('https://'))throw Error('Set APP_ORIGIN to the exact HTTPS origin');
 return async(req,res)=>{headers(res);const requestId=crypto.randomUUID();res.setHeader('X-Request-ID',requestId);if(secure)res.setHeader('Strict-Transport-Security','max-age=31536000');
  try{
   const url=new URL(req.url,origin);let route=url.pathname; // Vercel rewrite preserves path in a query parameter
   if(route==='/api/index'&&url.searchParams.has('route'))route='/api/'+url.searchParams.get('route');
   const mutating=!['GET','HEAD'].includes(req.method);
   if(mutating){if(req.headers.origin!==origin)throw error(403,'ORIGIN','Запрос с другого сайта отклонён.');if(req.headers['sec-fetch-site']&&req.headers['sec-fetch-site']!=='same-origin'&&req.headers['sec-fetch-site']!=='none')throw error(403,'ORIGIN','Запрос с другого сайта отклонён.')}
   const sid=cookie(req,secure),csrf=req.headers['x-csrf-token'];
   if(route==='/api/health'&&req.method==='GET')return json(res,200,{service:'ek65-secure',version:'6.5-security.1'});
   if(route==='/api/login'&&req.method==='POST'){const result=await service.login(await body(req),process.env.VERCEL?String(req.headers['x-vercel-forwarded-for']||'vercel').split(',')[0]:req.socket?.remoteAddress||'local');setCookie(res,result.cookie,secure);delete result.cookie;return json(res,200,result)}
   if(route==='/api/activate'&&req.method==='POST'){const result=await service.activate(await body(req));setCookie(res,result.cookie,secure);delete result.cookie;return json(res,200,result)}
   if(route==='/api/session'&&req.method==='GET')return json(res,200,await service.getSession(sid));
   if(route==='/api/logout'&&req.method==='POST'){const result=await service.logout(sid,csrf);setCookie(res,'',secure,true);return json(res,200,result)}
   if(route==='/api/password'&&req.method==='POST'){const result=await service.changePassword(sid,csrf,await body(req));setCookie(res,result.cookie,secure);delete result.cookie;return json(res,200,result)}
   if(route==='/api/state'&&req.method==='GET')return json(res,200,await service.getState(sid));
   if(route==='/api/state'&&req.method==='PATCH')return json(res,200,await service.patch(sid,csrf,await body(req)));
   if(route==='/api/users'&&req.method==='GET')return json(res,200,await service.listUsers(sid));
   if(route==='/api/invite'&&req.method==='POST')return json(res,200,await service.invite(sid,csrf,await body(req)));
   if(route==='/api/revoke'&&req.method==='POST')return json(res,200,await service.disableUser(sid,csrf,await body(req)));
   if(route==='/api/audit'&&req.method==='GET')return json(res,200,await service.auditLog(sid));
   if(route==='/api/backup'&&req.method==='GET'){res.setHeader('Content-Disposition','attachment; filename="ek65-backup.json"');return json(res,200,await service.exportState(sid))}
   const files={'/':'public/login.html','/login':'public/login.html','/auth.js':'public/auth.js','/login.css':'public/login.css','/app':'public/app.html','/app.css':'public/app.css','/model.js':'lib/model.cjs','/api/app':'build/app.js'};
   if(files[route]&&req.method==='GET'){
    if(route==='/api/app'||route==='/app')await service.getSession(sid);
    const file=files[route];res.setHeader('Content-Type',file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8');return res.end(await readFile(path.join(ROOT,file)));
   }
   return json(res,404,{error:'NOT_FOUND',message:'Не найдено.'});
  }catch(e){if(e.code==='AUTH_REQUIRED'&&req.url==='/app'){res.statusCode=302;res.setHeader('Location','/login');return res.end()}const status=e.status||500;if(status>=500)console.error(JSON.stringify({requestId,event:'request.failed',code:e.code||'INTERNAL'}));if(status===429)res.setHeader('Retry-After','900');return json(res,status,{error:status>=500?'SERVER_ERROR':e.code||'VALIDATION',message:status>=500?'Сервис временно недоступен. Изменения не потеряны: повторите позже.':e.message,requestId})}
 }
}
module.exports={handler,headers};
