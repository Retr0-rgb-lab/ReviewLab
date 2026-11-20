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

| # | Action | Expected result | Result |
|---|---|---|---|
| 1.1 | Open the deployed address | The root level opens with the seeded folders and cards | |
| 1.2 | Click a folder | That folder's level opens and the address changes | |
| 1.3 | Enter Focus on a level | Focus shows one item of the level | |
| 1.4 | Press `Enter` on a card | The card flips between title and body | |
| 1.5 | Press `ArrowRight` then `ArrowLeft` | The next and the previous item of the level are shown, wrapping at both ends | |
| 1.6 | Press `Mastered` | The card becomes mastered and the left counter goes up by one | |
| 1.7 | Press `Mastered` again | Nothing changes. Neither counter moves | |
| 1.8 | Press `Not mastered` | The left counter goes down by one and the right counter goes up by one | |
| 1.9 | Edit the title of a card | The new title is saved after the input loses focus | |
| 1.10 | Edit the body of a card | The new body is saved after the input loses focus | |
| 1.11 | Create a folder, write a name, press `Enter` | The folder appears in the level and stays there after a reload | |
| 1.12 | Create a folder, then press `Esc` before writing a name | No folder is created | |
| 1.13 | Delete a folder and confirm | The folder and everything below it are gone, the counts were stated before the confirmation | |
| 1.14 | Delete a folder and cancel | Nothing is deleted | |
| 1.15 | Reload the page | The tree and the mastery states are the same as before | |
| 1.16 | Open the statistics view | The completion rate of the current level is shown with its numerator and denominator | |
| 1.17 | Click an unmastered card in the statistics view | Focus opens on that card | |
| 1.18 | Press `Ctrl+K` | The search layer opens in the middle of the screen | |
| 1.19 | Type a word and press `Enter` | The matching item opens, a card opens in Focus | |
| 1.20 | Press `Esc` in the search layer | The search closes and the view underneath is unchanged | |

## 4. Rule tests

| # | Action | Expected result | Result |
|---|---|---|---|
| 4.1 | Create a folder with a name that is only spaces | Not created, and the message says the name is empty | |
| 4.2 | Create a folder with a name of 121 characters | Not created, and the message says the limit is 120 characters | |
| 4.3 | Create a folder with a name of 120 characters | Created | |
| 4.4 | Set a card body of 4001 characters | Not saved, and the message says the limit is 4000 characters | |
| 4.5 | Set a card body of 4000 characters | Saved | |
| 4.6 | Clear the body completely | Saved. An empty body is valid | |
| 4.7 | Write a name with 120 characters including multi-byte characters | Saved. The limit counts code points, not bytes | |
| 4.8 | Try to delete the root folder | Refused. The root folder has no delete affordance, and the API answers 403 | |
| 4.9 | Rename the root folder | Allowed | |
| 4.10 | Delete a folder that holds a subfolder and cards | The confirmation states the folder count and the card count, counting every level below | |
| 4.11 | Create two items with the same name in the same level | Both are kept. The same name is allowed in one level | |
| 4.12 | Press `ArrowLeft` on the first item of a level | The last item is shown | |
| 4.13 | Press `ArrowRight` on the last item of a level | The first item is shown | |
| 4.14 | Type in a title, then press `ArrowRight` | The item does not change. The key acts on the input only | |
| 4.15 | Type in a title, then press `Esc` | The editing ends and the item does not change | |
| 4.16 | Open a delete confirmation, then press `Ctrl+K` | The search does not open | |
| 4.17 | Open a delete confirmation, then press `Esc` | The confirmation is cancelled and nothing is deleted | |
| 4.18 | Type in a title, then press `Ctrl+K` with a valid title | The title is saved first, then the search opens | |
| 4.19 | Type in a title, then press `Ctrl+K` with an invalid title | The search does not open, and the reason is shown | |
| 4.20 | Drag a card and release it | The next item of the level is shown | |
| 4.21 | Press `Enter` on a folder in Focus | The folder opens in the file view | |
| 4.22 | Open the search and type a text that matches nothing | The message "No results" is shown | |
| 4.23 | Open the search with an empty query | Every folder and card is listed, grouped by Today, Yesterday, Earlier, with the root folder included | |
| 4.24 | Open the search and press `ArrowUp` on the first row | The selection stays on the first row | |

