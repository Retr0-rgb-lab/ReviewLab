# AI use

Coding route: **vibe coding**. AI tools generated parts of the code that is
submitted. Every file that an AI tool wrote or changed is listed here, with the
tool, the file and the purpose. The rows are in the order the work happened.

The rows of Grok describe the first part of the project. Where a later change
made a row untrue, the row says so. The rows of MiniMax Code describe the
change of 20 November 2026, when the API layer was written and the empty
components were filled in.

## Grok

| Tool | File | Purpose |
|---|---|---|
| Grok | `source/client/src/views/fileActions.js` | Exercise scaffold for create and rename, and later for delete and for the card body. The five function bodies were written by the student first. On 20 November 2026 MiniMax Code rewrote them so that they call the API instead of the tables. |
| Grok | `source/client/src/views/FileView.jsx` | Form that calls those functions. The read functions were written by the student. Later, Grok laid out the file view with DotGrid behind the page and BranchedMenu on the left. On 20 November 2026 MiniMax Code rewrote the file on top of the API. |
| Grok | `source/client/src/index.css` | Layout for the file view: background, sidebar, and spaced controls. |
| Grok | `source/client/src/components/AppShell.jsx` | Exercise scaffold for the page shell. The function body was written by the student. On 20 November 2026 MiniMax Code implemented `shellOverlay`, which hosts the search layer. |
| Grok | `source/client/src/components/Sidebar.jsx` | Exercise scaffold for the collapsible sidebar. The function bodies were written by the student. On 20 November 2026 MiniMax Code put the create-card button in the sidebar and the theme and search buttons in its footer. |
| Grok | `source/client/src/components/FileToolbar.jsx` | Exercise scaffold for the file-view toolbar. The four function bodies were written by the student. The file was removed on 20 November 2026, because the file view took over the level heading and the create controls, and nothing imported it any more. |
| Grok | `source/client/src/components/FolderTile.jsx` | Wrote the folder tile's double-click rename and focus handling, then connected the React Bits Folder graphic. The student asked for this code. On 20 November 2026 MiniMax Code added the delete button. |
| Grok | `source/client/src/components/react-bits/Folder.jsx` | Copied the Folder component from React Bits. Author David Haz. License MIT + Commons Clause. |
| Grok | `source/client/src/components/react-bits/Folder.css` | Styles copied with the Folder component. Author David Haz. License MIT + Commons Clause. |
| Grok | `source/client/src/components/react-bits/BranchedMenu.jsx` | Removed a sample data block that had been pasted over the component. Author David Haz. License MIT + Commons Clause. |
| Grok | `source/client/src/components/react-bits/SpotlightCard.jsx` | Copied Spotlight Card from React Bits. Author David Haz. License MIT + Commons Clause. |
| Grok | `source/client/src/components/react-bits/SpotlightCard.css` | Styles copied with Spotlight Card. Author David Haz. License MIT + Commons Clause. |
| Grok | `source/client/src/components/CardTile.jsx` | Wrote the card tile on Spotlight Card, including double-click title editing. The student asked for this code. On 20 November 2026 MiniMax Code hosted the card menu in it and added the delete action. |
| Grok | `source/client/src/components/react-bits/DotGrid.jsx` | Added the source and license comment. The component was copied by the student. Author David Haz. License MIT + Commons Clause. The file was removed on 20 November 2026; the file view uses ShapeGrid instead. |
| Grok | `source/client/src/components/react-bits/DotGrid.css` | Added the source and license comment. The styles were copied by the student. Author David Haz. License MIT + Commons Clause. The file was removed on 20 November 2026 with the component. |
| Grok | `source/client/src/components/react-bits/ShapeGrid.jsx` | Added the source and license comment. The component was copied by the student. Author David Haz. License MIT + Commons Clause. |
| Grok | `source/client/src/components/LevelMenu.jsx` | Exercise scaffold for the card right-click level menu. Function bodies were left for the student. The file was removed before the first commit; the card menu lives in `CardMenu.jsx`. |
| Grok | `source/client/src/components/CreateControls.jsx` | Exercise scaffold for the sidebar create-card button and the create-folder button. Function bodies were left for the student. On 20 November 2026 MiniMax Code implemented both. |
| Grok | `source/client/src/components/ItemGrid.jsx` | Exercise scaffold for the mixed folder and card grid. The function body was left for the student. On 20 November 2026 MiniMax Code translated the comments into English. |
| Grok | `source/client/src/components/CardMenu.jsx` | Exercise scaffold for the card corner menu. Function bodies were left for the student. On 20 November 2026 MiniMax Code implemented it. |
| Grok | `source/client/src/components/SearchPalette.jsx` | Exercise scaffold for the search layer. The function body was left for the student. On 20 November 2026 MiniMax Code implemented it in plain HTML and CSS, because the package the comment named is not a dependency of the project. |
| Grok | `source/client/src/views/searchActions.js` | Exercise scaffold for search matching, grouping, and opening. Function bodies were left for the student. On 20 November 2026 MiniMax Code implemented all eight of them. |
| Grok | `source/client/src/views/FocusView.jsx` | Exercise scaffold for the Focus title and body layout. Function bodies were left for the student. On 20 November 2026 MiniMax Code implemented it. |
| Grok | `source/client/src/views/fileActions.js` | Added empty scaffolds for delete confirmation and updating a card body. Existing create and rename bodies were not changed. |
| Grok | `source/client/src/components/Sidebar.jsx` | Added an empty `persistentSidebarClass` scaffold. The existing sidebar body was not changed. The property is gone in the rewritten sidebar. |
| Grok | `source/client/src/components/FileToolbar.jsx` | Added an empty `levelTitleStyle` scaffold. The existing toolbar body was not changed. The file was removed on 20 November 2026. |
| Grok | `source/client/src/components/CardTile.jsx` | Added empty scaffolds for the title text and title editing. The existing tile body was not changed. |
| Grok | `source/client/src/components/AppShell.jsx` | Added an empty `shellOverlay` scaffold. The existing shell body was not changed. |
| Grok | `source/client/src/components/FileToolbar.jsx` | Added empty scaffolds for renaming the current level from its heading. Revised where the heading stays. The existing toolbar body was not changed. The file was removed on 20 November 2026; the level rename lives in `FileView.jsx` now. |
| Grok | `source/client/src/components/CreateControls.jsx` | Revised the scaffolds so create card and create folder each have one entrance. Function bodies were still empty. |
| Grok | `source/client/src/components/FolderTile.jsx` | Revised the folder rename scaffold so only a double-click starts editing. The function body was still empty. |
| Grok | `source/client/src/components/LevelMenu.jsx` | Removed the right-click level menu scaffold. Those actions are not a card context menu. |
| Grok | `source/client/src/views/FileView.jsx` | Revised the next-step comment. The existing file view behavior was not changed. |
| Grok | `source/client/src/components/AppShell.jsx` | Noted that the current-level heading stays out of the shell. The existing shell body was not changed. |
| Grok | `source/client/src/components/FileToolbar.jsx` | Wired the current-level heading edit: editing state, title draft, double-click check, input focus, and cancel. The file was removed on 20 November 2026; the same behaviour lives in `FileView.jsx`. |
| Grok | `source/client/src/views/FileView.jsx` | `onRenameLevel` accepted the heading text and used `commitLevelTitle` before `renameFolder`. The rewritten file view does the same in `commitLevelTitle`. |
| Grok | `source/client/src/index.css` | Sans-serif size for the current-level heading only. |
| Grok | `source/client/src/views/FileView.jsx` | `onRenameLevel` awaited `commitLevelTitle` and used its folder result. |
| Grok | `source/client/src/components/FileToolbar.jsx` | Removed the duplicate heading style object. The font stays in `index.css`. The file was removed on 20 November 2026. |
| Grok | `docs/specs/2026-11-21-reviewlab-file-overview-spec.md` | 2026-11-22. Added section 19, the file-view problem list from a Chrome DevTools pass. A later note records which of those items were fixed. |
| Grok | `source/client/src/components/ArcGallery.jsx` | 2026-11-22. Enter flips the focused card, a flick follows the pointer, and `flipRequest` flips the active card. |
| Grok | `source/client/src/components/ArcGallery.css` | 2026-11-22. The card face uses border-box so the question is not clipped. Mastery buttons sit on the card, outside the flip control. |
| Grok | `source/client/src/views/FileView.css` | 2026-11-22. Narrow layout: two-row top bar, shorter wheel, rail beside the card, room under the fixed dock, card aligned to the top of its cell. |
| Grok | `source/client/src/views/FileView.jsx` | 2026-11-22. Stale level no longer rewrites the address. Zen opens on the current card. Wheel re-click flips. Window scroll hides the dock. A new card opens in the edit panel. |
| Grok | `source/client/src/views/ZenView.jsx` | 2026-11-22. Reads the card id handed over in history state, without putting it in the address. |
| Grok | `source/client/src/components/CardWheel.jsx` | 2026-11-22. Clicking the already selected card calls `onActiveClick`. |
| Grok | `source/client/src/views/fileActions.js` | 2026-11-22. Delete confirmation states both the folder count and the card count. |
| Grok | `source/tests/cases.mjs` | 2026-11-22. U.2 expects both counts, including zero folders. |

