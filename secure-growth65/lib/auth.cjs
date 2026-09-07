'use strict';
const {randomBytes,scrypt,timingSafeEqual}=require('node:crypto');const {promisify}=require('node:util');const derive=promisify(scrypt);
const PARAMS={N:131072,r:8,p:1,maxmem:256*1024*1024};
const token=()=>randomBytes(32).toString('base64url');
const equalSecret=(a,b)=>typeof a==='string'&&typeof b==='string'&&Buffer.byteLength(a)===Buffer.byteLength(b)&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
let active=0;const waiting=[];
async function limited(fn){if(active>=2){if(waiting.length>=8)throw Object.assign(Error('Сервис входа занят. Повторите позже.'),{status:429,code:'RATE_LIMIT'});await new Promise(r=>waiting.push(r))}else active++;try{return await fn()}finally{const next=waiting.shift();if(next)next();else active--}}
function validPassword(p){if(typeof p!=='string'||p.length<12||p.length>128)throw Object.assign(Error('Пароль: от 12 до 128 символов.'),{status:422,code:'PASSWORD_POLICY'});if(/^(.)\1+$/.test(p)||/^(password|qwerty|123456)/i.test(p))throw Object.assign(Error('Выберите менее предсказуемый пароль.'),{status:422,code:'PASSWORD_POLICY'})}
async function hashPassword(p){validPassword(p);return limited(async()=>{const salt=randomBytes(16).toString('hex'),out=await derive(p,salt,64,PARAMS);return `scrypt$131072$8$1$${salt}$${out.toString('hex')}`})}
const DUMMY='scrypt$131072$8$1$00000000000000000000000000000000$'+'00'.repeat(64);
async function verifyPassword(p,encoded=DUMMY){return limited(async()=>{const parts=encoded.split('$');if(parts.length!==6||parts[1]!=='131072'||parts[2]!=='8'||parts[3]!=='1')return false;const out=await derive(String(p).slice(0,128),parts[4],64,PARAMS),expected=Buffer.from(parts[5],'hex');return expected.length===out.length&&timingSafeEqual(expected,out)})}
module.exports={token,equalSecret,validPassword,hashPassword,verifyPassword};
