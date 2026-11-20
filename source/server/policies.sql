-- ReviewLab access rules.
--
-- The model: the product has no login by design. The deployment is one shared
-- tree and the report lists that as a known limitation. What the database
-- does give is that no client can write a row that breaks the rules, because
-- the browser is not allowed to touch the tables at all and every read and
-- every write goes through the validating functions in
-- source/database/api.sql.
--
-- Apply this file after source/database/api.sql, because the grants below
-- refer to the functions that api.sql creates.

-- The two blanket policies let any visitor read and write every row of every
-- table. They are removed: direct table access is not part of the API.
drop policy if exists folder_anon_all on folders;
drop policy if exists cards_anon_all on cards;

-- The anon role gets no access to the tables themselves. Row level security
-- is enabled on both tables in source/database/schema.sql, so with the grant
-- gone there is nothing left to select from or write to.
--
-- The revoke is wrapped in a block because the authenticated role only exists
-- on Supabase. On a plain PostgreSQL server the statement would fail and, in
-- the Supabase SQL editor, it would abort the rest of the batch.
do $$
begin
    if exists (select 1 from pg_roles where rolname = 'anon') then
        execute 'revoke all on table folders, cards from anon';
    end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then
        execute 'revoke all on table folders, cards from authenticated';
    end if;
end;
$$;

-- The insertion order sequence is internal as well.
revoke all on sequence reviewlab_ord_seq from anon;
do $$
begin
    if exists (select 1 from pg_roles where rolname = 'authenticated') then
        execute 'revoke all on sequence reviewlab_ord_seq from authenticated';
    end if;
end;
$$;

-- The functions live in the public schema and PostgREST exposes that schema.
grant usage on schema public to anon;

-- Read endpoints.
grant execute on function api_get_root() to anon;
grant execute on function api_list_level(uuid) to anon;
grant execute on function api_get_card(uuid) to anon;
grant execute on function api_list_tree() to anon;
grant execute on function api_delete_impact(uuid) to anon;

-- Write endpoints.
grant execute on function api_create_folder(uuid, text) to anon;
grant execute on function api_rename_folder(uuid, text) to anon;
grant execute on function api_delete_folder(uuid) to anon;
grant execute on function api_create_card(uuid) to anon;
grant execute on function api_rename_card(uuid, text) to anon;
grant execute on function api_update_card_body(uuid, text) to anon;
grant execute on function api_set_mastery(uuid, text) to anon;
grant execute on function api_delete_card(uuid) to anon;

-- Validation helpers. They only check a value and return the trimmed one.
grant execute on function api_check_text(text, text) to anon;
grant execute on function api_check_body(text) to anon;
grant execute on function api_check_mastery(text) to anon;

-- api_fail only raises exceptions, it is not part of the contract, so it is
-- not given to anon. It stays reachable from the functions above, which run
-- as their owner.
revoke execute on function api_fail(integer, text, text) from anon;
revoke execute on function api_fail(integer, text, text) from authenticated;
revoke execute on function api_fail(integer, text, text) from public;
