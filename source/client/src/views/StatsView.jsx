// Statistics view: the result of the current level, counted from the state of its cards.
//
// The big ring in the middle is the same component as the small one in the left
// rail of the ordinary view. It shows the share of the marked cards that are
// mastered. The completion rate below it uses the other denominator: the cards
// of the whole level.

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HugeiconsIcon } from '@hugeicons/react'
import { Search01Icon } from '@hugeicons/core-free-icons'
import MasteryDial from '../components/MasteryDial.jsx'
import { fetchTree } from './levelActions.js'
import './StatsView.css'

// A card counts as marked when it is mastered or not mastered. An unmarked card is not a mistake.
export function markedCount(cards) {
    if (!Array.isArray(cards)) {
        return 0
    }
    return cards.filter((card) => card?.mastery === 'mastered' || card?.mastery === 'unmastered').length
}

// The rounded completion rate of the level. A level without cards has no rate at all.
export function completionRate(cards) {
    if (!Array.isArray(cards) || cards.length === 0) {
        return null
    }
    return Math.round((markedCount(cards) / cards.length) * 100)
}

// The rate with its numerator and denominator, for example "67% (2 of 3 cards marked)".
export function rateSummary(cards) {
    if (!Array.isArray(cards) || cards.length === 0) {
        return ''
    }
    return `${completionRate(cards)}% (${markedCount(cards)} of ${cards.length} cards marked)`
}

function byCreated(a, b) {
    const created = new Date(a?.created_at ?? 0).getTime() - new Date(b?.created_at ?? 0).getTime()
    if (created !== 0) {
        return created
    }
    return (a?.ord ?? 0) - (b?.ord ?? 0)
}

// The cards of this level that are mastered, oldest first.
export function masteredCards(cards) {
    if (!Array.isArray(cards)) {
        return []
    }
    return cards.filter((card) => card?.mastery === 'mastered').slice().sort(byCreated)
}

// The cards of this level that are not mastered, oldest first.
export function unmasteredCards(cards) {
    if (!Array.isArray(cards)) {
        return []
    }
    return cards.filter((card) => card?.mastery === 'unmastered').slice().sort(byCreated)
}

// One line for the list. Marks are removed so the row can ellipsize.
export function answerPreview(body) {
    const text = String(body ?? '')
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/^- /gm, '')
        .replace(/\s+/g, ' ')
        .trim()
    return text || 'No answer yet.'
}

