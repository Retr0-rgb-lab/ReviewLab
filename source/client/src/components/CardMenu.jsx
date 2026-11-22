// Card menu: a small triangle in the top right corner of a card tile.
//
// The menu itself is the DropdownMenu of the Astryx design system. It brings
// the open and the close behaviour, the keyboard navigation and the focus of
// the menu, so the card tile only has to say what the two entries do.
//
// The search layer is not built on the design system. Its groups by day, its
// path line and its own keyboard handling are specific to this application,
// and a generic palette component does not provide them.

import { useMemo } from 'react'
import { DropdownMenu } from '@astryxdesign/core/DropdownMenu'
import './CardMenu.css'

// The two entries of the card menu. There is no Move entry, a card cannot change folder.
export function cardMenuActions() {
    return [
        { id: 'rename', label: 'Rename', action: 'rename' },
        { id: 'delete', label: 'Delete', action: 'delete' },
    ]
}

export default function CardMenu({ open, onRename, onDelete, onClose }) {
    const items = useMemo(() => cardMenuActions().map((action) => ({
        id: action.id,
        label: action.label,
        variant: action.action === 'delete' ? 'destructive' : 'default',
        onClick: () => {
            if (action.action === 'rename') {
                onRename?.()
                return
            }
            // Delete only opens the confirmation, the card is removed after it is accepted.
            onDelete?.()
        },
    })), [onRename, onDelete])

    return (
        <DropdownMenu
            isMenuOpen={open}
            onOpenChange={(isOpen) => {
                if (!isOpen) {
                    onClose?.()
                }
            }}
            renderTrigger={(trigger) => (
                <button
                    type="button"
                    className="card-menu__trigger"
                    aria-label="Card actions"
                    {...trigger}
                >
                    <span className="card-menu__triangle" aria-hidden="true" />
                </button>
            )}
            items={items}
            menuWidth={168}
        />
    )
}
