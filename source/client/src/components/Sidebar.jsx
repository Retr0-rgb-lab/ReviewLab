//The design of sidebar which contains the "BranchMenu" component

import BranchedMenu from './react-bits/BranchedMenu.jsx'
import { SidebarCreateCardButton } from './CreateControls.jsx'


export default function Sidebar({
    items,
    onSelect,
    theme = 'White',
    onToggleTheme,
    onOpenSearch,
    onCreateCard,
    createCardDisabled = false,
}) {
    return (
        <aside className = "sidebar">
            <SidebarCreateCardButton
                disabled={createCardDisabled}
                onCreateCard={onCreateCard}
            />
            <BranchedMenu
                items = {items}
                defaultOpen={0}
                color = "#18181b"
                lineColor='#a1a1aa'
                accentColor = "#18181b"
                onSelect={onSelect}
            />
            <div className = "sidebar__footer">
                <button
                    type="button"
                    className="sidebar__footer-button"
                    onClick={onOpenSearch}
                >
                    Search
                </button>
                <button
                    type="button"
                    className="sidebar__footer-button"
                    onClick={onToggleTheme}
                >
                    {theme === 'Dark' ? 'Use White theme' : 'Use Dark theme'}
                </button>
            </div>
        </aside>
    );
}
