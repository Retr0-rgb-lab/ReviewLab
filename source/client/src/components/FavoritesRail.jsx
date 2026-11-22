// Favorites rail: the narrow column on the right of the screen.
//
// It holds two places: the favorite count and the entry to the zen mode.
// The favorite button is a read only placeholder in this round. It only
// tells the host that the filter was asked for, the host decides what that
// means, so the rail never filters anything by itself.

import { HugeiconsIcon } from '@hugeicons/react'
import { FullscreenIcon, StarIcon } from '@hugeicons/core-free-icons'
import './FavoritesRail.css'

export default function FavoritesRail({
    favoriteCount = 0,
    filterActive = false,
    onToggleFilter = null,
    onOpenZen = null,
    theme = 'White',
    className = '',
}) {
    const count = Number(favoriteCount) || 0

    return (
        <aside
            className={`favorites-rail${className ? ` ${className}` : ''}`}
            data-theme={theme}
            aria-label="Favorites rail"
        >
            <button
                type="button"
                className={`favorites-rail__button favorites-rail__button--favorite${filterActive ? ' favorites-rail__button--active' : ''}`}
                aria-label="Favorites"
                title="Favorites"
                aria-pressed={filterActive}
                onClick={() => onToggleFilter?.()}
            >
                <HugeiconsIcon
                    icon={StarIcon}
                    size={22}
                    color="currentColor"
                    fill={filterActive ? 'currentColor' : 'none'}
                    aria-hidden="true"
                />
                <span className="favorites-rail__count">{count}</span>
            </button>
            <button
                type="button"
                className="favorites-rail__button"
                aria-label="Zen mode"
                title="Zen mode"
                onClick={() => onOpenZen?.()}
            >
                <HugeiconsIcon icon={FullscreenIcon} size={22} color="currentColor" aria-hidden="true" />
            </button>
        </aside>
    )
}