## MiniMax Code, 20 November 2026

The API layer and the components that were still empty.

| Tool | File | Purpose |
|---|---|---|
| MiniMax Code | `source/API.md` | The API contract: the thirteen endpoints with their arguments, their answers and their status codes, the error codes, the rules the database enforces and the access model. The endpoint table is the same table the report uses. |
| MiniMax Code | `source/TEST-PLAN.md` | The test plan: the manual test table for the path a new user takes, the rule tests, the responsive checks, the persistence and deployment checks and the checks of the access rules. |
| MiniMax Code | `source/client/src/api.js` | The wrapper around `supabase.rpc`. It turns the answer of the API into `{ data }` or `{ error }`, and it turns a missing function into the instruction to run `api.sql`. |
| MiniMax Code | `source/client/src/pendingCommit.js` | The registry that lets the application save the change that is being edited before the search layer opens. |
| MiniMax Code | `source/client/src/App.jsx` | The application root: the router with the routes `/`, `/folder/:folderId`, `/focus/:folderId/:itemId` and `/stats/:folderId`, the global theme, the search layer and the delete confirmation. |
| MiniMax Code | `source/client/src/views/FileView.jsx` | Rewritten on top of the API. It loads a level, creates, renames and deletes, shows the unsaved folder row and keeps `orderLevel` for the grid. |
| MiniMax Code | `source/client/src/views/FocusView.jsx` | Implemented from the stub: the two halves of a card, the flip, the keys, the drag, the edit of the title and the body, the mastery buttons and the two counters. |
| MiniMax Code | `source/client/src/views/StatsView.jsx` | Implemented from an empty file: the completion rate with its numerator and denominator, the list of the cards that are not mastered and the empty level. |
| MiniMax Code | `source/client/src/views/levelActions.js` | The read side of the API: the root folder, one level, one card, the whole tree and the counts of a delete. |
| MiniMax Code | `source/client/src/views/searchActions.js` | The eight search rules: the shortcut, the query, the matching, the grouping by day, the path of a result, the movement of the selection and what to open. |
| MiniMax Code | `source/client/src/views/fileActions.js` | The write side of the API: create, rename, delete, the card body and the mastery, plus the sentence of the delete confirmation. The Chinese scaffold comments were replaced by English ones. |
| MiniMax Code | `source/client/src/views.css` | The new styles: the level heading, the tile actions, the sidebar buttons, the delete confirmation and the narrow screen rules. |
| MiniMax Code | `source/client/src/views/FocusView.css` | The styles of the Focus view. |
| MiniMax Code | `source/client/src/views/StatsView.css` | The styles of the statistics view. |
| MiniMax Code | `source/client/src/components/SearchPalette.jsx` | The search layer in plain HTML and CSS: the groups by day, the selected row, the path of each row and the empty answer. |
| MiniMax Code | `source/client/src/components/SearchPalette.css` | The styles of the search layer. |
| MiniMax Code | `source/client/src/components/CardMenu.jsx` | The corner menu of a card with the entries Rename and Delete. Delete only opens the confirmation. |
| MiniMax Code | `source/client/src/components/CardMenu.css` | The styles of the corner menu. |
| MiniMax Code | `source/client/src/components/CardTile.jsx` | The card tile hosts the corner menu, the click on the menu does not open the card, and the title edit registers itself for the search shortcut. |
| MiniMax Code | `source/client/src/components/FolderTile.jsx` | The delete button of a folder, which is hidden while the name is edited, and the registration of the rename for the search shortcut. |
| MiniMax Code | `source/client/src/components/AppShell.jsx` | `shellOverlay` renders the search layer over the whole shell, so the view underneath stays as it is. |
| MiniMax Code | `source/client/src/components/CreateControls.jsx` | The create-card button of the sidebar and the create-folder button of the file view. |
| MiniMax Code | `source/client/src/components/Sidebar.jsx` | The create-card button as the first child of the sidebar, the theme toggle and the search button in the footer. The props of the branch menu were not changed. |
| MiniMax Code | `source/client/src/components/ItemGrid.jsx` | The Chinese scaffold comments were translated into English. The rendering was not changed. |
| MiniMax Code | `source/client/src/components/CardTile.css` | The Chinese scaffold comments were translated into English. The rules were not changed. |
| MiniMax Code | `source/client/src/main.jsx` | The entry point renders `App.jsx` instead of the file view alone. |
| MiniMax Code | `source/client/src/index.css` | The import of `views.css` and the removal of the rule of the deleted `FileToolbar`. |
| MiniMax Code | `source/database/api.sql` | The API layer: seventeen Postgres functions, thirteen of them the endpoints of `source/API.md`, with the validation, the error codes and the recursive count of a delete. |
| MiniMax Code | `source/database/schema.sql` | The column `ord` and the sequence `reviewlab_ord_seq` that carry the insertion order, and the ordering indexes that use them. |
| MiniMax Code | `source/server/policies.sql` | The access rules: the two blanket policies for the `anon` role were removed, the role has no grants on the tables, and it may only execute the API functions. On 20 November 2026 the file was changed again, after the live test found that a policy named `folders_anon_all` had survived: the policies are now looked up and every one of them on the two tables is dropped. |
| MiniMax Code | `source/tests/run.mjs` | The runner of the checks of the functions. It bundles the application with esbuild and replaces the icon package, the Astryx components and the Supabase client with stubs. |
| MiniMax Code | `source/tests/cases.mjs` | The 36 checks of the pure functions: the rules of the search, the validation of the names, the titles and the bodies, the counters of the statistics, the sentence of the delete confirmation and the calls that the client sends to the API. |
| MiniMax Code | `source/tests/stubs/supabase.js` | The stand-in for the Supabase client. It records the calls, so a test can check the name of the function and the arguments that the client sends. |
| MiniMax Code | `source/tests/stubs/hugeicons.js` | The stand-in for the icon package. |
| MiniMax Code | `source/tests/stubs/astryx.js` | The stand-in for the Astryx components. |
| MiniMax Code | `source/client/src/components/CardMenu.jsx` | The corner menu of a card is built on the DropdownMenu of the Astryx design system. The two entries and what they do are written here. The search layer is not built on the design system, because the product specification asks for the search to be written by hand. |
| MiniMax Code | `source/client/src/main.jsx` | The entry point renders `App.jsx` instead of the file view alone, and it loads the stylesheets of the design system. |
| MiniMax Code | `source/client/src/index.css` | The import of `views.css` and the removal of the rule of the deleted `FileToolbar`. |
| MiniMax Code | `source/client/index.html` | The tag that tells a phone how wide the page is, and the icon of the page, so that the browser does not ask for a file that is not there. |
| MiniMax Code | `.gitignore` | `dist` was added, so the build output stays out of the repository. The `docs` rule was changed earlier, so that the product spec is published and the course requirements are not. |

