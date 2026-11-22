# ReviewLab API

Status: 2026-11-20. This document is the contract between the browser client and
the database. The client may not talk to the tables directly; every read and every
write goes through one of the functions listed here.

Implementation: `source/database/api.sql` (Postgres functions),
`source/server/policies.sql` (access rules),
`source/client/src/api.js` (the client wrapper).

## 1. Transport

Supabase exposes every Postgres function in the `public` schema over PostgREST.

| Property | Value |
|---|---|
| Method | `POST` |
| URL | `https://<project-ref>.supabase.co/rest/v1/rpc/<function_name>` |
| Headers | `apikey: <publishable key>`, `Content-Type: application/json` |
| Body | JSON object, keys are the named arguments of the function |
| Response | `200` with a JSON body on success |

The client never writes the URL by hand. `source/client/src/api.js` wraps
`supabase.rpc(name, params)` and returns either `{ data }` or `{ error }`.

```js
const result = await callApi('api_create_folder', { p_parent: id, p_name: 'Notes' })
if (result.error) {
    showError(result.error.message)
} else {
    use(result.data)
}
```

## 2. Response and error format

Success is HTTP `200`. The body is the function's return value, which is always a
JSON object. Every function returns the same shape of data it changed, so the
client can update local state from the response instead of re-reading the level.

A failure raises a Postgres exception. The `api_fail` helper sets the SQLSTATE to
`PT<status>`, and PostgREST maps that prefix to the HTTP status code. The message
is always `CODE: Human readable sentence`, so the client can show the sentence and
the code can be tested.

| SQLSTATE | HTTP | Meaning |
|---|---|---|
| `PT400` | 400 | Validation failed, or the operation is not allowed by the rules |
| `PT403` | 403 | The operation is forbidden for this target (for example the root folder) |
| `PT404` | 404 | The target row does not exist |
| `PT409` | 409 | The request conflicts with the current state |
| other | 500 | Unexpected database error |

If the deployed PostgREST version does not map the `PT` prefix, the same failures
arrive with the status 400 and the message unchanged. The client reads the message
prefix and never depends on the status value, so both behave the same.

Error codes returned in the message prefix:

| Code | Raised by |
|---|---|
| `EMPTY_NAME` | Folder name or card title is empty after trimming |
| `EMPTY_BODY` | Not used. A card body may be empty |
| `NAME_TOO_LONG` | Name or title is longer than 120 characters |
| `BODY_TOO_LONG` | Body is longer than 4000 characters |
| `INVALID_MASTERY` | Mastery is not `unmarked`, `mastered` or `unmastered` |
| `INVALID_FAVORITE` | The favorite flag is not `true` or `false` |
| `ROOT_DELETE_FORBIDDEN` | The root folder cannot be deleted |
| `NOT_FOUND` | The target row does not exist |
| `API_NOT_INSTALLED` | The functions in `api.sql` have not been applied to the database yet |

When the input is invalid **and** the target does not exist, the input error is
raised first, so the status is 400 and not 404. The client always validates the
input before it calls, so this only happens on a direct API call.

`api_set_mastery` does not write the row when the card already has the requested
state. The state does not change, the two counters do not change, and
`updated_at` does not move.

If the SQL in `api.sql` has not been applied, PostgREST answers with `PGRST202`
and the client wrapper turns that into `API_NOT_INSTALLED` with the message
"The ReviewLab API is not installed in this database yet. Run source/database/api.sql
in the Supabase SQL editor." The user then sees an instruction instead of a
PostgREST dump.

## 3. Rules enforced by the database

These rules live in the database, not in the browser, so they hold for any client.

