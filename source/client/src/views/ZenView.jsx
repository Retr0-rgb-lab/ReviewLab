// Zen mode: the whole screen belongs to one level of cards.
//
// There is no top bar, no sidebar, no dock and no breadcrumb here. The arc
// gallery of the components folder is the only thing on the screen, and three
// small buttons in the top right corner open the search, change the theme and
// leave the zen mode.
//
// The keyboard of the gallery is also the keyboard of this view: the arrow keys
// change the card and Enter flips it. Escape leaves the zen mode.
//
// The card is the same deck as the file view, including Mastered and Not
// mastered. Escape leaves. There is no favorite button and no editor here.

import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { HugeiconsIcon } from '@hugeicons/react'
import { Cancel01Icon, Search01Icon } from '@hugeicons/core-free-icons'
import ArcGallery from '../components/ArcGallery.jsx'
import { setMastery } from './fileActions.js'
import { fetchLevel, fetchTree } from './levelActions.js'
import './ZenView.css'

export const TITLE_LIMIT = 120
export const BODY_LIMIT = 4000

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

// The cards of the level with the body of every one of them. The level gives
// the order of the cards and their mark, the tree gives the body of a card.
function cardsWithBodies(cards, treeCards) {
    const bodies = new Map()
    for (const card of treeCards) {
        if (card && card.id) {
            bodies.set(card.id, typeof card.body === 'string' ? card.body : '')
        }
    }
    return cards.map((card) => ({
        ...card,
        body: typeof card.body === 'string' ? card.body : (bodies.get(card.id) ?? ''),
        favorite: Boolean(card.favorite),
    }))
}

// The card that was created first is the card the zen mode opens with. The
// times of the database are written in one format, so they can be compared as
// text. A level without any time keeps the order of the level.
function earliestIndex(cards) {
    let best = -1
    let bestTime = null
    for (let index = 0; index < cards.length; index += 1) {
        const time = cards[index].created_at
        if (typeof time !== 'string' || time === '') {
            continue
        }
        if (bestTime === null || time < bestTime) {
            bestTime = time
            best = index
        }
    }
    return best >= 0 ? best : 0
}

// The message of a failed read. The API reports the reason, the view only
// brings a sentence of its own when there is none.
function errorMessage(error, fallback) {
    if (typeof error === 'string' && error !== '') {
        return error
    }
    if (error && typeof error.message === 'string' && error.message !== '') {
        return error.message
    }
    return fallback
}

// The mark of the theme button. The view draws it itself, so the button does
// not depend on an icon of the package.
function ThemeMark() {
    return (
        <svg className="zen-view__mark" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M12 3.5a8.5 8.5 0 0 0 0 17z" fill="currentColor" />
        </svg>
    )
}

