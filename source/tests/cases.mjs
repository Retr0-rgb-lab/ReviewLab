// The checks of the pure functions of the application.
//
// Every check states what the product specification asks for, so the file can
// also be used as the test table of the report. The runner is
// source/tests/run.mjs, which bundles this file and runs it.

import assert from 'node:assert/strict'

import {
    dayGroup,
    groupSearchResults,
    isSearchShortcut,
    matchesQuery,
    moveSelection,
    normalizeQuery,
    openSearchResult,
    pathLabel,
} from '../client/src/views/searchActions.js'

import {
    countRemoval,
    createCard,
    createFolder,
    deleteCard,
    deleteFolder,
    removalConfirmText,
    renameCard,
    renameFolder,
    setMastery,
    updateCardBody,
    validateName,
} from '../client/src/views/fileActions.js'

import { readApiError } from '../client/src/api.js'
import { itemKind, newCardFocus, validateBody, validateTitle } from '../client/src/views/ZenView.jsx'
import { completionRate, markedCount, rateSummary, unmasteredCards } from '../client/src/views/StatsView.jsx'
import { cardMenuActions } from '../client/src/components/CardMenu.jsx'
import { rowName, rowPath } from '../client/src/components/SearchPalette.jsx'
import { masteryShare } from '../client/src/components/MasteryDial.jsx'
import {
    cardLayout,
    offsetOf,
    wrapIndex,
    zoomName,
    zoomValue,
} from '../client/src/components/ArcGallery.jsx'
import { calls, resetCalls } from './stubs/supabase.js'

export const checks = []

// Every check is collected first and run one after the other by the runner,
// because some of them share the recorded calls of the API stub.
export function check(id, what, fn) {
    checks.push({ id, what, fn })
}

const NOW = new Date('2026-11-20T12:00:00')
const day = (offset, hour = 12) => {
    const date = new Date(NOW)
    date.setDate(date.getDate() + offset)
    date.setHours(hour, 0, 0, 0)
    return date.toISOString()
}

// ---------------------------------------------------------------- search

check('S.1', 'Ctrl+K and Cmd+K open the search, other keys do not', () => {
    assert.equal(isSearchShortcut({ key: 'k', ctrlKey: true }), true)
    assert.equal(isSearchShortcut({ key: 'k', metaKey: true }), true)
    assert.equal(isSearchShortcut({ key: 'K', ctrlKey: true }), true)
    assert.equal(isSearchShortcut({ key: 'k' }), false)
    assert.equal(isSearchShortcut({ key: 'j', ctrlKey: true }), false)
})

check('S.2', 'the search shortcut does nothing while a delete confirmation is open', () => {
    assert.equal(isSearchShortcut({ key: 'k', ctrlKey: true }, { confirmOpen: true }), false)
})

check('S.3', 'the query is trimmed', () => {
    assert.equal(normalizeQuery('  requirement  '), 'requirement')
    assert.equal(normalizeQuery(''), '')
    assert.equal(normalizeQuery(null), '')
})

check('S.4', 'an empty query matches every item, the root folder included', () => {
    assert.equal(matchesQuery({ kind: 'folder', name: 'Anything' }, ''), true)
    assert.equal(matchesQuery({ kind: 'folder', name: 'Anything' }, '   '), true)
})

check('S.5', 'a query matches a folder by its name and a card by its title or its body', () => {
    assert.equal(matchesQuery({ kind: 'folder', name: 'Integration' }, 'integr'), true)
    assert.equal(matchesQuery({ kind: 'folder', name: 'Integration' }, 'INTEG'), true)
    assert.equal(matchesQuery({ kind: 'card', title: 'What is a requirement?' }, 'require'), true)
    assert.equal(matchesQuery({ kind: 'card', title: 'A', body: 'Assembling components' }, 'assembling'), true)
    assert.equal(matchesQuery({ kind: 'card', title: 'A', body: 'B' }, 'zzz'), false)
})

