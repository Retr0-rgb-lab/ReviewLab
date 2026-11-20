// Statistics view: the result of the current level, counted from the state of its cards.

import { useMemo } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Note01Icon } from '@hugeicons/core-free-icons'
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

export default function StatsView({ folder = null, cards = [], onOpenCard }) {
    const levelCards = Array.isArray(cards) ? cards : []
    const total = levelCards.length
    const marked = markedCount(levelCards)
    const rate = completionRate(levelCards)
    const pending = useMemo(() => unmasteredCards(levelCards), [levelCards])

    return (
        <section className="stats-view">
            <header className="stats-view__header">
                <h1 className="stats-view__title">
                    {folder?.name ? `Statistics of ${folder.name}` : 'Statistics'}
                </h1>
            </header>

            {total === 0 ? (
                <p className="stats-view__empty">This level has no cards.</p>
            ) : (
                <>
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
                                        onClick={() => onOpenCard?.(card.id)}
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