## MiniMax Code, 21 November 2026

The visual pass of the file view and one design mockup.

| Tool | File | Purpose |
|---|---|---|
| MiniMax Code | `docs/articrafts/before-fileview-1440.png`, `docs/articrafts/before-fileview-360.png` | Two screenshots of the running application, taken during the visual pass of 21 November 2026 that the earlier section had left out. They show the file view at a desktop width and at 360px. |
| MiniMax Code | `docs/articrafts/reviewlab-normal-view-mockup.jpg` | A design mockup of the proposed file view. It was generated with the image-generation tool from the hand-drawn sketch of the student, so that the layout could be discussed as a picture. It is a design artefact, not application code, and it is not part of the submitted application. |
| MiniMax Code | `docs/specs/2026-11-21-reviewlab-file-overview-spec.md` | The specification of the new file overview interface: the layout of the ordinary view, the zen mode, the statistics view, the shared card gallery, the card flip, the mastery dial and its geometry, the dock, the data change and the routes. It records the decisions that were taken while the student and the assistant discussed the design. |
| MiniMax Code | `docs/specs/2026-11-12-reviewlab-requirements.md` | The sections on the components and on the assessment table were rewritten on 21 November 2026, because the course now accepts AI generated code and no longer requires a part of the application to be written by hand. The other sections were not changed. |
| MiniMax Code | `source/client/src/components/CardMenu.jsx` | The comment that explained why the search layer is not built on the design system. It named the rule that was removed from the specification, so it was rewritten to give the technical reason instead. The code of the component was not changed. |
| MiniMax Code | `source/database/schema.sql` | The column `favorite` on the cards table, so a card can be marked as a favourite apart from its mastery. |
| MiniMax Code | `source/database/api.sql` | The field `favorite` in the answer of every function that returns cards, and the new function `api_set_favorite`, which is written like `api_set_mastery`. |
| MiniMax Code | `source/database/migrations/20261122_add_favorite.sql` | A migration that adds the column, replaces the card functions and grants the new function. It can be run more than once. It was applied to the live project on 22 November 2026. |
| MiniMax Code | `source/server/policies.sql` | The grant of `api_set_favorite` to the anon role, in the same block as the grants of the other functions. |
| MiniMax Code | `source/client/src/api.js` | The wrapper `apiSetFavorite` around the new database function. |
| MiniMax Code | `source/client/src/views/fileActions.js` | The write `setFavorite`, next to `setMastery`, with the same shape and the same error handling. |
| MiniMax Code | `source/API.md` | The endpoint `api_set_favorite` in the endpoint table, its description, and the note that the answer of a card carries the field `favorite`. |
| MiniMax Code | `source/tests/cases.mjs` | The import of the renamed view file. The view Focus is now called the zen mode, so the path changed. |

