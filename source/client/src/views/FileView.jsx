// The file view: the level of the tree, the cards of that level and the
// actions that change them.
//
// Reads go through levelActions.js, writes through fileActions.js. The level
// gives the order of the items and the state of the cards, the tree gives the
// body of the cards and the path of the level.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HugeiconsIcon } from '@hugeicons/react'
import { Delete02Icon, Folder01Icon, Search01Icon } from '@hugeicons/core-free-icons'

import ArcGallery from '../components/ArcGallery.jsx'
import CardWheel from '../components/CardWheel.jsx'
import Dock from '../components/Dock.jsx'
import EditPanel from '../components/EditPanel.jsx'
import FavoritesRail from '../components/FavoritesRail.jsx'
import MasteryDial from '../components/MasteryDial.jsx'
import {
    createCard,
    createFolder,
    renameCard,
    renameFolder,
    setFavorite,
    setMastery,
    updateCardBody,
    validateName,
} from './fileActions.js'
import { fetchLevel, fetchTree } from './levelActions.js'
import './FileView.css'

// The error of a failed call is a string in some places and an object with a
// message in others, so the sentence is pulled out in one place.
export function errorText(error, fallback = 'Something went wrong.') {
    if (!error) {
        return fallback
    }
    if (typeof error === 'string') {
        return error
    }
    if (typeof error.message === 'string' && error.message !== '') {
        return error.message
    }
    if (typeof error.error === 'string' && error.error !== '') {
        return error.error
    }
    return fallback
}

// The order of one level: creation time first, then the insertion order of the
// rows that share it. ItemGrid imports this function, so the name stays.
export function orderLevel(folders, cards) {
    const folderItems = (folders || []).map((folder, index) => ({ ...folder, kind: 'folder', rowIndex: index }))
    const cardItems = (cards || []).map((card, index) => ({ ...card, kind: 'card', rowIndex: index }))

    return [...folderItems, ...cardItems].sort((a, b) => {
        const byTime = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        if (byTime !== 0) {
            return byTime
        }
        return rowOrder(a) - rowOrder(b)
    })
}

function rowOrder(item) {
    if (item.ord === undefined || item.ord === null) {
        return item.rowIndex
    }
    const ord = Number(item.ord)
    return Number.isFinite(ord) ? ord : item.rowIndex
}

// The next card of the level after a card that is gone, or the one before it
// when there is no next one. The neighbours are looked up in the order of the
// level before the card was removed.
function neighbourIndex(ids, previous, position, step) {
    for (let index = position + step; step > 0 ? index < previous.length : index >= 0; index += step) {
        const found = ids.indexOf(previous[index])
        if (found >= 0) {
            return found
        }
    }
    return -1
}

function plural(count, noun) {
    return `${count} ${noun}${count === 1 ? '' : 's'}`
}

