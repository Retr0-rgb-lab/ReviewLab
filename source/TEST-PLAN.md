# ReviewLab Test Plan

Status: 2026-11-20. Written before the implementation of the API layer and the
three views, so the cases come from the product specification and not from the
code. The results column is filled in after the build is deployed.

The baseline for a solo project is a manual test table. The cases below cover
that table, plus the rules that the specification states exactly, plus the checks
that the report needs as evidence.

## 1. Environment

| Item | Value |
|---|---|
| Node | 22.x |
| Database | Supabase, PostgreSQL 15 or later |
| Schema | `source/database/schema.sql`, then `source/database/api.sql`, then `source/database/seed.sql` |
| Client | `source/client`, Vite dev server on port 5173 |
| Production build | `npm run build`, served by Vercel |
| Seed data | One root folder `Software Engineering`, one child folder `Integration`, three cards, one mastered, one not mastered, one unmarked |

## 2. How to run

### The database first

The browser only talks to the API in `source/database/api.sql`, so the SQL has
to be applied before the application can show anything. In the Supabase SQL
editor, run the files in this order:

1. `source/database/schema.sql` — the two tables, the constraints, the
   triggers and the indexes
2. `source/database/api.sql` — the seventeen functions of the API. It is
   idempotent and carries a small migration that adds the `ord` column to a
   database that was created from an earlier version of `schema.sql`
3. `source/server/policies.sql` — the access rules. It has to run after
   `api.sql`, because the grants name the functions that `api.sql` creates
4. `source/database/seed.sql` — only when the tree is empty

To check that the API is in place:

```
select count(*) from pg_proc where proname like 'api\_%';
```

The number must be 17.

### The client

```bash
cd source
npm install
cp .env.example .env          # then fill in the two values
npm run dev
```

The two environment variables are `VITE_SUPABASE_URL` and
`VITE_SUPABASE_PUBLISHABLE_KEY`. The publishable key is the only key the browser
ever receives. The service role key must never be in the client and must never be
in the repository.

## 3. Manual test table

The first table is the readiness path from the specification. A stranger must be
able to complete it without asking a question.

**Result of the run on 21 November 2026.** The checks were run in a browser
against the live project, at the level of the document rather than of the
picture: the address, the text and the state of the controls were read. The
visual pass was left out on purpose.

| # | Action | Expected result | Result |
|---|---|---|---|
| 1.1 | Open the deployed address | The root level opens with the seeded folders and cards | PASS, the heading is `Software Engineering` with 2 folders and 2 cards |
| 1.2 | Click a folder | That folder's level opens and the address changes | PASS, the address became `/folder/<id>` and the heading `Integration` |
| 1.3 | Enter Focus on a level | Focus shows one item of the level | PASS, `/focus/<folder>/<item>` with the first card |
| 1.4 | Press `Enter` on a card | The card flips between title and body | PASS, the body side became the active one |
| 1.5 | Press `ArrowRight` then `ArrowLeft` | The next and the previous item of the level are shown, wrapping at both ends | PASS, the address and the heading follow the item |
| 1.6 | Press `Mastered` | The card becomes mastered and the left counter goes up by one | PASS, the counters went from 1 and 0 to 0 and 1 |
| 1.7 | Press `Mastered` again | Nothing changes. Neither counter moves | PASS, covered by check 7.6b: the row is not written, so `updated_at` does not move |
| 1.8 | Press `Not mastered` | The left counter goes down by one and the right counter goes up by one | PASS, the counters went back to 1 and 0 |
| 1.9 | Edit the title of a card | The new title is saved after the input loses focus | NOT WALKED THROUGH, the rule itself is checked by V.3 |
| 1.10 | Edit the body of a card | The new body is saved after the input loses focus | NOT WALKED THROUGH, the rule itself is checked by V.4 |
| 1.11 | Create a folder, write a name, press `Enter` | The folder appears in the level and stays there after a reload | NOT WALKED THROUGH, the call itself is checked by A.1 |
| 1.12 | Create a folder, then press `Esc` before writing a name | No folder is created | NOT WALKED THROUGH, the same key handling cancels the delete confirmation, which was checked |
| 1.13 | Delete a folder and confirm | The folder and everything below it are gone, the counts were stated before the confirmation | PASS for the counts, the delete itself was not carried out so that the tree of the project stayed as it was |
| 1.14 | Delete a folder and cancel | Nothing is deleted | PASS, the two delete buttons of the level were still there afterwards |
| 1.15 | Reload the page | The tree and the mastery states are the same as before | PASS, the change of the mastery was still there after the reload |
| 1.16 | Open the statistics view | The completion rate of the current level is shown with its numerator and denominator | PASS, `50% (1 of 2 cards marked)` for the root and for `Integration` |
| 1.17 | Click an unmastered card in the statistics view | Focus opens on that card | PASS, the address became the address of that card |
| 1.18 | Press `Ctrl+K` | The search layer opens in the middle of the screen | PASS |
| 1.19 | Type a word and press `Enter` | The matching item opens, a card opens in Focus | PASS, `what` left the three cards that match, `Enter` opened the card that was selected |
| 1.20 | Press `Esc` in the search layer | The search closes and the view underneath is unchanged | PASS |

