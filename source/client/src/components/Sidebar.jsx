//The design of sidebar which contains the "BranchMenu" component

import BranchedMenu from './react-bits/BranchedMenu.jsx'


export function Sidebar({items, onSelect}) {
    return (
        <aside className = "sidebar">
            <BranchedMenu
                items = {items}
                defaultOpen={0}
                color = "#18181b"
                lineColor='#a1a1aa'
                accentColor = "#18181b"
                onSelect={onSelect}
            />
            <div className = "sidebar__footer"/>
        </aside>
    );
}