check('S.6', 'the groups are Today, Yesterday and Earlier', () => {
    assert.equal(dayGroup(day(0, 9), NOW), 'Today')
    assert.equal(dayGroup(day(-1, 9), NOW), 'Yesterday')
    assert.equal(dayGroup(day(-3, 9), NOW), 'Earlier')
    assert.equal(dayGroup(day(-40, 9), NOW), 'Earlier')
})

check('S.7', 'the results come back in the order Today, Yesterday, Earlier, and an empty group is left out', () => {
    const items = [
        { id: 'a', kind: 'card', title: 'A', updated_at: day(-5), created_at: day(-5) },
        { id: 'b', kind: 'card', title: 'B', updated_at: day(0), created_at: day(0) },
        { id: 'c', kind: 'card', title: 'C', updated_at: day(-1), created_at: day(-1) },
    ]
    const groups = groupSearchResults(items, '', NOW)
    assert.deepEqual(groups.map((group) => group.label), ['Today', 'Yesterday', 'Earlier'])
})

check('S.8', 'inside a group the newest change comes first, and the same time keeps the order of creation', () => {
    const items = [
        { id: 'old', kind: 'card', title: 'old', updated_at: day(0, 8), created_at: day(-9) },
        { id: 'new', kind: 'card', title: 'new', updated_at: day(0, 10), created_at: day(-2) },
    ]
    const groups = groupSearchResults(items, '', NOW)
    assert.deepEqual(groups[0].items.map((item) => item.id), ['new', 'old'])
})

check('S.9', 'the path of a result runs from the outermost folder to its parent', () => {
    const root = { id: 'r', name: 'Software Engineering' }
    const middle = { id: 'm', name: 'Integration' }
    assert.equal(pathLabel({ id: 'r', parent_id: null }, []), '')
    assert.equal(pathLabel({ id: 'm', parent_id: 'r' }, [root]), 'Software Engineering')
    assert.equal(pathLabel({ id: 'c', parent_id: 'm' }, [root, middle]), 'Software Engineering / Integration')
})

check('S.10', 'the selection stops at the ends of the list and does not wrap around', () => {
    assert.equal(moveSelection(0, -1, 5), 0)
    assert.equal(moveSelection(4, 1, 5), 4)
    assert.equal(moveSelection(1, 1, 5), 2)
    assert.equal(moveSelection(3, -1, 5), 2)
    assert.equal(moveSelection(0, 1, 0), 0)
})

check('S.11', 'opening a result of the search says what to open', () => {
    assert.deepEqual(openSearchResult({ kind: 'folder', id: 'f1' }), { target: 'folder', folderId: 'f1' })
    assert.deepEqual(openSearchResult({ kind: 'card', id: 'c1', folder_id: 'f1' }),
        { target: 'card', cardId: 'c1', folderId: 'f1' })
})

check('S.12', 'a row of the palette shows the name of the item and the path above it', () => {
    assert.equal(rowName({ kind: 'folder', name: 'A folder' }), 'A folder')
    assert.equal(rowName({ kind: 'card', title: 'A card' }), 'A card')
    assert.equal(rowPath({ kind: 'card', id: 'c', title: 't', ancestors: [{ name: 'Root' }] }), 'Root')
    assert.equal(rowPath({ kind: 'folder', id: 'r', parent_id: null, ancestors: [] }), '')
})

// ------------------------------------------------------------ validation

check('V.1', 'a name is trimmed, cannot be empty and is at most 120 characters', () => {
    assert.equal(validateName('  ').ok, false)
    assert.equal(validateName('').ok, false)
    assert.equal(validateName('  a  ').name, 'a')
    assert.equal(validateName('x'.repeat(120)).ok, true)
    assert.equal(validateName('x'.repeat(121)).ok, false)
})

check('V.2', 'the length of a name counts code points, not units of UTF-16', () => {
    assert.equal(validateName('😀'.repeat(120)).ok, true)
    assert.equal(validateName('😀'.repeat(121)).ok, false)
})

