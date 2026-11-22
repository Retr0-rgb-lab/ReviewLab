// Arc gallery: the card browser that the ordinary view and the zen mode share.
//
// The gallery has one continuous zoom value t between 0 and 1.
//   t = 1 is the focused state: the active card fills the middle and the
//        other cards sit behind it as a deck, so only their edges show.
//   t = 0 is the overview state: every card of the level stands on a shallow
//        arc, the active one in the middle, the sides turned away and faded.
//
// The arc is a cylinder seen from the front. A card at the angle theta sits
// at x = R sin(theta) and is pushed back by R (1 - cos(theta)), so the row
// curves away at the sides. The rotation of the card is the same theta.
//
// The keyboard, the drag that changes the card and the pinch that changes the
// zoom all live here, so the two views share the same feel.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { StarIcon } from '@hugeicons/core-free-icons'
import FlipCard from './react-bits/FlipCard.jsx'
import './ArcGallery.css'

// The cylinder the cards stand on.
const ARC_RADIUS = 1400
const ARC_STEP = 7
const ARC_DEPTH = 0.85
// The deck behind the focused card.
const DECK_OFFSET = 16
const DECK_DEPTH = 8
// The drag that changes the card. A small move is still a click. A finished
// horizontal move, or a clear flick, goes to the next card. Anything shorter
// returns the card to its place.
const DRAG_THRESHOLD = 12
const DRAG_COMMIT = 48
const DRAG_HISTORY_MS = 90
// Pixels per millisecond over the recent samples. Slower than this is a drag
// that has to cover DRAG_COMMIT before it changes the card.
const DRAG_FLICK = 0.8

const clamp = (value, low, high) => Math.min(high, Math.max(low, value))
const lerp = (from, to, amount) => from + (to - from) * amount

// The index of a card in a list of length, wrapping in both directions.
export function wrapIndex(index, length) {
    if (!length) {
        return 0
    }
    return ((Math.round(index) % length) + length) % length
}

// The distance from the active card, in steps, taking the short way round.
export function offsetOf(index, activeIndex, length, loop) {
    let distance = index - activeIndex
    if (loop && length > 1) {
        if (distance > length / 2) {
            distance -= length
        } else if (distance < -length / 2) {
            distance += length
        }
    }
    return distance
}

// Where one card stands at the given zoom. The deck is the focused state and
// the cylinder is the overview state; the two are mixed by t.
export function cardLayout(index, activeIndex, length, t, options = {}) {
    const {
        radius = ARC_RADIUS,
        step = ARC_STEP,
        depth = ARC_DEPTH,
        deckOffset = DECK_OFFSET,
        deckDepth = DECK_DEPTH,
        loop = true,
    } = options

    const distance = offsetOf(index, activeIndex, length, loop)
    const steps = Math.abs(distance)
    const theta = (distance * step * Math.PI) / 180

    // The cylinder: the card stands on the arc and is turned away at the sides.
    const arcX = radius * Math.sin(theta)
    const arcY = radius * (1 - Math.cos(theta)) * 0.12
    const arcZ = -radius * (1 - Math.cos(theta)) * depth
    const arcRotate = -(distance * step)
    const arcScale = 1 - Math.min(steps, 5) * 0.07
    const arcOpacity = clamp(1 - steps * 0.22, 0, 1)

    // The deck: the cards behind the active one peek out to the upper left.
    const deck = Math.min(steps, 3)
    const deckX = -deck * deckOffset
    const deckY = -deck * deckOffset
    const deckZ = -deck * deckDepth
    const deckScale = 1
    const deckOpacity = 1
    const deckRotate = 0

    return {
        x: lerp(arcX, deckX, t),
        y: lerp(arcY, deckY, t),
        z: lerp(arcZ, deckZ, t),
        rotateY: lerp(arcRotate, deckRotate, t),
        scale: lerp(arcScale, deckScale, t),
        opacity: lerp(arcOpacity, deckOpacity, t),
        blur: lerp(Math.min(steps, 4) * 1.6, 0, t),
        distance,
    }
}

// The zoom value that belongs to a zoom name.
export function zoomValue(zoom) {
    return zoom === 'overview' ? 0 : 1
}

// The zoom name that belongs to a zoom value.
export function zoomName(value) {
    return value < 0.5 ? 'overview' : 'focused'
}

