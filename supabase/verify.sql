-- Run in the Supabase SQL Editor after applying the migration.
-- These queries inspect configuration; they do not prove the end-to-end test.
select relrowsecurity as items_rls_enabled
from pg_class where oid = 'public.items'::regclass;

-- All six permissions should be false.
select role_name,
  has_table_privilege(role_name, 'public.items', 'select') as can_select,
  has_table_privilege(role_name, 'public.items', 'insert') as can_insert,
  has_table_privilege(role_name, 'public.items', 'update') as can_update
from (values ('anon'), ('authenticated')) as roles(role_name);

-- No rows should be returned for items.
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies where schemaname = 'public' and tablename = 'items';

-- Confirm public=true, limit=2097152 and all three expected MIME types.
select id, public, file_size_limit, allowed_mime_types
from storage.buckets where id = 'item-photos';

-- Inspect these for any unrelated policy that allows client writes to this bucket.
select policyname, roles, cmd, qual, with_check
from pg_policies where schemaname = 'storage' and tablename = 'objects';
