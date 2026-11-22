# ReviewLab Test Plan

Status: 2026-11-22. Rewritten for the current design: the ordinary view with
its top bar, its three columns and its dock, the zen mode with the arc
gallery, and the statistics view with the mastery dial.

The manual results of this plan are empty on purpose. This document is the
list that the walkthrough fills in, and every row that has not been run says
`NOT WALKED THROUGH` instead of a result that nobody saw. The checks of the
client are the one part that is already run, and their result stands in
section 9.

The plan covers the path of a new user, the rules that the specification
states exactly, the three widths of the screen, the persistence of the data,
the access rules of the database, the contract between the three parts of the
API and the visual pass of the screen.

## 1. Environment

| Item | Value |
|---|---|
| Node | 22.x |
| Database | Supabase project `byxvejnivrlomobcgztt`, the URL is in `source/.env` |
| Schema | `source/database/schema.sql`, then `source/database/api.sql`, then `source/server/policies.sql`, then `source/database/seed.sql` |
| Client | `source/client`, the Vite dev server on port 5173 |
| Production build | `npm run build`, served by Vercel |
| Checks of the client | `source/tests`, the runner is `source/tests/run.mjs` |
| Seed data | The root folder `Software Engineering` with one mastered card, the folder `Integration` with one card that is not mastered and one unmarked card whose body is empty |

The seed is only for a fresh database. A database that already holds a tree is
not seeded again, because the seed would add a second tree beside the first.

## 2. How to run

### 2.1 The database first

The browser only talks to the API in `source/database/api.sql`, so the SQL has
to be applied before the application can show anything. In the Supabase SQL
editor, run the files in this order:

1. `source/database/schema.sql` — the two tables, the constraints, the
   triggers and the indexes. It carries the migration that adds the
   `favorite` column of the cards to a database of an earlier version.
2. `source/database/api.sql` — the functions of the API, the fourteen
   endpoints and the four helpers that they use. It is idempotent.
3. `source/server/policies.sql` — the access rules. It has to run after
   `api.sql`, because the grants name the functions that `api.sql` creates.
4. `source/database/seed.sql` — only when the tree is empty.

To check that the API is in place:

```sql
select count(*) from pg_proc where proname like 'api\_%' and proname not like 'api\_check%' and proname <> 'api_fail';
```

The number must be 14. The four helpers, `api_check_text`, `api_check_body`,
`api_check_mastery` and `api_fail`, are not part of the contract.

### 2.2 The client

```bash
cd source
npm install
cp .env.example .env          # then fill in the two values
npm run dev
```

The two environment variables are `VITE_SUPABASE_URL` and
`VITE_SUPABASE_PUBLISHABLE_KEY`. The publishable key is the only key the
browser ever receives. The service role key must never be in the client and
must never be in the repository.

### 2.3 The checks of the client

```bash
cd source && npm test
```

They run without a browser and without a network. The runner bundles the
application with esbuild and replaces the icon package, the Astryx
components, the animation package and the Supabase client with the stubs in
`source/tests/stubs`, so that the run is fast and the calls that the client
would send can be read afterwards. The result is in section 9.

### 2.4 The production build

```bash
cd source && npm run build
npx vite preview
```

The preview serves the built application on the same port as the dev server.
The build is what Vercel deploys, and the walkthrough of section 3 is worth
doing against the preview, because the addresses of the three views have to
work on a real server and not only under the dev server.

## 3. The main path

The path of a user who has never seen the application. Every step is done
from a cold start, so that a change that was only in the memory of the
browser is caught.

