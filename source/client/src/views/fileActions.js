//Create and rename folders and cards

import { supabase } from '../supabase.js'

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
    const result = validateName(rawName);
    if (!result.ok){
        return {error: result.error};
    }
    const {data: folder, error} = await supabase
        .from('folders')
        .insert({
            name: result.name,
            parent_id: parentId
        })
        .select('id, name')
        .single();
    if (error){
        return {error: error.message};
    } 
    return {folder};
}


export async function renameFolder(folderId, rawName) {
    const result = validateName(rawName);
    if (!result.ok){
        return {error: result.error};
    }
    const {data: folder, error} = await supabase
        .from('folders')
        .update({name: result.name})
        .eq('id', folderId)
        .select('id, name')
        .single();
    
    if (error){
        return {error: error.message};
    }
    return {folder};
}


export async function createCard(folderId) {
    const new_card = {
        title: "New page",
        body: "",
        mastery: "unmarked"
    };
    const {data: card, error} = await supabase
        .from('cards')
        .insert({
            title: new_card.title,
            folder_id: folderId,
            body: new_card.body,
            mastery: new_card.mastery
        })
        .select('id, title')
        .single();
    if (error){
        return {error: error.message};
    }
    return {card};
}

export async function renameCard(cardId, rawTitle) {
    const result = validateName(rawTitle);
    if (!result.ok){
        return {error: result.error};
    }
    const {data: card, error} = await supabase
        .from('cards')
        .update({title: result.name})
        .eq('id', cardId)
        .select('id, title')
        .single();

    if (error){
        return {error: error.message};
    }
    return {card};
}
