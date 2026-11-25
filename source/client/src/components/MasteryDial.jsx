// Mastery dial: the share of the cards of one level that are marked as mastered.
//
// The ring itself is the CometDial of the react-bits collection. It is used
// read only, because the share is a result of the level and not an input, and
// the "rest colour" turns the rest of the track into a solid red arc.

import CometDial from './react-bits/CometDial.jsx'
import './MasteryDial.css'

// The share of the level that is mastered.
// It returns the raw share, the share in percent for the ring, and whether the
// level has no marked card at all.
export function masteryShare(mastered, unmastered) {
    const m = Number(mastered) || 0
    const n = Number(unmastered) || 0
    const total = m + n
    if (total === 0) return { p: 0, value: 0, empty: true }
    const p = m / total
    return { p, value: Math.round(p * 100), empty: false }
}

export default function MasteryDial({
    mastered = 0,
    unmastered = 0,
    size = 132,
    onOpen = null,
    theme = 'White',
    className = '',
}) {
    const m = Number(mastered) || 0
    const n = Number(unmastered) || 0
    const share = masteryShare(m, n)
    // The dial writes the percentage with this colour, so it has to follow the
    // theme of the application.
    const ink = 'var(--rl-ink)'

    const dial = (
        <CometDial
            value={share.value}
            min={0}
            max={100}
            step={1}
            unit="%"
            label="Mastery"
            accent="var(--mastery-master)"
            ink={ink}
            readOnly
            size={size}
            sweep={270}
            {...(share.empty ? {} : { restColor: 'var(--mastery-not-mastered)' })}
        />
    )

    return (
        <div
            className={`mastery-dial${className ? ` ${className}` : ''}`}
            data-theme={theme}
            style={{ '--dial-size': `${size}px` }}
        >
            <div className="mastery-dial__row">
                <span className="mastery-dial__label mastery-dial__label--master">Master</span>
                <div className="mastery-dial__ring">
                    {onOpen ? (
                        <button
                            type="button"
                            className="mastery-dial__button"
                            aria-label="Open the statistics of this level"
                            onClick={onOpen}
                        >
                            {dial}
                        </button>
                    ) : (
                        dial
                    )}
                    <div className="mastery-dial__counts">
                        <span className="mastery-dial__count mastery-dial__count--master">{m}</span>
                        <span className="mastery-dial__count mastery-dial__count--not-mastered">{n}</span>
                    </div>
                </div>
                <span className="mastery-dial__label mastery-dial__label--not-mastered">Not Mastered</span>
            </div>
        </div>
    )
}
