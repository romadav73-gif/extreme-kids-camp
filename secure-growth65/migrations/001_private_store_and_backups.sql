-- Existing Growth OS 6.5 server store; no club records, accounts, passwords or
-- legacy keys are imported. Use an administrator connection for migrations.
CREATE SCHEMA IF NOT EXISTS ek65_private;
REVOKE ALL ON SCHEMA ek65_private FROM PUBLIC;
CREATE TABLE IF NOT EXISTS ek65_private.store (
 id integer PRIMARY KEY CHECK (id=1), revision bigint NOT NULL DEFAULT 0,
 payload jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ek65_private.store ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE ek65_private.store FROM PUBLIC;
INSERT INTO ek65_private.store (id,payload) VALUES (1,
 '{"format":1,"users":{},"sessions":{},"invites":{},"workspaces":{},"requests":{},"tombstones":{},"rates":{},"audit":[]}'::jsonb
) ON CONFLICT(id) DO NOTHING;
CREATE TABLE IF NOT EXISTS ek65_private.backup_points (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 store_revision bigint NOT NULL UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now(),
 workspaces jsonb NOT NULL CHECK(jsonb_typeof(workspaces)='object'),
 sha256 text NOT NULL CHECK(length(sha256)=64)
);
ALTER TABLE ek65_private.backup_points ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE ek65_private.backup_points FROM PUBLIC;
CREATE OR REPLACE FUNCTION ek65_private.capture_backup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF OLD.payload->'workspaces' IS DISTINCT FROM NEW.payload->'workspaces'
    AND pg_catalog.jsonb_typeof(OLD.payload->'workspaces')='object'
    AND OLD.payload->'workspaces'<>'{}'::jsonb THEN
   INSERT INTO ek65_private.backup_points(store_revision,workspaces,sha256)
     VALUES(OLD.revision,OLD.payload->'workspaces',
       pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to((OLD.payload->'workspaces')::text,'UTF8')),'hex'))
     ON CONFLICT(store_revision) DO NOTHING;
   DELETE FROM ek65_private.backup_points WHERE id IN
     (SELECT id FROM ek65_private.backup_points ORDER BY id DESC OFFSET 30);
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION ek65_private.capture_backup() FROM PUBLIC;
DROP TRIGGER IF EXISTS ek65_capture_backup ON ek65_private.store;
CREATE TRIGGER ek65_capture_backup BEFORE UPDATE ON ek65_private.store
 FOR EACH ROW EXECUTE FUNCTION ek65_private.capture_backup();
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='ek65_runtime') THEN
  CREATE ROLE ek65_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
 END IF;
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='anon') THEN
  REVOKE ALL ON SCHEMA ek65_private FROM anon;
  REVOKE ALL ON ALL TABLES IN SCHEMA ek65_private FROM anon;
  REVOKE ALL ON ALL FUNCTIONS IN SCHEMA ek65_private FROM anon;
 END IF;
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='authenticated') THEN
  REVOKE ALL ON SCHEMA ek65_private FROM authenticated;
  REVOKE ALL ON ALL TABLES IN SCHEMA ek65_private FROM authenticated;
  REVOKE ALL ON ALL FUNCTIONS IN SCHEMA ek65_private FROM authenticated;
 END IF;
END $$;
GRANT USAGE ON SCHEMA ek65_private TO ek65_runtime;
GRANT SELECT,UPDATE ON TABLE ek65_private.store TO ek65_runtime;
DROP POLICY IF EXISTS ek65_runtime_select ON ek65_private.store;
CREATE POLICY ek65_runtime_select ON ek65_private.store FOR SELECT TO ek65_runtime USING(id=1);
DROP POLICY IF EXISTS ek65_runtime_update ON ek65_private.store;
CREATE POLICY ek65_runtime_update ON ek65_private.store FOR UPDATE TO ek65_runtime USING(id=1) WITH CHECK(id=1);
-- Deliberately no backup read/delete grant, public SQL RPC or login credential.