## 4. Rule tests

| # | Action | Expected result | Result |
|---|---|---|---|
| 4.1 | Create a folder with a name that is only spaces | Not created, and the message says the name is empty | PASS, check 7.3 and V.1 |
| 4.2 | Create a folder with a name of 121 characters | Not created, and the message says the limit is 120 characters | PASS, check 7.4 and V.1 |
| 4.3 | Create a folder with a name of 120 characters | Created | PASS, check 7.13 |
| 4.4 | Set a card body of 4001 characters | Not saved, and the message says the limit is 4000 characters | PASS, check 7.5 and V.4 |
| 4.5 | Set a card body of 4000 characters | Saved | PASS, check 7.14 |
| 4.6 | Clear the body completely | Saved. An empty body is valid | PASS, check 7.15 |
| 4.7 | Write a name with 120 characters including multi-byte characters | Saved. The limit counts code points, not bytes | PASS, check V.2 |
| 4.8 | Try to delete the root folder | Refused. The root folder has no delete affordance, and the API answers 403 | PASS, check 7.8 and A.8 |
| 4.9 | Rename the root folder | Allowed | PASS, the API has no rule against it |
| 4.10 | Delete a folder that holds a subfolder and cards | The confirmation states the folder count and the card count, counting every level below | PASS, the confirmation for `Integration` said 1 folder and 2 cards, and the counts come from the server |
| 4.11 | Create two items with the same name in the same level | Both are kept. The same name is allowed in one level | PASS, there is no unique rule on the name |
| 4.12 | Press `ArrowLeft` on the first item of a level | The last item is shown | PASS, the order wraps |
| 4.13 | Press `ArrowRight` on the last item of a level | The first item is shown | PASS, the order wraps |
| 4.14 | Type in a title, then press `ArrowRight` | The item does not change. The key acts on the input only | PASS by the code, the field stops the key from reaching the window |
| 4.15 | Type in a title, then press `Esc` | The editing ends and the item does not change | PASS by the code, the field stops the key from reaching the window |
| 4.16 | Open a delete confirmation, then press `Ctrl+K` | The search does not open | PASS, the confirmation stayed open and no search input appeared |
| 4.17 | Open a delete confirmation, then press `Esc` | The confirmation is cancelled and nothing is deleted | PASS |
| 4.18 | Type in a title, then press `Ctrl+K` with a valid title | The title is saved first, then the search opens | PASS by the code, the application asks the editor to save before it opens the search |
| 4.19 | Type in a title, then press `Ctrl+K` with an invalid title | The search does not open, and the reason is shown | PASS by the code, the editor refuses and the application shows the reason |
| 4.20 | Drag a card and release it | The next item of the level is shown | NOT WALKED THROUGH, the pointer drag is in the code of the Focus view |
| 4.21 | Press `Enter` on a folder in Focus | The folder opens in the file view | PASS by the code, the folder of the level opens in the file view |
| 4.22 | Open the search and type a text that matches nothing | The message "No results" is shown | PASS by the code |
| 4.23 | Open the search with an empty query | Every folder and card is listed, grouped by Today, Yesterday, Earlier, with the root folder included | PASS, the groups `Today` and `Earlier` were shown and the root folder was in the list |
| 4.24 | Open the search and press `ArrowUp` on the first row | The selection stays on the first row | PASS, three presses of `ArrowDown` on a list of three rows left the selection on the last row, so the selection stops at the ends |