| # | Step | Expected result | Actual result | Verdict |
|---|---|---|---|---|
| 3.1 | Open the address of the root level | The root folder opens. The top bar shows the search button, the title of the level, the breadcrumb and the counts of the level | NOT WALKED THROUGH | pending |
| 3.2 | Click a folder in the left column | That level opens and the address becomes `/folder/<folderId>` | NOT WALKED THROUGH | pending |
| 3.3 | Click the zen mode button in the right column | The zen mode opens at `/zen/<folderId>`. The screen holds the arc and the card alone | NOT WALKED THROUGH | pending |
| 3.4 | Click the card in the zen mode, or press `Enter` | The card turns over. The front is the question, the back is the content | NOT WALKED THROUGH | pending |
| 3.5 | Press `ArrowRight`, then `ArrowLeft` | The next and the previous card of the level are shown. The order wraps at both ends | NOT WALKED THROUGH | pending |
| 3.6 | Mark the card as mastered | The card is marked. The number M under the dial goes up, the number N does not move, and the green arc of the dial grows | NOT WALKED THROUGH | pending |
| 3.7 | Open the edit panel and change the title | The new title stands on the card, in the wheel of the left column and in the search | NOT WALKED THROUGH | pending |
| 3.8 | Change the body and turn the card over | The back of the card shows the new body | NOT WALKED THROUGH | pending |
| 3.9 | Press the star in the dock | The card becomes a favorite. The star shows on the card and the number of the favorites rail goes up | NOT WALKED THROUGH | pending |
| 3.10 | Press the create button in the dock | A new card appears in the level. Its title is `New page` and its body is empty | NOT WALKED THROUGH | pending |
| 3.11 | Press the delete button in the dock | A confirmation opens. It says how many folders and how many cards will be removed | NOT WALKED THROUGH | pending |
| 3.12 | Accept the confirmation | The item is gone and the level, the wheel and the dial follow | NOT WALKED THROUGH | pending |
| 3.13 | Reload the page | The tree, the mastery and the favorites are the same as before the reload | NOT WALKED THROUGH | pending |
| 3.14 | Open `/stats/<folderId>` | The statistics of the level are shown: the completion rate, the two numbers and the list of the cards that are not mastered | NOT WALKED THROUGH | pending |
| 3.15 | Click a card in the list of the statistics | The zen mode opens on that card, at `/zen/<folderId>/<itemId>` | NOT WALKED THROUGH | pending |
| 3.16 | Press `Ctrl+K`, type a word of a card that lies in another level, press `Enter` | The zen mode opens on that card, at `/zen/<folderId>/<itemId>` | NOT WALKED THROUGH | pending |
| 3.17 | Press `Esc` in the zen mode, then press the cross | The zen mode closes and the ordinary view comes back, on the same level | NOT WALKED THROUGH | pending |
| 3.18 | Pinch the track pad out, then in | The gallery zooms out to the overview and back to the focused card | NOT WALKED THROUGH | pending |
| 3.19 | Drag a card to the side and let go | The next card of the level is shown | NOT WALKED THROUGH | pending |
| 3.20 | Switch the theme in the top bar | The White and the Dark theme change the file view, the focus, the statistics and the search layer together | NOT WALKED THROUGH | pending |

## 4. Rule tests

### 4.1 The rules of the mastery

| # | Action | Expected result | Actual result | Verdict |
|---|---|---|---|---|
| 4.1.1 | Mark a card that is not marked as mastered | The number M goes up by one and the number N stays | NOT WALKED THROUGH | pending |
| 4.1.2 | Mark a card that is already mastered as mastered | Nothing changes. Neither number moves and the arc does not move | NOT WALKED THROUGH | pending |
| 4.1.3 | Change a card from mastered to not mastered | The number M goes down by one and the number N goes up by one | NOT WALKED THROUGH | pending |
| 4.1.4 | Mark a card as not mastered, then mark it as not mastered again | Nothing changes | NOT WALKED THROUGH | pending |
| 4.1.5 | Mark a card as not mastered and then as mastered | The card ends as mastered. The two numbers end where they began | NOT WALKED THROUGH | pending |
| 4.1.6 | Look at a card that was never marked | It belongs to neither of the two numbers. The dial counts only the marked cards | NOT WALKED THROUGH | pending |

### 4.2 The rules of the dial

| # | Action | Expected result | Actual result | Verdict |
|---|---|---|---|---|
| 4.2.1 | Mark every card of the level as mastered | The green arc fills the ring to the right, the dial reads 100% and the red arc is gone | NOT WALKED THROUGH | pending |
| 4.2.2 | Mark half of the cards as mastered and half as not mastered | The head of the comet stands straight above, the dial reads 50% | NOT WALKED THROUGH | pending |
| 4.2.3 | Look at a level where no card is marked | The dial reads 0%, the whole ring is a neutral grey and it does not animate | NOT WALKED THROUGH | pending |
| 4.2.4 | Look at a level where no card is marked, and mark one of them | The ring turns into a green arc and a red arc, and it animates | NOT WALKED THROUGH | pending |
| 4.2.5 | Look at the numbers under the dial | The number M of the mastered cards and the number N of the cards that are not mastered are both there | NOT WALKED THROUGH | pending |
| 4.2.6 | Click the dial | The statistics of the level open | NOT WALKED THROUGH | pending |
| 4.2.7 | Look at a level with one card that is mastered and one that is not | The dial reads 50%, and the unmarked cards of the level are not in the share | NOT WALKED THROUGH | pending |

