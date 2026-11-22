-- ReviewLab schema.
--
-- Two entities: folders and cards. A card belongs to one folder, a folder
-- belongs to one folder or to none, and the folder without a parent is the
-- single root of the tree.
--
-- This file describes a fresh database. It can be run again on a database
-- that was created from it without failing (create ... if not exists, drop
-- trigger if exists). A database that was created from an older version of
-- this file is brought up to date by the migration block in
-- source/database/api.sql, which adds the ord column and rebuilds the
-- ordering indexes.

-- Insertion order. created_at alone cannot say which of two rows written in
-- the same instant came first, so every row also carries the number it got
-- from a sequence. One sequence is shared by both tables, because the file view
-- shows the folders and the cards of a level in one list and their write order
-- has to be comparable across the two. The sequence comes before the tables
-- because the columns use it as their default.
create sequence if not exists reviewlab_ord_seq;

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create or replace function reject_root_delete()
returns trigger
language plpgsql
as $$
begin
    if old.parent_id is null then
        raise exception 'cannot delete the root folder';
    end if;
    return old;
end;
$$;

create or replace function reject_folder_parent_change()
returns trigger
language plpgsql
as $$
begin
    if new.parent_id is distinct from old.parent_id then
        raise exception 'cannot change a folder parent';
    end if;
    return new;
end;
$$;

create or replace function reject_card_folder_change()
returns trigger
language plpgsql
as $$
begin
    if new.folder_id is distinct from old.folder_id then
        raise exception 'cannot move a card';
    end if;
    return new;
end;
$$;

create table if not exists folders (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    parent_id uuid references folders(id) on delete cascade,
    ord bigint not null default nextval('public.reviewlab_ord_seq'),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint folders_name_length check(
        name = btrim(name)
        and char_length(name) between 1 and 120
    ),
    constraint folders_not_own_parent check(parent_id is distinct from id)
);

create table if not exists cards (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    body text not null default '',
    folder_id uuid not null references folders (id) on delete cascade,
    mastery text not null default 'unmarked',
    favorite boolean not null default false,
    ord bigint not null default nextval('public.reviewlab_ord_seq'),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint cards_title_length check(
        title = btrim(title)
        and char_length(title) between 1 and 120
    ),
    constraint cards_body_length check(
        body = btrim(body)
        and char_length(body) <= 4000
    ),
    constraint cards_mastery check (
        mastery in ('unmarked', 'mastered', 'unmastered')
    )
);

-- The favorite flag of a card was added after the first version of this file,
-- so a database that already has the table gets the column here. The default
-- is false, so the cards that exist already are not favorites.
alter table cards
    add column if not exists favorite boolean not null default false;

-- The sequence is shared by the two tables, so it cannot be owned by one
-- column. It stays behind if the tables are dropped.

--Only one root node is allowed
create unique index if not exists folders_one_root
    on folders ((true))
    where parent_id is null;

-- A level is read as parent_id, then ordered by created_at and by ord.
create index if not exists folders_parent_created
    on folders (parent_id, created_at, ord);

create index if not exists cards_folder_created
    on cards (folder_id, created_at, ord);

drop trigger if exists folders_set_updated_at on folders;
create trigger folders_set_updated_at
    before update on folders
    for each row execute function set_updated_at();

drop trigger if exists cards_set_updated_at on cards;
create trigger cards_set_updated_at
    before update on cards
    for each row execute function set_updated_at();

drop trigger if exists folders_reject_root_delete on folders;
create trigger folders_reject_root_delete
    before delete on folders
    for each row execute function reject_root_delete();

drop trigger if exists folders_reject_parent_change on folders;
create trigger folders_reject_parent_change
    before update on folders
    for each row execute function reject_folder_parent_change();

drop trigger if exists cards_reject_folder_change on cards;
create trigger cards_reject_folder_change
    before update on cards
    for each row execute function reject_card_folder_change();


--Open row level security
alter table folders enable row level security;
alter table cards enable row level security;
