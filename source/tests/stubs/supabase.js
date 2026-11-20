// A stand-in for source/client/src/supabase.js, so that the functions that
// talk to the API can be tested without a network and without a browser.
//
// Every call is recorded, so a test can check the name of the function and
// the arguments that the client sends.

export const calls = []

export const supabase = {
    rpc: async (name, params) => {
        calls.push({ name, params })
        return { data: null, error: null }
    },
}

export function resetCalls() {
    calls.length = 0
}
