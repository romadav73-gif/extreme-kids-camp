import http from 'node:http';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {randomBytes} from 'node:crypto';
import {ownerPasswordController} from './owner-password.mjs';
const require=createRequire(import.meta.url),root=new URL('.',import.meta.url);
const {MemoryStore}=require('./base/lib/store.cjs'),{Service,authenticate}=require('./base/lib/service.cjs');
const {handler,headers}=require('./base/lib/http.cjs'),fixture=require('./base/tests/fixture.cjs');
const store=new MemoryStore(),securityKey=randomBytes(32).toString('hex'),service=new Service(store,{securityKey});
const credentials={owner:randomBytes(24).toString('base64url'),staff:randomBytes(24).toString('base64url')};
await service.bootstrap({username:'qa_owner',password:credentials.owner,data:fixture});
const o=await service.login({username:'qa_owner',password:credentials.owner});
const i=await service.invite(o.cookie,o.csrf,{username:'qa_staff',personId:'tasya',role:'mentor'});
await service.activate({token:i.token,password:credentials.staff});
fs.writeFileSync(new URL('.qa-auth.json',root),JSON.stringify(credentials),{mode:0o600});
const core=handler(service,{origin:'http://127.0.0.1:8879',secure:false});
const reset=ownerPasswordController({store,authenticate,getSecurityKey:async()=>securityKey});
let bundle=fs.readFileSync(new URL('base/build/app.js',root),'utf8');
const marker="document.addEventListener('click',handleClick);";
if(bundle.split(marker).length!==2)throw Error('Bootstrap changed');
bundle=bundle.replace(marker,fs.readFileSync(new URL('owner-passwords.js',root),'utf8')+'\n'+marker);
http.createServer(async(req,res)=>{
 try{
  if(req.url==='/api/app'){
   const sid=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('ek65_dev='))?.slice(9)||'';
   await service.getSession(sid);headers(res);res.setHeader('Content-Type','text/javascript');return res.end(bundle);
  }
  if(req.url==='/api/owner-password'&&req.method==='POST'){
   headers(res);
   if(req.headers.origin!=='http://127.0.0.1:8879')throw Object.assign(Error('Origin'),{status:403});
   const chunks=[];for await(const x of req)chunks.push(x);
   const body=JSON.parse(Buffer.concat(chunks).toString());
   const sid=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('ek65_dev='))?.slice(9)||'';
   const result=await reset(sid,req.headers['x-csrf-token'],body);
   res.setHeader('Content-Type','application/json');return res.end(JSON.stringify(result));
  }
  return core(req,res);
 }catch(e){res.statusCode=e.status||500;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:e.code||'ERROR',message:e.message}));}
}).listen(8879,'127.0.0.1',()=>console.log('LOCAL_TEST_READY'));
