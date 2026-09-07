'use strict';
// Shared JSON operation format. No numeric array indices: record IDs are stable
// across clients. Absence and null are deliberately different values.
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.EK65Model=factory()})(globalThis,()=>{
 const BAD=new Set(['__proto__','prototype','constructor']);
 const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
 const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
 const clone=x=>x===undefined?undefined:structuredClone(x);
 function canonical(x){if(Array.isArray(x))return '['+x.map(canonical).join(',')+']';if(obj(x))return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';return JSON.stringify(x)}
 const equal=(a,b)=>canonical(a)===canonical(b);
 const recordKey=x=>obj(x)&&typeof x.id==='string'?'@'+x.id:null;
 const keyed=x=>Array.isArray(x)&&x.length>0&&x.every(recordKey)&&new Set(x.map(recordKey)).size===x.length;
 const ignored=(p,k)=>['_fieldUpdatedAt','updatedAt','createdAt','sync65'].includes(k)||(p.length===0&&['meta','ui','activity'].includes(k))||(p.length===1&&p[0]==='settings'&&['currentMonth','autoSync','syncInterval'].includes(k));
 function clean(x,p=[]){if(Array.isArray(x))return x.map(v=>clean(v,p.concat(recordKey(v)||'*')));if(!obj(x))return x;const o={};for(const k of Object.keys(x))if(!ignored(p,k)){if(BAD.has(k))throw Error('Unsafe key');o[k]=clean(x[k],p.concat(k))}return o}
 function validateJson(value,depth=0){if(depth>32)throw Error('Too deeply nested');if(value===null||typeof value==='boolean')return;if(typeof value==='number'){if(!Number.isFinite(value))throw Error('Non-finite number');return}if(typeof value==='string'){if(value.length>40000)throw Error('Text too long');return}if(Array.isArray(value)){if(value.length>20000)throw Error('Too many records');value.forEach(x=>validateJson(x,depth+1));return}if(!obj(value))throw Error('Not JSON');for(const [k,v] of Object.entries(value)){if(BAD.has(k)||k.length>180)throw Error('Unsafe key');validateJson(v,depth+1)}}
 function validPath(path){if(!Array.isArray(path)||!path.length||path.length>16||path.some(k=>typeof k!=='string'||!k||k.length>180||BAD.has(k)||k.startsWith('@')&&!/^@[a-zA-Z0-9_.:-]{1,128}$/.test(k)))throw Error('Invalid path')}
 function lookup(data,path){validPath(path);let node=data;for(const k of path){if(Array.isArray(node)){if(!k.startsWith('@'))throw Error('Array must use record IDs');node=node.find(x=>x?.id===k.slice(1));if(node===undefined)return{exists:false}}else if(obj(node)&&own(node,k))node=node[k];else return{exists:false}}return{exists:true,value:clone(node)}}
 function change(data,c){validPath(c.path);let node=data;for(const k of c.path.slice(0,-1)){if(Array.isArray(node))node=node.find(x=>x?.id===k.slice(1));else if(obj(node)&&own(node,k))node=node[k];else throw Error('Missing parent');if(!obj(node)&&!Array.isArray(node))throw Error('Invalid parent')}
  const key=c.path.at(-1);if(Array.isArray(node)){const idx=node.findIndex(x=>x?.id===key.slice(1));if(c.op==='remove'){if(idx>=0)node.splice(idx,1)}else{if(!obj(c.value)||c.value.id!==key.slice(1))throw Error('Record ID mismatch');if(idx<0)node.push(clone(c.value));else node[idx]=clone(c.value)}}else if(obj(node)){if(c.op==='remove')delete node[key];else node[key]=clone(c.value)}else throw Error('Invalid parent');return data;
 }
 function diff(a,b,p=[],out=[]){if(equal(a,b))return out;
  if(obj(a)&&obj(b)){for(const k of new Set([...Object.keys(a),...Object.keys(b)])){if(ignored(p,k))continue;const hasA=own(a,k),hasB=own(b,k);if(hasA&&hasB)diff(a[k],b[k],p.concat(k),out);else out.push({op:hasB?'set':'remove',path:p.concat(k),previous:hasA?{exists:true,value:clone(a[k])}:{exists:false},...(hasB?{value:clone(b[k])}:{})})}return out}
  if(Array.isArray(a)&&Array.isArray(b)&&(keyed(a)||keyed(b))&&(!a.length||keyed(a))&&(!b.length||keyed(b))){const x=new Map(a.map(v=>[recordKey(v),v])),y=new Map(b.map(v=>[recordKey(v),v]));for(const k of new Set([...x.keys(),...y.keys()])){if(x.has(k)&&y.has(k))diff(x.get(k),y.get(k),p.concat(k),out);else out.push({op:y.has(k)?'set':'remove',path:p.concat(k),previous:x.has(k)?{exists:true,value:clone(x.get(k))}:{exists:false},...(y.has(k)?{value:clone(y.get(k))}:{})})}return out}
  if(!p.length)throw Error('Cannot replace root');out.push({op:'set',path:p,previous:{exists:true,value:clone(a)},value:clone(b)});return out;
 }
 function emptyState(month=new Date().toISOString().slice(0,7)){const s={version:6,meta:{revision:0,updatedAt:''},settings:{clubName:'EXTREME KIDS Тропарёво',currentMonth:month,autoSync:true,syncInterval:25000},months:{},sales:{},salesByMonth:{},adminOperationsByMonth:{},adminSalarySnapshots:{},operationsDays:{},managementPlans:{weeks:{}},managementMeetingDraft:{},meetingTimer:{},sofiaMotivationByMonth:{},attendanceSettings:{},ui:{selectedMentor:'',selectedAdmin:'',groupSearch:'',groupMentor:'all',groupDiscipline:'all',taskOwner:'all',taskMonthMode:'selected',eventType:'all'}};for(const k of ['people','groups','tasks','goals','events','recommendations','archive','activity','mentorPayroll','attendanceChildren','attendanceMemberships','attendanceSessions','attendanceWeekArchives','managementMeetings','meetingAgenda','staffDocuments','staffDuties'])s[k]=[];s.months[month]={key:month,label:month,minimum:0,target:0,stretch:0,fact:0,daily:[],focus:'',loadTarget:0};return s}
 return{BAD,obj,own,clone,canonical,equal,clean,validateJson,validPath,lookup,change,diff,emptyState};
});
