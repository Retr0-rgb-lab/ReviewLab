// The frame of the application.
//
// The background is a plain colour, so the shell only holds the content of
// the current view and the layers that cover it. Every view draws its own
// top bar, its own columns and its own theme switch.

export default function AppShell({ children, overlay }) {
    return (
        <div className="app-shell">
            <div className="app-shell__content">
                <div className="app-shell__main">{children}</div>
            </div>
            {overlay}
        </div>
    )
}

export function shellOverlay(search) {
    // The search layer covers the whole shell, the sidebar included, and not
    // only the header of one view. The view underneath keeps its own state, so
    // closing the search returns to the same view and the same item.
    // The palette draws its own screen and its own panel, so the host here
    // only gives it a place above the shell.
    // The current level title does not live in this frame. It belongs to the
    // file view.
    if (!search || !search.open) {
        return null
    }

    return (
        <div className="search-layer__host">
            {search.children}
        </div>
    )
}
