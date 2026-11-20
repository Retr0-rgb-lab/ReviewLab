-- ReviewLab API layer.
--
-- The browser does not read or write the tables. It calls one of the
-- functions in this file over PostgREST. Every rule of the product (trimmed
-- names, the length limits, the three mastery values, the root folder that
-- cannot be deleted) is enforced here, in the database, so that the rules
-- hold for any client and not only for the one in the browser.
--
-- Every function is SECURITY DEFINER and pins the search path to
-- `public, pg_temp`:
--
--   * SECURITY DEFINER makes the function run as its owner. The anon role
--     has no grants on folders or cards (see source/server/policies.sql), so
--     these functions are the only door into the data. The owner also bypasses
--     row level security, which is why the tables can stay closed to the
--     browser while these functions can still read and write them.
--   * The pinned search path means every name inside a function resolves to an
--     object in public and never to a temporary object or to a schema that
--     another role controls.
--
-- Failures go through api_fail. It sets the SQLSTATE to PT400, PT403 or
-- PT404, PostgREST maps the PT prefix to the HTTP status, and the message is
-- always `CODE: sentence`, so the client can test the code and show the
-- sentence. See source/API.md for the contract.
--
-- The file is idempotent: it can be applied to a fresh database, to a
-- database that already has the tables, and it can be run twice.

-- ---------------------------------------------------------------------------
-- Migration block.
--
-- Brings an existing database up to the schema in source/database/schema.sql.
-- On a fresh database every statement here is a no-op, because schema.sql has
-- already created the sequences and the ord columns.
-- ---------------------------------------------------------------------------

-- One sequence for both tables. A folder and a card can share the same
-- created_at, and the file view shows them in one list, so their write order
-- has to be comparable across the two tables. A single sequence gives that.
create sequence if not exists reviewlab_ord_seq;

do $$
begin
    if not exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'folders'
          and column_name = 'ord'
    ) then
        alter table folders
            add column ord bigint not null default nextval('public.reviewlab_ord_seq');
    end if;

    if not exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'cards'
          and column_name = 'ord'
    ) then
        alter table cards
            add column ord bigint not null default nextval('public.reviewlab_ord_seq');
    end if;

    -- The column may already exist with the default of an older per table
    -- sequence. Point it at the shared one either way.
    execute 'alter table folders alter column ord set default nextval(''public.reviewlab_ord_seq'')';
    execute 'alter table cards alter column ord set default nextval(''public.reviewlab_ord_seq'')';
end;
$$;

-- The sequences of the first version of this file are not used any more.
drop sequence if exists folders_ord_seq;
drop sequence if exists cards_ord_seq;

-- The ordering indexes carry ord, so the level listing is served by the
-- index. They are dropped first because an earlier version of schema.sql
-- created them without ord.
drop index if exists public.folders_parent_created;
create index if not exists folders_parent_created
    on folders (parent_id, created_at, ord);

drop index if exists public.cards_folder_created;
create index if not exists cards_folder_created
    on cards (folder_id, created_at, ord);

-- ---------------------------------------------------------------------------
-- api_fail: the one place where an error is raised.
--
-- The SQLSTATE carries the HTTP status behind the PT prefix, and the message
-- carries the error code in front of the sentence. api_fail is an internal
-- helper: it is not granted to anon in source/server/policies.sql.
-- ---------------------------------------------------------------------------