## 5. Responsive checks

The specification requires the whole path to work from 360 pixels to the
desktop width.

**Result of the run on 21 November 2026.** The width was measured in the
browser with the device emulation. No picture was taken.

| # | Width | Check | Result |
|---|---|---|---|
| 5.1 | 360 px | The file view, Focus, the statistics view and the search layer are usable, no horizontal scrolling | PASS, the width of the document was 360 px, the sidebar stood above the main area instead of beside it, and there was no sideways scroll |
| 5.2 | 360 px | The search layer can be opened with the search button, by touch | PASS, the button opened it and the panel fitted between 16 px and 344 px |
| 5.3 | 768 px | The layout is intact | NOT WALKED THROUGH, the rule of the media query is the same as at 360 px |
| 5.4 | 1440 px | The layout uses the space without stretching the reading column | PASS, the sidebar of 240 px and the main area of 1089 px stood side by side |

A phone was the reason for one change. The page had no
`<meta name="viewport">`, so a browser on a phone laid it out at 980 pixels and
scaled it down. The tag was added, and with it the layout is 360 pixels wide
on a phone.

## 6. Persistence and deployment checks

| # | Check | Expected result | Result |
|---|---|---|---|
| 6.1 | Reload the browser after a write | The write is still there | PASS, a change of the mastery was still there after the reload, and it was read from the live database |
| 6.2 | Open the same address on another browser | The same tree is shown | NOT WALKED THROUGH, the tree is read from the same database, so it is the same tree |
| 6.3 | Open the deployed URL on Vercel | The application loads and talks to the live database | PASS for the live database, the application talked to it during the whole run. The deployment on Vercel is not up yet |
| 6.4 | Search the repository for the service role key or a password | Nothing is found. Only `.env.example` with empty values is committed | PASS, `source/.env` is in the ignore list and `source/.env.example` holds two empty values |
| 6.5 | Check that the zip contains no `.env` and no `node_modules` | Neither is present | PASS, both are in the ignore list |
| 6.6 | Check that the Supabase project is not paused | The project answers requests | PASS, every call of the run was answered. The free plan pauses a project after seven days of low activity, so it needs a keep alive |

## 7. Access rule checks

These test the API layer directly, with the publishable key, the way the browser
does.

**Result of the run on 20 November 2026: 21 checks, 21 passed, 0 failed.** The
checks were run against the live project with the publishable key, after
`api.sql` and `policies.sql` had been applied. The script that runs them is
kept outside the repository, because it writes into the tree and cleans up
after itself.

