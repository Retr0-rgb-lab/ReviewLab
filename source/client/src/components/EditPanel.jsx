// EditPanel: the side panel that edits the title and the body of one card.
//
// The panel checks the input before it hands the card over to onSave, so an
// invalid card never reaches the database. The Esc key is read on the panel
// itself, so it closes the panel and does not fall through to the rest of
// the application.

import { useEffect, useRef, useState } from 'react'
import './EditPanel.css'

const TITLE_MAX = 120
const BODY_MAX = 4000

export default function EditPanel({
    open = false,
    card = null,
    onClose = null,
    onSave = null,
    theme = 'White',
    className = '',
}) {
    const [title, setTitle] = useState('')
    const [body, setBody] = useState('')
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)
    const panelRef = useRef(null)
    const titleRef = useRef(null)

    // The fields follow the card that is opened, a new card fills them again.
    useEffect(() => {
        if (!open) return
        setTitle(card?.title ?? '')
        setBody(card?.body ?? '')
        setError('')
    }, [open, card])

    // Esc closes the panel. The listener sits on the panel, so the key is not
    // taken away from the rest of the application.
    useEffect(() => {
        if (!open) return undefined
        const node = panelRef.current
        if (!node) return undefined

        const onKeyDown = (event) => {
            if (event.key !== 'Escape') return
            event.stopPropagation()
            onClose?.()
        }

        node.addEventListener('keydown', onKeyDown)
        return () => node.removeEventListener('keydown', onKeyDown)
    }, [open, onClose])

    // The title is the first thing to read, so it takes the focus.
    useEffect(() => {
        if (!open) return
        titleRef.current?.focus({ preventScroll: true })
    }, [open])

    const handleSave = async () => {
        const trimmed = title.trim()
        if (!trimmed) {
            setError('Title is required')
            return
        }
        if ([...trimmed].length > TITLE_MAX) {
            setError('Title must be at most 120 characters')
            return
        }
        if ([...body].length > BODY_MAX) {
            setError('Body must be at most 4000 characters')
            return
        }
        if (!card || !onSave) return

        setError('')
        setSaving(true)
        try {
            const result = await onSave(card.id, { title: trimmed, body })
            if (result && result.error) {
                setError(result.error)
                return
            }
            onClose?.()
        } finally {
            setSaving(false)
        }
    }

    const classes = ['edit-panel', open ? 'edit-panel--open' : 'edit-panel--closed', className]
        .filter(Boolean)
        .join(' ')

    return (
        <aside
            ref={panelRef}
            className={classes}
            data-theme={theme}
            aria-label="Edit card"
            aria-hidden={!open}
        >
            <header className="edit-panel__header">
                <h2 className="edit-panel__heading">Edit card</h2>
                <button
                    type="button"
                    className="edit-panel__close"
                    aria-label="Close"
                    title="Close"
                    onClick={() => onClose?.()}
                >
                    &times;
                </button>
            </header>

            <div className="edit-panel__body">
                <label className="edit-panel__field">
                    <span className="edit-panel__label">Title</span>
                    <input
                        ref={titleRef}
                        className="edit-panel__input"
                        type="text"
                        value={title}
                        placeholder="Card title"
                        onChange={(event) => setTitle(event.target.value)}
                    />
                </label>

                <label className="edit-panel__field">
                    <span className="edit-panel__label">Body</span>
                    <textarea
                        className="edit-panel__textarea"
                        rows={10}
                        value={body}
                        placeholder="Card body"
                        onChange={(event) => setBody(event.target.value)}
                    />
                </label>

                {error ? (
                    <p className="edit-panel__error" role="alert">{error}</p>
                ) : null}
            </div>

            <footer className="edit-panel__footer">
                <button
                    type="button"
                    className="edit-panel__save"
                    onClick={handleSave}
                    disabled={saving}
                >
                    Save
                </button>
            </footer>
        </aside>
    )
}