// The chain of folders from the outermost one down to the parent of the level.
function ancestorChain(folders, folder) {
    if (!folder || !Array.isArray(folders)) {
        return []
    }
    const byId = new Map(folders.map((entry) => [entry.id, entry]))
    const chain = []
    let parentId = folder.parent_id
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

function useMaxWidth(px) {
    const [matches, setMatches] = useState(() => (
        typeof window !== 'undefined' && window.matchMedia(`(max-width: ${px}px)`).matches
    ))
    useEffect(() => {
        const media = window.matchMedia(`(max-width: ${px}px)`)
        const onChange = () => setMatches(media.matches)
        onChange()
        media.addEventListener('change', onChange)
        return () => media.removeEventListener('change', onChange)
    }, [px])
    return matches
}

export default function StatsView({
    folder = null,
    cards = [],
    ancestors = null,
    theme = 'White',
    dataVersion = 0,
    onOpenSearch = null,
    onToggleTheme = null,
}) {
    const navigate = useNavigate()
    const [tree, setTree] = useState({ folders: [], cards: [] })
    const [treeStatus, setTreeStatus] = useState('loading')
    const [localTheme, setLocalTheme] = useState(theme)
    const narrow = useMaxWidth(720)
    const seenRowIds = useRef(new Set())

    useEffect(() => {
        let cancelled = false
        setTreeStatus('loading')
        fetchTree()
            .then((result) => {
                if (cancelled) {
                    return
                }
                if (!result || result.error) {
                    setTreeStatus('error')
                    return
                }
                setTree({ folders: result.folders || [], cards: result.cards || [] })
                setTreeStatus('ready')
            })
            .catch(() => {
                if (!cancelled) {
                    setTreeStatus('error')
                }
            })
        return () => {
            cancelled = true
        }
    }, [dataVersion])

    useEffect(() => {
        setLocalTheme(theme)
    }, [theme])

    const bodyById = useMemo(() => {
        const map = new Map()
        for (const card of tree.cards || []) {
            if (card && typeof card.body === 'string') {
                map.set(card.id, card.body)
            }
        }
        return map
    }, [tree.cards])

    const levelCards = (Array.isArray(cards) ? cards : []).map((card) => {
        const body = bodyById.has(card.id) ? bodyById.get(card.id) : (card.body || '')
        return { ...card, body }
    })
    const total = levelCards.length
    const marked = markedCount(levelCards)
    const rate = completionRate(levelCards)
    const pending = useMemo(() => unmasteredCards(levelCards), [levelCards])
    const masteredList = useMemo(() => masteredCards(levelCards), [levelCards])
    const mastered = masteredList.length
    const notMastered = pending.length

    const chain = ancestors || ancestorChain(tree.folders, folder)
    const folderCount = useMemo(() => {
        if (!folder?.id || !Array.isArray(tree.folders)) {
            return 0
        }
        return tree.folders.filter((entry) => entry.parent_id === folder.id).length
    }, [tree.folders, folder])
    const dark = localTheme === 'Dark'

    function toggleTheme() {
        if (typeof onToggleTheme === 'function') {
            onToggleTheme()
            return
        }
        setLocalTheme((current) => (current === 'Dark' ? 'White' : 'Dark'))
    }

    const listSignature = [...masteredList, ...pending].map((card) => card.id).join('|')
    const listRef = useRef([])
    listRef.current = [...masteredList, ...pending]
    // A row springs in the first time its id is on screen. After that, moving
    // it between the two lists must not play the entrance again.
    useEffect(() => {
        const ids = listRef.current.map((card) => card.id).filter(Boolean)
        const timer = window.setTimeout(() => {
            for (const id of ids) {
                seenRowIds.current.add(id)
            }
        }, 720)
        return () => window.clearTimeout(timer)
    }, [listSignature])

    function openCard(card) {
        if (!card?.id || !folder?.id) {
            return
        }
        navigate(`/folder/${folder.id}/${card.id}`)
    }

    return (
        <section className="stats-view" data-theme={localTheme}>
            <header className="stats-view__topbar">
                <button
                    type="button"
                    className="stats-view__search"
                    onClick={onOpenSearch}
                    aria-label="Search"
                    title="Search"
                >
                    <HugeiconsIcon icon={Search01Icon} size={18} color="currentColor" aria-hidden="true" />
                    <span>Search</span>
                </button>
                <div className="stats-view__heading">
                    <h1 className="stats-view__title">
                        {folder?.name ? `Statistics of ${folder.name}` : 'Statistics'}
                    </h1>
                    <p className="stats-view__crumbs">
                        {chain.map((entry) => (
                            <span key={entry.id} className="stats-view__crumb">
                                <button
                                    type="button"
                                    className="stats-view__crumb-link"
                                    onClick={() => navigate(`/folder/${entry.id}`)}
                                >
                                    {entry.name}
                                </button>
                                <span className="stats-view__crumb-sep">›</span>
                            </span>
                        ))}
                        <button
                            type="button"
                            className="stats-view__crumb-link stats-view__crumb--current"
                            onClick={() => {
                                if (folder?.id) {
                                    navigate(`/folder/${folder.id}`)
                                }
                            }}
                        >
                            {folder?.name ?? ''}
                        </button>
                        <span className="stats-view__counts">
                            {treeStatus === 'ready'
                                ? `${folderCount} folder${folderCount === 1 ? '' : 's'} · ${total} card${total === 1 ? '' : 's'}`
                                : `${total} card${total === 1 ? '' : 's'}`}
                        </span>
                    </p>
                </div>
                <button
                    type="button"
                    className="stats-view__theme"
                    onClick={toggleTheme}
                    aria-pressed={dark}
                    aria-label={dark ? 'Use White theme' : 'Use Dark theme'}
                    title={dark ? 'Use White theme' : 'Use Dark theme'}
                >
                    <span className={`stats-view__knob${dark ? ' stats-view__knob--dark' : ''}`} />
                </button>
            </header>

            {total === 0 ? (
                <p className="stats-view__empty">This level has no cards.</p>
            ) : (
                <div className={`stats-view__board${masteredList.length > 0 && pending.length > 0 ? ' stats-view__board--both' : ''}`}>
                    <div className="stats-view__dial">
                        <MasteryDial
                            mastered={mastered}
                            unmastered={notMastered}
                            size={narrow ? 148 : 220}
                            theme={localTheme}
                        />
                        <p className="stats-view__rate">
                            <span className="stats-view__rate-value">
                                {rate == null ? 'No cards' : `Completion ${rate}%`}
                            </span>
                            <span className="stats-view__rate-detail">
                                {rate == null ? '' : `${marked} of ${total} marked`}
                            </span>
                        </p>
                    </div>
                    {masteredList.length > 0 ? (
                        <CardColumn
                            title="Mastered"
                            cards={masteredList}
                            onOpen={openCard}
                            treeStatus={treeStatus}
                            seenRowIds={seenRowIds}
                        />
                    ) : null}
                    {pending.length > 0 ? (
                        <CardColumn
                            title="Not mastered"
                            cards={pending}
                            onOpen={openCard}
                            treeStatus={treeStatus}
                            seenRowIds={seenRowIds}
                        />
                    ) : null}
                </div>
            )}
        </section>
    )
}

function answerLine(body, treeStatus) {
    if (treeStatus === 'loading') {
        return '\u00a0'
    }
    if (treeStatus === 'error') {
        return 'Answer unavailable.'
    }
    return answerPreview(body)
}

function CardColumn({ title, cards, onOpen, treeStatus, seenRowIds }) {
    const rowRefs = useRef([])
    const [hover, setHover] = useState(-1)
    const active = hover
    const [ring, setRing] = useState({ y: 0, h: 0, show: false })

    useLayoutEffect(() => {
        const row = rowRefs.current[active]
        if (!row) {
            setRing((current) => (current.show ? { ...current, show: false } : current))
            return undefined
        }
        const update = () => {
            setRing({ y: row.offsetTop, h: row.offsetHeight, show: true })
        }
        update()
        const observer = new ResizeObserver(update)
        observer.observe(row)
        return () => observer.disconnect()
    }, [active, cards])

    return (
        <section className="stats-view__column" aria-label={title}>
            <h2 className="stats-view__column-title">{title}</h2>
            <ul className="stats-view__list" onPointerLeave={() => setHover(-1)}>
                    {cards.map((card, index) => {
                        const pops = !seenRowIds.current.has(card.id)
                        return (
                        <li
                            key={card.id}
                            className={`stats-view__row${pops ? ' stats-view__row--enter' : ''}`}
                            style={pops ? { '--row-i': Math.min(index, 8) } : undefined}
                            ref={(element) => {
                                rowRefs.current[index] = element
                            }}
                            onPointerEnter={() => setHover(index)}
                        >
                            <button
                                type="button"
                                className="stats-view__unit"
                                onClick={() => onOpen(card)}
                            >
                                <span className="stats-view__question">{card.title || 'Untitled'}</span>
                                <span className="stats-view__answer">{answerLine(card.body, treeStatus)}</span>
                            </button>
                        </li>
                        )
                    })}
                    <span
                        className="stats-view__ring"
                        style={{
                            transform: `translate3d(0, ${ring.y}px, 0)`,
                            height: ring.h,
                            opacity: ring.show ? 1 : 0,
                        }}
                        aria-hidden="true"
                    />
                </ul>
        </section>
    )
}
