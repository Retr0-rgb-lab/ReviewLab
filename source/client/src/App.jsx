// The application root. It owns the router, the global theme, the search
// layer and the delete confirmation that the three views share.
//
// Every read goes through levelActions.js, every write through fileActions.js.
//
// There are three views and three kinds of address:
//   /folder/:folderId/:itemId  the file view, with one card in the middle
//   /zen/:folderId/:itemId     the zen mode, one card on the whole screen
//   /stats/:folderId           the numbers of one level
// The theme switch belongs to the top bar of every view, so the application
// hands the switch to the views instead of drawing it in a sidebar.

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
import { Theme } from '@astryxdesign/core/theme'
import { neutralTheme } from '@astryxdesign/theme-neutral/built'
import FileView, { errorText } from './views/FileView.jsx'
import ZenView from './views/ZenView.jsx'
import StatsView from './views/StatsView.jsx'
import { createCard, deleteCard, deleteFolder, removalConfirmText } from './views/fileActions.js'
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

// The root of the tree. The application opens on the oldest card of the root
// folder, so the tree is never an empty level on the screen.
function RootRoute() {
    const [state, setState] = useState({ status: 'loading', root: null, firstCardId: null, message: '' })

    useEffect(() => {
        let cancelled = false

        async function load() {
            let result = null
            try {
                result = await fetchRootFolder()
            } catch (caught) {
                if (!cancelled) {
                    setState({
                        status: 'empty',
                        root: null,
                        firstCardId: null,
                        message: caught && caught.message ? caught.message : '',
                    })
                }
                return
            }
            if (cancelled) {
                return
            }
            if (!result || result.error) {
                setState({
                    status: 'empty',
                    root: null,
                    firstCardId: null,
                    message: result && result.error ? errorText(result.error) : '',
                })
                return
            }

            // The cards of a level come back in the order of their creation,
            // so the first card of the level is the oldest one.
            let firstCardId = null
            try {
                const level = await fetchLevel(result.id)
                const cards = (level && level.cards) || []
                firstCardId = cards.length > 0 ? cards[0].id : null
            } catch (caught) {
                // A level that cannot be read still opens, the file view shows
                // the reason itself.
                firstCardId = null
            }
            if (cancelled) {
                return
            }
            setState({ status: 'ready', root: result, firstCardId, message: '' })
        }

        load()
        return () => {
            cancelled = true
        }
    }, [])

    if (state.status === 'loading') {
        return <p className="state__message">Loading the tree…</p>
    }
    if (state.status === 'empty') {
        return (
            <div className="state state--empty">
                <p className="state__title">There is no root folder yet.</p>
                <p className="state__text">
                    {state.message || 'The tree starts with one outer folder. Add it in the database, then reload this page.'}
                </p>
            </div>
        )
    }

    const target = state.firstCardId
        ? `/folder/${state.root.id}/${state.firstCardId}`
        : `/folder/${state.root.id}`
    return <Navigate to={target} replace />
}

// The file view of one level. The item of the address may be missing, then
// the view picks the card of the level itself.
function FileRoute(props) {
    const { folderId, itemId } = useParams()
    return (
        <FileView
            folderId={folderId}
            itemId={itemId}
            theme={props.theme}
            dataVersion={props.dataVersion}
            onOpenSearch={props.onOpenSearch}
            onRequestDelete={props.onRequestDelete}
            onError={props.onError}
            onClearError={props.onClearError}
            onDataChanged={props.onDataChanged}
            onLevelReady={props.onLevelReady}
            onToggleTheme={props.onToggleTheme}
        />
    )
}

// The zen mode of one level. The item of the address is optional, the mode
// can open without a card.
function ZenRoute(props) {
    const { folderId, itemId } = useParams()
    return (
        <ZenView
            folderId={folderId}
            itemId={itemId}
            theme={props.theme}
            dataVersion={props.dataVersion}
            onOpenSearch={props.onOpenSearch}
            onToggleTheme={props.onToggleTheme}
            onDataChanged={props.onDataChanged}
            onError={props.onError}
            onClearError={props.onClearError}
            onLevelReady={props.onLevelReady}
        />
    )
}

function StatsRoute(props) {
    const { folderId } = useParams()
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
            theme={props.theme}
            dataVersion={props.dataVersion}
            onOpenSearch={props.onOpenSearch}
            onToggleTheme={props.onToggleTheme}
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

    // The folder of the current address, whatever view is on the screen.
    const folderItemMatch = useMatch('/folder/:folderId/:itemId')
    const folderMatch = useMatch('/folder/:folderId')
    const zenItemMatch = useMatch('/zen/:folderId/:itemId')
    const zenMatch = useMatch('/zen/:folderId')
    const statsMatch = useMatch('/stats/:folderId')
    const currentFolderId = (folderItemMatch && folderItemMatch.params.folderId)
        || (folderMatch && folderMatch.params.folderId)
        || (zenItemMatch && zenItemMatch.params.folderId)
        || (zenMatch && zenMatch.params.folderId)
        || (statsMatch && statsMatch.params.folderId)
        || null

    useEffect(() => {
        storeTheme(theme)
    }, [theme])

    // The tree feeds the search. It is read again after a write so that the
    // results show the current state.
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

    // The theme switch of the top bar of the three views.
    const toggleTheme = useCallback(() => {
        setTheme((current) => (current === 'Dark' ? 'White' : 'Dark'))
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
        navigate(`/zen/${target.folderId}/${target.cardId}`)
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

    // A new card opens in the zen mode, where its title and its body are
    // written.
    const createCardInLevel = useCallback(async () => {
        if (!currentFolderId || !readyFolders[currentFolderId]) {
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
        navigate(`/zen/${currentFolderId}/${result.card.id}`)
    }, [currentFolderId, readyFolders, navigate])

    const shared = {
        theme,
        dataVersion,
        onOpenSearch: openSearch,
        onRequestDelete: requestDelete,
        onError: setError,
        onClearError: clearError,
        onDataChanged: onDataChanged,
        onLevelReady: onLevelReady,
        onToggleTheme: toggleTheme,
    }

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
        <Theme theme={neutralTheme} mode={theme === 'Dark' ? 'dark' : 'light'}>
            <div className={`app-root app-root--${theme === 'Dark' ? 'dark' : 'white'}`} data-theme={theme}>
                <AppShell overlay={<LayerBoundary>{overlay}</LayerBoundary>}>
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
                        <Route path="/folder/:folderId/:itemId" element={<FileRoute {...shared} />} />
                        <Route path="/zen/:folderId" element={<ZenRoute {...shared} />} />
                        <Route path="/zen/:folderId/:itemId" element={<ZenRoute {...shared} />} />
                        <Route path="/stats/:folderId" element={<StatsRoute {...shared} />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </AppShell>
                {deleteDialog}
            </div>
        </Theme>
    )
}

export default function App() {
    return (
        <BrowserRouter>
            <ReviewLab />
        </BrowserRouter>
    )
}
