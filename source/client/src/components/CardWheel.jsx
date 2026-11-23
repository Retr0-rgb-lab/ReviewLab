// Card wheel: the stack of small cards on the left of the screen.
//
// The cards lie on an arc and the one in the middle of the arc is the card
// in focus. The wheel is controlled: the host says which card is the
// current one and the wheel turns to it.
//
// The geometry is the one of the Option Wheel of React Bits, but the wheel
// is drawn here on purpose. That component keeps its position inside
// itself: it takes the first index as its start and offers no way to move
// it from the outside, and a controlled wheel needs exactly that.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Note01Icon } from '@hugeicons/core-free-icons'
import './CardWheel.css'

// One card is 44px high and the gap between two cards is 8px.
const ROW_H = 52
const TILT = 6
const CURVE = 1
const BLUR = 2
const FADE = 0.25
const MIN_OPACITY = 0.05
const INSET = 200
const DRAG_THRESHOLD = 4

const STATUS_LABEL = {
    mastered: 'Mastered',
    unmastered: 'Not mastered',
    unmarked: 'Not marked',
}

// The wheel goes around, so every index is wrapped into the list.
function wrap(index, count) {
    if (count <= 0) return 0
    return ((index % count) + count) % count
}

// A card knows three states, everything that is neither mastered nor not
// mastered is unmarked.
function masteryState(mastery) {
    if (mastery === 'mastered') return 'mastered'
    if (mastery === 'unmastered') return 'unmastered'
    return 'unmarked'
}