### 4.3 The rules of the search

| # | Action | Expected result | Actual result | Verdict |
|---|---|---|---|---|
| 4.3.1 | Press `Ctrl+K` in the file view, in the zen mode and in the statistics view | The search layer opens in the middle of the screen, in all three views | NOT WALKED THROUGH | pending |
| 4.3.2 | Open the search with an empty query | Every folder and every card is listed, grouped by Today, Yesterday and Earlier | NOT WALKED THROUGH | pending |
| 4.3.3 | Type a word that is in the title of a card | That card is in the list | NOT WALKED THROUGH | pending |
| 4.3.4 | Type a word that is in the body of a card | That card is in the list | NOT WALKED THROUGH | pending |
| 4.3.5 | Type a word that matches nothing | The layer says that there is no result | NOT WALKED THROUGH | pending |
| 4.3.6 | Open a card of the list | The zen mode opens on that card, at `/zen/<folderId>/<itemId>` | NOT WALKED THROUGH | pending |
| 4.3.7 | Open a folder of the list | The ordinary view opens on that folder, at `/folder/<folderId>` | NOT WALKED THROUGH | pending |
| 4.3.8 | Press `Esc` in the search layer | The layer closes and the view underneath is unchanged | NOT WALKED THROUGH | pending |
| 4.3.9 | Open a delete confirmation, then press `Ctrl+K` | The search does not open | NOT WALKED THROUGH | pending |

### 4.4 The rules of the names and of the bodies

| # | Action | Expected result | Actual result | Verdict |
|---|---|---|---|---|
| 4.4.1 | Save a title that is only spaces | The card is not saved and the reason says that the title is required | NOT WALKED THROUGH | pending |
| 4.4.2 | Save a title of 120 characters | The card is saved | NOT WALKED THROUGH | pending |
| 4.4.3 | Save a title of 121 characters | The card is not saved and the reason says the limit of 120 characters | NOT WALKED THROUGH | pending |
| 4.4.4 | Save a body of 4000 characters | The body is saved | NOT WALKED THROUGH | pending |
| 4.4.5 | Save a body of 4001 characters | The body is not saved and the reason says the limit of 4000 characters | NOT WALKED THROUGH | pending |
| 4.4.6 | Clear the body of a card completely | The body is saved as an empty string, and the back of the card says `This card has no content yet.` | NOT WALKED THROUGH | pending |
| 4.4.7 | Write a name of 120 characters with multi byte characters | The name is saved. The limit counts code points, not bytes | NOT WALKED THROUGH | pending |
| 4.4.8 | Give a folder and a card the same name in one level | Both are kept. The same name is allowed in one level | NOT WALKED THROUGH | pending |

### 4.5 The rules of the delete confirmation

| # | Action | Expected result | Actual result | Verdict |
|---|---|---|---|---|
| 4.5.1 | Delete a card | The confirmation says how many cards will be removed, and it does not talk about folders | NOT WALKED THROUGH | pending |
| 4.5.2 | Delete a folder that holds a subfolder and cards | The confirmation states the number of folders and the number of cards that will be removed, counting every level below | NOT WALKED THROUGH | pending |
| 4.5.3 | Cancel the confirmation | Nothing is deleted | NOT WALKED THROUGH | pending |
| 4.5.4 | Try to delete the root folder | It cannot be deleted. The root folder has no delete button and the API refuses | NOT WALKED THROUGH | pending |

### 4.6 The rules of the favorites

