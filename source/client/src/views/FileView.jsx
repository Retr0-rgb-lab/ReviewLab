// Fetch folders and cards from Supabase and display the current folder's contents.
// Allow users to navigate into subfolders.

import { useEffect, useState } from 'react'
import { supabase } from '../supabase.js'

export default function FileView() {
    const [folder, setFolder] = useState(null)
    const [items, setItems] = useState([])
    const [counts, setCounts] = useState({ folders: 0, cards: 0 })
    const [error, setError] = useState('')

    useEffect(() => {
        let cancelled = false

        async function load() {
            const root = await fetchRootFolder()
            if (cancelled) {
                return
            }
            if (!root) {
                setError('Have not open the root level yet')
                return
            }
            await showFolder(root, setFolder, setItems, setCounts, setError)
        }

        load().catch((caught) => {
            if (!cancelled) {
                setError(caught.message)
            }
        })

        return () => {
            cancelled = true
        }
    }, [])

    return (
        <main>
            <p>{error}</p>
            <h1>{folder ? folder.name : 'Current level'}</h1>
            <p>
                {counts.folders} folders, {counts.cards} cards. 
            </p>
            <ul>
                {items.map((item) => (
                    <li key={`${item.kind}-${item.id}`}>
                        <button
                            type="button"
                            onClick={() =>
                                openFolder(item, setFolder, setItems, setCounts, setError)
                            }
                        >
                            {labelFor(item)}
                        </button>
                    </li>
                ))}
            </ul>
        </main>
    )
}

export async function fetchRootFolder() {
	const {data, error} = await supabase
        .from('folders')
        .select('id, name')
        .is('parent_id', null)
        .maybeSingle();

    if (error || data === null) {
        return null;
    } else {
        return data;
    }
}


export async function fetchLevel(folderId) {
    const {data: child_folders, error: folder_error} = await supabase
        .from('folders')
        .select('id, name, created_at')
        .eq('parent_id', folderId);
    
    const {data: child_cards, error: card_error} = await supabase
        .from('cards')
        .select('id, title, created_at')
        .eq('folder_id', folderId);
    
    if (folder_error || card_error){
        return { folders: [], cards: [], error: (folder_error || card_error).message }
    }
    return {folders: child_folders, cards: child_cards, error: null};
}


export function orderLevel(folders, cards) {
    const folderItems = folders.map(folder => ({
        ...folder,
        kind: 'folder'
    }));

    const cardItems = cards.map(card => ({
        ...card,
        kind: 'card'
    }));

    const items = [...folderItems, ...cardItems];
    items.sort((a, b) => (
        new Date(a.created_at) - new Date(b.created_at)
    ));

    return items;
}

export async function showFolder(folderRow, setFolder, setItems, setCounts, setError) {
    const level = await fetchLevel(folderRow.id)
    if (!level || level.error) {
        setError(level && level.error ? level.error : 'Cannot read this level')
        return
    }
    const folders = level.folders || []
    const cards = level.cards || []
    setFolder({ id: folderRow.id, name: folderRow.name })
    setCounts({ folders: folders.length, cards: cards.length })
    setItems(orderLevel(folders, cards))
    setError('')
}


export function labelFor(item) {
    if (item.kind === 'folder') {
        return "folder" + " " + item.name;
    } else {
        return "card" + " " + item.title;
    }
}

export async function openFolder(item, setFolder, setItems, setCounts, setError) {
    if (item.kind !== 'folder') return;
    await showFolder(item, setFolder, setItems, setCounts, setError);
}