// A field keeps Enter, the arrows and Esc. The gallery does not take them.
function keepsOwnKeys(target) {
    if (!(target instanceof Element)) {
        return false
    }
    if (target instanceof HTMLElement && target.isContentEditable) {
        return true
    }
    return Boolean(target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])'))
}

// Horizontal speed over the samples still inside the recent window.
function recentSpeed(hist, now) {
    if (!hist || hist.length < 2) {
        return 0
    }
    const last = hist[hist.length - 1]
    const first = hist[0]
    const dt = last.t - first.t
    if (dt <= 0 || now - last.t > DRAG_HISTORY_MS) {
        return 0
    }
    return (last.x - first.x) / dt
}

export default function ArcGallery({
    cards = [],
    activeIndex = 0,
    onActiveIndexChange = null,
    zoom = 'focused',
    onZoomChange = null,
    onFlip = null,
    focusExtra = null,
    flipRequest = undefined,
    theme = 'White',
    className = '',
}) {
    const count = cards.length
    const [t, setT] = useState(() => zoomValue(zoom))
    const [flippedIds, setFlippedIds] = useState({})
    // Extra horizontal shift while a drag is active. It is not part of cardLayout.
    const [dragX, setDragX] = useState(0)
    const tRef = useRef(t)
    const dragRef = useRef(null)
    const pinchRef = useRef(null)
    const touchRef = useRef(null)
    const flipRequestRef = useRef(flipRequest)

    // The zoom name comes from the outside. The value inside moves towards it.
    useEffect(() => {
        const target = zoomValue(zoom)
        const from = tRef.current
        if (Math.abs(target - from) < 0.001) {
            return undefined
        }
        let frame = 0
        const start = performance.now()
        const duration = 320
        const step = (now) => {
            const done = Math.min(1, (now - start) / duration)
            const eased = 1 - Math.pow(1 - done, 3)
            const value = from + (target - from) * eased
            tRef.current = value
            setT(value)
            if (done < 1) {
                frame = requestAnimationFrame(step)
            }
        }
        frame = requestAnimationFrame(step)
        return () => cancelAnimationFrame(frame)
    }, [zoom])

    // A new active card starts on its front side.
    useEffect(() => {
        setFlippedIds((previous) => {
            const keys = Object.keys(previous)
            if (!keys.length) {
                return previous
            }
            const next = {}
            let changed = false
            for (const key of keys) {
                if (key === cards[activeIndex]?.id) {
                    changed = true
                    continue
                }
                next[key] = previous[key]
            }
            return changed ? next : previous
        })
    }, [activeIndex, cards])

    const stepCard = useCallback((direction) => {
        if (!count) {
            return
        }
        const next = wrapIndex(activeIndex + direction, count)
        if (typeof onActiveIndexChange === 'function') {
            onActiveIndexChange(next)
        }
    }, [activeIndex, count, onActiveIndexChange])

    const flipCard = useCallback((id) => {
        if (!id) {
            return
        }
        setFlippedIds((previous) => {
            const next = { ...previous, [id]: !previous[id] }
            if (typeof onFlip === 'function') {
                onFlip(id, next[id])
            }
            return next
        })
    }, [onFlip])

    // A later change of flipRequest flips the active card. The value present
    // at mount does not, so a host can count up from zero without a first flip.
    useEffect(() => {
        if (Object.is(flipRequestRef.current, flipRequest)) {
            return
        }
        flipRequestRef.current = flipRequest
        flipCard(cards[activeIndex]?.id)
    }, [flipRequest, flipCard, cards, activeIndex])

    // The pinch of a track pad arrives as a wheel event with the control key.
    useEffect(() => {
        if (typeof onZoomChange !== 'function') {
            return undefined
        }
        let timer = 0
        const onWheel = (event) => {
            if (!event.ctrlKey) {
                return
            }
            event.preventDefault()
            const value = clamp(tRef.current - event.deltaY * 0.004, 0, 1)
            tRef.current = value
            setT(value)
            window.clearTimeout(timer)
            timer = window.setTimeout(() => {
                if (typeof onZoomChange === 'function') {
                    onZoomChange(zoomName(value))
                }
            }, 220)
        }
        window.addEventListener('wheel', onWheel, { passive: false })
        return () => {
            window.clearTimeout(timer)
            window.removeEventListener('wheel', onWheel)
        }
    }, [onZoomChange])

    // Two fingers on a touch screen do the same thing.
    useEffect(() => {
        if (typeof onZoomChange !== 'function') {
            return undefined
        }
        const distance = (touches) => {
            const dx = touches[0].clientX - touches[1].clientX
            const dy = touches[0].clientY - touches[1].clientY
            return Math.hypot(dx, dy)
        }
        const onStart = (event) => {
            if (event.touches.length !== 2) {
                return
            }
            event.preventDefault()
            touchRef.current = { base: distance(event.touches), value: tRef.current }
        }
        const onMove = (event) => {
            const start = touchRef.current
            if (!start || event.touches.length !== 2) {
                return
            }
            event.preventDefault()
            const ratio = distance(event.touches) / Math.max(start.base, 1)
            const value = clamp(start.value * ratio, 0, 1)
            tRef.current = value
            setT(value)
        }
        const onEnd = (event) => {
            if (!touchRef.current) {
                return
            }
            if (event.touches.length < 2) {
                touchRef.current = null
                if (typeof onZoomChange === 'function') {
                    onZoomChange(zoomName(tRef.current))
                }
            }
        }
        window.addEventListener('touchstart', onStart, { passive: false })
        window.addEventListener('touchmove', onMove, { passive: false })
        window.addEventListener('touchend', onEnd)
        window.addEventListener('touchcancel', onEnd)
        return () => {
            window.removeEventListener('touchstart', onStart)
            window.removeEventListener('touchmove', onMove)
            window.removeEventListener('touchend', onEnd)
            window.removeEventListener('touchcancel', onEnd)
        }
    }, [onZoomChange])

    // The keyboard changes the card. A field that has the focus keeps its keys.
    // Enter is taken on the way down, so the card's own key handler cannot
    // flip a private copy of the state. The gallery is the source of truth.
    useEffect(() => {
        const onEnter = (event) => {
            if (event.key !== 'Enter' || event.ctrlKey || event.metaKey || event.altKey) {
                return
            }
            if (keepsOwnKeys(event.target)) {
                return
            }
            // A real button or link keeps Enter. The card itself is not one.
            if (event.target instanceof Element && event.target.closest('button, a')) {
                return
            }
            event.preventDefault()
            event.stopPropagation()
            if (event.repeat) {
                return
            }
            if (tRef.current < 0.5) {
                if (typeof onZoomChange === 'function') {
                    onZoomChange('focused')
                }
                return
            }
            flipCard(cards[activeIndex]?.id)
        }
        window.addEventListener('keydown', onEnter, true)
        return () => window.removeEventListener('keydown', onEnter, true)
    }, [onZoomChange, flipCard, cards, activeIndex])

    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.ctrlKey || event.metaKey || event.altKey) {
                return
            }
            if (keepsOwnKeys(event.target) && (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'Enter' || event.key === 'Escape')) {
                return
            }
            if (event.key === 'ArrowLeft') {
                event.preventDefault()
                stepCard(-1)
                return
            }
            if (event.key === 'ArrowRight') {
                event.preventDefault()
                stepCard(1)
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [stepCard])

    // The drag that changes the card. The window listens, so the card does
    // not have to give up the pointer to the gallery. The card follows the
    // pointer with an extra shift, and only a finished horizontal gesture
    // moves on. That move is always the next card, the same as ArrowRight.
    useEffect(() => {
        const onMove = (event) => {
            const drag = dragRef.current
            if (!drag || drag.pointerId !== event.pointerId) {
                return
            }
            const dx = event.clientX - drag.startX
            const dy = event.clientY - drag.startY
            if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) {
                return
            }
            drag.moved = true
            const now = performance.now()
            drag.hist.push({ t: now, x: event.clientX })
            while (drag.hist.length > 2 && now - drag.hist[0].t > DRAG_HISTORY_MS) {
                drag.hist.shift()
            }
            setDragX(dx)
        }
        const finish = (event, cancelled) => {
            const drag = dragRef.current
            if (!drag || drag.pointerId !== event.pointerId) {
                return
            }
            dragRef.current = null
            setDragX(0)
            if (cancelled) {
                return
            }
            if (!drag.moved) {
                // A click without a drag flips the card that is in front.
                flipCard(cards[activeIndex]?.id)
                return
            }
            const dx = event.clientX - drag.startX
            const dy = event.clientY - drag.startY
            const travelX = Math.abs(dx)
            const speed = recentSpeed(drag.hist, performance.now())
            const flicked = travelX >= DRAG_THRESHOLD && travelX >= Math.abs(dy) && Math.abs(speed) >= DRAG_FLICK
            if (travelX >= DRAG_COMMIT || flicked) {
                stepCard(1)
            }
        }
        const onUp = (event) => finish(event, false)
        const onCancel = (event) => finish(event, true)
        window.addEventListener('pointermove', onMove)
        window.addEventListener('pointerup', onUp)
        window.addEventListener('pointercancel', onCancel)
        return () => {
            window.removeEventListener('pointermove', onMove)
            window.removeEventListener('pointerup', onUp)
            window.removeEventListener('pointercancel', onCancel)
        }
    }, [cards, activeIndex, flipCard, stepCard])

    const onPointerDown = useCallback((event) => {
        if (event.button !== 0) {
            return
        }
        if (event.target.closest('button, input, textarea, a, [data-no-drag]')) {
            return
        }
        dragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            moved: false,
            hist: [],
        }
    }, [])

    const layouts = useMemo(() => {
        if (!count) {
            return []
        }
        return cards.map((card, index) => cardLayout(index, activeIndex, count, t))
    }, [cards, activeIndex, count, t])

    if (!count) {
        return (
            <div className={`arc-gallery arc-gallery--empty ${className}`} data-theme={theme}>
                <p className="arc-gallery__empty">This level has no cards.</p>
            </div>
        )
    }

    return (
        <div
            className={`arc-gallery ${className}`}
            data-theme={theme}
            onPointerDown={onPointerDown}
        >
            <div className="arc-gallery__stage">
                {cards.map((card, index) => {
                    const place = layouts[index]
                    const isActive = index === activeIndex
                    const flipped = Boolean(flippedIds[card.id])
                    // The drag is a second translate in front of the layout, so
                    // cardLayout itself stays the position of the card at rest.
                    const dragShift = isActive && dragX !== 0 ? `translate3d(${dragX.toFixed(2)}px, 0, 0) ` : ''
                    const style = {
                        transform: `${dragShift}translate3d(${place.x.toFixed(2)}px, ${place.y.toFixed(2)}px, ${place.z.toFixed(2)}px) rotateY(${place.rotateY.toFixed(3)}deg) scale(${place.scale.toFixed(4)})`,
                        opacity: place.opacity.toFixed(3),
                        zIndex: isActive ? 40 : Math.max(1, 40 - place.distance),
                        filter: place.blur > 0.05 ? `blur(${place.blur.toFixed(2)}px)` : undefined,
                    }
                    const faceClass = focusExtra && isActive ? 'arc-gallery__face arc-gallery__face--with-extra' : 'arc-gallery__face'
                    const front = (
                        <div className={faceClass}>
                            <div className="arc-gallery__head">
                                <span className="arc-gallery__status" data-mastery={card.mastery} aria-hidden="true" />
                                <h2 className="arc-gallery__title">{card.title}</h2>
                                {card.favorite ? (
                                    <HugeiconsIcon className="arc-gallery__star" icon={StarIcon} size={18} aria-hidden="true" />
                                ) : null}
                            </div>
                        </div>
                    )
                    const back = (
                        <div className={`${faceClass} arc-gallery__face--back`}>
                            <p className="arc-gallery__body">
                                {card.body ? card.body : 'This card has no content yet.'}
                            </p>
                        </div>
                    )
                    return (
                        <div
                            className="arc-gallery__card"
                            key={card.id}
                            style={style}
                            aria-hidden={!isActive}
                        >
                            <FlipCard
                                front={front}
                                back={back}
                                flipped={flipped}
                                onFlipChange={() => {}}
                                flipOnClick={false}
                                draggable={false}
                                tilt={false}
                                glare={false}
                                width={320}
                                height={440}
                                radius={22}
                                background="var(--rl-surface)"
                                color="var(--rl-ink)"
                                shadow
                                shadowOpacity={0.16}
                                ariaLabel={card.title}
                                className="arc-gallery__flip"
                            />
                            {focusExtra && isActive ? (
                                <div className="arc-gallery__extra">{focusExtra}</div>
                            ) : null}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