| # | Action | Expected result | Actual result | Verdict |
|---|---|---|---|---|
| 4.6.1 | Press the star in the dock on a card that is not a favorite | The card becomes a favorite, the star shows on the card and the count of the rail goes up by one | NOT WALKED THROUGH | pending |
| 4.6.2 | Press the star again | The card is not a favorite any more and the count goes down by one | NOT WALKED THROUGH | pending |
| 4.6.3 | Change the favorite of a card | The change of the favorite moves the `updated_at` of the card | NOT WALKED THROUGH | pending |
| 4.6.4 | Press the favorites button in the right column | Nothing is filtered in this round. The button is a read only placeholder and the level stays as it is | NOT WALKED THROUGH | pending |

### 4.7 The rules of the three views

| # | Action | Expected result | Actual result | Verdict |
|---|---|---|---|---|
| 4.7.1 | Open the ordinary view, the zen mode and the statistics view | Every one of them has its own address and can be opened on its own | NOT WALKED THROUGH | pending |
| 4.7.2 | Reload the zen mode | The same card is shown, and the address still holds the item | NOT WALKED THROUGH | pending |
| 4.7.3 | Open an address that does not exist | The application falls back to the root level instead of showing an empty page | NOT WALKED THROUGH | pending |
| 4.7.4 | Turn a card over with the mouse and with `Enter` | Both ways turn the same card over | NOT WALKED THROUGH | pending |
| 4.7.5 | Type in a field, then press `ArrowRight` | The card does not change. The key belongs to the field | NOT WALKED THROUGH | pending |

## 5. Responsive checks

The whole path has to work from 360 pixels to the width of the desktop. The
width is measured with the device emulation of the browser, and the width of
the document is read with `document.documentElement.scrollWidth`, which must
not be larger than the width of the screen.

| # | Width | What has to be seen | What must not be there | Actual result | Verdict |
|---|---|---|---|---|---|
| 5.1 | 360 px | The ordinary view, the zen mode, the statistics and the search layer can all be used | A horizontal scrollbar | NOT WALKED THROUGH | pending |
| 5.2 | 360 px | The search layer can be opened with the search button of the top bar, by touch | A panel that is wider than the screen | NOT WALKED THROUGH | pending |
| 5.3 | 360 px | The dock of the bottom stays reachable and its four buttons can be pressed | A button that is cut off | NOT WALKED THROUGH | pending |
| 5.4 | 360 px | The dial of the left column and its two numbers are readable | Numbers that are clipped | NOT WALKED THROUGH | pending |
| 5.5 | 768 px | The columns of the ordinary view stand next to each other and every column keeps its content | A column that is squeezed to nothing | NOT WALKED THROUGH | pending |
| 5.6 | 768 px | The zen mode fills the screen and the card is in the middle | A card that is cut off at the top or at the bottom | NOT WALKED THROUGH | pending |
| 5.7 | 1440 px | The three columns of the ordinary view stand next to each other, the card in the middle stays in the middle | A reading column that stretches over the whole width | NOT WALKED THROUGH | pending |
| 5.8 | 1440 px | The arc of the zen mode uses the width without pushing the card off the screen | A horizontal scrollbar | NOT WALKED THROUGH | pending |
| 5.9 | 360 px, 768 px, 1440 px | The page carries the viewport tag, so that a phone lays it out at 360 pixels | The old layout of 980 pixels, scaled down | NOT WALKED THROUGH | pending |

## 6. Persistence and deployment checks

| # | Check | Expected result | Actual result | Verdict |
|---|---|---|---|---|
| 6.1 | Reload the browser after a write | The write is still there. The tree, the mastery and the favorites are read from the database | NOT WALKED THROUGH | pending |
| 6.2 | Close the browser, open it again, open the same address | The same tree is shown | NOT WALKED THROUGH | pending |
| 6.3 | Open the same address in another browser | The same tree is shown, because both read the same database | NOT WALKED THROUGH | pending |
| 6.4 | Open the deployed address on Vercel | The application loads and talks to the live database | NOT WALKED THROUGH | pending |
| 6.5 | Look at the network log of the browser | Every request goes to `/rest/v1/rpc/...`. No request goes to `/rest/v1/folders` or to `/rest/v1/cards` | NOT WALKED THROUGH | pending |
| 6.6 | Search the repository for the service role key or for a password | Nothing is found. `source/.env` is in the ignore list and `source/.env.example` holds two empty values | NOT WALKED THROUGH | pending |
| 6.7 | Look at the files of the zip | Neither `.env` nor `node_modules` is in it | NOT WALKED THROUGH | pending |
| 6.8 | Check that the Supabase project is not paused | The project answers requests. The free plan pauses a project after seven days of low activity | NOT WALKED THROUGH | pending |