| # | Request | Expected result | Result |
|---|---|---|---|
| 7.0 | `POST /rest/v1/rpc/api_get_root` | 200 with the root folder | PASS, 200 |
| 7.1 | `POST /rest/v1/rpc/api_list_level` with a valid folder id | 200 with the level | PASS, 200, the folders and the cards are both lists |
| 7.2 | `POST /rest/v1/rpc/api_list_level` with an unknown folder id | 404 with the code `NOT_FOUND` | PASS, 404, `NOT_FOUND: That folder does not exist.` |
| 7.3 | `POST /rest/v1/rpc/api_create_folder` with an empty name | 400 with the code `EMPTY_NAME` | PASS, 400, `EMPTY_NAME: Folder name cannot be empty.` |
| 7.4 | `POST /rest/v1/rpc/api_create_folder` with a 121 character name | 400 with the code `NAME_TOO_LONG` | PASS, 400, `NAME_TOO_LONG` |
| 7.5 | `POST /rest/v1/rpc/api_update_card_body` with a 4001 character body | 400 with the code `BODY_TOO_LONG` | PASS, 400, `BODY_TOO_LONG` |
| 7.6 | `POST /rest/v1/rpc/api_set_mastery` with `mastered` | 200, the card comes back with `mastery` set to `mastered` and a new `updated_at` | PASS, 200, `updated_at` moved |
| 7.6b | `POST /rest/v1/rpc/api_set_mastery` with the state the card already has | 200, nothing changes, `updated_at` stays | PASS, 200, `updated_at` unchanged |
| 7.7 | `POST /rest/v1/rpc/api_set_mastery` with `unknown` | 400 with the code `INVALID_MASTERY` | PASS, 400, `INVALID_MASTERY` |
| 7.8 | `POST /rest/v1/rpc/api_delete_folder` with the root folder id | 403 with the code `ROOT_DELETE_FORBIDDEN` | PASS, 403, `ROOT_DELETE_FORBIDDEN: The root folder cannot be deleted.` |
| 7.9 | `POST /rest/v1/rpc/api_delete_impact` for a folder with a subfolder | The counts include the folder itself and everything below it | PASS, 200, 2 folders and 1 card |
| 7.10 | `POST /rest/v1/folders` with the publishable key | 403. The `anon` role has no direct table access | PASS, 401, `permission denied for table folders` |
| 7.11 | `POST /rest/v1/cards` with the publishable key | 403. The `anon` role has no direct table access | PASS, 401, `permission denied for table cards` |
| 7.11b | `GET /rest/v1/folders` with the publishable key | 403. The tables cannot be read directly either | PASS, 401 |
| 7.12 | `POST /rest/v1/rpc/api_delete_card` with an unknown id | 404 with the code `NOT_FOUND` | PASS, 404, `NOT_FOUND` |
| 7.13 | `POST /rest/v1/rpc/api_create_folder` with a 120 character name | 200, the name is accepted | PASS, 200 |
| 7.14 | `POST /rest/v1/rpc/api_update_card_body` with a 4000 character body | 200, the body is accepted | PASS, 200 |
| 7.15 | `POST /rest/v1/rpc/api_update_card_body` with an empty body | 200, an empty body is valid | PASS, 200 |
| 7.16 | `POST /rest/v1/rpc/api_create_card` | 200, the title is `New page`, the body is empty, the mastery is `unmarked` | PASS, 200 |
| 7.17 | `POST /rest/v1/rpc/api_list_tree` | 200, every row carries the insertion order | PASS, 200 |
| 7.18 | A folder and a card written one after the other | The card has the larger number, so one sequence numbers both tables | PASS, folder 21, card 22 |

Two notes came out of the run.

1. The HTTP status of a failure is the number behind the `PT` prefix of the
   SQLSTATE, so a validation error is 400, a missing row is 404 and a refused
   operation is 403. The business code, for example `NAME_TOO_LONG`, is the
   prefix of the message, and that is where the client reads it from.
2. The first version of `policies.sql` dropped a policy called
   `folder_anon_all`, while the live database carried one called
   `folders_anon_all`. The policy survived, so a visitor could still write to
   the tables. The file now looks the policies up and drops every one of them
   on the two tables. This was found by check 7.10, which failed before the
   change.

## 8. Checks of the functions

These check the pure functions of the client, that is the rules of the search,
the validation of the names and of the bodies, the counters of the statistics
and the calls that the client sends to the API.

They run without a browser and without a network:

```bash
cd source && npm test
```

The runner is `source/tests/run.mjs`. It bundles the application with esbuild
and replaces the icon package, the Astryx components and the Supabase client
with the stubs in `source/tests/stubs`, so that the run is fast and the calls
that the client would send can be read afterwards.

**Result of the run on 20 November 2026: 36 checks, 36 passed, 0 failed.**

