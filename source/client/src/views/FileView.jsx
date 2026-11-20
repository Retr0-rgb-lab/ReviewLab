// The file view: one level of the tree and the actions that change it.
// Reads go through levelActions.js, writes through fileActions.js.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CardTile from '../components/CardTile.jsx'
import FolderTile from '../components/FolderTile.jsx'
import ItemGrid from '../components/ItemGrid.jsx'
import { CreateFolderButton } from '../components/CreateControls.jsx'
import { registerPendingCommit } from '../pendingCommit.js'
import { createFolder, renameCard, renameFolder, validateName } from './fileActions.js'
import { fetchLevel } from './levelActions.js'

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

export default function FileView({
    folderId,
    theme = 'White',
    dataVersion = 0,
    onOpenSearch,
    onRequestDelete,
    onError,
    onClearError,
    onDataChanged,
    onLevelReady,
}) {
    const navigate = useNavigate()
    const [level, setLevel] = useState(null)
    const [status, setStatus] = useState('loading')
    const [loadError, setLoadError] = useState('')
    const [editingId, setEditingId] = useState(null)
    const [draftFolder, setDraftFolder] = useState(null)
    const [titleEditing, setTitleEditing] = useState(false)
    const [titleDraft, setTitleDraft] = useState('')
    const cancelTitle = useRef(false)
    const draftInput = useRef(null)
    const loadedKey = useRef(null)

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
                    onLevelReady(folderId, false)
                    return
                }
                setLevel(result)
                setStatus('ready')
                onLevelReady(folderId, true)
            })
            .catch((caught) => {
                if (cancelled) {
                    return
                }
                setStatus('error')
                setLevel(null)
                setLoadError(caught && caught.message ? caught.message : 'This level could not be loaded.')
                onLevelReady(folderId, false)
            })

        return () => {
            cancelled = true
        }
    }, [folderId, dataVersion, onLevelReady])

    useEffect(() => () => {
        if (folderId) {
            onLevelReady(folderId, false)
        }
    }, [folderId, onLevelReady])

    const items = useMemo(() => orderLevel(level && level.folders, level && level.cards), [level])

    const gridItems = useMemo(() => {
        if (!draftFolder) {
            return items
        }
        // The unsaved folder is a row of the level. It is not written until the
        // name is valid.
        return [...items, { kind: 'folder', id: 'draft-folder', name: draftFolder.name, draft: true }]
    }, [items, draftFolder])

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

    async function renameFolderItem(item, rawName) {
        const result = await renameFolder(item.id, rawName)
        if (result && result.error) {
            reportError(errorText(result.error))
            return { error: result.error }
        }
        setEditingId(null)
        clearError()
        changed()
        return result
    }

    async function renameCardItem(item, rawTitle) {
        const result = await renameCard(item.id, rawTitle)
        if (result && result.error) {
            reportError(errorText(result.error))
            return { error: result.error }
        }
        setEditingId(null)
        clearError()
        changed()
        return result
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

    // While the level name is being edited, the application can ask for the
    // change to be saved. The search shortcut uses this.
    useEffect(() => {
        if (!titleEditing) {
            return undefined
        }
        const commit = async () => {
            const check = validateName(titleDraft)
            if (!check.ok) {
                reportError(check.error)
                return { ok: false, message: check.error }
            }
            const saved = await commitLevelTitle()
            return saved
                ? { ok: true }
                : { ok: false, message: 'The name could not be saved.' }
        }
        return registerPendingCommit(commit)
    }, [titleEditing, titleDraft])

    async function commitDraftFolder() {
        if (!level || !level.folder || !draftFolder) {
            return false
        }
        const check = validateName(draftFolder.name)
        if (!check.ok) {
            reportError(check.error)
            return false
        }
        const result = await createFolder(level.folder.id, check.name)
        if (result && result.error) {
            reportError(errorText(result.error))
            return false
        }
        setDraftFolder(null)
        clearError()
        changed()
        return true
    }

    function onTitleClick(event) {
        if (!level || event.detail !== 2) {
            return
        }
        cancelTitle.current = false
        setTitleDraft(level.folder.name)
        setTitleEditing(true)
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
            // A valid change is saved before the search opens.
            event.preventDefault()
            commitLevelTitle().then((saved) => {
                if (saved) {
                    onOpenSearch()
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

    function onDraftKeyDown(event) {
        event.stopPropagation()
        if (event.key === 'Escape') {
            event.preventDefault()
            setDraftFolder(null)
        }
        if (event.key === 'Enter') {
            event.preventDefault()
            event.currentTarget.blur()
        }
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
            event.preventDefault()
            commitDraftFolder().then((saved) => {
                if (saved) {
                    onOpenSearch()
                }
            })
        }
    }

    async function onDraftBlur(event) {
        const saved = await commitDraftFolder()
        if (!saved) {
            if (draftInput.current) {
                draftInput.current.focus()
            } else {
                event.target.focus()
            }
        }
    }

    function openFocus() {
        if (!items.length) {
            return
        }
        navigate(`/focus/${folderId}/${items[0].id}`)
    }

    function renderFolder(item) {
        if (item.draft) {
            return (
                <div className="file-view__draft">
                    <span className="file-view__draft-label">New folder</span>
                    <input
                        ref={draftInput}
                        className="file-view__draft-input"
                        autoFocus
                        aria-label="New folder name"
                        value={draftFolder.name}
                        onChange={(event) => setDraftFolder({ name: event.target.value })}
                        onKeyDown={onDraftKeyDown}
                        onBlur={onDraftBlur}
                    />
                </div>
            )
        }
        return (
            <FolderTile
                folder={item}
                theme={theme}
                onEnter={() => navigate(`/folder/${item.id}`)}
                editing={editingId === item.id}
                onBeginRename={() => setEditingId(item.id)}
                onCommitRename={(name) => renameFolderItem(item, name)}
                onCancelRename={() => setEditingId(null)}
                onDelete={() => onRequestDelete({
                    kind: 'folder',
                    id: item.id,
                    label: item.name,
                    isRoot: false,
                    parentId: item.parent_id,
                })}
            />
        )
    }

    function renderCard(item) {
        return (
            <CardTile
                title={item.title}
                theme={theme}
                onOpen={() => navigate(`/focus/${folderId}/${item.id}`)}
                editing={editingId === item.id}
                onBeginEdit={() => setEditingId(item.id)}
                onCommitEdit={(title) => renameCardItem(item, title)}
                onCancelEdit={() => setEditingId(null)}
                onDelete={() => onRequestDelete({
                    kind: 'card',
                    id: item.id,
                    label: item.title,
                    folderId,
                })}
            />
        )
    }

    if (!folderId) {
        return (
            <div className="file-view file-view__main">
                <div className="state state--empty">
                    <p className="state__title">No level is open.</p>
                    <p className="state__text">Open a folder from the sidebar to see its cards.</p>
                </div>
            </div>
        )
    }

    const folder = level ? level.folder : null
    const folderCount = level ? (level.folders || []).length : 0
    const cardCount = level ? (level.cards || []).length : 0
    const isRoot = Boolean(folder && !folder.parent_id)

    return (
        <div className="file-view file-view__main">
            {folder ? (
                <header className="file-view__heading">
                    {titleEditing ? (
                        <input
                            className="file-view__title-input"
                            autoFocus
                            aria-label="Level name"
                            value={titleDraft}
                            onChange={(event) => setTitleDraft(event.target.value)}
                            onKeyDown={onTitleKeyDown}
                            onBlur={onTitleBlur}
                        />
                    ) : (
                        <h1 className="file-view__title" data-level-title onClick={onTitleClick}>
                            {folder.name}
                        </h1>
                    )}
                    <p className="file-view__counts">{folderCount} folders, {cardCount} cards.</p>
                    <div className="file-view__actions">
                        <CreateFolderButton
                            disabled={status !== 'ready'}
                            onBeginDraft={() => setDraftFolder({ name: '' })}
                        />
                        <button
                            type="button"
                            className="file-view__button"
                            onClick={openFocus}
                            disabled={status !== 'ready' || items.length === 0}
                        >
                            Focus
                        </button>
                        <button
                            type="button"
                            className="file-view__button"
                            onClick={() => navigate(`/stats/${folderId}`)}
                            disabled={status !== 'ready'}
                        >
                            Statistics
                        </button>
                        <button
                            type="button"
                            className="file-view__button"
                            onClick={onOpenSearch}
                        >
                            Search
                        </button>
                        {folder && !isRoot ? (
                            <button
                                type="button"
                                className="file-view__button"
                                onClick={() => onRequestDelete({
                                    kind: 'folder',
                                    id: folder.id,
                                    label: folder.name,
                                    isRoot: false,
                                    parentId: folder.parent_id,
                                })}
                            >
                                Delete level
                            </button>
                        ) : null}
                    </div>
                </header>
            ) : null}

            {status === 'loading' ? (
                <p className="state__message">Loading this level…</p>
            ) : null}

            {status === 'error' ? (
                <div className="state state--error">
                    <p className="state__title">This level could not be loaded.</p>
                    <p className="state__text">{loadError}</p>
                </div>
            ) : null}

            {status === 'ready' && items.length === 0 && !draftFolder ? (
                <div className="state state--empty">
                    <p className="state__title">This level is empty.</p>
                    <p className="state__text">Create a folder here, or create a card from the sidebar.</p>
                </div>
            ) : null}

            {status === 'ready' ? (
                <ItemGrid items={gridItems} renderFolder={renderFolder} renderCard={renderCard} />
            ) : null}
        </div>
    )
}
