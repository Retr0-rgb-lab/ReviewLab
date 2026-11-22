// Dock: the floating action bar at the bottom of the file view.
//
// It carries the four actions of the current layer. The order is fixed, so the
// bar reads the same way in every layer: favorite, create, edit, delete.
//
// The bar is always mounted. When it is not visible it slides out of the
// screen at the bottom, so the transition can play in both directions.

import { HugeiconsIcon } from '@hugeicons/react'
import { StarIcon, Add01Icon, Edit02Icon, Delete02Icon } from '@hugeicons/core-free-icons'
import './Dock.css'

const DOCK_ACTIONS = [
    { id: 'favorite', label: 'Favorite', icon: StarIcon },
    { id: 'create', label: 'Create', icon: Add01Icon },
    { id: 'edit', label: 'Edit', icon: Edit02Icon },
    { id: 'delete', label: 'Delete', icon: Delete02Icon },
]

export default function Dock({
    visible = true,
    favoriteActive = false,
    onFavorite = null,
    onCreate = null,
    onEdit = null,
    onDelete = null,
    theme = 'White',
    className = '',
}) {
    const handlers = {
        favorite: onFavorite,
        create: onCreate,
        edit: onEdit,
        delete: onDelete,
    }

    const classes = ['dock', visible ? 'dock--visible' : 'dock--hidden', className]
        .filter(Boolean)
        .join(' ')

    return (
        <div className={classes} data-theme={theme} role="toolbar" aria-label="Card actions">
            {DOCK_ACTIONS.map((action) => {
                const handle = handlers[action.id]
                // Only the favorite button carries a state, the other three are plain actions.
                const active = action.id === 'favorite' && favoriteActive

                return (
                    <button
                        key={action.id}
                        type="button"
                        className={`dock__button${active ? ' dock__button--active' : ''}`}
                        aria-label={action.label}
                        title={action.label}
                        aria-pressed={action.id === 'favorite' ? favoriteActive : undefined}
                        onClick={() => handle?.()}
                    >
                        <span className="dock__icon" aria-hidden="true">
                            <HugeiconsIcon
                                icon={action.icon}
                                size={20}
                                strokeWidth={1.5}
                                color="currentColor"
                            />
                        </span>
                        <span className="dock__label">{action.label}</span>
                    </button>
                )
            })}
        </div>
    )
}
