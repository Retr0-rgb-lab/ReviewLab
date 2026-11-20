// Focus view: one item of the current level fills the main area of the screen.

import { useEffect, useRef, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { CancelCircleIcon, CheckmarkCircle01Icon } from '@hugeicons/core-free-icons'
import { registerPendingCommit } from '../pendingCommit.js'
import './FocusView.css'

export const TITLE_LIMIT = 120
export const BODY_LIMIT = 4000
const DRAG_THRESHOLD = 6

// The view model of a card that was just created: fixed title, empty body, no mark.
export function newCardFocus(card) {
    return {
        kind: 'card',
        id: card?.id ?? null,
        title: card?.title ?? 'New page',
        body: card?.body ?? '',
        mastery: card?.mastery ?? 'unmarked',
        folder_id: card?.folder_id ?? null,
        created_at: card?.created_at ?? null,
        updated_at: card?.updated_at ?? null,
    }
}

// A title is saved trimmed, never empty and never longer than 120 code points.
export function validateTitle(raw) {
    const title = String(raw ?? '').trim()
    if (title === '') {
        return { ok: false, error: 'Title is required' }
    }
    if ([...title].length > TITLE_LIMIT) {
        return { ok: false, error: `Title must be at most ${TITLE_LIMIT} characters` }
    }
    return { ok: true, value: title }
}

// A body may be empty, is saved trimmed and is never longer than 4000 code points.
export function validateBody(raw) {
    const body = String(raw ?? '').trim()
    if ([...body].length > BODY_LIMIT) {
        return { ok: false, error: `Body must be at most ${BODY_LIMIT} characters` }
    }
    return { ok: true, value: body }
}

// A level row is either a folder or a card.
export function itemKind(item) {
    if (!item) {
        return 'card'
    }
    if (item.kind === 'folder' || item.kind === 'card') {
        return item.kind
    }
    return item.title !== undefined ? 'card' : 'folder'
}

export default function FocusView({
    folder = null,
    item = null,
    items = [],
    index = 0,
    masteredCount = 0,
    unmasteredCount = 0,
    onCommitTitle,
    onCommitBody,
    onCommitMastery,
    onNavigate,
    onExit,
    onOpenFolder,
}) {
    const [side, setSide] = useState('title')
    const [editing, setEditing] = useState(null)
    const [titleDraft, setTitleDraft] = useState('')
    const [bodyDraft, setBodyDraft] = useState('')
    const [message, setMessage] = useState('')
    const [drag, setDrag] = useState({ active: false, x: 0, y: 0 })

    const cancelEdit = useRef(false)
    const suppressClick = useRef(false)
    const dragRef = useRef(null)
    const titleRef = useRef(null)
    const bodyRef = useRef(null)

    const kind = itemKind(item)
    const isFolder = kind === 'folder'
    const title = item?.title ?? ''
    const body = item?.body ?? ''
    const mastery = item?.mastery ?? 'unmarked'
    const levelSize = items.length

    // A different item starts again on its title side, without a draft or a message.
    useEffect(() => {
        setSide('title')
        setEditing(null)
        setTitleDraft('')
        setBodyDraft('')
        setMessage('')
        setDrag({ active: false, x: 0, y: 0 })
        cancelEdit.current = false
        suppressClick.current = false
        dragRef.current = null
    }, [item?.id])

    useEffect(() => {
        if (editing === 'title') {
            titleRef.current?.focus()
        }
        if (editing === 'body') {
            bodyRef.current?.focus()
        }
    }, [editing])

    // While a field is open, the application can ask for the change to be
    // saved. The search shortcut uses this: the change is saved first, and an
    // invalid change keeps the search closed and shows the reason.
    useEffect(() => {
        if (!editing) {
            return undefined
        }
        const commit = async () => {
            if (editing === 'title') {
                const check = validateTitle(titleDraft)
                if (!check.ok) {
                    setMessage(check.error)
                    return { ok: false, message: check.error }
                }
                const saved = await saveTitle()
                return saved
                    ? { ok: true }
                    : { ok: false, message: 'The title could not be saved.' }
            }
            const check = validateBody(bodyDraft)
            if (!check.ok) {
                setMessage(check.error)
                return { ok: false, message: check.error }
            }
            const saved = await saveBody()
            return saved
                ? { ok: true }
                : { ok: false, message: 'The body could not be saved.' }
        }
        return registerPendingCommit(commit)
    }, [editing, titleDraft, bodyDraft, item?.id])

    // The level order loops: the item after the last one is the first one.
    function go(direction) {
        if (levelSize === 0) {
            return
        }
        const next = (index + direction + levelSize) % levelSize
        onNavigate?.(next)
    }

    function flip() {
        if (isFolder) {
            return
        }
        setSide((current) => (current === 'title' ? 'body' : 'title'))
    }

    // Enter on a folder opens that folder. The fixed props have no folder route,
    // so onOpenFolder is optional and Focus is left when it is not wired.
    function openFolder() {
        if (typeof onOpenFolder === 'function') {
            onOpenFolder(item)
            return
        }
        onExit?.()
    }

    function activate() {
        if (isFolder) {
            openFolder()
            return
        }
        flip()
    }

    function startEdit(which) {
        if (isFolder) {
            return
        }
        cancelEdit.current = false
        setMessage('')
        setSide(which)
        setEditing(which)
        if (which === 'title') {
            setTitleDraft(title)
        } else {
            setBodyDraft(body)
        }
    }

    async function saveTitle() {
        const check = validateTitle(titleDraft)
        if (!check.ok) {
            setMessage(check.error)
            return false
        }
        const result = await onCommitTitle?.(item?.id, check.value)
        if (result && result.error) {
            setMessage(result.error)
            return false
        }
        setMessage('')
        setEditing(null)
        return true
    }

    async function saveBody() {
        const check = validateBody(bodyDraft)
        if (!check.ok) {
            setMessage(check.error)
            return false
        }
        const result = await onCommitBody?.(item?.id, check.value)
        if (result && result.error) {
            setMessage(result.error)
            return false
        }
        setMessage('')
        setEditing(null)
        return true
    }

    // The state a card already has is not sent again, so the two counts do not move.
    async function setMastery(value) {
        if (isFolder || !item) {
            return
        }
        if (mastery === value) {
            return
        }
        const result = await onCommitMastery?.(item.id, value)
        if (result && result.error) {
            setMessage(result.error)
        }
    }

    // Keys inside a field stay in the field: they never change the item and never leave Focus.
    function onFieldKeyDown(event, which) {
        event.stopPropagation()
        if (event.key === 'Escape') {
            event.preventDefault()
            cancelEdit.current = true
            setEditing(null)
            setMessage('')
            return
        }
        if (event.key === 'Enter' && (which === 'title' || event.ctrlKey || event.metaKey)) {
            event.preventDefault()
            event.currentTarget.blur()
        }
    }

    async function onFieldBlur(which) {
        if (cancelEdit.current) {
            cancelEdit.current = false
            return
        }
        if (editing !== which) {
            return
        }
        const saved = which === 'title' ? await saveTitle() : await saveBody()
        if (saved) {
            return
        }
        // A refused save keeps the field open. The focus only goes back to the
        // field when the focus was lost to the page, so that a layer above
        // Focus, such as the search, keeps its own focus.
        const active = document.activeElement
        if (active && active !== document.body) {
            return
        }
        if (which === 'title') {
            titleRef.current?.focus()
            return
        }
        bodyRef.current?.focus()
    }

    function onSideClick(event, which) {
        if (event.target.closest('input, textarea')) {
            return
        }
        if (suppressClick.current) {
            suppressClick.current = false
            return
        }
        if (event.detail >= 2) {
            startEdit(which)
            return
        }
        activate()
    }

    function onStageClick() {
        if (suppressClick.current) {
            suppressClick.current = false
        }
    }

    function onPointerDown(event) {
        if (event.pointerType === 'mouse' && event.button !== 0) {
            return
        }
        if (event.target.closest('input, textarea, button, a, [data-no-drag]')) {
            return
        }
        dragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            moved: false,
            captured: false,
        }
    }

    function onPointerMove(event) {
        const state = dragRef.current
        if (!state || state.pointerId !== event.pointerId) {
            return
        }
        const dx = event.clientX - state.startX
        const dy = event.clientY - state.startY
        if (!state.moved) {
            if (Math.hypot(dx, dy) < DRAG_THRESHOLD) {
                return
            }
            state.moved = true
            // The pointer is only captured once the item really moves, so that a
            // plain click still reaches the title or the body underneath.
            try {
                event.currentTarget.setPointerCapture(event.pointerId)
                state.captured = true
            } catch (error) {
                // Pointer capture is optional, the drag still works without it.
            }
        }
        setDrag({ active: true, x: dx, y: dy })
    }

    // Releasing a finished drag is the same as ArrowRight.
    function onPointerUp(event) {
        const state = dragRef.current
        if (!state || state.pointerId !== event.pointerId) {
            return
        }
        dragRef.current = null
        if (state.captured) {
            try {
                event.currentTarget.releasePointerCapture(event.pointerId)
            } catch (error) {
                // The pointer may already be released.
            }
        }
        const moved = state.moved
        setDrag({ active: false, x: 0, y: 0 })
        if (moved) {
            suppressClick.current = true
            go(1)
        }
    }

    // A drag that never finishes puts the item back where it was.
    function onPointerCancel(event) {
        const state = dragRef.current
        if (!state || state.pointerId !== event.pointerId) {
            return
        }
        dragRef.current = null
        if (state.captured) {
            try {
                event.currentTarget.releasePointerCapture(event.pointerId)
            } catch (error) {
                // The pointer may already be released.
            }
        }
        setDrag({ active: false, x: 0, y: 0 })
    }

    useEffect(() => {
        function onKeyDown(event) {
            if (editing) {
                return
            }
            const target = event.target
            if (target instanceof HTMLElement && target.closest('input, textarea, select, [contenteditable="true"]')) {
                return
            }
            if (event.ctrlKey || event.metaKey || event.altKey) {
                return
            }
            if (event.key === 'ArrowLeft') {
                event.preventDefault()
                go(-1)
                return
            }
            if (event.key === 'ArrowRight') {
                event.preventDefault()
                go(1)
                return
            }
            if (event.key === 'Enter') {
                event.preventDefault()
                activate()
                return
            }
            if (event.key === 'Escape') {
                event.preventDefault()
                onExit?.()
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [editing, index, levelSize, item, isFolder, onNavigate, onExit])

    const dragStyle = drag.active
        ? { transform: `translate(${drag.x}px, ${drag.y}px)` }
        : undefined

    return (
        <section className="focus-view">
            {folder?.name ? <p className="focus-view__level">{folder.name}</p> : null}

            <div
                className="focus-view__stage"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerCancel}
                onClick={onStageClick}
            >
                <article className="focus-view__item" style={dragStyle}>
                    {isFolder ? (
                        <div className="focus-view__folder">
                            <h1 className="focus-view__folder-name">{item?.name ?? ''}</h1>
                        </div>
                    ) : (
                        <>
                            <section
                                className={`focus-view__side focus-view__side--title${side === 'title' ? ' focus-view__side--active' : ''}`}
                                onClick={(event) => onSideClick(event, 'title')}
                            >
                                {editing === 'title' ? (
                                    <input
                                        ref={titleRef}
                                        className="focus-view__title-input"
                                        aria-label="Card title"
                                        value={titleDraft}
                                        onChange={(event) => setTitleDraft(event.target.value)}
                                        onKeyDown={(event) => onFieldKeyDown(event, 'title')}
                                        onBlur={() => onFieldBlur('title')}
                                    />
                                ) : (
                                    <h1 className="focus-view__title">{title}</h1>
                                )}
                            </section>
                            <hr className="focus-view__rule" />
                            <section
                                className={`focus-view__side focus-view__side--body${side === 'body' ? ' focus-view__side--active' : ''}`}
                                onClick={(event) => onSideClick(event, 'body')}
                            >
                                {editing === 'body' ? (
                                    <textarea
                                        ref={bodyRef}
                                        className="focus-view__body-input"
                                        aria-label="Card body"
                                        rows={8}
                                        value={bodyDraft}
                                        onChange={(event) => setBodyDraft(event.target.value)}
                                        onKeyDown={(event) => onFieldKeyDown(event, 'body')}
                                        onBlur={() => onFieldBlur('body')}
                                    />
                                ) : (
                                    <p className="focus-view__body">{body}</p>
                                )}
                            </section>
                        </>
                    )}
                </article>
            </div>

            {isFolder ? null : (
                <div className="focus-view__controls">
                    <div className="focus-view__mastery">
                        <button
                            type="button"
                            className="focus-view__button"
                            aria-pressed={mastery === 'mastered'}
                            onClick={() => setMastery('mastered')}
                        >
                            <HugeiconsIcon icon={CheckmarkCircle01Icon} size={18} color="currentColor" aria-hidden="true" />
                            Mastered
                        </button>
                        <button
                            type="button"
                            className="focus-view__button"
                            aria-pressed={mastery === 'unmastered'}
                            onClick={() => setMastery('unmastered')}
                        >
                            <HugeiconsIcon icon={CancelCircleIcon} size={18} color="currentColor" aria-hidden="true" />
                            Not mastered
                        </button>
                    </div>
                    <div className="focus-view__counts">
                        <span className="focus-view__count focus-view__count--mastered">{masteredCount}</span>
                        <span className="focus-view__count focus-view__count--unmastered">{unmasteredCount}</span>
                    </div>
                </div>
            )}

            {message ? <p className="focus-view__message" role="alert">{message}</p> : null}

            <p className="focus-view__hint">
                Enter flips the card, ArrowLeft and ArrowRight change the item, Esc leaves Focus.
                Drag the item and release it to go to the next one.
            </p>
        </section>
    )
}