## 7. Access rule checks

These test the database directly, with the publishable key, the way the
browser does. The key is read from `source/.env`, it is never written into
this document.

| # | Request | Expected result | Actual result | Verdict |
|---|---|---|---|---|
| 7.1 | `POST /rest/v1/rpc/api_get_root` | 200 with the root folder | NOT WALKED THROUGH | pending |
| 7.2 | `POST /rest/v1/rpc/api_list_level` with a valid folder id | 200 with the folders and the cards of that level | NOT WALKED THROUGH | pending |
| 7.3 | `POST /rest/v1/rpc/api_list_level` with an unknown folder id | 404 with the code `NOT_FOUND` | NOT WALKED THROUGH | pending |
| 7.4 | `POST /rest/v1/rpc/api_get_card` with a valid card id | 200 with the card, its mastery and its favorite flag | NOT WALKED THROUGH | pending |
| 7.5 | `POST /rest/v1/rpc/api_list_tree` | 200 with every row of both tables | NOT WALKED THROUGH | pending |
| 7.6 | `POST /rest/v1/rpc/api_delete_impact` for a folder with a subfolder | 200 with the number of folders and the number of cards below it | NOT WALKED THROUGH | pending |
| 7.7 | `POST /rest/v1/rpc/api_create_folder` with an empty name | 400 with the code `EMPTY_NAME` | NOT WALKED THROUGH | pending |
| 7.8 | `POST /rest/v1/rpc/api_create_folder` with a name of 121 characters | 400 with the code `NAME_TOO_LONG` | NOT WALKED THROUGH | pending |
| 7.9 | `POST /rest/v1/rpc/api_create_folder` with a name of 120 characters | 200, the name is accepted | NOT WALKED THROUGH | pending |
| 7.10 | `POST /rest/v1/rpc/api_create_card` | 200. The title is `New page`, the body is empty, the mastery is `unmarked` and the card is not a favorite | NOT WALKED THROUGH | pending |
| 7.11 | `POST /rest/v1/rpc/api_set_mastery` with `mastered` | 200, the card comes back with that mastery and a new `updated_at` | NOT WALKED THROUGH | pending |
| 7.12 | `POST /rest/v1/rpc/api_set_mastery` with the state the card already has | 200, nothing changes, `updated_at` stays | NOT WALKED THROUGH | pending |
| 7.13 | `POST /rest/v1/rpc/api_set_mastery` with `unknown` | 400 with the code `INVALID_MASTERY` | NOT WALKED THROUGH | pending |
| 7.14 | `POST /rest/v1/rpc/api_set_favorite` with `true` | 200, the card comes back with `favorite` set to true and a new `updated_at` | NOT WALKED THROUGH | pending |
| 7.15 | `POST /rest/v1/rpc/api_set_favorite` with `false` | 200, the card comes back with `favorite` set to false | NOT WALKED THROUGH | pending |
| 7.16 | `POST /rest/v1/rpc/api_update_card_body` with a body of 4001 characters | 400 with the code `BODY_TOO_LONG` | NOT WALKED THROUGH | pending |
| 7.17 | `POST /rest/v1/rpc/api_update_card_body` with an empty body | 200, an empty body is valid | NOT WALKED THROUGH | pending |
| 7.18 | `POST /rest/v1/rpc/api_delete_folder` with the root folder id | 403 with the code `ROOT_DELETE_FORBIDDEN` | NOT WALKED THROUGH | pending |
| 7.19 | `POST /rest/v1/rpc/api_delete_card` with an unknown id | 404 with the code `NOT_FOUND` | NOT WALKED THROUGH | pending |
| 7.20 | `POST /rest/v1/folders` with the publishable key | 403. The `anon` role has no direct write on the tables | NOT WALKED THROUGH | pending |
| 7.21 | `POST /rest/v1/cards` with the publishable key | 403. The `anon` role has no direct write on the tables | NOT WALKED THROUGH | pending |
| 7.22 | `GET /rest/v1/folders` with the publishable key | 403. The tables cannot be read directly either | NOT WALKED THROUGH | pending |
| 7.23 | `GET /rest/v1/cards` with the publishable key | 403 | NOT WALKED THROUGH | pending |
| 7.24 | `PATCH /rest/v1/cards` with the publishable key | 403. The mastery and the favorite may only be written through the functions | NOT WALKED THROUGH | pending |
| 7.25 | Call each of the fourteen functions of the API once | Every one of them answers 200, and none of them answers 401 or 403 | NOT WALKED THROUGH | pending |
| 7.26 | Call a name that is not a function, for example `/rest/v1/rpc/api_drop_everything` | 404. There is no other way into the data | NOT WALKED THROUGH | pending |
| 7.27 | Look at the grants in the database | The `anon` role may call the fourteen endpoints and the three helpers, and nothing else. `api_fail` is revoked | NOT WALKED THROUGH | pending |
| 7.28 | Look at the policies of the two tables | Row level security is on and there is no policy left for `anon`, so no row is reachable directly | NOT WALKED THROUGH | pending |