create or replace function api_fail(p_status int, p_code text, p_message text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    raise exception '%: %', p_code, p_message
        using errcode = 'PT' || p_status::text;
end;
$$;

-- ---------------------------------------------------------------------------
-- Validation helpers.
--
-- They trim the input, count characters with char_length (which counts code
-- points, so one code point is one character) and raise through api_fail.
-- ---------------------------------------------------------------------------

-- A folder name or a card title: trimmed, not empty, at most 120 characters.
create or replace function api_check_text(p_value text, p_label text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_trimmed text;
begin
    v_trimmed := btrim(coalesce(p_value, ''));

    if v_trimmed = '' then
        perform api_fail(400, 'EMPTY_NAME', p_label || ' cannot be empty.');
    end if;

    if char_length(v_trimmed) > 120 then
        perform api_fail(
            400,
            'NAME_TOO_LONG',
            p_label || ' cannot be longer than 120 characters.'
        );
    end if;

    return v_trimmed;
end;
$$;

-- A card body: trimmed, at most 4000 characters. An empty body is valid.
create or replace function api_check_body(p_value text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_trimmed text;
begin
    v_trimmed := btrim(coalesce(p_value, ''));

    if char_length(v_trimmed) > 4000 then
        perform api_fail(
            400,
            'BODY_TOO_LONG',
            'Card body cannot be longer than 4000 characters.'
        );
    end if;

    return v_trimmed;
end;
$$;

-- The mastery of a card: one of unmarked, mastered, unmastered.
create or replace function api_check_mastery(p_value text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_trimmed text;
begin
    v_trimmed := btrim(coalesce(p_value, ''));

    if v_trimmed not in ('unmarked', 'mastered', 'unmastered') then
        perform api_fail(
            400,
            'INVALID_MASTERY',
            'Mastery must be unmarked, mastered or unmastered.'
        );
    end if;

    return v_trimmed;
end;
$$;

-- ---------------------------------------------------------------------------
-- Read endpoints.
-- ---------------------------------------------------------------------------

-- api_get_root: the single root folder of the tree.
create or replace function api_get_root()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_row folders%rowtype;
begin
    select f.* into v_row
    from folders f
    where f.parent_id is null
    order by f.created_at asc, f.ord asc
    limit 1;

    if not found then
        perform api_fail(404, 'NOT_FOUND', 'The root folder does not exist.');
    end if;

    return jsonb_build_object(
        'id', v_row.id,
        'ord', v_row.ord,
        'name', v_row.name,
        'parent_id', v_row.parent_id,
        'created_at', v_row.created_at,
        'updated_at', v_row.updated_at
    );
end;
$$;

-- api_list_level: one level of the tree.
--
-- The folder itself, its direct child folders and its direct child cards.
-- Cards in this response do not carry the body: api_get_card is the function
-- that returns the body of the card being reviewed.
create or replace function api_list_level(p_folder uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_folder folders%rowtype;
    v_folders jsonb;
    v_cards jsonb;
begin
    select f.* into v_folder
    from folders f
    where f.id = p_folder;

    if not found then
        perform api_fail(404, 'NOT_FOUND', 'That folder does not exist.');
    end if;

    select coalesce(
        jsonb_agg(
            jsonb_build_object(
                'id', f.id,
                'ord', f.ord,
                'name', f.name,
                'parent_id', f.parent_id,
                'created_at', f.created_at,
                'updated_at', f.updated_at
            )
            order by f.created_at asc, f.ord asc
        ),
        '[]'::jsonb
    )
    into v_folders
    from folders f
    where f.parent_id = p_folder;

    select coalesce(
        jsonb_agg(
            jsonb_build_object(
                'id', c.id,
                'ord', c.ord,
                'title', c.title,
                'folder_id', c.folder_id,
                'mastery', c.mastery,
                'created_at', c.created_at,
                'updated_at', c.updated_at
            )
            order by c.created_at asc, c.ord asc
        ),
        '[]'::jsonb
    )
    into v_cards
    from cards c
    where c.folder_id = p_folder;

    return jsonb_build_object(
        'folder', jsonb_build_object(
            'id', v_folder.id,
            'name', v_folder.name,
            'parent_id', v_folder.parent_id,
            'created_at', v_folder.created_at,
            'updated_at', v_folder.updated_at
        ),
        'folders', v_folders,
        'cards', v_cards
    );
end;
$$;

-- api_get_card: one card including its body, used when Focus opens a card.
create or replace function api_get_card(p_card uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_row cards%rowtype;
begin
    select c.* into v_row
    from cards c
    where c.id = p_card;

    if not found then
        perform api_fail(404, 'NOT_FOUND', 'That card does not exist.');
    end if;

    return jsonb_build_object(
        'id', v_row.id,
        'ord', v_row.ord,
        'title', v_row.title,
        'body', v_row.body,
        'folder_id', v_row.folder_id,
        'mastery', v_row.mastery,
        'created_at', v_row.created_at,
        'updated_at', v_row.updated_at
    );
end;
$$;

-- api_list_tree: every folder and every card in the tree.
--
-- The search layer uses it to match and to build the path of each result, so
-- the card bodies are included here.
create or replace function api_list_tree()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_folders jsonb;
    v_cards jsonb;
begin
    select coalesce(
        jsonb_agg(
            jsonb_build_object(
                'id', f.id,
                'ord', f.ord,
                'name', f.name,
                'parent_id', f.parent_id,
                'created_at', f.created_at,
                'updated_at', f.updated_at
            )
            order by f.created_at asc, f.ord asc
        ),
        '[]'::jsonb
    )
    into v_folders
    from folders f;

    select coalesce(
        jsonb_agg(
            jsonb_build_object(
                'id', c.id,
                'ord', c.ord,
                'title', c.title,
                'body', c.body,
                'folder_id', c.folder_id,
                'mastery', c.mastery,
                'created_at', c.created_at,
                'updated_at', c.updated_at
            )
            order by c.created_at asc, c.ord asc
        ),
        '[]'::jsonb
    )
    into v_cards
    from cards c;

    return jsonb_build_object(
        'folders', v_folders,
        'cards', v_cards
    );
end;
$$;

-- api_delete_impact: what a delete of this folder would remove.
--
-- The counts include the folder itself and everything below it, so the
-- confirmation text in the file view can state the real numbers. The tree is
-- walked with a recursive CTE because folders can be nested to any depth.
create or replace function api_delete_impact(p_folder uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_folder_count int;
    v_card_count int;
begin
    perform 1 from folders f where f.id = p_folder;

    if not found then
        perform api_fail(404, 'NOT_FOUND', 'That folder does not exist.');
    end if;

    with recursive subtree as (
        select f.id
        from folders f
        where f.id = p_folder
        union all
        select child.id
        from folders child
        join subtree s on child.parent_id = s.id
    )
    select count(*)::int
    into v_folder_count
    from subtree;

    with recursive subtree as (
        select f.id
        from folders f
        where f.id = p_folder
        union all
        select child.id
        from folders child
        join subtree s on child.parent_id = s.id
    )
    select count(*)::int
    into v_card_count
    from cards c
    where c.folder_id in (select s.id from subtree s);

    return jsonb_build_object(
        'folder_count', v_folder_count,
        'card_count', v_card_count
    );
end;
$$;

-- ---------------------------------------------------------------------------
-- Write endpoints.
-- ---------------------------------------------------------------------------

-- api_create_folder: a new folder inside p_parent.
create or replace function api_create_folder(p_parent uuid, p_name text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_name text;
    v_row folders%rowtype;
begin
    v_name := api_check_text(p_name, 'Folder name');

    perform 1 from folders f where f.id = p_parent;

    if not found then
        perform api_fail(404, 'NOT_FOUND', 'The parent folder does not exist.');
    end if;

    insert into folders (name, parent_id)
    values (v_name, p_parent)
    returning * into v_row;

    return jsonb_build_object(
        'id', v_row.id,
        'ord', v_row.ord,
        'name', v_row.name,
        'parent_id', v_row.parent_id,
        'created_at', v_row.created_at,
        'updated_at', v_row.updated_at
    );
end;
$$;

-- api_rename_folder: rename a folder. The root folder may be renamed.
create or replace function api_rename_folder(p_id uuid, p_name text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_name text;
    v_row folders%rowtype;
begin
    v_name := api_check_text(p_name, 'Folder name');

    update folders f
    set name = v_name
    where f.id = p_id
    returning * into v_row;

    if not found then
        perform api_fail(404, 'NOT_FOUND', 'That folder does not exist.');
    end if;

    return jsonb_build_object(
        'id', v_row.id,
        'ord', v_row.ord,
        'name', v_row.name,
        'parent_id', v_row.parent_id,
        'created_at', v_row.created_at,
        'updated_at', v_row.updated_at
    );
end;
$$;

-- api_delete_folder: delete a folder and everything below it.
--
-- The foreign keys cascade, so the folders and the cards under this folder go
-- with it. The root folder is refused with 403; the trigger
-- folders_reject_root_delete refuses it as well, this check only turns the
-- refusal into a clean message.
create or replace function api_delete_folder(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_row folders%rowtype;
begin
    select f.* into v_row
    from folders f
    where f.id = p_id;

    if not found then
        perform api_fail(404, 'NOT_FOUND', 'That folder does not exist.');
    end if;

    if v_row.parent_id is null then
        perform api_fail(
            403,
            'ROOT_DELETE_FORBIDDEN',
            'The root folder cannot be deleted.'
        );
    end if;

    delete from folders f where f.id = p_id;

    return jsonb_build_object('deleted', true);
end;
$$;

-- api_create_card: a new card in p_folder.
--
-- The title, the body and the mastery are fixed by the product rules at
-- creation, so this function takes no title argument.
create or replace function api_create_card(p_folder uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_row cards%rowtype;
begin
    perform 1 from folders f where f.id = p_folder;

    if not found then
        perform api_fail(404, 'NOT_FOUND', 'That folder does not exist.');
    end if;

    insert into cards (title, body, folder_id, mastery)
    values ('New page', '', p_folder, 'unmarked')
    returning * into v_row;

    return jsonb_build_object(
        'id', v_row.id,
        'ord', v_row.ord,
        'title', v_row.title,
        'body', v_row.body,
        'folder_id', v_row.folder_id,
        'mastery', v_row.mastery,
        'created_at', v_row.created_at,
        'updated_at', v_row.updated_at
    );
end;
$$;

-- api_rename_card: change the title of a card.
create or replace function api_rename_card(p_id uuid, p_title text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_title text;
    v_row cards%rowtype;
begin
    v_title := api_check_text(p_title, 'Card title');

    update cards c
    set title = v_title
    where c.id = p_id
    returning * into v_row;

    if not found then
        perform api_fail(404, 'NOT_FOUND', 'That card does not exist.');
    end if;

    return jsonb_build_object(
        'id', v_row.id,
        'ord', v_row.ord,
        'title', v_row.title,
        'body', v_row.body,
        'folder_id', v_row.folder_id,
        'mastery', v_row.mastery,
        'created_at', v_row.created_at,
        'updated_at', v_row.updated_at
    );
end;
$$;

-- api_update_card_body: replace the body of a card. An empty body is valid.
create or replace function api_update_card_body(p_id uuid, p_body text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_body text;
    v_row cards%rowtype;
begin
    v_body := api_check_body(p_body);

    update cards c
    set body = v_body
    where c.id = p_id
    returning * into v_row;

    if not found then
        perform api_fail(404, 'NOT_FOUND', 'That card does not exist.');
    end if;

    return jsonb_build_object(
        'id', v_row.id,
        'ord', v_row.ord,
        'title', v_row.title,
        'body', v_row.body,
        'folder_id', v_row.folder_id,
        'mastery', v_row.mastery,
        'created_at', v_row.created_at,
        'updated_at', v_row.updated_at
    );
end;
$$;

-- api_set_mastery: set the mastery of a card.
--
-- Marking a card with the state it already has changes nothing, so the row is
-- not written and updated_at does not move. The two counters in the interface
-- are counted from the card rows, so an unchanged row means unchanged
-- counters.
create or replace function api_set_mastery(p_id uuid, p_mastery text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_mastery text;
    v_row cards%rowtype;
begin
    v_mastery := api_check_mastery(p_mastery);

    select c.* into v_row
    from cards c
    where c.id = p_id;

    if not found then
        perform api_fail(404, 'NOT_FOUND', 'That card does not exist.');
    end if;

    if v_row.mastery is distinct from v_mastery then
        update cards c
        set mastery = v_mastery
        where c.id = p_id
        returning * into v_row;
    end if;

    return jsonb_build_object(
        'id', v_row.id,
        'ord', v_row.ord,
        'title', v_row.title,
        'body', v_row.body,
        'folder_id', v_row.folder_id,
        'mastery', v_row.mastery,
        'created_at', v_row.created_at,
        'updated_at', v_row.updated_at
    );
end;
$$;

-- api_delete_card: delete one card.
create or replace function api_delete_card(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    perform 1 from cards c where c.id = p_id;

    if not found then
        perform api_fail(404, 'NOT_FOUND', 'That card does not exist.');
    end if;

    delete from cards c where c.id = p_id;

    return jsonb_build_object('deleted', true);
end;
$$;