export default function CardWheel({
    cards = [],
    activeIndex = 0,
    onSelect = null,
    onActiveClick = null,
    theme = 'White',
    className = '',
}) {
    const count = cards.length
    const [pos, setPos] = useState(() => wrap(activeIndex, count))
    const [dragging, setDragging] = useState(false)

    const wheelRef = useRef(null)
    const posRef = useRef(pos)
    const activeRef = useRef(activeIndex)
    const dragRef = useRef(null)
    const dragMovedRef = useRef(false)
    const reportedRef = useRef(null)
    const onSelectRef = useRef(onSelect)
    const onActiveClickRef = useRef(onActiveClick)

    onSelectRef.current = onSelect
    onActiveClickRef.current = onActiveClick
    posRef.current = pos

    // The host owns the index. A drag owns the position while it lasts, the
    // host catches up with it afterwards.
    useEffect(() => {
        activeRef.current = activeIndex
        if (dragRef.current) return
        const next = wrap(activeIndex, count)
        posRef.current = next
        setPos(next)
    }, [activeIndex, count])

    // The host is told about a new card, but only when it really changes.
    const report = useCallback((index) => {
        if (reportedRef.current === index) return
        reportedRef.current = index
        onSelectRef.current?.(index)
    }, [])

    const step = useCallback((direction) => {
        if (count <= 0) return
        const current = wrap(activeRef.current, count)
        report(wrap(current + direction, count))
    }, [count, report])

    // The wheel of the mouse is registered by hand, so the page can be kept
    // from scrolling while the wheel is used.
    useEffect(() => {
        const node = wheelRef.current
        if (!node) return
        let accumulated = 0
        let timer = null

        function onWheel(event) {
            if (count <= 0) return
            event.preventDefault()
            const delta = event.deltaMode === 1 ? event.deltaY * 24 : event.deltaY
            accumulated += delta
            if (timer) clearTimeout(timer)
            timer = setTimeout(() => {
                accumulated = 0
            }, 140)
            // One card per notch of the wheel.
            if (Math.abs(accumulated) < ROW_H) return
            const direction = accumulated > 0 ? 1 : -1
            accumulated -= direction * ROW_H
            step(direction)
        }

        node.addEventListener('wheel', onWheel, { passive: false })
        return () => {
            node.removeEventListener('wheel', onWheel)
            if (timer) clearTimeout(timer)
        }
    }, [count, step])

    function handlePointerDown(event) {
        if (count === 0) return
        dragRef.current = { y: event.clientY, pos: posRef.current }
        dragMovedRef.current = false
    }

    function handlePointerMove(event) {
        const drag = dragRef.current
        if (!drag) return
        const dy = event.clientY - drag.y
        if (!dragMovedRef.current) {
            if (Math.abs(dy) <= DRAG_THRESHOLD) return
            dragMovedRef.current = true
            setDragging(true)
            wheelRef.current?.setPointerCapture?.(event.pointerId)
        }
        const next = drag.pos - dy / ROW_H
        posRef.current = next
        setPos(next)
        report(wrap(Math.round(next), count))
    }

    function handlePointerEnd() {
        dragRef.current = null
        setDragging(false)
        if (!dragMovedRef.current) return
        const index = wrap(Math.round(posRef.current), count)
        // The host owns the index, so the wheel goes back to it when the host
        // did not follow the drag.
        const target = activeRef.current === index ? index : wrap(activeRef.current, count)
        posRef.current = target
        setPos(target)
    }

    function handleKeyDown(event) {
        let direction = 0
        if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
            direction = 1
        } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
            direction = -1
        } else {
            return
        }
        // The arrows move the wheel and not the page.
        event.preventDefault()
        event.stopPropagation()
        step(direction)
    }

    function handleCardClick(index) {
        // A click that ended a drag is not a click on the card.
        if (dragMovedRef.current) return
        // The card already in focus flips. A different card is only selected.
        if (index === wrap(activeRef.current, count)) {
            onActiveClickRef.current?.()
            return
        }
        report(index)
    }

    // The place of every card on the arc. The distance to the card is taken
    // the short way round, so the wheel goes around.
    const layout = useMemo(() => {
        if (count === 0) return []
        const tiltRad = (TILT * Math.PI) / 180
        const radius = ROW_H / tiltRad
        return cards.map((card, index) => {
            let distance = index - pos
            distance = ((distance % count) + count) % count
            if (distance > count / 2) distance -= count
            const angle = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, distance * tiltRad))
            const y = radius * Math.sin(angle)
            const x = -radius * (1 - Math.cos(angle)) * CURVE
            const rotation = (angle * 180) / Math.PI
            const opacity = Math.max(MIN_OPACITY, 1 - Math.abs(distance) * FADE)
            const blur = Math.abs(distance) * BLUR
            return { index, x, y, rotation, opacity, blur }
        })
    }, [cards, count, pos])

    const current = wrap(activeIndex, count)

    return (
        <div
            ref={wheelRef}
            className={`card-wheel${className ? ` ${className}` : ''}${dragging ? ' card-wheel--dragging' : ''}`}
            data-theme={theme}
            role="listbox"
            aria-label="Cards"
            tabIndex={0}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            onKeyDown={handleKeyDown}
        >
            {layout.map((entry) => {
                const card = cards[entry.index]
                const state = masteryState(card?.mastery)
                const selected = entry.index === current
                return (
                    <div
                        key={card?.id ?? entry.index}
                        role="option"
                        aria-selected={selected}
                        className={`card-wheel__card${selected ? ' card-wheel__card--active' : ''}`}
                        style={{
                            transform: `translate(${entry.x.toFixed(2)}px, calc(${entry.y.toFixed(2)}px - 50%)) rotate(${entry.rotation.toFixed(3)}deg)`,
                            opacity: entry.opacity.toFixed(3),
                            filter: entry.blur > 0 ? `blur(${entry.blur.toFixed(2)}px)` : 'none',
                        }}
                        onClick={() => handleCardClick(entry.index)}
                    >
                        <span className="card-wheel__icon" aria-hidden="true">
                            <HugeiconsIcon icon={Note01Icon} size={16} color="currentColor" />
                        </span>
                        <span className="card-wheel__title">{card?.title ?? ''}</span>
                        <span
                            className={`card-wheel__status card-wheel__status--${state}`}
                            role="img"
                            aria-label={STATUS_LABEL[state]}
                        />
                    </div>
                )
            })}
        </div>
    )
}
