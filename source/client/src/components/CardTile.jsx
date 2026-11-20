import { useEffect, useRef, useState } from 'react'
import { validateName } from '../views/fileActions.js'
import { registerPendingCommit } from '../pendingCommit.js'
import SpotlightCard from './react-bits/SpotlightCard.jsx'
import CardMenu from './CardMenu.jsx'
import './CardTile.css'

export function cardLabel(title) {
    if (!title) return 'card'
    return 'card ' + title
}

export function cardTitleText(title) {
    return title ?? ''
}

export function spotlightTheme(theme) {
    if (theme === 'Dark') return 'dark'
    return 'light'
}

export function activateOnKey(event, onOpen) {
    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        if (typeof onOpen === 'function') {
            onOpen()
        }
    }
}

export function beginCardTitleEdit(event) {
    if (event.detail !== 2) {
        return false
    }
    return event.target.closest('[data-card-title]') !== null
}

export function commitCardTitle(rawTitle) {
    return validateName(rawTitle)
}

export default function CardTile({
    title,
    onOpen,
    theme = 'White',
    editing,
    onBeginEdit,
    onCommitEdit,
    onCancelEdit,
    onDelete,
}) {
    const [draft, setDraft] = useState(title ?? '')
    const cancelEdit = useRef(false)

    useEffect(() => {
        if (editing) {
            setDraft(title ?? '')
        }
    }, [editing, title])

    // While the title is being edited, the application can ask for the change
    // to be saved. The search shortcut uses this.
    useEffect(() => {
        if (!editing) {
            return undefined
        }
        const commit = async () => {
            const check = validateName(draft)
            if (!check.ok) {
                return { ok: false, message: check.error }
            }
            const result = typeof onCommitEdit === 'function'
                ? await onCommitEdit(check.name)
                : null
            if (result && result.error) {
                return { ok: false, message: result.error }
            }
            return { ok: true }
        }
        return registerPendingCommit(commit)
    }, [editing, draft, onCommitEdit])

    function onCardClick(event) {
        // A click inside the corner menu never opens the card.
        if (event.target.closest('[data-card-menu]')) {
            return
        }
        if (beginCardTitleEdit(event)) {
            cancelEdit.current = false
            if (typeof onBeginEdit === 'function') {
                onBeginEdit()
            }
            return
        }
        if (editing || event.target.closest('[data-card-title]')) {
            return
        }
        if (typeof onOpen === 'function') {
            onOpen()
        }
    }

    function onTitleKeyDown(event) {
        event.stopPropagation()
        if (event.key === 'Escape') {
            event.preventDefault()
            cancelEdit.current = true
            onCancelEdit()
        }
        if (event.key === 'Enter') {
            event.preventDefault()
            event.currentTarget.blur()
        }
    }

    async function onTitleBlur(event) {
        if (cancelEdit.current) {
            cancelEdit.current = false
            return
        }
        const result = await onCommitEdit(draft)
        if (result && result.error) {
            event.target.focus()
        }
    }

    return (
        <SpotlightCard
            className="card-tile"
            theme={spotlightTheme(theme)}
            flare={true}
            onClick={onCardClick}
            onKeyDown={(event) => {
                if (editing) {
                    return
                }
                // The corner menu keeps its own keys.
                if (event.target.closest('[data-card-menu]')) {
                    return
                }
                activateOnKey(event, onOpen)
            }}
            tabIndex={0}
            role="button"
        >
            <CardMenu
                onRename={() => {
                    if (typeof onBeginEdit === 'function') {
                        onBeginEdit()
                    }
                }}
                onDelete={() => {
                    if (typeof onDelete === 'function') {
                        onDelete()
                    }
                }}
                onClose={() => {}}
            />
            {editing ? (
                <input
                    className="card-tile__title"
                    data-card-title
                    autoFocus
                    aria-label="Card title"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={onTitleKeyDown}
                    onBlur={onTitleBlur}
                />
            ) : (
                <span className="card-tile__title" data-card-title>
                    {cardTitleText(title)}
                </span>
            )}
        </SpotlightCard>
    )
}
