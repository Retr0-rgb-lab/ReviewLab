import { useEffect, useRef, useState } from 'react'
import { validateName } from '../views/fileActions.js'
import { registerPendingCommit } from '../pendingCommit.js'
import Folder from './react-bits/Folder.jsx'

export function folderCaption(name) {
    return name ?? ''
}


export function beginFolderRename(event) {
    //Make sure only double click can activate
    if (event.detail !== 2) {
        return false;
    }
    return event.target.closest('[data-folder-name]') !== null
}

export function commitFolderName(rawName) {
    return validateName(rawName)
}

export default function FolderTile({
    folder,
    theme = 'White',
    editing,
    onEnter,
    onBeginRename,
    onCommitRename,
    onCancelRename,
    onDelete,
}) {
    const [draft, setDraft] = useState(folder?.name ?? '')
    const cancelEdit = useRef(false)

    useEffect(() => {
        if (editing) {
            setDraft(folder?.name ?? '')
        }
    }, [editing, folder?.name])

    // While the name is being edited, the application can ask for the change
    // to be saved. The search shortcut uses this.
    useEffect(() => {
        if (!editing) {
            return undefined
        }
        const commit = async () => {
            const check = validateName(draft)
            if (!check.ok) {
                return { ok: false, message: check.error }
            }
            const result = typeof onCommitRename === 'function'
                ? await onCommitRename(check.name)
                : null
            if (result && result.error) {
                return { ok: false, message: result.error }
            }
            return { ok: true }
        }
        return registerPendingCommit(commit)
    }, [editing, draft, onCommitRename])

    function onNameClick(event) {
        if (!beginFolderRename(event)) {
            return
        }
        cancelEdit.current = false
        onBeginRename()
    }

    function onNameKeyDown(event) {
        event.stopPropagation()
        if (event.key === 'Escape') {
            event.preventDefault()
            cancelEdit.current = true
            onCancelRename()
        }
        if (event.key === 'Enter') {
            event.preventDefault()
            event.currentTarget.blur()
        }
    }

    async function onNameBlur(event) {
        if (cancelEdit.current) {
            cancelEdit.current = false
            return
        }
        const result = await onCommitRename(draft)
        if (result && result.error) {
            event.target.focus()
        }
    }

    return (
        <div className="folder-tile">
            <Folder
                className="folder-tile__graphic"
                label={folderCaption(folder?.name)}
                theme={theme === 'Dark' ? 'dark' : 'light'}
                size={0.72}
                items={[{ title: '' }]}
                open={false}
                draggable={false}
                zoomOnClick={false}
                onOpenChange={(next) => {
                    if (next && !editing) {
                        onEnter()
                    }
                }}
            />
            {editing ? (
                <input
                    data-folder-name
                    autoFocus
                    aria-label="Folder name"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={onNameKeyDown}
                    onBlur={onNameBlur}
                />
            ) : (
                <span data-folder-name onClick={onNameClick}>
                    {folderCaption(folder?.name)}
                </span>
            )}
            {onDelete && !editing ? (
                <button
                    type="button"
                    className="folder-tile__delete"
                    onClick={onDelete}
                    aria-label={`Delete folder ${folderCaption(folder?.name)}`}
                >
                    Delete
                </button>
            ) : null}
        </div>
    )
}
