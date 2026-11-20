import { supabase } from './supabase.js'

// Every backend call goes through this module. The Postgres functions are
// defined in source/database/api.sql and are documented in source/API.md.
// The client never touches the tables directly.

const NOT_INSTALLED = 'The ReviewLab API is not installed in this database yet. Run source/database/api.sql in the Supabase SQL editor.'

function statusFromSqlstate(sqlstate) {
    // The api.sql helper raises with a SQLSTATE of PT400, PT403, PT404 or PT409.
    // PostgREST maps the PT prefix to the HTTP status code.
    if (typeof sqlstate === 'string' && sqlstate.startsWith('PT')) {
        const parsed = Number.parseInt(sqlstate.slice(2), 10)
        if (!Number.isNaN(parsed)) {
            return parsed
        }
    }
    return 500
}

export function readApiError(error) {
    const raw = (error && error.message) || 'The request failed.'
    const cut = raw.indexOf(': ')
    const code = cut > 0 ? raw.slice(0, cut) : 'REQUEST_FAILED'
    const message = cut > 0 ? raw.slice(cut + 2) : raw
    return {
        status: statusFromSqlstate(error && error.code),
        code,
        message,
    }
}

export async function callApi(name, params = {}) {
    const { data, error } = await supabase.rpc(name, params)

    if (error) {
        const details = readApiError(error)
        if (details.code === 'PGRST202' || details.code === '42883') {
            return {
                error: {
                    status: 404,
                    code: 'API_NOT_INSTALLED',
                    message: NOT_INSTALLED,
                },
            }
        }
        if (details.code === 'PGRST203') {
            return {
                error: {
                    status: 400,
                    code: 'MISSING_ARGUMENT',
                    message: 'The API call was missing an argument.',
                },
            }
        }
        return { error: details }
    }

    return { data }
}