| Rule | Where |
|---|---|
| A name or title is trimmed, must not be empty, and is at most 120 characters | `api_check_text` in `api.sql`, plus the check constraints in `schema.sql` |
| A body is trimmed and at most 4000 characters. An empty body is valid | `api_check_body` in `api.sql`, plus the check constraint in `schema.sql` |
| Mastery is one of `unmarked`, `mastered`, `unmastered` | `api_check_mastery`, plus the check constraint in `schema.sql` |
| A card carries a boolean favorite flag, which is independent of the mastery | Column `favorite` in `schema.sql`, set through `api_set_favorite` |
| The root folder cannot be deleted | `api_delete_folder`, plus the trigger `folders_reject_root_delete` |
| A folder cannot change its parent | Trigger `folders_reject_parent_change` |
| A card cannot change its folder | Trigger `cards_reject_folder_change` |
| `updated_at` moves on every write | Trigger `folders_set_updated_at` and `cards_set_updated_at` |
| Only one root folder exists | Partial unique index `folders_one_root` |
| Items in a level are ordered by creation time, then by insertion order | Column `ord`, ordered by `created_at asc, ord asc` |
| One level shows its folders and its cards in one list | The client merges the two arrays and sorts by `created_at asc, ord asc`. Both columns come from the API |

Character counting uses `char_length`, which counts code points, matching the
requirement that one code point counts as one character.

## 4. Endpoint table

This table is the same content the report needs for its "Data model and API"
section.

| # | Method and path | Input | Output | Status |
|---|---|---|---|---|
| 1 | `POST /rest/v1/rpc/api_get_root` | none | `{ id, name, parent_id, created_at, updated_at }` | 200, 404 |
| 2 | `POST /rest/v1/rpc/api_list_level` | `p_folder` uuid | `{ folder, folders[], cards[] }` | 200, 404 |
| 3 | `POST /rest/v1/rpc/api_get_card` | `p_card` uuid | the card row including `body` | 200, 404 |
| 4 | `POST /rest/v1/rpc/api_list_tree` | none | `{ folders[], cards[] }` for the whole tree | 200 |
| 5 | `POST /rest/v1/rpc/api_delete_impact` | `p_folder` uuid | `{ folder_count, card_count }` | 200, 404 |
| 6 | `POST /rest/v1/rpc/api_create_folder` | `p_parent` uuid, `p_name` text | the new folder row | 200, 400, 404 |
| 7 | `POST /rest/v1/rpc/api_rename_folder` | `p_id` uuid, `p_name` text | the updated folder row | 200, 400, 404 |
| 8 | `POST /rest/v1/rpc/api_delete_folder` | `p_id` uuid | `{ deleted: true }` | 200, 403, 404 |
| 9 | `POST /rest/v1/rpc/api_create_card` | `p_folder` uuid | the new card row | 200, 404 |
| 10 | `POST /rest/v1/rpc/api_rename_card` | `p_id` uuid, `p_title` text | the updated card row | 200, 400, 404 |
| 11 | `POST /rest/v1/rpc/api_update_card_body` | `p_id` uuid, `p_body` text | the updated card row | 200, 400, 404 |
| 12 | `POST /rest/v1/rpc/api_set_mastery` | `p_id` uuid, `p_mastery` text | the updated card row | 200, 400, 404 |
| 13 | `POST /rest/v1/rpc/api_set_favorite` | `p_id` uuid, `p_favorite` boolean | the updated card row | 200, 400, 404 |
| 14 | `POST /rest/v1/rpc/api_delete_card` | `p_id` uuid | `{ deleted: true }` | 200, 404 |

### 4.1 Reads

**`api_get_root()`** returns the single root folder. The application has exactly
one root, enforced by the partial unique index.

**`api_list_level(p_folder)`** returns one level of the tree.

```json
{
  "folder": { "id": "...", "name": "Integration", "parent_id": "...", "ord": 2, "created_at": "...", "updated_at": "..." },
  "folders": [ { "id": "...", "name": "...", "parent_id": "...", "ord": 3, "created_at": "...", "updated_at": "..." } ],
  "cards": [ { "id": "...", "title": "...", "folder_id": "...", "mastery": "unmarked", "favorite": false, "ord": 4, "created_at": "...", "updated_at": "..." } ]
}
```

`ord` is the insertion order. It comes from one sequence that both tables share,
so a folder and a card that were written in the same instant can still be put
in the right order in the one list the file view shows.

`folders` and `cards` are the direct children only. Cards in this response do not
carry `body`; use `api_get_card` for the card that is being reviewed.

### 4.0 The shape of a card

