// Read side of the ReviewLab API. Every function resolves to a plain object and
// never rejects, so a view can use the result without a try/catch.

import { callApi } from '../api.js'

export async function fetchRootFolder() {
    // The one root folder of the tree, or null while the tree has no root yet.
    const result = await callApi('api_get_root')
    if (result.error) {
        if (isMissing(result.error)) {
            return null
        }
        return { error: result.error }
    }
    return result.data || null
}

export async function fetchLevel(folderId) {
    // One level of the tree: the folder itself, its child folders and its cards.
    const result = await callApi('api_list_level', { p_folder: folderId })
    if (result.error) {
        return { error: result.error }
    }
    const data = result.data || {}
    return {
        folder: data.folder || null,
        folders: asList(data.folders),
        cards: asList(data.cards),
    }
}

export async function fetchCard(cardId) {
    // The card as it is reviewed, including its body.
    const result = await callApi('api_get_card', { p_card: cardId })
    if (result.error) {
        return { error: result.error }
    }
    return result.data || null
}

export async function fetchTree() {
    // Every folder and every card of the tree, card bodies included, for search.
    const result = await callApi('api_list_tree')
    if (result.error) {
        return { folders: [], cards: [], error: result.error }
    }
    const data = result.data || {}
    return {
        folders: asList(data.folders),
        cards: asList(data.cards),
    }
}

export async function fetchDeleteImpact(folderId) {
    // How many folders and cards a delete of this folder would take with it.
    const result = await callApi('api_delete_impact', { p_folder: folderId })
    if (result.error) {
        return { error: result.error }
    }
    const data = result.data || {}
    return {
        folderCount: toCount(data.folder_count),
        cardCount: toCount(data.card_count),
    }
}

function asList(value) {
    return Array.isArray(value) ? value : []
}

function toCount(value) {
    const count = Number(value)
    if (!Number.isFinite(count) || count < 0) {
        return 0
    }
    return Math.trunc(count)
}

// The API reports a missing row with the code NOT_FOUND. The HTTP status is
// not relied on, because a deployment without the PT prefix reports 400 and an
// API that is not installed yet also reports 404.
function isMissing(error) {
    if (!error) {
        return false
    }
    if (error.code === 'NOT_FOUND') {
        return true
    }
    return error.status === 404 && error.code !== 'API_NOT_INSTALLED'
}
