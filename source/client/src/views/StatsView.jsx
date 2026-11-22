// Statistics view: the result of the current level, counted from the state of its cards.
//
// The big ring in the middle is the same component as the small one in the left
// rail of the ordinary view. It shows the share of the marked cards that are
// mastered. The completion rate below it uses the other denominator: the cards
// of the whole level.

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HugeiconsIcon } from '@hugeicons/react'
import { Note01Icon, Search01Icon } from '@hugeicons/core-free-icons'
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

// The cards of this level that are not mastered, oldest first.
export function unmasteredCards(cards) {
    if (!Array.isArray(cards)) {
        return []
    }
    return cards
        .filter((card) => card?.mastery === 'unmastered')
        .slice()
        .sort((a, b) => {
            const created = new Date(a?.created_at ?? 0).getTime() - new Date(b?.created_at ?? 0).getTime()
            if (created !== 0) {
                return created
            }
            return (a?.ord ?? 0) - (b?.ord ?? 0)
        })
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

export default function StatsView({
    folder = null,
    cards = [],
    ancestors = null,
    theme = 'White',
    dataVersion = 0,
    onOpenSearch = null,
    onOpenCard = null,
    onToggleTheme = null,
}) {
    const navigate = useNavigate()
    const [tree, setTree] = useState({ folders: [], cards: [] })
    const [localTheme, setLocalTheme] = useState(theme)

    useEffect(() => {
        let cancelled = false
        fetchTree()
            .then((result) => {
                if (cancelled || !result || result.error) {
                    return
                }
                setTree({ folders: result.folders || [], cards: result.cards || [] })
            })
            .catch(() => {})
        return () => {
            cancelled = true
        }
    }, [dataVersion])

    useEffect(() => {
        setLocalTheme(theme)
    }, [theme])

    const levelCards = Array.isArray(cards) ? cards : []
    const total = levelCards.length
    const marked = markedCount(levelCards)
    const rate = completionRate(levelCards)
    const pending = useMemo(() => unmasteredCards(levelCards), [levelCards])
    const mastered = levelCards.filter((card) => card?.mastery === 'mastered').length
    const notMastered = levelCards.filter((card) => card?.mastery === 'unmastered').length

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

    function openCard(card) {
        if (typeof onOpenCard === 'function') {
            onOpenCard(card.id)
            return
        }
        if (folder?.id && card?.id) {
            navigate(`/zen/${folder.id}/${card.id}`)
        }
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
                        <span className="stats-view__crumb stats-view__crumb--current">
                            {folder?.name ?? ''}
                        </span>
                        <span className="stats-view__counts">
                            {`${folderCount} folder${folderCount === 1 ? '' : 's'} · ${total} card${total === 1 ? '' : 's'}`}
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
                <>
                    <div className="stats-view__ring">
                        <MasteryDial
                            mastered={mastered}
                            unmastered={notMastered}
                            size={260}
                            theme={localTheme}
                        />
                    </div>

                    <p className="stats-view__rate">
                        <span className="stats-view__rate-value">{rate}%</span>
                        <span className="stats-view__rate-detail">
                            ({marked} of {total} cards marked)
                        </span>
                    </p>

                    <h2 className="stats-view__subtitle">Not mastered</h2>

                    {pending.length === 0 ? (
                        <p className="stats-view__empty">No card of this level is marked as not mastered.</p>
                    ) : (
                        <ul className="stats-view__list">
                            {pending.map((card) => (
                                <li key={card.id}>
                                    <button
                                        type="button"
                                        className="stats-view__card"
                                        onClick={() => openCard(card)}
                                    >
                                        <HugeiconsIcon icon={Note01Icon} size={18} color="currentColor" aria-hidden="true" />
                                        <span className="stats-view__card-title">{card.title ?? ''}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </>
            )}
        </section>
    )
}
