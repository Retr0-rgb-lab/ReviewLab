// A view that is editing a title or a body registers here how that change is
// saved. The application asks for it before it opens the search layer, because
// the specification says that a change that is being edited is saved first
// when the search shortcut is pressed, and that an invalid change keeps the
// search closed and shows the reason.
//
// Only one editor is active at a time, so one slot is enough.

let pending = null

// Registers the commit of the editor that is open now. The returned function
// unregisters it again, so a closed editor does not answer for a later one.
export function registerPendingCommit(commit) {
    pending = commit
    return () => {
        if (pending === commit) {
            pending = null
        }
    }
}

// Asks the editor that is open now to save. The answer is
// { ok: true } when there is nothing to save or when the change was saved,
// and { ok: false, message } when the change is not valid.
export async function runPendingCommit() {
    if (!pending) {
        return { ok: true }
    }
    const outcome = await pending()
    if (!outcome || outcome.ok !== false) {
        return { ok: true }
    }
    return outcome
}