## How the code was verified

The specification and the assessment guide ask how the AI written code was
checked. These are the checks that were run.

- The build: `cd source && npx vite build` succeeds with no error.
- The contract: a script compares the thirteen endpoints of `source/API.md` with
  the functions in `source/database/api.sql`, with the grants in
  `source/server/policies.sql` and with every call in the client. The names and
  the arguments match on all four sides.
- The SQL: the three SQL files are parsed with a PostgreSQL parser, and they
  were applied to the live Supabase project with the Supabase CLI on
  20 November 2026. All three files were accepted by the database.
- The API against the live database: 21 checks of the access rules of
  `source/TEST-PLAN.md` section 7, run with the publishable key the way the
  browser does. 21 passed, 0 failed. They cover the status codes, the error
  codes, the limits of the names and of the bodies, the count of a delete and
  the refusal of a direct write to the tables.
- The functions of the client: `cd source && npm test` runs 36 checks of the
  pure functions, with the Supabase client replaced by a stub that records the
  calls. 36 passed, 0 failed. They cover the rules of the search, the
  validation, the counters of the statistics, the sentence of the delete
  confirmation and the arguments that the client sends to the API.
- The application in a browser: on 21 November 2026 the built application was
  served and the path of the test plan was walked through against the live
  database, at the level of the document and of the state of the controls. The
  network log shows that every request went to `/rest/v1/rpc/...` and that
  none went to the tables. The only error in the console was a missing
  `favicon.ico`, and the icon is now drawn in the page itself.