check('V.3', 'a title of the Focus view is trimmed, cannot be empty and is at most 120 characters', () => {
    assert.equal(validateTitle('   ').ok, false)
    assert.equal(validateTitle('  a  ').value, 'a')
    assert.equal(validateTitle('x'.repeat(120)).ok, true)
    assert.equal(validateTitle('x'.repeat(121)).ok, false)
    // The reason has to say whether the title is empty or too long.
    assert.match(validateTitle('').error, /required|empty/i)
    assert.match(validateTitle('x'.repeat(121)).error, /120/)
})

check('V.4', 'a body of the Focus view may be empty and is at most 4000 characters', () => {
    assert.equal(validateBody('').ok, true)
    assert.equal(validateBody('   ').value, '')
    assert.equal(validateBody('y'.repeat(4000)).ok, true)
    assert.equal(validateBody('y'.repeat(4001)).ok, false)
    assert.equal(validateBody('😀'.repeat(4000)).ok, true)
})

check('V.5', 'a card has exactly the three states the API accepts', async () => {
    resetCalls()
    for (const state of ['unmarked', 'mastered', 'unmastered']) {
        const result = await setMastery('c1', state)
        assert.equal(result.error, undefined)
    }
    assert.deepEqual(calls.map((call) => call.params.p_mastery), ['unmarked', 'mastered', 'unmastered'])
    resetCalls()
})

// --------------------------------------------------------- the API calls

check('A.1', 'creating a folder calls the API with the parent and the name', async () => {
    resetCalls()
    await createFolder('parent-1', '  Notes  ')
    assert.equal(calls.length, 1)
    assert.equal(calls[0].name, 'api_create_folder')
    assert.deepEqual(calls[0].params, { p_parent: 'parent-1', p_name: 'Notes' })
})

check('A.2', 'a name that is not valid never reaches the database', async () => {
    resetCalls()
    const result = await createFolder('parent-1', '   ')
    assert.ok(result.error)
    assert.equal(calls.length, 0)
})

check('A.3', 'renaming a folder and a card calls the API with the right arguments', async () => {
    resetCalls()
    await renameFolder('f1', 'New name')
    await renameCard('c1', 'New title')
    assert.deepEqual(calls.map((call) => call.name), ['api_rename_folder', 'api_rename_card'])
    assert.deepEqual(calls[0].params, { p_id: 'f1', p_name: 'New name' })
    assert.deepEqual(calls[1].params, { p_id: 'c1', p_title: 'New title' })
})

check('A.4', 'creating a card calls the API without a title, because the title is fixed', async () => {
    resetCalls()
    await createCard('f1')
    assert.equal(calls[0].name, 'api_create_card')
    assert.deepEqual(calls[0].params, { p_folder: 'f1' })
})

check('A.5', 'the body is trimmed before it is sent and an empty body is sent as an empty string', async () => {
    resetCalls()
    await updateCardBody('c1', '  the body  ')
    await updateCardBody('c1', '   ')
    assert.deepEqual(calls[0].params, { p_id: 'c1', p_body: 'the body' })
    assert.deepEqual(calls[1].params, { p_id: 'c1', p_body: '' })
})

check('A.6', 'a body that is too long never reaches the database', async () => {
    resetCalls()
    const result = await updateCardBody('c1', 'y'.repeat(4001))
    assert.ok(result.error)
    assert.equal(calls.length, 0)
})

check('A.7', 'the mastery is sent as one of the three states and nothing else is accepted', async () => {
    resetCalls()
    await setMastery('c1', 'mastered')
    assert.deepEqual(calls[0].params, { p_id: 'c1', p_mastery: 'mastered' })
    resetCalls()
    const result = await setMastery('c1', 'unknown')
    assert.ok(result.error)
    assert.equal(calls.length, 0)
})

check('A.8', 'the root folder is never sent to the database for a delete', async () => {
    resetCalls()
    const result = await deleteFolder('root-1', true)
    assert.ok(result.error)
    assert.equal(calls.length, 0)
})

check('A.9', 'deleting a card calls the API', async () => {
    resetCalls()
    await deleteCard('c1')
    assert.equal(calls[0].name, 'api_delete_card')
    assert.deepEqual(calls[0].params, { p_id: 'c1' })
})

