'use strict';
// Explicit one-time migration. No HTTP import endpoint, reset, implicit merge,
// password in arguments, production demo account, or legacy-key exchange.
const fs=require('node:fs'),path=require('node:path');const crypto=require('node:crypto');
const M=require('../lib/model.cjs'),P=require('../lib/policy.cjs');const{PostgresStore,hash}=require('../lib/store.cjs');const{Service,cleanImport}=require('../lib/service.cjs');
function inspect(filename){const bytes=fs.readFileSync(filename);if(bytes.length>4e6)throw Error('Input exceeds 4 MB. Inspect and archive separately.');const raw=JSON.parse(bytes.toString('utf8'));let data=raw;if(raw.format==='ek65-backup-v1'){if(hash(M.canonical(raw.data))!==raw.sha256)throw Error('Backup checksum mismatch');data=raw.data}if(data.growthOS&&Object.keys(data).some(k=>k!=='growthOS'))throw Error('Ambiguous legacy wrapper. Explicitly reconcile outer fields first.');const clean=cleanImport(data),issues=[],duplicates=[];
 for(const root of Object.keys(P.collections)){try{P.validateState(clean,[{path:[root]}])}catch(e){issues.push({root,message:e.message})}}
 for(const root of ['months','operationsDays','adminOperationsByMonth'])try{P.validateState(clean,[{path:[root]}])}catch(e){issues.push({root,message:e.message})}
 for(const root of ['groups','tasks','events']){const signatures=new Map();for(const row of clean[root]||[]){if(row.deletedAt)continue;const sig=root==='groups'?JSON.stringify([row.mentorId,row.name,row.discipline,row.day,row.time,row.level]):JSON.stringify([row.title,row.ownerId,row.deadline||row.date]);const prev=signatures.get(sig);if(prev)duplicates.push({root,ids:[prev,row.id]});else signatures.set(sig,row.id)}}
 const summary={sourceSha256:hash(bytes),sourceBytes:bytes.length,counts:Object.fromEntries(Object.keys(P.collections).map(k=>[k,clean[k]?.length||0])),months:Object.keys(clean.months).length,validationIssues:issues,possibleDuplicates:duplicates,status:issues.length||duplicates.length?'RECONCILE_FIRST':'READY_FOR_EXPLICIT_IMPORT'};return{summary,clean,bytes};
}
async function main(){const args=process.argv.slice(2),mode=args.shift(),get=k=>args[args.indexOf(k)+1],input=get('--file');if(!['inspect','import'].includes(mode)||!args.includes('--file'))throw Error('Usage: node scripts/import.cjs inspect --file /private/export.json');const r=inspect(input);if(mode==='inspect'){console.log(JSON.stringify(r.summary,null,2));return}
 if(r.summary.status!=='READY_FOR_EXPLICIT_IMPORT')throw Error('Source has validation issues or duplicates. No data was imported. Run inspect.');
 if(!args.includes('--freeze-confirmed')||!args.includes('--expected-sha256')||get('--expected-sha256')!==r.summary.sourceSha256)throw Error('Migration requires --freeze-confirmed and the exact inspected --expected-sha256.');
 if(!args.includes('--out-dir'))throw Error('Set --out-dir to a private backup directory outside the source/deploy directory.');
 const dir=path.resolve(get('--out-dir')),root=path.resolve(__dirname,'..');if(dir===root||dir.startsWith(root+path.sep))throw Error('Never put backups/invitations inside the deployment directory.');
 if(!/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(process.env.APP_ORIGIN||''))throw Error('Set APP_ORIGIN to the production HTTPS origin.');
 const store=new PostgresStore(process.env.DATABASE_URL),service=new Service(store,{securityKey:process.env.SECURITY_KEY});
 fs.mkdirSync(dir,{recursive:true,mode:0o700});const backup=path.join(dir,'pre-import-'+r.summary.sourceSha256.slice(0,12)+'.json');fs.writeFileSync(backup,r.bytes,{mode:0o600,flag:'wx'});
 try{await store.migrate();await store.tx(d=>{if(Object.keys(d.users).length||Object.keys(d.workspaces).length)throw Error('Server already initialized. No reset/overwrite allowed.')});
 const result=await service.bootstrap({username:args.includes('--username')?get('--username'):'roman',personId:'roman',data:r.clean});
 const check=await store.tx(d=>d.workspaces[result.workspaceId].data);if(!M.equal(M.clean(check),M.clean(r.clean)))throw Error('Readback did not match. Keep the old site frozen and inspect backups.');
 const inviteFile=path.join(dir,'owner-invitation.txt');fs.writeFileSync(inviteFile,process.env.APP_ORIGIN+'/login#invite='+result.invite+'\n',{mode:0o600,flag:'wx'});
 fs.writeFileSync(path.join(dir,'migration-receipt.json'),JSON.stringify({sourceSha256:r.summary.sourceSha256,workspaceId:result.workspaceId,readback:true,at:new Date().toISOString(),counts:r.summary.counts,legacyDatabaseModified:false},null,2),{mode:0o600,flag:'wx'});
 console.log('Import verified. Backup, receipt and one-hour owner invitation written to your private output directory. No credentials printed. The legacy database was NOT deleted.');
 }finally{await store.close()}
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1});module.exports={inspect};
