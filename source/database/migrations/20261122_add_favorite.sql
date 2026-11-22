-- ReviewLab migration: the favorite flag of a card.
--
-- Date: 2026-11-22.
--
-- What it does:
--
--   1. Adds the column favorite to the cards table. It is a boolean that is
--      not null and defaults to false, so the cards that exist already are not
--      favorites.
--   2. Adds the function api_set_favorite, which sets the flag of one card.
--      It is written like api_set_mastery: security definer, pinned search
--      path, the same errors and the same card shape in the answer.
--   3. Replaces the functions that return cards, so that their answer carries
--      the new field.
--   4. Grants execute on the new function to the anon role.
--
-- The script can be run more than once. Every statement is either idempotent
-- by itself (add column if not exists, create or replace function, grant) or
-- is safe to repeat.

-- ---------------------------------------------------------------------------
-- 1. The column.
-- ---------------------------------------------------------------------------

alter table cards
    add column if not exists favorite boolean not null default false;

-- ---------------------------------------------------------------------------
-- 2. The functions that return cards.
--
-- These are the same bodies as in source/database/api.sql, with the favorite
-- field added to the card shape.
-- ---------------------------------------------------------------------------

-- api_list_level: one level of the tree.
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
                'favorite', c.favorite,
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

-- api_get_card: one card including its body.
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
        'favorite', v_row.favorite,
        'created_at', v_row.created_at,
        'updated_at', v_row.updated_at
    );
end;
$$;

-- api_list_tree: every folder and every card in the tree.
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
                'favorite', c.favorite,
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

-- api_create_card: a new card in p_folder.
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
        'favorite', v_row.favorite,
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
        'favorite', v_row.favorite,
        'created_at', v_row.created_at,
        'updated_at', v_row.updated_at
    );
end;
$$;

-- api_update_card_body: replace the body of a card.
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
        'favorite', v_row.favorite,
        'created_at', v_row.created_at,
        'updated_at', v_row.updated_at
    );
end;
$$;

-- api_set_mastery: set the mastery of a card.
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
        'favorite', v_row.favorite,
        'created_at', v_row.created_at,
        'updated_at', v_row.updated_at
    );
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. The new function.
--
-- api_set_favorite: set the favorite flag of a card.
--
-- The flag is a boolean on the card row, next to the mastery. Setting it
-- writes the row, so updated_at moves and the card comes to the top of the
-- search results, which are grouped by the last change.
--
-- The caller is the anon role, which has no grant on the tables, so the
-- function runs as its owner and is the only way in.
-- ---------------------------------------------------------------------------
create or replace function api_set_favorite(p_id uuid, p_favorite boolean)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_row cards%rowtype;
begin
    if p_favorite is null then
        perform api_fail(
            400,
            'INVALID_FAVORITE',
            'Favorite must be true or false.'
        );
    end if;

    select c.* into v_row
    from cards c
    where c.id = p_id;

    if not found then
        perform api_fail(404, 'NOT_FOUND', 'That card does not exist.');
    end if;

    update cards c
    set favorite = p_favorite
    where c.id = p_id
    returning * into v_row;

    return jsonb_build_object(
        'id', v_row.id,
        'ord', v_row.ord,
        'title', v_row.title,
        'body', v_row.body,
        'folder_id', v_row.folder_id,
        'mastery', v_row.mastery,
        'favorite', v_row.favorite,
        'created_at', v_row.created_at,
        'updated_at', v_row.updated_at
    );
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. The grant.
--
-- The anon role is the only role that calls the API, so it needs execute on
-- the new function. The grant is repeated safely.
-- ---------------------------------------------------------------------------

do $$
begin
    if exists (select 1 from pg_roles where rolname = 'anon') then
        execute 'grant execute on function api_set_favorite(uuid, boolean) to anon';
    end if;
end;
$$;
