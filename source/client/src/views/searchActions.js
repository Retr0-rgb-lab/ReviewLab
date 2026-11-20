// The rules of the search layer: the shortcut, the matching, the grouping by
// last change, the path of a result and the movement of the selected row.
// None of these functions navigate or read the database; the view owns that.

export function isSearchShortcut(event, options = {}) {
    // True when the key press asks for the search layer. A delete confirmation
    // is open, so the search stays closed and Esc only cancels the delete.
    if (!event) {
        return false;
    }
    if (options && options.confirmOpen) {
        return false;
    }
    if (event.key !== 'k' && event.key !== 'K') {
        return false;
    }
    return Boolean(event.ctrlKey || event.metaKey);
}

export function normalizeQuery(raw) {
    // The query without its surrounding spaces. Matching and grouping both use it.
    if (typeof raw !== 'string') {
        return '';
    }
    return raw.trim();
}

export function matchesQuery(item, query) {
    // Every item matches an empty query, the root folder included. A query that
    // is not empty matches a folder by its name and a card by its title or its
    // body, without regard to case.
    if (!item) {
        return false;
    }
    const needle = normalizeQuery(query).toLowerCase();
    if (needle === '') {
        return true;
    }
    const fields = [item.name, item.title, item.body];
    return fields.some((field) => (
        typeof field === 'string' && field.toLowerCase().includes(needle)
    ));
}

export function dayGroup(updatedAt, now) {
    // Which of the three groups a row belongs to, by the local calendar day of
    // the last change.
    const changed = toTime(updatedAt);
    if (changed === null) {
        return 'Earlier';
    }
    const reference = toTime(now);
    const day = new Date(changed);
    const today = new Date(reference === null ? Date.now() : reference);
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const days = Math.round((end - start) / 86400000);
    if (days <= 0) {
        return 'Today';
    }
    if (days === 1) {
        return 'Yesterday';
    }
    return 'Earlier';
}

export function groupSearchResults(items, query, now) {
    // The matching rows, grouped by the day of the last change. The groups come
    // in the order Today, Yesterday, Earlier, and a group without rows is left
    // out. Inside a group the newest change comes first, and rows with the same
    // time keep the order of their creation.
    const rows = Array.isArray(items) ? items : [];
    const matched = rows.filter((item) => matchesQuery(item, query));
    const groups = [];
    for (const label of GROUP_ORDER) {
        const group = matched.filter((item) => dayGroup(item.updated_at, now) === label);
        if (group.length === 0) {
            continue;
        }
        group.sort((left, right) => {
            const changed = toTime(right.updated_at) - toTime(left.updated_at);
            if (changed !== 0) {
                return changed;
            }
            return toTime(left.created_at) - toTime(right.created_at);
        });
        groups.push({label, items: group});
    }
    return groups;
}

export function pathLabel(item, ancestors) {
    // The names of the folders above the item, from the outermost folder down to
    // its parent, joined with " / ". The root folder has no path.
    if (item && item.parent_id === null) {
        return '';
    }
    const list = Array.isArray(ancestors) ? ancestors : [];
    const names = list
        .map((folder) => (folder && typeof folder.name === 'string' ? folder.name : ''))
        .filter((name) => name !== '');
    return names.join(' / ');
}

export function moveSelection(index, direction, count) {
    // The index of the selected row after a step up or down. The ends stop the
    // movement, the rows do not wrap around.
    const total = Number(count);
    if (!Number.isFinite(total) || total <= 0) {
        return index;
    }
    const current = Number.isFinite(Number(index)) ? Number(index) : 0;
    const step = Math.sign(Number(direction));
    if (step === 0) {
        return current;
    }
    const next = current + step;
    if (next < 0) {
        return 0;
    }
    if (next > total - 1) {
        return total - 1;
    }
    return next;
}

export function openSearchResult(item) {
    // What the view has to open. The result carries the folder of the card, so
    // Focus can land on the card itself.
    if (!item) {
        return null;
    }
    if (isFolder(item)) {
        return {target: 'folder', folderId: item.id};
    }
    return {target: 'card', cardId: item.id, folderId: item.folder_id};
}

const GROUP_ORDER = ['Today', 'Yesterday', 'Earlier'];

function isFolder(item) {
    if (item.kind === 'folder') {
        return true;
    }
    if (item.kind === 'card') {
        return false;
    }
    return typeof item.name === 'string' && typeof item.title !== 'string';
}

function toTime(value) {
    if (value === null || value === undefined || value === '') {
        return null;
    }
    const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
    return Number.isNaN(time) ? null : time;
}