check('A.10', 'the error of the API keeps the status and the code', () => {
    const error = readApiError({ message: 'NAME_TOO_LONG: Name must be at most 120 characters.', code: 'PT400' })
    assert.equal(error.status, 400)
    assert.equal(error.code, 'NAME_TOO_LONG')
    assert.equal(error.message, 'Name must be at most 120 characters.')
    const missing = readApiError({ message: 'NOT_FOUND: That card does not exist.', code: 'PT404' })
    assert.equal(missing.status, 404)
    assert.equal(missing.code, 'NOT_FOUND')
})

// --------------------------------------------------------------- the UI

check('U.1', 'the sentence of the delete confirmation states both numbers', () => {
    const text = removalConfirmText(3, 7, 'folder')
    assert.match(text, /3/)
    assert.match(text, /7/)
    assert.match(text, /folder/i)
    assert.match(text, /card/i)
})

check('U.2', 'the confirmation of a card states zero folders and one card', () => {
    const text = removalConfirmText(0, 1, 'card')
    assert.match(text, /0 folders/)
    assert.match(text, /1 card/)
    assert.match(text, /folder/i)
    assert.doesNotMatch(text, /Delete this card/i)
})

check('U.3', 'the count of the confirmation counts the item itself', () => {
    assert.deepEqual(countRemoval({ kind: 'card' }, { folderCount: 0, cardCount: 1 }), { folderCount: 0, cardCount: 1 })
    assert.deepEqual(countRemoval({ kind: 'folder' }, { folderCount: 2, cardCount: 3 }), { folderCount: 2, cardCount: 3 })
})

check('U.4', 'the completion rate counts the marked cards over the cards of the level', () => {
    const cards = [
        { mastery: 'mastered' },
        { mastery: 'unmastered' },
        { mastery: 'unmarked' },
    ]
    assert.equal(markedCount(cards), 2)
    assert.equal(completionRate(cards), 67)
    assert.match(rateSummary(cards), /2 of 3/)
})

check('U.5', 'a level without cards has no rate and no division by zero', () => {
    assert.equal(completionRate([]), null)
    assert.equal(markedCount([]), 0)
    assert.equal(rateSummary([]), '')
})

check('U.6', 'the list of the cards that are not mastered leaves the unmarked cards out', () => {
    const cards = [
        { id: 'a', mastery: 'mastered', created_at: '2026-11-01T00:00:00Z' },
        { id: 'b', mastery: 'unmastered', created_at: '2026-11-03T00:00:00Z' },
        { id: 'c', mastery: 'unmastered', created_at: '2026-11-02T00:00:00Z' },
        { id: 'd', mastery: 'unmarked', created_at: '2026-11-04T00:00:00Z' },
    ]
    assert.deepEqual(unmasteredCards(cards).map((card) => card.id), ['c', 'b'])
})

check('U.7', 'a new card starts with the title New page, an empty body and no mark', () => {
    const card = newCardFocus({ id: 'c1' })
    assert.equal(card.title, 'New page')
    assert.equal(card.body, '')
    assert.equal(card.mastery, 'unmarked')
})

check('U.8', 'a row of a level is either a folder or a card', () => {
    assert.equal(itemKind({ kind: 'folder' }), 'folder')
    assert.equal(itemKind({ kind: 'card' }), 'card')
    assert.equal(itemKind({ title: 'A card' }), 'card')
    assert.equal(itemKind({ name: 'A folder' }), 'folder')
})

check('U.9', 'the card menu has Rename and Delete and no Move', () => {
    const actions = cardMenuActions()
    assert.deepEqual(actions.map((action) => action.label), ['Rename', 'Delete'])
    assert.equal(actions.some((action) => /move/i.test(action.label)), false)
})

// ------------------------------------------------------------- the dial

check('D.1', 'a level without a marked card has an empty dial and no share', () => {
    assert.deepEqual(masteryShare(0, 0), { p: 0, value: 0, empty: true })
})