The fourteen endpoints are `api_get_root`, `api_list_level`, `api_get_card`,
`api_list_tree`, `api_delete_impact`, `api_create_folder`, `api_rename_folder`,
`api_delete_folder`, `api_create_card`, `api_rename_card`,
`api_update_card_body`, `api_set_mastery`, `api_set_favorite` and
`api_delete_card`.

The script that runs these checks writes into the tree and cleans up after
itself, so it is kept outside the repository.

## 8. API contract checks

Three parts have to agree on the same contract: the table of
`source/API.md`, the functions of `source/database/api.sql`, the grants of
`source/server/policies.sql` and the calls of `source/client/src/api.js`.
Every endpoint is looked at in the four places.

| # | Check | Expected result | Actual result | Verdict |
|---|---|---|---|---|
| 8.1 | The endpoints of the table of `source/API.md` against the functions of `api.sql` | Every endpoint of the document is a function of the SQL, with the same name and the same parameters, and every function of the SQL is in the document | NOT WALKED THROUGH | pending |
| 8.2 | The endpoints of the table of `source/API.md` against the grants of `policies.sql` | Every endpoint of the document is granted to `anon`, and nothing is granted that is not an endpoint | NOT WALKED THROUGH | pending |
| 8.3 | The endpoints of the table of `source/API.md` against the calls of `source/client/src/api.js` | Every call of the client names an endpoint of the document, and every endpoint of the document is called by the client | NOT WALKED THROUGH | pending |
| 8.4 | The parameters of the endpoints | The name of the parameter of the SQL, of the grant and of the client are the same, for example `p_folder` for the folder of `api_list_level` | NOT WALKED THROUGH | pending |
| 8.5 | The answers of the endpoints | The document states the fields of the answer, and the client reads exactly those fields | NOT WALKED THROUGH | pending |
| 8.6 | The codes of the errors | The document lists the codes of the errors, and the client turns each of them into a sentence for the user | NOT WALKED THROUGH | pending |
| 8.7 | The endpoints that write | Every endpoint that writes a row also moves the `updated_at` of that row | NOT WALKED THROUGH | pending |
| 8.8 | The new endpoint of the favorites | `api_set_favorite` is in the document, in the SQL, in the grants and in the client, and it takes a boolean | NOT WALKED THROUGH | pending |

## 9. The checks of the client

They run without a browser and without a network:

```bash
cd source && npm test
```

The runner is `source/tests/run.mjs`. It bundles the application with esbuild
and replaces the icon package, the Astryx components, the animation package
and the Supabase client with the stubs in `source/tests/stubs`, so that the
run is fast and the calls that the client would send can be read afterwards.

