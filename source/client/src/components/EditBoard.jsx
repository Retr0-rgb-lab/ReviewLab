// EditBoard: the white panel that edits the title and the body of one card.
//
// The board is controlled. It does not decide whether a change can be saved,
// and it does not ask about unsaved work. The parent owns both.
//
// The body is plain text. Bold and italic wrap the selection, and a bullet
// is a line that starts with "- ". The title has no marks.

import { useId, useLayoutEffect, useRef } from 'react'
import SpecularButton from './react-bits/SpecularButton.jsx'
import WarmTooltip, { WarmTooltipGroup } from './react-bits/WarmTooltip.jsx'
import './EditBoard.css'

// The caret stays between the marks when the selection is empty.
function applyWrap(value, start, end, open, close) {
    const length = value.length
    const lo = clamp(Math.min(start, end), 0, length)
    const hi = clamp(Math.max(start, end), 0, length)
    const selected = value.slice(lo, hi)
    return {
        value: value.slice(0, lo) + open + selected + close + value.slice(hi),
        start: lo + open.length,
        end: lo + open.length + selected.length,
    }
}

// Every line the selection touches gains "- " once. A line that already
// starts with it is left alone, and the caret stays on the same characters.
function applyList(value, start, end) {
    const length = value.length
    const lo = clamp(Math.min(start, end), 0, length)
    const hi = clamp(Math.max(start, end), 0, length)
    const lineStart = lo === 0 ? 0 : value.lastIndexOf('\n', lo - 1) + 1
    const anchor = hi > lo ? hi - 1 : lo
    const breakAt = value.indexOf('\n', anchor)
    const lineEnd = breakAt === -1 ? length : breakAt
    const lines = value.slice(lineStart, lineEnd).split('\n')

    let pos = lineStart
    let shiftLo = 0
    let shiftHi = 0
    const nextLines = lines.map((line) => {
        const begins = pos
        pos += line.length + 1
        if (line.startsWith('- ')) return line
        if (begins <= lo) shiftLo += 2
        if (begins <= hi) shiftHi += 2
        return `- ${line}`
    })

    return {
        value: value.slice(0, lineStart) + nextLines.join('\n') + value.slice(lineEnd),
        start: lo + shiftLo,
        end: hi + shiftHi,
    }
}

function clamp(value, min, max) {
    if (!Number.isFinite(value)) return max
    return Math.min(max, Math.max(min, value))
}

