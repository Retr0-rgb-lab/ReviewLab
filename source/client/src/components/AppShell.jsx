//The design of overall frame of fileView page

import DotGrid from './react-bits/DotGrid.jsx'


export function backgroundProps() {
    return {
        baseColor: "#c4c4c4",
        activeColor: "#5c5c5c"
    };
}

export default function AppShell({ sidebar, children }) {
    const colors = backgroundProps()
    return (
        <div className="app-shell">
            <DotGrid className="app-shell__background" {...colors} />
            <div className="app-shell__content">
                {sidebar}
                <div className="app-shell__main">{children}</div>
            </div>
        </div>
    )
}
