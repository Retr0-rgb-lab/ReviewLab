//The design of sidebar which contains the "BranchMenu" component

import { useState } from 'react'
import BranchedMenu from './react-bits/BranchedMenu.jsx'


export function nextCollapsed(collapsed) {
    return !collapsed;
}


export function sidebarClass(collapsed) {
    if (!collapsed){
        return "sidebar";
    } else {
        return "sidebar sidebar--collapsed";
    }
}

export default function Sidebar({ items, onSelect }) {
    const [collapsed, setCollapsed] = useState(false)

    return (
        <aside className={sidebarClass(collapsed)}>
            <button type="button" onClick={() => setCollapsed(nextCollapsed(collapsed))}>
                {collapsed ? 'Show sidebar' : 'Hide sidebar'}
            </button>
            <BranchedMenu
                items={items}
                defaultOpen={0}
                color="#18181b"
                lineColor="#a1a1aa"
                accentColor="#18181b"
                onSelect={onSelect}
            />
            <div className="sidebar__footer" />
        </aside>
    )
}
