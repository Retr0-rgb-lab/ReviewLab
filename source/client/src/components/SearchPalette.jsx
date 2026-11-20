// Search layer: a palette in the middle of the screen above the current view.
// The palette has no address of its own, so it is closed again after a reload.
//
// The rules of the search, that is the matching, the grouping by the day of
// the last change, the path of a result and the movement of the selection,
// live in searchActions.js. This file only draws them.

import { useEffect, useMemo, useRef, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Cancel01Icon, Folder01Icon, Note01Icon, Search01Icon } from '@hugeicons/core-free-icons'
import { groupSearchResults, moveSelection, pathLabel } from '../views/searchActions.js'
import './SearchPalette.css'

// The visible name of a row: a folder shows its name, a card shows its title.
export function rowName(item) {
    if (!item) {
        return ''
    }
    if (item.kind === 'folder') {
        return item.name ?? ''
    }
    if (item.kind === 'card') {
        return item.title ?? ''
    }
    return item.title ?? item.name ?? ''
}

// The path of a row, from the outermost folder down to its parent folder.
export function rowPath(item) {
    if (!item) {
        return ''
    }
    if (typeof item.path === 'string' && item.path !== '') {
        return item.path
    }
    try {
        const label = pathLabel(item, item.ancestors ?? [])
        return typeof label === 'string' ? label : ''
    } catch (error) {
        return ''
    }
}

// The icon only tells the type apart.
export function rowIcon(item) {
    return item?.kind === 'folder' ? Folder01Icon : Note01Icon
}

export default function SearchPalette({
    open = false,
    rows = [],
    onQueryChange,
    onConfirm,
    onClose,
}) {
    const [query, setQuery] = useState('')
    const [selectedIndex, setSelectedIndex] = useState(0)
    const inputRef = useRef(null)
    const panelRef = useRef(null)

    // The matching and the grouping are the rules of the search layer.
    const groups = useMemo(
        () => groupSearchResults(rows, query, new Date()),
        [rows, query],
    )

    // The rows keep the order of the groups, and empty groups are left out.
    const rendered = useMemo(() => {
        const out = []
        let index = 0
        for (const group of groups) {
            const items = group.items || []
            if (items.length === 0) {
                continue
            }
            out.push({
                label: group.label,
                rows: items.map((item) => ({ item, index: index++ })),
            })
        }
        return out
    }, [groups])

    const rowCount = rendered.reduce((sum, group) => sum + group.rows.length, 0)

    // Opening starts with an empty query and the first row selected.
    useEffect(() => {
        if (!open) {
            return
        }
        setQuery('')
        setSelectedIndex(0)
        onQueryChange?.('')
    }, [open, onQueryChange])

    // The input has the focus as soon as the palette opens.
    useEffect(() => {
        if (!open) {
            return
        }
        const node = inputRef.current
        if (node) {
            node.focus()
            node.select()
        }
    }, [open])

    // Keep the selected row inside the visible part of the list.
    useEffect(() => {
        const panel = panelRef.current
        if (!panel) {
            return
        }
        const row = panel.querySelector('.search-layer__row--selected')
        if (row && typeof row.scrollIntoView === 'function') {
            row.scrollIntoView({ block: 'nearest' })
        }
    }, [selectedIndex, rendered])

    function changeQuery(next) {
        setQuery(next)
        setSelectedIndex(0)
        onQueryChange?.(next)
    }

    function move(direction) {
        setSelectedIndex((current) => moveSelection(current, direction, rowCount))
    }

    function confirm() {
        const row = rendered
            .flatMap((group) => group.rows)
            .find((entry) => entry.index === selectedIndex)
        if (!row) {
            return
        }
        onConfirm?.(row.item)
    }

    function onKeyDown(event) {
        if (event.key === 'ArrowDown') {
            event.preventDefault()
            event.stopPropagation()
            move(1)
            return
        }
        if (event.key === 'ArrowUp') {
            event.preventDefault()
            event.stopPropagation()
            move(-1)
            return
        }
        if (event.key === 'Enter') {
            event.preventDefault()
            event.stopPropagation()
            confirm()
            return
        }
        if (event.key === 'Escape') {
            event.preventDefault()
            event.stopPropagation()
            onClose?.()
        }
    }

    if (!open) {
        return null
    }

    return (
        <div className="search-layer" onClick={() => onClose?.()}>
            <div
                ref={panelRef}
                className="search-layer__panel"
                role="dialog"
                aria-modal="true"
                aria-label="Search"
                onClick={(event) => event.stopPropagation()}
                onMouseDown={(event) => event.stopPropagation()}
                onKeyDown={onKeyDown}
            >
                <div className="search-layer__bar">
                    <HugeiconsIcon icon={Search01Icon} size={18} color="currentColor" aria-hidden="true" />
                    <input
                        ref={inputRef}
                        className="search-layer__input"
                        type="text"
                        aria-label="Search folders and cards"
                        placeholder="Search folders and cards"
                        value={query}
                        onChange={(event) => changeQuery(event.target.value)}
                    />
                    <button
                        type="button"
                        className="search-layer__close"
                        aria-label="Close search"
                        onClick={() => onClose?.()}
                    >
                        <HugeiconsIcon icon={Cancel01Icon} size={16} color="currentColor" aria-hidden="true" />
                    </button>
                </div>

                {rowCount === 0 ? (
                    <p className="search-layer__empty">No results</p>
                ) : (
                    <ul className="search-layer__groups">
                        {rendered.map((group) => (
                            <li className="search-layer__group" key={group.label}>
                                <p className="search-layer__group-label">{group.label}</p>
                                <ul className="search-layer__rows">
                                    {group.rows.map((row) => (
                                        <li key={`${row.item.kind}-${row.item.id}`}>
                                            <button
                                                type="button"
                                                className={`search-layer__row${row.index === selectedIndex ? ' search-layer__row--selected' : ''}`}
                                                aria-selected={row.index === selectedIndex}
                                                onClick={() => {
                                                    setSelectedIndex(row.index)
                                                    onConfirm?.(row.item)
                                                }}
                                            >
                                                <HugeiconsIcon
                                                    icon={rowIcon(row.item)}
                                                    size={18}
                                                    color="currentColor"
                                                    aria-hidden="true"
                                                />
                                                <span className="search-layer__name">{rowName(row.item)}</span>
                                                {rowPath(row.item) ? (
                                                    <span className="search-layer__path">{rowPath(row.item)}</span>
                                                ) : null}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}