**Result of the run on 22 November 2026: 48 checks, 48 passed, 0 failed.**

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
| V.3 | A title is trimmed, cannot be empty and is at most 120 characters, and the reason says which of the two it is | PASS |
| V.4 | A body may be empty and is at most 4000 characters | PASS |
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
| U.4 | The completion rate counts the marked cards over the cards of the level | PASS |
| U.5 | A level without cards has no rate and no division by zero | PASS |
| U.6 | The list of the cards that are not mastered leaves the unmarked cards out | PASS |
| U.7 | A new card starts with the title `New page`, an empty body and no mark | PASS |
| U.8 | A row of a level is either a folder or a card | PASS |
| U.9 | The card menu has Rename and Delete and no Move | PASS |
| D.1 | A level without a marked card has an empty dial and no share | PASS |
| D.2 | A level where every card is mastered fills the ring | PASS |
| D.3 | A level where no card is mastered is not an empty dial | PASS |
| D.4 | Half of the cards mastered gives half of the ring | PASS |
| D.5 | The share counts the marked cards only, and it is rounded | PASS |
| G.1 | The index of a card is wrapped in both directions | PASS |
| G.2 | The distance to a card is taken the short way round | PASS |
| G.3 | The two zoom states have a name and a number | PASS |
| G.4 | The card in focus stands in the middle of the arc in both zoom states | PASS |
| G.5 | In the overview a card that is far away is smaller and fainter | PASS |
| G.6 | In the focused state the cards behind peek out to the upper left | PASS |
| G.7 | The distance to a card is the same in both zoom states | PASS |

The checks of the client are a floor and not a ceiling. They cover the pure
functions of the rules, and they cannot see the screen, so the walkthrough of
section 3 and the visual pass of section 10 are still needed.

## 10. Visual checks

The previous plan ended with the note that the screen had never been looked
at. That is not good enough for a report that claims a design, so this round
looks at the screen, and the result of every line is written down.

| # | View | What is looked at | Actual result | Verdict |
|---|---|---|---|---|
| 10.1 | The ordinary view at 1440 px | The three columns stand side by side, the card in the middle is the largest thing on the screen, and the dock floats at the bottom | NOT WALKED THROUGH | pending |
| 10.2 | The ordinary view at 360 px | The columns stack, nothing overlaps, and the dock does not cover the card | NOT WALKED THROUGH | pending |
| 10.3 | The zen mode | The screen holds the arc and the card alone, the three small buttons sit in the top right corner, and nothing else is in the way | NOT WALKED THROUGH | pending |
| 10.4 | The zen mode in the overview | The cards stand on the arc, the sides turn away and fade, and the card in the middle stays readable | NOT WALKED THROUGH | pending |
| 10.5 | The back of a card | The body is readable, and a card without a body says `This card has no content yet.` | NOT WALKED THROUGH | pending |
| 10.6 | The mastery dial | The green arc and the red arc are two solid arcs, the head of the comet is on the track, and the two numbers stand under the ring | NOT WALKED THROUGH | pending |
| 10.7 | The dial of a level where nothing is marked | The whole ring is a neutral grey, there is no comet and no red arc | NOT WALKED THROUGH | pending |
| 10.8 | The search layer | The layer sits in the middle of the screen, the groups and the paths read well, and the background is dimmed | NOT WALKED THROUGH | pending |
| 10.9 | The Dark theme | The text, the surfaces, the ring and the icons of all three views follow the theme, and the search layer follows it too | NOT WALKED THROUGH | pending |
| 10.10 | The White theme | The same, and the contrast of the text is enough to read the body of a card | NOT WALKED THROUGH | pending |
| 10.11 | The confirmation of a delete | The sentence with the two numbers is readable, and the button that cancels is next to the one that accepts | NOT WALKED THROUGH | pending |
| 10.12 | The whole screen | No console error, no missing icon, no text that runs out of its box | NOT WALKED THROUGH | pending |

A picture of each view is taken and kept with the report, so that the design
can be judged and not only described.

## 11. Known limitations

These are part of the design of the product and not bugs. The report lists
them as well.

- There is no login. The deployment serves one shared tree, and anybody who
  knows the address can change it. The rules of the database still hold for
  every client, because the access rules let the `anon` role call the
  fourteen functions of the API and nothing else.
- The favorites are a read only placeholder in this round. The star of the
  dock writes the flag of a card and the rail shows the number, but the
  button of the rail does not filter the level yet. The meaning of a filter
  has to be designed first: does it hide the other cards of the level, or
  does it open a level of its own?
- There is no interval repetition and no history. The state of a card is the
  three states and nothing else.
- The zen mode is a full screen of the same gallery as the ordinary view, so
  the arc cannot be walked on a phone without a track pad. The pinch and the
  drag are the way to move in it.
- The names and the bodies are stored as plain text. There is no rich text
  and no picture in a card.