check('D.2', 'a level where every card is mastered fills the ring', () => {
    const share = masteryShare(1, 0)
    assert.equal(share.value, 100)
    assert.equal(share.empty, false)
    assert.equal(share.p, 1)
})

check('D.3', 'a level where no card is mastered is not an empty dial', () => {
    const share = masteryShare(0, 2)
    assert.equal(share.value, 0)
    assert.equal(share.empty, false)
    assert.equal(share.p, 0)
})

check('D.4', 'half of the cards mastered gives half of the ring', () => {
    const share = masteryShare(1, 1)
    assert.equal(share.value, 50)
    assert.equal(share.p, 0.5)
})

check('D.5', 'the share counts the marked cards only, and it is rounded', () => {
    const share = masteryShare(3, 1)
    assert.equal(share.value, 75)
    assert.equal(share.p, 0.75)
    assert.equal(masteryShare(1, 2).value, 33)
})

// ----------------------------------------------------------- the gallery

check('G.1', 'the index of a card is wrapped in both directions', () => {
    assert.equal(wrapIndex(-1, 3), 2)
    assert.equal(wrapIndex(3, 3), 0)
    assert.equal(wrapIndex(4, 3), 1)
    assert.equal(wrapIndex(-4, 3), 2)
    assert.equal(wrapIndex(0, 0), 0)
})

check('G.2', 'the distance to a card is taken the short way round', () => {
    assert.equal(offsetOf(0, 2, 5, true), -2)
    assert.equal(offsetOf(4, 0, 5, true), -1)
    assert.equal(offsetOf(2, 0, 5, true), 2)
    assert.equal(offsetOf(4, 0, 5, false), 4)
    assert.equal(offsetOf(0, 0, 1, true), 0)
})

check('G.3', 'the two zoom states have a name and a number', () => {
    assert.equal(zoomValue('overview'), 0)
    assert.equal(zoomValue('focused'), 1)
    assert.equal(zoomName(0.4), 'overview')
    assert.equal(zoomName(0.6), 'focused')
    assert.equal(zoomName(0), 'overview')
    assert.equal(zoomName(1), 'focused')
    assert.equal(zoomName(zoomValue('overview')), 'overview')
    assert.equal(zoomName(zoomValue('focused')), 'focused')
})

check('G.4', 'the card in focus stands in the middle of the arc in both zoom states', () => {
    const focused = cardLayout(2, 2, 5, 1)
    const overview = cardLayout(2, 2, 5, 0)
    assert.equal(focused.distance, 0)
    assert.equal(focused.x, overview.x)
    assert.equal(focused.y, overview.y)
    assert.equal(focused.z, overview.z)
    assert.equal(focused.scale, overview.scale)
    assert.equal(focused.opacity, overview.opacity)
    assert.equal(overview.x, 0)
    assert.equal(overview.y, 0)
})

check('G.5', 'in the overview a card that is far away is smaller and fainter', () => {
    const active = cardLayout(0, 0, 5, 0)
    const far = cardLayout(3, 0, 5, 0)
    assert.equal(far.distance, -2)
    assert.ok(far.scale < active.scale)
    assert.ok(far.opacity < active.opacity)
    assert.ok(Math.abs(far.x) > Math.abs(active.x))
})

check('G.6', 'in the focused state the cards behind peek out to the upper left', () => {
    const active = cardLayout(0, 0, 5, 1)
    const behind = cardLayout(1, 0, 5, 1)
    assert.equal(active.x, 0)
    assert.equal(active.y, 0)
    assert.ok(behind.x < 0)
    assert.ok(behind.y < 0)
    assert.ok(behind.z < 0)
    assert.equal(behind.opacity, 1)
})

check('G.7', 'the distance to a card is the same in both zoom states', () => {
    assert.equal(cardLayout(3, 0, 5, 0).distance, cardLayout(3, 0, 5, 1).distance)
    const only = cardLayout(0, 0, 1, 0)
    assert.equal(only.distance, 0)
    assert.equal(only.scale, 1)
    assert.equal(only.opacity, 1)
})