export default function ZenView({
    folderId,
    itemId = null,
    theme = 'White',
    dataVersion = 0,
    onOpenSearch = null,
    onToggleTheme = null,
    onDataChanged = null,
    onError = null,
    onClearError = null,
    onLevelReady = null,
}) {
    const navigate = useNavigate()
    const location = useLocation()
    const [status, setStatus] = useState('loading')
    const [cards, setCards] = useState([])
    const [activeIndex, setActiveIndex] = useState(0)
    const [localTheme, setLocalTheme] = useState(theme)
    const [message, setMessage] = useState('')

    // The callbacks of the parent are read through a ref, so a new function
    // identity does not read the level again.
    const callbacks = useRef({ onError, onClearError, onLevelReady })
    callbacks.current = { onError, onClearError, onLevelReady }

    // The file view hands over its current card without putting the id in the
    // address. The id is read once for this history entry. A refresh has no
    // state, so the earliest card stays the refresh behavior. After the student
    // moves to another card, a later reload must not jump back to the handed one.
    const handedCardId = useRef(null)
    const keepIndex = useRef(false)
    const entryKey = useRef(null)
    if (entryKey.current !== location.key) {
        entryKey.current = location.key
        keepIndex.current = false
        const cardId = location.state && location.state.cardId
        handedCardId.current = !itemId && cardId ? cardId : null
    }

    // The level gives the cards, the tree gives the body of every card. The
    // version of the data asks for a new read after a write elsewhere.
    useEffect(() => {
        let cancelled = false
        setStatus('loading')
        setMessage('')

        Promise.all([fetchLevel(folderId), fetchTree()])
            .then(([level, tree]) => {
                if (cancelled) {
                    return
                }
                if (!level || level.error) {
                    const text = errorMessage(level && level.error, 'This level could not be loaded.')
                    setStatus('error')
                    setMessage(text)
                    callbacks.current.onError?.(text)
                    return
                }
                setCards(cardsWithBodies(level.cards || [], (tree && tree.cards) || []))
                setStatus('ready')
                callbacks.current.onClearError?.()
                callbacks.current.onLevelReady?.(folderId, true)
            })
            .catch((caught) => {
                if (cancelled) {
                    return
                }
                const text = errorMessage(caught, 'This level could not be loaded.')
                setStatus('error')
                setMessage(text)
                callbacks.current.onError?.(text)
            })

        return () => {
            cancelled = true
        }
    }, [folderId, dataVersion])

    // A route card wins (search and stats). Otherwise the card handed over with
    // this visit is used, and a visit with no card falls back to the earliest one.
    useEffect(() => {
        if (!cards.length) {
            setActiveIndex(0)
            return
        }
        const fromRoute = itemId ? cards.findIndex((card) => card.id === itemId) : -1
        if (fromRoute >= 0) {
            setActiveIndex(fromRoute)
            return
        }
        if (keepIndex.current) {
            setActiveIndex((index) => (index >= 0 && index < cards.length ? index : 0))
            return
        }
        const handed = handedCardId.current
        const fromHand = handed ? cards.findIndex((card) => card.id === handed) : -1
        setActiveIndex(fromHand >= 0 ? fromHand : earliestIndex(cards))
    }, [cards, itemId])

    // The theme of the parent wins. The local state is the fallback for the
    // case that the parent does not hand over a toggle.
    useEffect(() => {
        setLocalTheme(theme)
    }, [theme])

    const hasThemeToggle = typeof onToggleTheme === 'function'
    const currentTheme = hasThemeToggle ? theme : localTheme

    // The card that is in the focus. The index is kept inside the level, so a
    // level that became shorter does not point outside of it.
    const safeIndex = cards.length ? Math.min(activeIndex, cards.length - 1) : 0

    // Moving inside zen drops the handed card, so a later reload keeps this card.
    const onActiveIndexChange = useCallback((index) => {
        keepIndex.current = true
        handedCardId.current = null
        setActiveIndex(index)
    }, [])

    // Leaving the zen mode returns to the file view of the level, at the card
    // that is in the focus.
    const exit = useCallback(() => {
        const card = cards[safeIndex]
        if (card && card.id) {
            navigate(`/folder/${folderId}/${card.id}`)
            return
        }
        navigate(`/folder/${folderId}`)
    }, [cards, folderId, navigate, safeIndex])

    const active = cards[safeIndex] || null

    async function applyMastery(cardId, mastery) {
        const card = cards.find((entry) => entry.id === cardId)
        if (!card || card.mastery === mastery) {
            return
        }
        const result = await setMastery(cardId, mastery)
        if (result && result.error) {
            return
        }
        setCards((previous) => previous.map((entry) => (
            entry.id === cardId ? { ...entry, mastery } : entry
        )))
        onDataChanged?.()
    }

    const masteryButtons = active ? (
        <div className="file-view__mastery">
            <button
                type="button"
                className="file-view__mastery-button file-view__mastery-button--mastered"
                aria-pressed={active.mastery === 'mastered'}
                onClick={() => applyMastery(active.id, 'mastered')}
            >
                Mastered
            </button>
            <button
                type="button"
                className="file-view__mastery-button file-view__mastery-button--unmastered"
                aria-pressed={active.mastery === 'unmastered'}
                onClick={() => applyMastery(active.id, 'unmastered')}
            >
                Not mastered
            </button>
        </div>
    ) : null

    function toggleTheme() {
        if (hasThemeToggle) {
            onToggleTheme()
            return
        }
        setLocalTheme((current) => (current === 'Dark' ? 'White' : 'Dark'))
    }

    // Escape leaves the zen mode. A field that has the focus keeps the key:
    // the input ends first and the zen mode stays.
    useEffect(() => {
        function onKeyDown(event) {
            if (event.key !== 'Escape') {
                return
            }
            const target = event.target
            if (target instanceof HTMLElement && target.closest('input, textarea, [contenteditable]')) {
                if (typeof target.blur === 'function') {
                    target.blur()
                }
                return
            }
            if (target instanceof HTMLElement && target.closest('.search-layer')) {
                // The search layer is above the zen mode and closes itself.
                return
            }
            event.preventDefault()
            exit()
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [exit])

    return (
        <section className="zen-view" data-theme={currentTheme}>
            <div className="zen-view__controls">
                <button
                    type="button"
                    className="zen-view__button"
                    aria-label="Search"
                    title="Search"
                    onClick={() => onOpenSearch?.()}
                >
                    <HugeiconsIcon icon={Search01Icon} size={16} color="currentColor" aria-hidden="true" />
                </button>
                <button
                    type="button"
                    className="zen-view__button"
                    aria-label={currentTheme === 'Dark' ? 'Use the White theme' : 'Use the Dark theme'}
                    title={currentTheme === 'Dark' ? 'Use the White theme' : 'Use the Dark theme'}
                    onClick={toggleTheme}
                >
                    <ThemeMark />
                </button>
                <button
                    type="button"
                    className="zen-view__button"
                    aria-label="Leave the zen mode"
                    title="Leave the zen mode"
                    onClick={exit}
                >
                    <HugeiconsIcon icon={Cancel01Icon} size={16} color="currentColor" aria-hidden="true" />
                </button>
            </div>

            <div className="zen-view__stage">
                {status === 'ready' ? (
                    <ArcGallery
                        cards={cards}
                        activeIndex={safeIndex}
                        onActiveIndexChange={onActiveIndexChange}
                        arrangement="deck"
                        zoom="focused"
                        focusExtra={masteryButtons}
                        onFlip={() => {}}
                        theme={currentTheme}
                    />
                ) : null}
            </div>

            {status === 'loading' ? <p className="zen-view__message">Loading the cards…</p> : null}
            {status === 'error' ? <p className="zen-view__message" role="alert">{message}</p> : null}
        </section>
    )
}