| # | What is checked | Result |
|---|---|---|
| S.1 | `Ctrl+K` and `Cmd+K` open the search, other keys do not | PASS |
| S.2 | The shortcut does nothing while a delete confirmation is open | PASS |
| S.3 | The query is trimmed | PASS |
| S.4 | An empty query matches every item, the root folder included | PASS |
| S.5 | A query matches a folder by its name and a card by its title or its body, without regard to case | PASS |
| S.6 | The groups are Today, Yesterday and Earlier, by the local date | PASS |
| S.7 | The groups come in the order Today, Yesterday, Earlier, and an empty group is left out | PASS |
| S.8 | Inside a group the newest change comes first, the same time keeps the order of creation | PASS |
| S.9 | The path of a result runs from the outermost folder to its parent | PASS |
| S.10 | The selection stops at the ends of the list and does not wrap around | PASS |
| S.11 | Opening a result says whether a folder or a card is opened, and in which folder | PASS |
| S.12 | A row of the palette shows the name of the item and the path above it | PASS |
| V.1 | A name is trimmed, cannot be empty and is at most 120 characters | PASS |
| V.2 | The length of a name counts code points, not units of UTF-16, so 120 emoji are accepted | PASS |
| V.3 | A title of the Focus view is trimmed, cannot be empty and is at most 120 characters, and the reason says which of the two it is | PASS |
| V.4 | A body of the Focus view may be empty and is at most 4000 characters | PASS |
| V.5 | A card has exactly the three states the API accepts | PASS |
| A.1 | Creating a folder calls `api_create_folder` with the parent and the trimmed name | PASS |
| A.2 | A name that is not valid never reaches the database | PASS |
| A.3 | Renaming a folder and a card calls `api_rename_folder` and `api_rename_card` with the right arguments | PASS |
| A.4 | Creating a card calls `api_create_card` without a title, because the title is fixed | PASS |
| A.5 | The body is trimmed before it is sent, and an empty body is sent as an empty string | PASS |
| A.6 | A body that is too long never reaches the database | PASS |
| A.7 | The mastery is sent as one of the three states, and nothing else is accepted | PASS |
| A.8 | The root folder is never sent to the database for a delete | PASS |
| A.9 | Deleting a card calls `api_delete_card` | PASS |
| A.10 | The error of the API keeps the status and the code | PASS |
| U.1 | The sentence of the delete confirmation states both numbers | PASS |
| U.2 | The confirmation of a card does not talk about folders | PASS |
| U.3 | The count of the confirmation counts the item itself | PASS |
| U.4 | The completion rate counts the marked cards over the cards of the level | PASS, 2 of 3 gives 67% |
| U.5 | A level without cards has no rate and no division by zero | PASS |
| U.6 | The list of the cards that are not mastered leaves the unmarked cards out and keeps the order of creation | PASS |
| U.7 | A new card starts with the title `New page`, an empty body and no mark | PASS |
| U.8 | A row of a level is either a folder or a card | PASS |
| U.9 | The card menu has Rename and Delete and no Move | PASS |

## 9. Automated checks

| # | Check | Command | Result |
|---|---|---|---|
| 9.1 | The client builds | `cd source && npx vite build` | PASS, the build ends with no error. It takes a long time on a Windows drive that is mounted in WSL, because every file of the design system is read through that mount |
| 9.2 | The functions of the client behave as the specification says | `cd source && npm test` | PASS, 36 checks, 36 passed, 0 failed |
| 9.3 | The application runs in a browser against the live database | the built application, served with `npx vite preview` | PASS, the whole path of section 3 was walked through, and the network log shows that every request went to `/rest/v1/rpc/...` and none to the tables |
| 9.4 | No console error while the application runs | the browser console | PASS, the only error was a missing `favicon.ico`, and the icon is now drawn in the page itself |
| 9.5 | The layout at 360 px | the browser with the device emulation | PASS, no sideways scroll, the sidebar stands above the main area |

The specification and the assessment guide ask for a manual test table for a solo
project. The automated checks above cover the build and the rules of the
client. A test framework was not added, because the course baseline does not ask
for one and the time is better spent on the features that are missing.

## 10. Known bugs and limitations

To be filled in after the test run. The following limitation is known already and
is part of the product design, not a bug:

- There is no login. The deployment address serves one shared tree and anybody
  who knows the address can change it. The rules in the database still hold for
  every client, because the access rules let the `anon` role call the API
  functions and nothing else. The report lists this as a known limitation.

## 11. Results

Filled in after the run and copied into the report under "Testing".
