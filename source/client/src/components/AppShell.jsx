//The design of overall frame of fileView page

import ShapeGrid from './react-bits/ShapeGrid.jsx'


export function backgroundProps() {
    return {
        baseColor: "#c4c4c4",
        activeColor: "#5c5c5c"
    };
}

export default function AppShell({ sidebar, children, overlay }) {
    const colors = backgroundProps()
    return (
        <div className="app-shell">
            <ShapeGrid
                shape="square"
                direction="none"
                lineColor="#dde2e7"
                hoverColor="#94a3b8"
                hoverFillColor="#94a3b8"
                fillOpacity={0.1}
                cellSize={31}
                speed={0}
                tiltX={58}
                tiltY={0}
                rainbow={false}
                lineWidth={0.75}
                radius={0.4}
                trail={0.55}
                glow={0.25}
                twinkle={0}
                fade={1}
                clickCascade={false}
                intro={false}
                className='app-shell__background'
            />
            <div className="app-shell__content">
                {sidebar}
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
