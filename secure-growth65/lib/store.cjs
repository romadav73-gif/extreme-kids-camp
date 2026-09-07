'use strict';
const crypto=require('node:crypto');
const initial=()=>({format:1,users:{},sessions:{},invites:{},workspaces:{},requests:{},tombstones:{},rates:{},audit:[]});
// MemoryStore is intentionally test/development-only. Production will not boot
// without PostgreSQL. Both adapters roll back on any error.
class MemoryStore{
 constructor(data=initial()){this.data=structuredClone(data);this.tail=Promise.resolve()}
 async tx(fn){const previous=this.tail;let release;this.tail=new Promise(r=>release=r);await previous;try{const next=structuredClone(this.data);const result=await fn(next);this.data=next;return structuredClone(result)}finally{release()}}
 async close(){}
}
class PostgresStore{
 constructor(url,{local=false}={}){
  if(!url)throw Error('DATABASE_URL is required');
  const {Pool}=require('pg');
  const u=new URL(url);if(!['postgres:','postgresql:'].includes(u.protocol))throw Error('Invalid database protocol');
  for(const k of ['sslmode','sslcert','sslkey','sslrootcert'])u.searchParams.delete(k);
  this.pool=new Pool({connectionString:u.toString(),max:3,connectionTimeoutMillis:8000,idleTimeoutMillis:15000,ssl:local?false:{rejectUnauthorized:true,...(process.env.DATABASE_CA_PEM?{ca:process.env.DATABASE_CA_PEM}:{})},application_name:'extreme-kids-6.5-secure'});
 }
 async migrate(){const c=await this.pool.connect();try{await c.query('BEGIN');await c.query(`CREATE SCHEMA IF NOT EXISTS ek65_private; REVOKE ALL ON SCHEMA ek65_private FROM PUBLIC;
 CREATE TABLE IF NOT EXISTS ek65_private.store(id integer PRIMARY KEY CHECK(id=1), revision bigint NOT NULL DEFAULT 0, payload jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
 REVOKE ALL ON ek65_private.store FROM PUBLIC; ALTER TABLE ek65_private.store ENABLE ROW LEVEL SECURITY;`);
 // Supabase roles must never access the server's authentication/store table.
 await c.query(`DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON SCHEMA ek65_private FROM anon; REVOKE ALL ON ek65_private.store FROM anon; END IF; IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON SCHEMA ek65_private FROM authenticated; REVOKE ALL ON ek65_private.store FROM authenticated; END IF; END $$;`);
 await c.query('INSERT INTO ek65_private.store(id,payload) VALUES(1,$1) ON CONFLICT(id) DO NOTHING',[JSON.stringify(initial())]);await c.query('COMMIT')}catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}}
 async tx(fn){const c=await this.pool.connect();try{await c.query('BEGIN');await c.query("SET LOCAL lock_timeout='8s'; SET LOCAL statement_timeout='12s'");const r=await c.query('SELECT revision,payload FROM ek65_private.store WHERE id=1 FOR UPDATE');if(!r.rowCount)throw Error('Database not initialized');const data=r.rows[0].payload;const result=await fn(data);await c.query('UPDATE ek65_private.store SET payload=$1,revision=revision+1,updated_at=now() WHERE id=1',[JSON.stringify(data)]);await c.query('COMMIT');return result}catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}}
 async close(){await this.pool.end()}
}
function cleanup(d,now=Date.now()){
 for(const list of ['sessions','invites','requests','rates'])for(const [k,v] of Object.entries(d[list]))if((v.expiresAt||v.until||Infinity)<now)delete d[list][k];
 // Idempotency keys are retained for seven days; clients must refresh before
 // resending older entries. Audit metadata stays separate from browser state.
 if(d.audit.length>20000)d.audit=d.audit.slice(-20000);
}
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
function audit(d,actor,action,detail,key){const prev=d.audit.at(-1)?.hash||'genesis';const entry={id:crypto.randomUUID(),at:new Date().toISOString(),actorId:actor?.id||null,workspaceId:actor?.workspaceId||null,action,detail,prev};entry.hash=crypto.createHmac('sha256',key).update(JSON.stringify(entry)).digest('hex');d.audit.push(entry)}
module.exports={MemoryStore,PostgresStore,initial,cleanup,hash,audit};
