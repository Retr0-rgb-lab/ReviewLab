// The application root. It owns the router, the global theme, the search
// layer and the delete confirmation that the three views share.
//
// Every read goes through levelActions.js, every write through fileActions.js.

import { Component, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
    BrowserRouter,
    Navigate,
    Route,
    Routes,
    useMatch,
    useNavigate,
    useParams,
} from 'react-router-dom'

import AppShell, { shellOverlay } from './components/AppShell.jsx'
import SearchPalette from './components/SearchPalette.jsx'
import Sidebar from './components/Sidebar.jsx'
import FileView, { errorText, orderLevel } from './views/FileView.jsx'
import FocusView from './views/FocusView.jsx'
import StatsView from './views/StatsView.jsx'
import {
    createCard,
    deleteCard,
    deleteFolder,
    removalConfirmText,
    renameCard,
    setMastery,
    updateCardBody,
} from './views/fileActions.js'
import { fetchDeleteImpact, fetchLevel, fetchRootFolder, fetchTree } from './views/levelActions.js'
import { isSearchShortcut, openSearchResult } from './views/searchActions.js'
import { runPendingCommit } from './pendingCommit.js'

const THEME_STORAGE_KEY = 'reviewlab.theme'

// Keeps a broken layer from taking the whole application down.
class LayerBoundary extends Component {
    constructor(props) {
        super(props)
        this.state = { failed: false }
    }

    static getDerivedStateFromError() {
        return { failed: true }
    }

    render() {
        if (this.state.failed) {
            return <p className="state__message">This layer could not be shown.</p>
        }
        return this.props.children
    }
}

export function readStoredTheme() {
    try {
        return window.localStorage.getItem(THEME_STORAGE_KEY) === 'Dark' ? 'Dark' : 'White'
    } catch (error) {
        return 'White'
    }
}