export default function EditBoard({
    title = '',
    body = '',
    side = 'front',
    saving = false,
    error = null,
    canSave = false,
    onTitleChange,
    onBodyChange,
    onFocusTitle,
    onFocusBody,
    onSave,
    onClose,
}) {
    const titleId = useId()
    const bodyId = useId()
    const bodyRef = useRef(null)
    const selectionRef = useRef(null)
    const pendingCaret = useRef(null)
    const text = typeof body === 'string' ? body : ''
    const titleText = typeof title === 'string' ? title : ''

    // The body is controlled, so the caret is put back after the parent
    // sends the string the toolbar just wrote. A later, different string
    // drops that request instead of moving the caret.
    useLayoutEffect(() => {
        const caret = pendingCaret.current
        if (!caret) return
        pendingCaret.current = null
        if (caret.value !== text) return
        placeCaret(caret.start, caret.end)
    }, [text])

    const rememberSelection = () => {
        const field = bodyRef.current
        if (!field || typeof field.selectionStart !== 'number') return
        selectionRef.current = { start: field.selectionStart, end: field.selectionEnd }
    }

    const readRange = () => {
        const field = bodyRef.current
        if (field && document.activeElement === field && typeof field.selectionStart === 'number') {
            return { start: field.selectionStart, end: field.selectionEnd }
        }
        if (selectionRef.current) return selectionRef.current
        return { start: text.length, end: text.length }
    }

    const placeCaret = (start, end) => {
        const field = bodyRef.current
        selectionRef.current = { start, end }
        if (!field) return
        field.focus({ preventScroll: true })
        const max = field.value.length
        field.setSelectionRange(Math.min(start, max), Math.min(end, max))
    }

    const commitBody = (next, start, end) => {
        selectionRef.current = { start, end }
        if (next === text) {
            placeCaret(start, end)
            return
        }
        pendingCaret.current = { start, end, value: next }
        onBodyChange?.(next)
    }

    const onBold = () => {
        const range = readRange()
        const next = applyWrap(text, range.start, range.end, '**', '**')
        commitBody(next.value, next.start, next.end)
    }

    const onItalic = () => {
        const range = readRange()
        const next = applyWrap(text, range.start, range.end, '*', '*')
        commitBody(next.value, next.start, next.end)
    }

    const onList = () => {
        const range = readRange()
        const next = applyList(text, range.start, range.end)
        commitBody(next.value, next.start, next.end)
    }

    // The toolbar must not take the caret. The range is stored first, while
    // the body still has it. A mouse press is cancelled so the highlight stays.
    const keepCaret = (event) => {
        rememberSelection()
        if (event.pointerType === 'mouse') event.preventDefault()
    }

    return (
        <section className="edit-board" aria-label="Edit card">
            <div className="edit-board__bar">
                <button
                    type="button"
                    className="edit-board__close"
                    aria-label="Close"
                    onClick={() => onClose?.()}
                >
                    ×
                </button>
            </div>

            <div className="edit-board__field">
                <label className="edit-board__label" htmlFor={titleId}>Title</label>
                <input
                    id={titleId}
                    className={`edit-board__input${side === 'front' ? ' edit-board__input--current' : ''}`}
                    type="text"
                    value={titleText}
                    onChange={(event) => onTitleChange?.(event.target.value)}
                    onFocus={() => onFocusTitle?.()}
                />
                <p className="edit-board__hint">Front of the card.</p>
            </div>

            <div className="edit-board__field edit-board__field--body">
                <label className="edit-board__label" htmlFor={bodyId}>Body</label>
                <WarmTooltipGroup>
                    <div className="edit-board__tools" role="toolbar" aria-label="Body style">
                        <WarmTooltip content="Bold" side="top">
                            <button
                                type="button"
                                className="edit-board__tool edit-board__tool--bold"
                                onPointerDown={keepCaret}
                                onClick={onBold}
                            >
                                Bold
                            </button>
                        </WarmTooltip>
                        <WarmTooltip content="Italic" side="top">
                            <button
                                type="button"
                                className="edit-board__tool edit-board__tool--italic"
                                onPointerDown={keepCaret}
                                onClick={onItalic}
                            >
                                Italic
                            </button>
                        </WarmTooltip>
                        <WarmTooltip content="List" side="top">
                            <button
                                type="button"
                                className="edit-board__tool"
                                onPointerDown={keepCaret}
                                onClick={onList}
                            >
                                List
                            </button>
                        </WarmTooltip>
                    </div>
                </WarmTooltipGroup>
                <textarea
                    ref={bodyRef}
                    id={bodyId}
                    className={`edit-board__textarea${side === 'back' ? ' edit-board__textarea--current' : ''}`}
                    value={text}
                    onChange={(event) => {
                        const field = event.target
                        if (typeof field.selectionStart === 'number') {
                            selectionRef.current = { start: field.selectionStart, end: field.selectionEnd }
                        }
                        onBodyChange?.(field.value)
                    }}
                    onFocus={() => onFocusBody?.()}
                    onSelect={rememberSelection}
                    onKeyUp={rememberSelection}
                    onMouseUp={rememberSelection}
                    onBlur={rememberSelection}
                />
                <p className="edit-board__hint">Back of the card. It updates as you type.</p>
            </div>

            <div className="edit-board__footer">
                <SpecularButton
                    type="button"
                    size="sm"
                    radius={999}
                    textColor="#fffdf8"
                    lineColor="#fffdf8"
                    baseColor="#3f3f46"
                    tint="#fffdf8"
                    tintOpacity={0.08}
                    disabled={!canSave || saving}
                    onClick={() => onSave?.()}
                >
                    {saving ? 'Saving' : 'Save'}
                </SpecularButton>
                {error ? (
                    <p className="edit-board__error" role="alert">{error}</p>
                ) : null}
            </div>
        </section>
    )
}
