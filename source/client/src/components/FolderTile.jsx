import { useEffect, useRef, useState } from 'react'
import { validateName } from '../views/fileActions.js'
import Folder from './react-bits/Folder.jsx'

export function folderCaption(name) {
    return name ?? ''
}


export function beginFolderRename(event) {
    //Make sure only double click can activate
    if (event.detail !== 2) {
        return false
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
}) {
    const [draft, setDraft] = useState(folder?.name ?? '')
    const cancelEdit = useRef(false)

    useEffect(() => {
        if (editing) {
            setDraft(folder?.name ?? '')
        }
    }, [editing, folder?.name])

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
        </div>
    )
}