- The picture was not looked at. The visual pass was left out on purpose, so
  the look of the interface has not been checked yet.

## Third-party code

| Asset | Where | Author | Licence |
|---|---|---|---|
| React Bits: Folder | `source/client/src/components/react-bits/Folder.jsx`, `Folder.css` | David Haz | MIT + Commons Clause. The component may be used in this application, it may not be sold or redistributed on its own. |
| React Bits: Spotlight Card | `source/client/src/components/react-bits/SpotlightCard.jsx`, `SpotlightCard.css` | David Haz | MIT + Commons Clause, same terms. |
| React Bits: Branched Menu | `source/client/src/components/react-bits/BranchedMenu.jsx` | David Haz | MIT + Commons Clause, same terms. |
| React Bits: Shape Grid | `source/client/src/components/react-bits/ShapeGrid.jsx`, `ShapeGrid.css` | David Haz | MIT + Commons Clause, same terms. |
| Hugeicons | `node_modules/@hugeicons/react`, `@hugeicons/core-free-icons` | Hugeicons | MIT. The free package only, the Pro styles are not used. |
| Astryx | `node_modules/@astryxdesign/core`, `@astryxdesign/theme-neutral` | Meta | MIT. The DropdownMenu of the card corner menu and the theme that goes with it. The search layer is not built on it, because its groups by day, its path line and its own keyboard handling are specific to this application. |
| StyleX | `node_modules/@stylexjs/stylex` | Meta | MIT. The compiler that the Astryx components are built with. |
| React, React DOM, React Router | `node_modules` | Meta, Remix Software | MIT |
| Supabase JavaScript client | `node_modules/@supabase/supabase-js` | Supabase | MIT |