function storeTheme(theme) {
    try {
        window.localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch (error) {
        // The theme is only a preference, so a blocked storage is not an error.
    }
}

// The rows of the whole tree. A folder is matched by its name, a card by its
// title and its body. Every row carries the folders above it, so a result can
// show the path from the outermost folder down to its parent.
function searchRows(tree) {
    const folders = (tree && tree.folders) || []
    const cards = (tree && tree.cards) || []
    const byId = new Map(folders.map((folder) => [folder.id, folder]))

    const chainAbove = (folderId) => {
        const chain = []
        let parentId = folderId
        while (parentId) {
            const parent = byId.get(parentId)
            if (!parent) {
                break
            }
            chain.unshift(parent)
            parentId = parent.parent_id
        }
        return chain
    }

    return [
        ...folders.map((row) => ({ ...row, kind: 'folder', ancestors: chainAbove(row.parent_id) })),
        ...cards.map((row) => ({
            ...row,
            kind: 'card',
            ancestors: chainAbove(row.folder_id),
        })),
    ]
}

function defaultRemovalText(folderCount, cardCount) {
    return `This removes ${folderCount} folders and ${cardCount} cards. The item you picked counts as one of them.`
}

// The sentence of the delete confirmation. It always states the real counts.
function removalSentence(folderCount, cardCount, kind) {
    const sentence = removalConfirmText(folderCount, cardCount, kind)
    return sentence || defaultRemovalText(folderCount, cardCount)
}

function cardBody(tree, cardId, fallback = '') {
    const cards = (tree && tree.cards) || []
    const found = cards.find((card) => card.id === cardId)
    if (!found || typeof found.body !== 'string') {
        return fallback
    }
    return found.body
}

function RootRoute() {
    const [root, setRoot] = useState(undefined)
    const [message, setMessage] = useState('')

    useEffect(() => {
        let cancelled = false
        fetchRootFolder()
            .then((result) => {
                if (cancelled) {
                    return
                }
                if (!result || result.error) {
                    setMessage(result && result.error ? errorText(result.error) : '')
                    setRoot(null)
                    return
                }
                setRoot(result)
            })
            .catch((caught) => {
                if (!cancelled) {
                    setMessage(caught && caught.message ? caught.message : '')
                    setRoot(null)
                }
            })
        return () => {
            cancelled = true
        }
    }, [])

    if (root === undefined) {
        return <p className="state__message">Loading the tree…</p>
    }
    if (root === null) {
        return (
            <div className="state state--empty">
                <p className="state__title">There is no root folder yet.</p>
                <p className="state__text">
                    {message || 'The tree starts with one outer folder. Add it in the database, then reload this page.'}
                </p>
            </div>
        )
    }
    return <Navigate to={`/folder/${root.id}`} replace />
}

function FileRoute(props) {
    const { folderId } = useParams()
    return <FileView {...props} folderId={folderId} />
}

function FocusRoute(props) {
    const { folderId, itemId } = useParams()
    const navigate = useNavigate()
    const [state, setState] = useState({ status: 'loading', message: '' })
    const loadedKey = useRef(null)

    useEffect(() => {
        let cancelled = false
        const key = `${folderId}|${itemId}`
        const silent = loadedKey.current === key
        loadedKey.current = key
        if (!silent) {
            setState({ status: 'loading', message: '' })
        }

        // The level gives the order of the items, the tree gives the body of
        // the card that is being reviewed.
        Promise.all([fetchLevel(folderId), fetchTree()])
            .then(([level, tree]) => {
                if (cancelled) {
                    return
                }
                if (!level || level.error) {
                    setState({
                        status: 'error',
                        message: errorText(level && level.error, 'This level could not be loaded.'),
                    })
                    return
                }
                const items = orderLevel(level.folders, level.cards)
                const index = items.findIndex((entry) => entry.id === itemId)
                const item = index >= 0 ? items[index] : null
                const withBody = item && item.kind === 'card'
                    ? { ...item, body: cardBody(tree, item.id, item.body) }
                    : item
                setState({ status: 'ready', level, items, index, item: withBody })
                props.onLevelReady(folderId, true)
            })
            .catch((caught) => {
                if (cancelled) {
                    return
                }
                setState({
                    status: 'error',
                    message: caught && caught.message ? caught.message : 'This level could not be loaded.',
                })
            })

        return () => {
            cancelled = true
        }
    }, [folderId, itemId, props.dataVersion])

    async function commitTitle(cardId, title) {
        const result = await renameCard(cardId, title)
        if (result && result.error) {
            props.onError(errorText(result.error))
            return result
        }
        props.onClearError()
        props.onDataChanged()
        return result
    }

    async function commitBody(cardId, body) {
        const result = await updateCardBody(cardId, body)
        if (result && result.error) {
            props.onError(errorText(result.error))
            return result
        }
        props.onClearError()
        props.onDataChanged()
        return result
    }

    async function commitMastery(cardId, mastery) {
        const result = await setMastery(cardId, mastery)
        if (result && result.error) {
            props.onError(errorText(result.error))
            return result
        }
        props.onClearError()
        props.onDataChanged()
        return result
    }

    if (state.status === 'loading') {
        return <p className="state__message">Loading this item…</p>
    }
    if (state.status === 'error') {
        return (
            <div className="state state--error">
                <p className="state__title">This item could not be opened.</p>
                <p className="state__text">{state.message}</p>
            </div>
        )
    }
    if (!state.item) {
        return (
            <div className="state state--empty">
                <p className="state__title">This item is not in this level.</p>
                <p className="state__text">Open the level again to pick an item.</p>
            </div>
        )
    }

    const cards = (state.level && state.level.cards) || []
    const masteredCount = cards.filter((card) => card.mastery === 'mastered').length
    const unmasteredCount = cards.filter((card) => card.mastery === 'unmastered').length

    return (
        <FocusView
            folder={state.level.folder}
            item={state.item}
            items={state.items}
            index={state.index}
            masteredCount={masteredCount}
            unmasteredCount={unmasteredCount}
            onCommitTitle={commitTitle}
            onCommitBody={commitBody}
            onCommitMastery={commitMastery}
            onNavigate={(itemIndex) => {
                const target = state.items[itemIndex]
                if (target) {
                    navigate(`/focus/${folderId}/${target.id}`)
                }
            }}
            onOpenFolder={(item) => navigate(`/folder/${item.id}`)}
            onExit={() => {
                // The escape key returns to the file view of the level above.
                // At the outermost folder there is no level above, so Focus
                // stays where it is.
                const parentId = state.level && state.level.folder
                    ? state.level.folder.parent_id
                    : null
                if (parentId) {
                    navigate(`/folder/${parentId}`)
                }
            }}
        />
    )
}

function StatsRoute(props) {
    const { folderId } = useParams()
    const navigate = useNavigate()
    const [state, setState] = useState({ status: 'loading', message: '' })
    const loadedKey = useRef(null)

    useEffect(() => {
        let cancelled = false
        const silent = loadedKey.current === folderId
        loadedKey.current = folderId
        if (!silent) {
            setState({ status: 'loading', message: '' })
        }

        fetchLevel(folderId)
            .then((level) => {
                if (cancelled) {
                    return
                }
                if (!level || level.error) {
                    setState({
                        status: 'error',
                        message: errorText(level && level.error, 'This level could not be loaded.'),
                    })
                    return
                }
                setState({ status: 'ready', level })
                props.onLevelReady(folderId, true)
            })
            .catch((caught) => {
                if (cancelled) {
                    return
                }
                setState({
                    status: 'error',
                    message: caught && caught.message ? caught.message : 'This level could not be loaded.',
                })
            })

        return () => {
            cancelled = true
        }
    }, [folderId, props.dataVersion])

    if (state.status === 'loading') {
        return <p className="state__message">Loading the numbers…</p>
    }
    if (state.status === 'error') {
        return (
            <div className="state state--error">
                <p className="state__title">The numbers could not be read.</p>
                <p className="state__text">{state.message}</p>
            </div>
        )
    }

    return (
        <StatsView
            folder={state.level.folder}
            cards={state.level.cards || []}
            onOpenCard={(cardId) => navigate(`/focus/${folderId}/${cardId}`)}
        />
    )
}

function ReviewLab() {
    const navigate = useNavigate()
    const [theme, setTheme] = useState(readStoredTheme)
    const [error, setError] = useState('')
    const [tree, setTree] = useState({ folders: [], cards: [] })
    const [dataVersion, setDataVersion] = useState(0)
    const [searchOpen, setSearchOpen] = useState(false)
    const [query, setQuery] = useState('')
    const [pendingDelete, setPendingDelete] = useState(null)
    const [readyFolders, setReadyFolders] = useState({})

    const folderMatch = useMatch('/folder/:folderId')
    const focusMatch = useMatch('/focus/:folderId/:itemId')
    const statsMatch = useMatch('/stats/:folderId')
    const currentFolderId = (folderMatch && folderMatch.params.folderId)
        || (focusMatch && focusMatch.params.folderId)
        || (statsMatch && statsMatch.params.folderId)
        || null

    useEffect(() => {
        storeTheme(theme)
    }, [theme])

    // The tree feeds the sidebar and the search. It is read again after a
    // write so that both show the current state.
    useEffect(() => {
        let cancelled = false
        fetchTree()
            .then((result) => {
                if (cancelled) {
                    return
                }
                if (!result || result.error) {
                    setError(errorText(result && result.error, 'The tree could not be read.'))
                    return
                }
                setTree({ folders: result.folders || [], cards: result.cards || [] })
            })
            .catch((caught) => {
                if (!cancelled) {
                    setError(caught && caught.message ? caught.message : 'The tree could not be read.')
                }
            })
        return () => {
            cancelled = true
        }
    }, [dataVersion])

    const openSearch = useCallback(() => {
        setSearchOpen(true)
        setQuery('')
    }, [])

    const closeSearch = useCallback(() => {
        setSearchOpen(false)
    }, [])

    const cancelDelete = useCallback(() => {
        setPendingDelete(null)
    }, [])

    const onDataChanged = useCallback(() => {
        setDataVersion((version) => version + 1)
    }, [])

    const clearError = useCallback(() => {
        setError('')
    }, [])

    const onLevelReady = useCallback((folderId, ready) => {
        setReadyFolders((previous) => {
            if (ready) {
                if (previous[folderId]) {
                    return previous
                }
                return { ...previous, [folderId]: true }
            }
            if (!previous[folderId]) {
                return previous
            }
            const next = { ...previous }
            delete next[folderId]
            return next
        })
    }, [])

    // The shortcut and the escape key belong to the whole application. While
    // the delete confirmation is open, the escape key cancels the delete and
    // the shortcut does nothing.
    useEffect(() => {
        function onKeyDown(event) {
            if (isSearchShortcut(event, { confirmOpen: Boolean(pendingDelete) })) {
                event.preventDefault()
                if (searchOpen) {
                    closeSearch()
                    return
                }
                // The specification: a change that is being edited is saved
                // before the search opens. An invalid change keeps the search
                // closed and shows the reason.
                runPendingCommit().then((outcome) => {
                    if (!outcome.ok) {
                        setError(outcome.message || 'The change cannot be saved.')
                        return
                    }
                    openSearch()
                })
                return
            }
            if (event.key === 'Escape') {
                if (pendingDelete) {
                    event.preventDefault()
                    cancelDelete()
                    return
                }
                if (searchOpen) {
                    event.preventDefault()
                    closeSearch()
                }
            }
        }

        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [pendingDelete, searchOpen, openSearch, closeSearch, cancelDelete])

    // The rows of the whole tree. The search layer does the matching and the
    // grouping, the application only opens the row that was chosen.
    const rows = useMemo(() => searchRows(tree), [tree])

    // The branch menu of the sidebar: the root folder and its children.
    const menuItems = useMemo(() => {
        const folders = tree.folders || []
        const root = folders.find((folder) => !folder.parent_id)
        if (!root) {
            return []
        }
        return [{
            label: root.name,
            children: folders
                .filter((folder) => folder.parent_id === root.id)
                .map((folder) => ({ value: folder.id, label: folder.name })),
        }]
    }, [tree])

    const confirmSearchResult = useCallback((row) => {
        closeSearch()
        const target = openSearchResult(row)
        if (!target) {
            return
        }
        if (target.target === 'folder') {
            navigate(`/folder/${target.folderId}`)
            return
        }
        navigate(`/focus/${target.folderId}/${target.cardId}`)
    }, [navigate, closeSearch])
    // The root folder of the tree. The delete confirmation needs it, so it is
    // found before the callbacks that read it.
    const rootFolderId = useMemo(() => {
        const folders = tree.folders || []
        const root = folders.find((folder) => !folder.parent_id)
        return root ? root.id : null
    }, [tree])

    // The counts of the confirmation come from the server, so they always
    // match what a delete would really remove.
    const requestDelete = useCallback(async (payload) => {
        closeSearch()
        let folderCount = 0
        let cardCount = 0

        if (payload.kind === 'folder') {
            let impact = null
            try {
                impact = await fetchDeleteImpact(payload.id)
            } catch (caught) {
                setError(caught && caught.message ? caught.message : 'The delete could not be prepared.')
                return
            }
            if (!impact || impact.error) {
                setError(errorText(impact && impact.error, 'The delete could not be prepared.'))
                return
            }
            folderCount = Number(impact.folderCount) || 0
            cardCount = Number(impact.cardCount) || 0
        } else {
            // The picked card counts itself.
            cardCount = 1
        }

        setPendingDelete({
            ...payload,
            folderCount,
            cardCount,
            text: removalSentence(folderCount, cardCount, payload.kind),
        })
    }, [closeSearch])

    const confirmDelete = useCallback(async () => {
        if (!pendingDelete) {
            return
        }
        const { kind, id, isRoot, parentId } = pendingDelete
        let result = null
        try {
            // The root folder is refused by the client as well, so no request
            // is sent for it.
            result = kind === 'folder'
                ? await deleteFolder(id, Boolean(isRoot) || id === rootFolderId)
                : await deleteCard(id)
        } catch (caught) {
            setError(caught && caught.message ? caught.message : 'The item could not be deleted.')
            return
        }
        if (!result || result.error) {
            setError(errorText(result && result.error, 'The item could not be deleted.'))
            return
        }

        setPendingDelete(null)
        setError('')
        setDataVersion((version) => version + 1)
        if (kind === 'folder' && id === currentFolderId && parentId) {
            navigate(`/folder/${parentId}`)
        }
    }, [pendingDelete, currentFolderId, rootFolderId, navigate])

    const createCardInLevel = useCallback(async () => {
        if (!currentFolderId) {
            return
        }
        let result = null
        try {
            result = await createCard(currentFolderId)
        } catch (caught) {
            setError(caught && caught.message ? caught.message : 'The card could not be created.')
            return
        }
        if (!result || result.error || !result.card) {
            setError(errorText(result && result.error, 'The card could not be created.'))
            return
        }
        setError('')
        setDataVersion((version) => version + 1)
        navigate(`/focus/${currentFolderId}/${result.card.id}`)
    }, [currentFolderId, navigate])

    const levelReady = Boolean(currentFolderId && readyFolders[currentFolderId])

    const shared = {
        theme,
        dataVersion,
        onOpenSearch: openSearch,
        onRequestDelete: requestDelete,
        onError: setError,
        onClearError: clearError,
        onDataChanged: onDataChanged,
        onLevelReady: onLevelReady,
    }

    const sidebar = (
        <Sidebar
            items={menuItems}
            onSelect={(value) => navigate(`/folder/${value}`)}
            theme={theme}
            onToggleTheme={() => setTheme((current) => current === 'Dark' ? 'White' : 'Dark')}
            onOpenSearch={openSearch}
            onCreateCard={createCardInLevel}
            createCardDisabled={!levelReady}
        />
    )

    const searchPalette = (
        <SearchPalette
            open={searchOpen}
            rows={rows}
            onQueryChange={setQuery}
            onConfirm={confirmSearchResult}
            onClose={closeSearch}
        />
    )

    const overlay = shellOverlay({
        open: searchOpen,
        children: searchPalette,
    })

    const deleteDialog = pendingDelete ? (
        <div
            className="confirm-layer"
            role="presentation"
            onClick={(event) => {
                if (event.target === event.currentTarget) {
                    cancelDelete()
                }
            }}
        >
            <div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
                <h2 className="confirm-dialog__title" id="confirm-dialog-title">
                    Delete {pendingDelete.kind === 'folder' ? 'folder' : 'card'}
                    {pendingDelete.label ? ` “${pendingDelete.label}”` : ''}?
                </h2>
                <p className="confirm-dialog__text">{pendingDelete.text}</p>
                <div className="confirm-dialog__actions">
                    <button type="button" className="confirm-dialog__button" onClick={cancelDelete} autoFocus>
                        Cancel
                    </button>
                    <button type="button" className="confirm-dialog__button confirm-dialog__button--danger" onClick={confirmDelete}>
                        Delete
                    </button>
                </div>
            </div>
        </div>
    ) : null

    return (
        <div className={`app-root app-root--${theme === 'Dark' ? 'dark' : 'white'}`} data-theme={theme}>
                <AppShell sidebar={sidebar} overlay={<LayerBoundary>{overlay}</LayerBoundary>}>
                    {error ? (
                        <div className="app-error" role="alert">
                            <span className="app-error__message">{error}</span>
                            <button type="button" className="app-error__dismiss" onClick={clearError} aria-label="Dismiss the message">
                                Dismiss
                            </button>
                        </div>
                    ) : null}
                    <Routes>
                        <Route path="/" element={<RootRoute />} />
                        <Route path="/folder/:folderId" element={<FileRoute {...shared} />} />
                        <Route path="/focus/:folderId/:itemId" element={<FocusRoute {...shared} />} />
                        <Route path="/stats/:folderId" element={<StatsRoute {...shared} />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
            </AppShell>
            {deleteDialog}
        </div>
    )
}

export default function App() {
    return (
        <BrowserRouter>
            <ReviewLab />
        </BrowserRouter>
    )
}