export default function FileView({
    folderId,
    itemId = null,
    theme = 'White',
    dataVersion = 0,
    onOpenSearch = null,
    onRequestDelete = null,
    onError = null,
    onClearError = null,
    onDataChanged = null,
    onLevelReady = null,
    onToggleTheme = null,
}) {
    const navigate = useNavigate()

    const [level, setLevel] = useState(null)
    const [tree, setTree] = useState({ folders: [], cards: [] })
    // The state that the server has not confirmed yet. It keeps the numbers of
    // the level in step with a mark that was just made.
    const [overrides, setOverrides] = useState({})
    const [status, setStatus] = useState('loading')
    const [loadError, setLoadError] = useState('')
    const [activeIndex, setActiveIndex] = useState(0)
    const [dockVisible, setDockVisible] = useState(true)
    const [flipRequest, setFlipRequest] = useState(0)
    const [editing, setEditing] = useState(false)
    const [createMenuOpen, setCreateMenuOpen] = useState(false)
    const [folderPromptOpen, setFolderPromptOpen] = useState(false)
    const [folderDraft, setFolderDraft] = useState('')
    const [folderPromptError, setFolderPromptError] = useState('')
    const [titleEditing, setTitleEditing] = useState(false)
    const [titleDraft, setTitleDraft] = useState('')
    const [renamingFolderId, setRenamingFolderId] = useState(null)
    const [renameDraft, setRenameDraft] = useState('')
    const [localTheme, setLocalTheme] = useState(theme)

    const loadedKey = useRef(null)
    const lastIds = useRef([])
    const fallbackRef = useRef(null)
    const itemIdRef = useRef(itemId)
    const scrollTopRef = useRef(0)
    const pendingEditId = useRef(null)
    const folderTimer = useRef(null)
    const cancelTitle = useRef(false)
    const cancelRename = useRef(false)

    itemIdRef.current = itemId

    const reportError = useCallback((message) => {
        if (typeof onError === 'function') {
            onError(message)
        }
    }, [onError])

    const clearError = useCallback(() => {
        if (typeof onClearError === 'function') {
            onClearError()
        }
    }, [onClearError])

    const changed = useCallback(() => {
        if (typeof onDataChanged === 'function') {
            onDataChanged()
        }
    }, [onDataChanged])

    // The level of the route. A refresh of the same level keeps the view on
    // screen, so a rename does not blank the page.
    useEffect(() => {
        if (!folderId) {
            setStatus('empty')
            return undefined
        }

        let cancelled = false
        const silent = loadedKey.current === folderId
        loadedKey.current = folderId
        if (!silent) {
            setStatus('loading')
            setLevel(null)
        }
        setLoadError('')

        fetchLevel(folderId)
            .then((result) => {
                if (cancelled) {
                    return
                }
                if (!result || result.error) {
                    setStatus('error')
                    setLevel(null)
                    setLoadError(errorText(result && result.error, 'This level could not be loaded.'))
                    onLevelReady?.(folderId, false)
                    return
                }

                const freshCards = result.cards || []
                const ids = orderLevel([], freshCards).map((card) => card.id)

                // The card that was in focus is not in the level any more. The
                // next card of the level takes its place, the one before it is
                // the second choice.
                const missing = itemIdRef.current
                const previous = lastIds.current
                let fallback = -1
                if (missing && previous.includes(missing) && !ids.includes(missing)) {
                    const position = previous.indexOf(missing)
                    fallback = neighbourIndex(ids, previous, position, 1)
                    if (fallback < 0) {
                        fallback = neighbourIndex(ids, previous, position, -1)
                    }
                }
                fallbackRef.current = fallback >= 0 ? { index: fallback } : null
                lastIds.current = ids

                // A mark that the server has confirmed does not need the local
                // copy any more.
                setOverrides((earlier) => {
                    const next = {}
                    let dirty = false
                    for (const [id, patch] of Object.entries(earlier)) {
                        const server = freshCards.find((card) => card.id === id)
                        if (!server) {
                            dirty = true
                            continue
                        }
                        const kept = {}
                        for (const [key, value] of Object.entries(patch)) {
                            if (server[key] !== value) {
                                kept[key] = value
                            }
                        }
                        if (Object.keys(kept).length !== Object.keys(patch).length) {
                            dirty = true
                        }
                        if (Object.keys(kept).length) {
                            next[id] = kept
                        }
                    }
                    return dirty ? next : earlier
                })

                setLevel(result)
                setStatus('ready')
                onLevelReady?.(folderId, true)
            })
            .catch((caught) => {
                if (cancelled) {
                    return
                }
                setStatus('error')
                setLevel(null)
                setLoadError(caught && caught.message ? caught.message : 'This level could not be loaded.')
                onLevelReady?.(folderId, false)
            })

        return () => {
            cancelled = true
        }
    }, [folderId, dataVersion, onLevelReady])

    useEffect(() => () => {
        if (folderId) {
            onLevelReady?.(folderId, false)
        }
    }, [folderId, onLevelReady])

    // The tree carries the body of the cards and the path of the level.
    useEffect(() => {
        if (!folderId) {
            return undefined
        }
        let cancelled = false
        fetchTree()
            .then((result) => {
                if (cancelled) {
                    return
                }
                if (!result || result.error) {
                    reportError(errorText(result && result.error, 'The tree could not be read.'))
                    return
                }
                setTree({ folders: result.folders || [], cards: result.cards || [] })
            })
            .catch((caught) => {
                if (!cancelled) {
                    reportError(caught && caught.message ? caught.message : 'The tree could not be read.')
                }
            })
        return () => {
            cancelled = true
        }
    }, [folderId, dataVersion, reportError])

    // The cards of the level, with the state that the server has not confirmed
    // yet laid over it.
    const cards = useMemo(() => {
        const levelCards = level ? (level.cards || []) : []
        return levelCards.map((card) => {
            const patch = overrides[card.id]
            return patch ? { ...card, ...patch } : card
        })
    }, [level, overrides])

    // The order of the level: the oldest card comes first.
    const orderedCards = useMemo(() => orderLevel([], cards), [cards])

    const bodyById = useMemo(() => {
        const map = new Map()
        for (const card of tree.cards || []) {
            if (card && typeof card.body === 'string') {
                map.set(card.id, card.body)
            }
        }
        return map
    }, [tree])

    const cardsWithBody = useMemo(() => orderedCards.map((card) => ({
        ...card,
        body: bodyById.has(card.id) ? bodyById.get(card.id) : (card.body || ''),
    })), [orderedCards, bodyById])

    const active = cardsWithBody[activeIndex] || null

    // The card of the address decides what is in focus. A card that is not in
    // this level falls back to the oldest card of the level, and the address is
    // rewritten to that card. On the render where the folder changes, the level
    // is still the previous one, so the address is left alone until this folder
    // has loaded.
    useEffect(() => {
        if (status !== 'ready' || !folderId) {
            return
        }
        if (!level || !level.folder || level.folder.id !== folderId) {
            return
        }
        const ids = cardsWithBody.map((card) => card.id)
        const createdId = pendingEditId.current
        if (createdId && ids.includes(createdId)) {
            // The address still has the previous card until this navigation is
            // applied. Following it here would bounce off the new card.
            const index = ids.indexOf(createdId)
            setActiveIndex(index)
            fallbackRef.current = null
            setEditing(true)
            if (itemId === createdId) {
                pendingEditId.current = null
            } else {
                navigate(`/folder/${folderId}/${createdId}`)
            }
            return
        }
        if (!ids.length) {
            setActiveIndex(0)
            fallbackRef.current = null
            if (itemId) {
                navigate(`/folder/${folderId}`, { replace: true })
            }
            return
        }
        const fromRoute = itemId ? ids.indexOf(itemId) : -1
        if (fromRoute >= 0) {
            setActiveIndex(fromRoute)
            fallbackRef.current = null
            return
        }
        const fallback = fallbackRef.current
        const index = fallback && fallback.index >= 0 && fallback.index < ids.length ? fallback.index : 0
        setActiveIndex(index)
        navigate(`/folder/${folderId}/${ids[index]}`, { replace: true })
    }, [status, cardsWithBody, itemId, folderId, navigate, level])

    // A new card belongs to the folder it was created in. Leaving that folder
    // drops the request, so a later level does not open the editor.
    useEffect(() => () => {
        pendingEditId.current = null
    }, [folderId])

    // The path of the level: from the outermost folder down to this one.
    const breadcrumb = useMemo(() => {
        const folder = level ? level.folder : null
        if (!folder) {
            return []
        }
        const byId = new Map((tree.folders || []).map((entry) => [entry.id, entry]))
        const chain = []
        const seen = new Set()
        let current = folder
        while (current && !seen.has(current.id)) {
            seen.add(current.id)
            chain.unshift(current)
            current = current.parent_id ? byId.get(current.parent_id) : null
        }
        return chain
    }, [level, tree])

    const childFolders = useMemo(() => (level ? (level.folders || []) : []), [level])
    const renamingFolder = useMemo(
        () => childFolders.find((folder) => folder.id === renamingFolderId) || null,
        [childFolders, renamingFolderId],
    )

    const masteredCount = useMemo(() => cards.filter((card) => card.mastery === 'mastered').length, [cards])
    const unmasteredCount = useMemo(() => cards.filter((card) => card.mastery === 'unmastered').length, [cards])
    const favoriteCount = useMemo(() => cards.filter((card) => card.favorite).length, [cards])

    // The theme is the one of the application. When the application does not
    // give a switch, the view keeps one of its own.
    const hasThemeSwitch = typeof onToggleTheme === 'function'
    const effectiveTheme = hasThemeSwitch ? theme : localTheme
    const isDark = effectiveTheme === 'Dark'

    useEffect(() => {
        setLocalTheme(theme)
    }, [theme])

    // The center column often cannot scroll, and a narrow window scrolls the
    // page instead. Scrolling down hides the dock. The pointer near the bottom
    // of the window brings it back. Nothing scrolling leaves it visible.
    useEffect(() => {
        let previous = window.scrollY
        function onWindowScroll() {
            const top = window.scrollY
            if (top > previous + 4) {
                setDockVisible(false)
            } else if (top < previous - 4) {
                setDockVisible(true)
            }
            previous = top
        }
        function onWindowPointerMove(event) {
            if (window.innerHeight - event.clientY < 80) {
                setDockVisible(true)
            }
        }
        window.addEventListener('scroll', onWindowScroll, { passive: true })
        window.addEventListener('pointermove', onWindowPointerMove)
        return () => {
            window.removeEventListener('scroll', onWindowScroll)
            window.removeEventListener('pointermove', onWindowPointerMove)
        }
    }, [])

    useEffect(() => () => {
        if (folderTimer.current) {
            clearTimeout(folderTimer.current)
            folderTimer.current = null
        }
    }, [])

    // The card in focus changes, and the address follows it.
    const selectCard = useCallback((index) => {
        const card = cardsWithBody[index]
        setActiveIndex(index)
        if (card && folderId) {
            navigate(`/folder/${folderId}/${card.id}`, { replace: true })
        }
    }, [cardsWithBody, folderId, navigate])

    async function applyMastery(cardId, mastery) {
        const card = cards.find((entry) => entry.id === cardId)
        if (!card || card.mastery === mastery) {
            // The card already has this mark, so nothing changes.
            return
        }
        const result = await setMastery(cardId, mastery)
        if (result && result.error) {
            reportError(errorText(result.error))
            return
        }
        setOverrides((previous) => ({
            ...previous,
            [cardId]: { ...(previous[cardId] || {}), mastery },
        }))
        clearError()
        changed()
    }

    async function applyFavorite(cardId, favorite) {
        const card = cards.find((entry) => entry.id === cardId)
        if (!card) {
            return
        }
        const result = await setFavorite(cardId, favorite)
        if (result && result.error) {
            reportError(errorText(result.error))
            return
        }
        setOverrides((previous) => ({
            ...previous,
            [cardId]: { ...(previous[cardId] || {}), favorite },
        }))
        clearError()
        changed()
    }

    async function saveCard(id, values) {
        const renamed = await renameCard(id, values.title)
        if (renamed && renamed.error) {
            reportError(errorText(renamed.error))
            return { error: renamed.error }
        }
        const bodyResult = await updateCardBody(id, values.body)
        if (bodyResult && bodyResult.error) {
            reportError(errorText(bodyResult.error))
            return { error: bodyResult.error }
        }
        clearError()
        changed()
        return {}
    }

    function beginTitleRename() {
        if (!level || !level.folder) {
            return
        }
        cancelTitle.current = false
        setTitleDraft(level.folder.name)
        setTitleEditing(true)
    }

    async function commitLevelTitle() {
        if (!level || !level.folder) {
            return false
        }
        const check = validateName(titleDraft)
        if (!check.ok) {
            reportError(check.error)
            return false
        }
        const result = await renameFolder(level.folder.id, check.name)
        if (result && result.error) {
            reportError(errorText(result.error))
            return false
        }
        setTitleEditing(false)
        clearError()
        changed()
        return true
    }

    function onTitleKeyDown(event) {
        event.stopPropagation()
        if (event.key === 'Escape') {
            event.preventDefault()
            cancelTitle.current = true
            setTitleEditing(false)
        }
        if (event.key === 'Enter') {
            event.preventDefault()
            event.currentTarget.blur()
        }
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
            // The name is saved before the search layer opens.
            event.preventDefault()
            commitLevelTitle().then((saved) => {
                if (saved) {
                    onOpenSearch?.()
                }
            })
        }
    }

    async function onTitleBlur(event) {
        if (cancelTitle.current) {
            cancelTitle.current = false
            return
        }
        const saved = await commitLevelTitle()
        if (!saved) {
            event.target.focus()
        }
    }

    // A click opens the folder, a double click renames it. The click waits a
    // moment, so the double click can take the row instead.
    function openFolder(folder) {
        if (folderTimer.current) {
            clearTimeout(folderTimer.current)
        }
        folderTimer.current = setTimeout(() => {
            folderTimer.current = null
            navigate(`/folder/${folder.id}`)
        }, 220)
    }

    function beginFolderRename(folder) {
        if (folderTimer.current) {
            clearTimeout(folderTimer.current)
            folderTimer.current = null
        }
        cancelRename.current = false
        setRenameDraft(folder.name)
        setRenamingFolderId(folder.id)
    }

    async function commitFolderRename(folder) {
        if (!folder) {
            return false
        }
        const check = validateName(renameDraft)
        if (!check.ok) {
            reportError(check.error)
            return false
        }
        const result = await renameFolder(folder.id, check.name)
        if (result && result.error) {
            reportError(errorText(result.error))
            return false
        }
        setRenamingFolderId(null)
        clearError()
        changed()
        return true
    }

    function onRenameKeyDown(event) {
        event.stopPropagation()
        if (event.key === 'Escape') {
            event.preventDefault()
            cancelRename.current = true
            setRenamingFolderId(null)
        }
        if (event.key === 'Enter') {
            event.preventDefault()
            event.currentTarget.blur()
        }
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
            // The name is saved before the search layer opens.
            event.preventDefault()
            commitFolderRename(renamingFolder).then((saved) => {
                if (saved) {
                    onOpenSearch?.()
                }
            })
        }
    }

    async function onRenameBlur(event) {
        if (cancelRename.current) {
            cancelRename.current = false
            return
        }
        const saved = await commitFolderRename(renamingFolder)
        if (!saved && event.target.isConnected) {
            event.target.focus()
        }
    }

    async function handleCreateCard() {
        if (!folderId) {
            return
        }
        setCreateMenuOpen(false)
        const result = await createCard(folderId)
        if (result && result.error) {
            reportError(errorText(result.error))
            return
        }
        if (!result || !result.card) {
            reportError('The card could not be created.')
            return
        }
        clearError()
        pendingEditId.current = result.card.id
        changed()
    }

    function openZen() {
        if (active && active.id) {
            navigate(`/zen/${folderId}`, { state: { cardId: active.id } })
            return
        }
        navigate(`/zen/${folderId}`)
    }

    function flipActiveCard() {
        setFlipRequest((value) => value + 1)
    }

    function beginCreateFolder() {
        setCreateMenuOpen(false)
        setFolderDraft('')
        setFolderPromptError('')
        setFolderPromptOpen(true)
    }

    async function commitCreateFolder() {
        if (!folderId) {
            return false
        }
        const check = validateName(folderDraft)
        if (!check.ok) {
            setFolderPromptError(check.error)
            return false
        }
        const result = await createFolder(folderId, check.name)
        if (result && result.error) {
            const message = errorText(result.error)
            setFolderPromptError(message)
            reportError(message)
            return false
        }
        setFolderPromptOpen(false)
        setFolderDraft('')
        setFolderPromptError('')
        clearError()
        changed()
        return true
    }

    // The dock slides out of the screen when the level is read downwards and
    // comes back when the pointer is near the bottom of the level.
    function onCenterScroll(event) {
        const top = event.currentTarget.scrollTop
        const previous = scrollTopRef.current
        scrollTopRef.current = top
        if (top > previous + 4) {
            setDockVisible(false)
        } else if (top < previous - 4) {
            setDockVisible(true)
        }
    }

    function onCenterMouseMove(event) {
        const node = event.currentTarget
        const box = node.getBoundingClientRect()
        if (box.bottom - event.clientY < 140) {
            setDockVisible(true)
        }
    }

    function toggleTheme() {
        if (hasThemeSwitch) {
            onToggleTheme()
            return
        }
        setLocalTheme((current) => (current === 'Dark' ? 'White' : 'Dark'))
    }

    if (!folderId) {
        return (
            <div className="file-view file-view--panel" data-theme={effectiveTheme}>
                <div className="state state--empty">
                    <p className="state__title">No level is open.</p>
                    <p className="state__text">Open a folder from the sidebar to see its cards.</p>
                </div>
            </div>
        )
    }

    const folder = level ? level.folder : null
    const folderName = folder ? folder.name : ''

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

    return (
        <div className="file-view file-view--panel" data-theme={effectiveTheme}>
            <header className="file-view__topbar">
                <button
                    type="button"
                    className="file-view__search"
                    onClick={() => onOpenSearch?.()}
                >
                    <HugeiconsIcon icon={Search01Icon} size={16} color="currentColor" aria-hidden="true" />
                    <span>Search</span>
                </button>

                <div className="file-view__identity">
                    {titleEditing ? (
                        <input
                            className="file-view__name-input"
                            autoFocus
                            aria-label="Level name"
                            value={titleDraft}
                            onChange={(event) => setTitleDraft(event.target.value)}
                            onKeyDown={onTitleKeyDown}
                            onBlur={onTitleBlur}
                        />
                    ) : (
                        <h1
                            className="file-view__name"
                            title="Double click to rename"
                            onDoubleClick={beginTitleRename}
                        >
                            {folderName}
                        </h1>
                    )}
                    <p className="file-view__meta">
                        <span className="file-view__breadcrumb">
                            {breadcrumb.map((entry, index) => (
                                <span className="file-view__crumb" key={entry.id}>
                                    {index < breadcrumb.length - 1 ? (
                                        <button
                                            type="button"
                                            className="file-view__crumb-link"
                                            onClick={() => navigate(`/folder/${entry.id}`)}
                                        >
                                            {entry.name}
                                        </button>
                                    ) : (
                                        <span className="file-view__crumb-current" aria-current="page">{entry.name}</span>
                                    )}
                                    {index < breadcrumb.length - 1 ? (
                                        <span className="file-view__crumb-sep" aria-hidden="true">›</span>
                                    ) : null}
                                </span>
                            ))}
                        </span>
                        <span className="file-view__dot" aria-hidden="true">·</span>
                        <span className="file-view__counts">
                            {plural(childFolders.length, 'folder')} · {plural(cards.length, 'card')}
                        </span>
                    </p>
                </div>

                <button
                    type="button"
                    className="file-view__theme"
                    role="switch"
                    aria-checked={isDark}
                    aria-label="Dark theme"
                    data-dark={isDark ? 'true' : 'false'}
                    onClick={toggleTheme}
                >
                    <span className="file-view__theme-knob" aria-hidden="true" />
                </button>
            </header>

            <div className="file-view__columns">
                <aside className="file-view__left">
                    <div className="file-view__folders">
                        {childFolders.map((child) => (
                            <div className="file-view__folder-row" key={child.id}>
                                {renamingFolderId === child.id ? (
                                    <input
                                        className="file-view__folder-input"
                                        autoFocus
                                        aria-label={`Name of ${child.name}`}
                                        value={renameDraft}
                                        onChange={(event) => setRenameDraft(event.target.value)}
                                        onKeyDown={onRenameKeyDown}
                                        onBlur={onRenameBlur}
                                    />
                                ) : (
                                    <button
                                        type="button"
                                        className="file-view__folder-button"
                                        title={`${child.name} — double click to rename`}
                                        onClick={() => openFolder(child)}
                                        onDoubleClick={() => beginFolderRename(child)}
                                    >
                                        <HugeiconsIcon icon={Folder01Icon} size={16} color="currentColor" aria-hidden="true" />
                                        <span className="file-view__folder-name">{child.name}</span>
                                    </button>
                                )}
                                {child.parent_id ? (
                                    <button
                                        type="button"
                                        className="file-view__folder-delete"
                                        aria-label={`Delete ${child.name}`}
                                        title="Delete"
                                        onClick={() => onRequestDelete?.({
                                            kind: 'folder',
                                            id: child.id,
                                            label: child.name,
                                            isRoot: false,
                                            parentId: child.parent_id,
                                        })}
                                    >
                                        <HugeiconsIcon icon={Delete02Icon} size={16} color="currentColor" aria-hidden="true" />
                                    </button>
                                ) : null}
                            </div>
                        ))}
                    </div>

                    {cards.length ? (
                        <CardWheel
                            cards={cards}
                            activeIndex={activeIndex}
                            onSelect={selectCard}
                            onActiveClick={flipActiveCard}
                            theme={effectiveTheme}
                        />
                    ) : null}

                    <MasteryDial
                        mastered={masteredCount}
                        unmastered={unmasteredCount}
                        size={132}
                        onOpen={() => navigate(`/stats/${folderId}`)}
                        theme={effectiveTheme}
                    />
                </aside>

                <main
                    className="file-view__center"
                    onScroll={onCenterScroll}
                    onMouseMove={onCenterMouseMove}
                >
                    {status === 'loading' ? (
                        <p className="state__message file-view__center-message">Loading this level…</p>
                    ) : null}

                    {status === 'error' ? (
                        <div className="state state--error">
                            <p className="state__title">This level could not be loaded.</p>
                            <p className="state__text">{loadError}</p>
                        </div>
                    ) : null}

                    {status === 'ready' && !cards.length ? (
                        <div className="file-view__empty">
                            <p className="file-view__empty-text">This level has no cards.</p>
                            <button
                                type="button"
                                className="file-view__button file-view__button--primary"
                                onClick={handleCreateCard}
                            >
                                Create card
                            </button>
                        </div>
                    ) : null}

                </main>

                {status === 'ready' && cards.length ? (
                    <ArcGallery
                        className="file-view__stage"
                        cards={cardsWithBody}
                        activeIndex={activeIndex}
                        onActiveIndexChange={selectCard}
                        flipRequest={flipRequest}
                        arrangement="deck"
                        zoom="focused"
                        focusExtra={masteryButtons}
                        theme={effectiveTheme}
                    />
                ) : null}

                <aside className="file-view__right">
                    <FavoritesRail
                        favoriteCount={favoriteCount}
                        filterActive={false}
                        onToggleFilter={() => {}}
                        onOpenZen={openZen}
                        theme={effectiveTheme}
                    />
                </aside>
            </div>

            <Dock
                visible={dockVisible}
                favoriteActive={Boolean(active && active.favorite)}
                onFavorite={() => {
                    if (active) {
                        applyFavorite(active.id, !active.favorite)
                    }
                }}
                onCreate={() => setCreateMenuOpen((open) => !open)}
                onEdit={() => {
                    if (active) {
                        setEditing(true)
                    }
                }}
                onDelete={() => {
                    if (active) {
                        onRequestDelete?.({
                            kind: 'card',
                            id: active.id,
                            label: active.title,
                            folderId,
                        })
                    }
                }}
                theme={effectiveTheme}
            />

            {createMenuOpen ? (
                <>
                    <div className="file-view__menu-scrim" onClick={() => setCreateMenuOpen(false)} />
                    <div className="file-view__create-menu" role="menu" aria-label="Create">
                        <button
                            type="button"
                            role="menuitem"
                            className="file-view__create-item"
                            onClick={handleCreateCard}
                        >
                            Create card
                        </button>
                        <button
                            type="button"
                            role="menuitem"
                            className="file-view__create-item"
                            onClick={beginCreateFolder}
                        >
                            Create folder
                        </button>
                    </div>
                </>
            ) : null}

            {folderPromptOpen ? (
                <div
                    className="file-view__prompt-layer"
                    role="presentation"
                    onClick={(event) => {
                        if (event.target === event.currentTarget) {
                            setFolderPromptOpen(false)
                        }
                    }}
                >
                    <div className="file-view__prompt" role="dialog" aria-modal="true" aria-label="New folder">
                        <h2 className="file-view__prompt-title">New folder</h2>
                        <input
                            className="file-view__prompt-input"
                            autoFocus
                            aria-label="Folder name"
                            value={folderDraft}
                            onChange={(event) => {
                                setFolderDraft(event.target.value)
                                setFolderPromptError('')
                            }}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    event.preventDefault()
                                    commitCreateFolder()
                                }
                                if (event.key === 'Escape') {
                                    event.preventDefault()
                                    setFolderPromptOpen(false)
                                }
                            }}
                        />
                        {folderPromptError ? (
                            <p className="file-view__prompt-error" role="alert">{folderPromptError}</p>
                        ) : null}
                        <div className="file-view__prompt-actions">
                            <button
                                type="button"
                                className="file-view__button"
                                onClick={() => setFolderPromptOpen(false)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="file-view__button file-view__button--primary"
                                onClick={commitCreateFolder}
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            <EditPanel
                open={editing}
                card={active ? { id: active.id, title: active.title, body: active.body } : null}
                onClose={() => setEditing(false)}
                onSave={saveCard}
                theme={effectiveTheme}
            />
        </div>
    )
}