## 5. Responsive checks

The specification requires the whole path to work from 360 pixels to the
desktop width.

| # | Width | Check | Result |
|---|---|---|---|
| 5.1 | 360 px | The file view, Focus, the statistics view and the search layer are usable, no horizontal scrolling | |
| 5.2 | 360 px | The search layer can be opened with the search button, by touch | |
| 5.3 | 768 px | The layout is intact | |
| 5.4 | 1440 px | The layout uses the space without stretching the reading column | |

Screenshots of 360 px and of the desktop width go into the report as evidence.

## 6. Persistence and deployment checks

| # | Check | Expected result | Result |
|---|---|---|---|
| 6.1 | Reload the browser after a write | The write is still there | |
| 6.2 | Open the same address on another browser | The same tree is shown | |
| 6.3 | Open the deployed URL on Vercel | The application loads and talks to the live database | |
| 6.4 | Search the repository for the service role key or a password | Nothing is found. Only `.env.example` with empty values is committed | |
| 6.5 | Check that the zip contains no `.env` and no `node_modules` | Neither is present | |
| 6.6 | Check that the Supabase project is not paused | The project answers requests. The free plan pauses a project after seven days of low activity, so it needs a keep alive | |

## 7. Access rule checks

These test the API layer directly, with the publishable key, the way the browser
does.

| # | Request | Expected result | Result |
|---|---|---|---|
| 7.1 | `POST /rest/v1/rpc/api_list_level` with a valid folder id | 200 with the level | |
| 7.2 | `POST /rest/v1/rpc/api_list_level` with an unknown folder id | 404 with the code `NOT_FOUND` | |
| 7.3 | `POST /rest/v1/rpc/api_create_folder` with an empty name | 400 with the code `EMPTY_NAME` | |
| 7.4 | `POST /rest/v1/rpc/api_create_folder` with a 121 character name | 400 with the code `NAME_TOO_LONG` | |
| 7.5 | `POST /rest/v1/rpc/api_update_card_body` with a 4001 character body | 400 with the code `BODY_TOO_LONG` | |
| 7.6 | `POST /rest/v1/rpc/api_set_mastery` with `mastered` | 200, the card comes back with `mastery` set to `mastered` and a new `updated_at` | |
| 7.7 | `POST /rest/v1/rpc/api_set_mastery` with `unknown` | 400 with the code `INVALID_MASTERY` | |
| 7.8 | `POST /rest/v1/rpc/api_delete_folder` with the root folder id | 403 with the code `ROOT_DELETE_FORBIDDEN` | |
| 7.9 | `POST /rest/v1/rpc/api_delete_impact` for a folder with a subfolder | The counts include the folder itself and everything below it | |
| 7.10 | `POST /rest/v1/folders` with the publishable key | 403. The `anon` role has no direct table access | |
| 7.11 | `POST /rest/v1/cards` with the publishable key | 403. The `anon` role has no direct table access | |
| 7.12 | `POST /rest/v1/rpc/api_delete_card` with an unknown id | 404 with the code `NOT_FOUND` | |

## 8. Automated checks

| # | Check | Command | Result |
|---|---|---|---|
| 8.1 | The client builds | `cd source && npx vite build` | |
| 8.2 | No console error in the browser, in the file view, in Focus, in the statistics view and in the search layer | manual, during the demo recording | |
| 8.3 | No JavaScript error while the application runs | manual, during the demo recording | |

The specification and the assessment guide ask for a manual test table for a solo
project. The automated checks above are kept to the build. A test framework was
not added, because the course baseline does not ask for one and the time is
better spent on the features that are missing.

## 9. Known bugs and limitations

To be filled in after the test run. The following limitation is known already and
is part of the product design, not a bug:

- There is no login. The deployment address serves one shared tree and anybody
  who knows the address can change it. The rules in the database still hold for
  every client, because the access rules let the `anon` role call the API
  functions and nothing else. The report lists this as a known limitation.

## 10. Results

Filled in after the run and copied into the report under "Testing".
