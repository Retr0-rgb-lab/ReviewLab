// Create, rename and delete folders and cards, and edit card content. Every
// write goes through the ReviewLab API, so the rules in the database hold.

import { apiSetFavorite, callApi } from '../api.js'

export function validateName(raw) {
    const name = raw.trim();
    if (name === ""){
        return {
            ok: false,
            error: "Name is required"
        };
    } else {
        if ([...name].length > 120){
            return {
                ok: false,
                error: "Name must be at most 120 characters"
            };
        } else {
            return {
                ok: true,
                name
            };
        }
    }
}

export async function createFolder(parentId, rawName) {
    // A new folder inside the given parent, named by the user.
    const result = validateName(rawName);
    if (!result.ok){
        return {error: result.error};
    }
    const response = await callApi('api_create_folder', {
        p_parent: parentId,
        p_name: result.name,
    });
    if (response.error){
        return {error: response.error.message};
    }
    return {folder: response.data};
}


export async function renameFolder(folderId, rawName) {
    // A renamed folder. The root folder may be renamed, but not deleted.
    const result = validateName(rawName);
    if (!result.ok){
        return {error: result.error};
    }
    const response = await callApi('api_rename_folder', {
        p_id: folderId,
        p_name: result.name,
    });
    if (response.error){
        return {error: response.error.message};
    }
    return {folder: response.data};
}


export async function createCard(folderId) {
    // A new card in the given folder. The API gives it the title "New page",
    // an empty body and the mastery "unmarked".
    const response = await callApi('api_create_card', {p_folder: folderId});
    if (response.error){
        return {error: response.error.message};
    }
    return {card: response.data};
}

export async function renameCard(cardId, rawTitle) {
    // A card with a new title. The body is not touched.
    const result = validateName(rawTitle);
    if (!result.ok){
        return {error: result.error};
    }
    const response = await callApi('api_rename_card', {
        p_id: cardId,
        p_title: result.name,
    });
    if (response.error){
        return {error: response.error.message};
    }
    return {card: response.data};
}

export function countRemoval(item, nestedFolders, nestedCards) {
    // The two numbers of the delete confirmation. The API already counts the
    // selected item and every level below it, so its counts are passed through.
    if (isCard(item)) {
        return {folderCount: 0, cardCount: 1};
    }
    const impact = asImpact(nestedFolders) || asImpact(nestedCards);
    if (impact) {
        return {folderCount: impact.folderCount, cardCount: impact.cardCount};
    }
    if (typeof nestedFolders === 'number' && typeof nestedCards === 'number') {
        return {folderCount: toCount(nestedFolders), cardCount: toCount(nestedCards)};
    }
    // Fallback for a caller that still hands over the nested rows instead of the
    // impact of the API. It only sees one level.
    const folders = Array.isArray(nestedFolders) ? nestedFolders : [];
    const cards = Array.isArray(nestedCards) ? nestedCards : [];
    return {folderCount: 1 + folders.length, cardCount: cards.length};
}

export function removalConfirmText(folderCount, cardCount, kind = 'folder') {
    // One sentence for a card and for a folder. The dialog title already names
    // `kind`, so this sentence only states the two counts, including a zero.
    const folders = toCount(folderCount);
    const cards = toCount(cardCount);
    return `This removes ${plural(folders, 'folder')} and ${plural(cards, 'card')}.`;
}

export async function deleteFolder(folderId, isRoot) {
    // A folder and everything below it. The root folder is refused here, so no
    // request is sent for it.
    if (isRoot) {
        return {error: 'The root folder cannot be deleted.'};
    }
    const response = await callApi('api_delete_folder', {p_id: folderId});
    if (response.error){
        return {error: response.error.message};
    }
    return {deleted: true};
}

export async function deleteCard(cardId) {
    // One card, and nothing else.
    const response = await callApi('api_delete_card', {p_id: cardId});
    if (response.error){
        return {error: response.error.message};
    }
    return {deleted: true};
}

export async function updateCardBody(cardId, rawBody) {
    // The body of a card, saved from Focus. An empty body is valid, and the
    // length is counted in code points.
    const body = typeof rawBody === 'string' ? rawBody.trim() : '';
    if ([...body].length > 4000) {
        return {error: 'Body is too long. It must be at most 4000 characters.'};
    }
    const response = await callApi('api_update_card_body', {
        p_id: cardId,
        p_body: body,
    });
    if (response.error){
        return {error: response.error.message};
    }
    return {card: response.data};
}

export async function setMastery(cardId, mastery) {
    // The mastery of a card: unmarked, mastered or unmastered.
    if (!MASTERY_VALUES.includes(mastery)) {
        return {error: 'Mastery must be unmarked, mastered or unmastered.'};
    }
    const response = await callApi('api_set_mastery', {
        p_id: cardId,
        p_mastery: mastery,
    });
    if (response.error){
        return {error: response.error.message};
    }
    return {card: response.data};
}

export async function setFavorite(cardId, favorite) {
    // The favorite flag of a card: true or false. The flag sits on the card
    // next to the mastery, so changing it also moves the card to the top of the
    // search results.
    if (typeof favorite !== 'boolean') {
        return {error: 'Favorite must be true or false.'};
    }
    const response = await apiSetFavorite(cardId, favorite);
    if (response.error){
        return {error: response.error.message};
    }
    return {card: response.data};
}

const MASTERY_VALUES = ['unmarked', 'mastered', 'unmastered'];

function isCard(item) {
    if (!item) {
        return false;
    }
    if (item.kind === 'card') {
        return true;
    }
    if (item.kind === 'folder') {
        return false;
    }
    return typeof item.title === 'string' || item.folder_id !== undefined;
}

// Accepts the impact of the API, in either spelling of the counters.
function asImpact(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return null;
    }
    const folders = value.folderCount !== undefined ? value.folderCount : value.folder_count;
    const cards = value.cardCount !== undefined ? value.cardCount : value.card_count;
    if (folders === undefined && cards === undefined) {
        return null;
    }
    return {folderCount: toCount(folders), cardCount: toCount(cards)};
}

function toCount(value) {
    const count = Number(value);
    if (!Number.isFinite(count) || count < 0) {
        return 0;
    }
    return Math.trunc(count);
}

function plural(count, noun) {
    return `${count} ${noun}${count === 1 ? '' : 's'}`;
}
