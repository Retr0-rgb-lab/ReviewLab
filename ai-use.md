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
| MiniMax Code | `source/server/policies.sql` | The access rules: the two blanket policies for the `anon` role were removed, the role has no grants on the tables, and it may only execute the API functions. |
| MiniMax Code | `.gitignore` | `dist` was added, so the build output stays out of the repository. The `docs` rule was changed earlier, so that the product spec is published and the course requirements are not. |

## How the code was verified

The specification and the assessment guide ask how the AI written code was
checked. These are the checks that were run.

- The build: `cd source && npx vite build` succeeds with no error.
- The contract: a script compares the thirteen endpoints of `source/API.md` with
  the functions in `source/database/api.sql`, with the grants in
  `source/server/policies.sql` and with every call in the client. The names and
  the arguments match on all four sides.
- The SQL: the three SQL files are parsed with a PostgreSQL parser, so the
  statements are checked. The functions themselves were **not** run against a
  live database, because no local PostgreSQL server was available. They have to
  be applied to the Supabase project and checked there before the demo.
- The rules of the client: the pure functions of the search layer, the file
  actions and the Focus view were run through assertion scripts outside the
  repository, over the boundaries of the specification: an empty name, a name of
  121 characters, a body of 4001 characters, a body of exactly 4000
  characters, the three mastery values, the order of the search results and
  the rate of a level with no cards.
- The behaviour in the browser was **not** tested. The demo recording is where
  the paths of the test plan are walked through.

## Third-party code

| Asset | Where | Author | Licence |
|---|---|---|---|
| React Bits: Folder | `source/client/src/components/react-bits/Folder.jsx`, `Folder.css` | David Haz | MIT + Commons Clause. The component may be used in this application, it may not be sold or redistributed on its own. |
| React Bits: Spotlight Card | `source/client/src/components/react-bits/SpotlightCard.jsx`, `SpotlightCard.css` | David Haz | MIT + Commons Clause, same terms. |
| React Bits: Branched Menu | `source/client/src/components/react-bits/BranchedMenu.jsx` | David Haz | MIT + Commons Clause, same terms. |
| React Bits: Shape Grid | `source/client/src/components/react-bits/ShapeGrid.jsx`, `ShapeGrid.css` | David Haz | MIT + Commons Clause, same terms. |
| Hugeicons | `node_modules/@hugeicons/react`, `@hugeicons/core-free-icons` | Hugeicons | MIT. The free package only, the Pro styles are not used. |
| React, React DOM, React Router | `node_modules` | Meta, Remix Software | MIT |
| Supabase JavaScript client | `node_modules/@supabase/supabase-js` | Supabase | MIT |
