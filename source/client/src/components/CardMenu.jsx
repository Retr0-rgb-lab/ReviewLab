// Card menu: a small triangle in the top right corner of a card tile.

import { useEffect, useRef, useState } from 'react'
import './CardMenu.css'

// The two entries of the card menu. There is no Move entry, a card cannot change folder.
export function cardMenuActions() {
    return [
        { id: 'rename', label: 'Rename', action: 'rename' },
        { id: 'delete', label: 'Delete', action: 'delete' },
    ]
}

export default function CardMenu({ open = false, onRename, onDelete, onClose }) {
    const [menuOpen, setMenuOpen] = useState(Boolean(open))
    const rootRef = useRef(null)

    // The parent may hold the menu open, the click on the triangle holds it itself.
    useEffect(() => {
        setMenuOpen(Boolean(open))
    }, [open])

    useEffect(() => {
        if (!menuOpen) {
            return undefined
        }
        function onPointerDown(event) {
            if (rootRef.current && rootRef.current.contains(event.target)) {
                return
            }
            setMenuOpen(false)
            onClose?.()
        }
        function onKeyDown(event) {
            if (event.key !== 'Escape') {
                return
            }
            event.preventDefault()
            event.stopPropagation()
            setMenuOpen(false)
            onClose?.()
        }
        document.addEventListener('pointerdown', onPointerDown)
        document.addEventListener('keydown', onKeyDown)
        return () => {
            document.removeEventListener('pointerdown', onPointerDown)
            document.removeEventListener('keydown', onKeyDown)
        }
    }, [menuOpen, onClose])

    function toggle(event) {
        event.stopPropagation()
        if (menuOpen) {
            setMenuOpen(false)
            onClose?.()
            return
        }
        setMenuOpen(true)
    }

    function run(action) {
        setMenuOpen(false)
        onClose?.()
        if (action.action === 'rename') {
            onRename?.()
            return
        }
        // Delete only opens the confirmation, the card is removed after it is accepted.
        onDelete?.()
    }

    return (
        <div className="card-menu" ref={rootRef} data-card-menu>
            <button
                type="button"
                className="card-menu__trigger"
                aria-label="Card actions"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={toggle}
            >
                <span className="card-menu__triangle" aria-hidden="true" />
            </button>
            {menuOpen ? (
                <ul className="card-menu__list" role="menu" aria-label="Card actions">
                    {cardMenuActions().map((action) => (
                        <li key={action.id} role="none">
                            <button
                                type="button"
                                role="menuitem"
                                className="card-menu__item"
                                onClick={() => run(action)}
                            >
                                {action.label}
                            </button>
                        </li>
                    ))}
                </ul>
            ) : null}
        </div>
    )
}