Every function that returns a card returns the same fields. `favorite` is the
boolean that says whether the card is a favorite; it is independent of
`mastery`, which stays one of `unmarked`, `mastered` or `unmastered`.

| Field | Type | In the level list | In the tree and in one card |
|---|---|---|---|
| `id` | uuid | yes | yes |
| `ord` | number | yes | yes |
| `title` | text | yes | yes |
| `body` | text | no | yes |
| `folder_id` | uuid | yes | yes |
| `mastery` | text | yes | yes |
| `favorite` | boolean | yes | yes |
| `created_at` | timestamp | yes | yes |
| `updated_at` | timestamp | yes | yes |

`api_list_level` is the one that leaves `body` out, because the level list does
not show the content of a card. Every other function that returns a card
returns the body as well.

**`api_get_card(p_card)`** returns one card including `body`, used when Focus
opens a card.

**`api_list_tree()`** returns every folder and every card in the tree. The search
layer uses it to match and to build the path of each result. Card bodies are
included because the search matches card bodies as well.

**`api_delete_impact(p_folder)`** counts what a delete would remove, including the
selected folder itself and every folder and card below it.

```json
{ "folder_count": 3, "card_count": 7 }
```

The names of the two counters match the column names in the database. The client
renames them to `folderCount` and `cardCount` when it builds its own view model.

The file view calls this before showing the delete confirmation, so the
confirmation text always states the real numbers.

### 4.2 Writes

**`api_create_folder(p_parent, p_name)`** creates a folder inside `p_parent` and
returns the new row. The name is trimmed and validated.

**`api_rename_folder(p_id, p_name)`** renames a folder. The root folder may be
renamed.

**`api_delete_folder(p_id)`** deletes a folder and, through the foreign keys, every
folder and card below it. It refuses the root folder with `403` and
`ROOT_DELETE_FORBIDDEN`.

**`api_create_card(p_folder)`** creates a card with the title `New page`, an empty
body and the mastery `unmarked`, and returns the new row. The title is fixed at
creation by the product rules, so this function takes no title argument.

**`api_rename_card(p_id, p_title)`** renames the title of a card.

**`api_update_card_body(p_id, p_body)`** replaces the body of a card. An empty body
is valid.

**`api_set_mastery(p_id, p_mastery)`** sets the mastery of a card to `unmarked`,
`mastered` or `unmastered`. The two counters in the interface are counted from
the card rows, so setting the same value twice leaves the counters unchanged.

**`api_set_favorite(p_id, p_favorite)`** sets the favorite flag of a card to
`true` or `false`. The flag is a boolean on the card row, next to the mastery,
and it is independent of the mastery. Setting it writes the row, so `updated_at`
moves and the card comes to the top of the search results, which are grouped by
the last change. A `p_favorite` of `null` is refused with `400` and
`INVALID_FAVORITE`.

**`api_delete_card(p_id)`** deletes one card.

## 5. Access rules

`source/server/policies.sql` grants the `anon` role no direct access to the
tables and grants `execute` on the API functions only. Every request therefore
passes the validation in `api.sql`.

This is the answer to "protect write operations" without adding accounts. The
product has no login by design and the deployment is a single shared tree, which
the report lists as a known limitation. What the design does provide is that no
client can write a row that breaks the rules, because the rules live in the
database.

## 6. Applying the API to a database

Fresh database:

```sql
-- in the Supabase SQL editor, run in this order
\i source/database/schema.sql
\i source/database/api.sql
\i source/database/seed.sql
```

Existing database that already has the tables from an earlier `schema.sql`:
run `source/database/api.sql` only. It is idempotent and contains a small
migration block that adds the `ord` and `favorite` columns if they are missing.

Existing database that already has the API and needs only the favorite flag:
run `source/database/migrations/20261122_add_favorite.sql`. It adds the column,
adds `api_set_favorite`, replaces the functions that return cards so that they
carry the new field, and grants execute on the new function. It can be run more
than once.

After applying, the database should answer:

```
select count(*) from pg_proc where proname like 'api\_%';
```

The number must be 18: the fourteen functions of section 4, the three validation
helpers of section 3 and the error helper `api_fail`.
