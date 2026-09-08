'use strict';
const test=require('node:test'),assert=require('node:assert/strict');const P=require('../lib/policy.cjs');const M=require('../lib/model.cjs');const f=require('./fixture.cjs');const{validate,immutableId}=require('../lib/integrity.cjs');
const rejection=fn=>assert.throws(fn,e=>e.status===422);
test('R3 integrity accepts the approved baseline',()=>validate(M.clone(f)));
test('R3 immutable id detection covers nested financial records',()=>{assert(immutableId({path:['tasks','@x','id']}));assert(immutableId({path:['adminOperationsByMonth','2026-09','sales','@x','id']}))});
for(const [name,edit] of [
 ['orphan group mentor',s=>{s.people=s.people.filter(p=>p.id!=='tasya')}],
 ['orphan membership group',s=>{s.groups=[]}],
 ['orphan attendance child',s=>{s.attendanceChildren=[]}],
 ['nonexistent document employee',s=>s.staffDocuments.push({id:'doc',personId:'missing',title:'x'})],
 ['nonexistent payroll employee',s=>s.mentorPayroll[0].mentorId='missing'],
 ['invalid event date',s=>s.events[0].date='2026-02-30'],
 ['negative event budget',s=>s.events[0].costPlan=-1],
 ['backward training time',s=>s.groups[0].time='18:00–17:00'],
 ['invalid month',s=>s.months['2026-13']=s.months['2026-09']],
 ['duplicate daily revenue id',s=>s.months['2026-09'].daily.push(M.clone(s.months['2026-09'].daily[0]))],
 ['duplicate sale id',s=>s.adminOperationsByMonth['2026-09'].sales.push(M.clone(s.adminOperationsByMonth['2026-09'].sales[0]))],
 ['fake sales category',s=>s.adminOperationsByMonth['2026-09'].sales[0].type='invented'],
 ['percent above 100',s=>s.settings.adminCompensation.groupRate=7],
 ['sale assigned to mentor',s=>s.adminOperationsByMonth['2026-09'].sales[0].adminId='tasya'],
 ['membership reversed dates',s=>s.attendanceMemberships[0].endDate='2026-08-31'],
 ['overlapping memberships',s=>s.attendanceMemberships.push({...s.attendanceMemberships[0],id:'overlap'})],
 ['HTTPS link with credentials',s=>s.staffDocuments.push({id:'doc',personId:'tasya',title:'x',url:'https://user:secret@example.com'})],
 ['duplicate real training',s=>{const x={id:'att1',groupId:'group-tasya',date:'2026-09-07',mode:'actual',records:[]};s.attendanceSessions.push(x,{...x,id:'att2'})}],
 ['child before membership starts',s=>s.attendanceSessions.push({id:'att',groupId:'group-tasya',date:'2026-08-31',mode:'actual',records:[{childId:'child-tasya',status:'present'}]})],
])test('R3 rejects '+name,()=>{const s=M.clone(f);edit(s);rejection(()=>validate(s))});
test('R3 accepts non-overlapping historical memberships',()=>{const s=M.clone(f);s.attendanceMemberships[0].endDate='2026-09-05';s.attendanceMemberships.push({...s.attendanceMemberships[0],id:'next',startDate:'2026-09-06',endDate:null});validate(s)});
test('R3 archived staff remain referenced for payroll history',()=>{const s=M.clone(f);s.people.find(p=>p.id==='tasya').active=false;validate(s)});
