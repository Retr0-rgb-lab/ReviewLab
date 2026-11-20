// The runner of the checks in source/tests/cases.mjs.
//
// The application is written in JSX and imports CSS and two packages that are
// large, so the checks are bundled first with esbuild. The parts that are not
// under test, the icon package, the Astryx components and the Supabase
// client, are replaced by the stubs in source/tests/stubs.
//
//   cd source && npm test

import { build } from 'esbuild'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const here = resolve(import.meta.dirname)
const stubs = join(here, 'stubs')

// The stub of the Supabase client, so that the calls of the application can be
// checked without a network.
const stubPlugin = {
    name: 'reviewlab-stubs',
    setup(build) {
        build.onResolve({ filter: /supabase\.js$/ }, () => ({ path: join(stubs, 'supabase.js') }))
        build.onResolve({ filter: /^@hugeicons\// }, () => ({ path: join(stubs, 'hugeicons.js') }))
        build.onResolve({ filter: /^@astryxdesign\/core\// }, () => ({ path: join(stubs, 'astryx.js') }))
    },
}

const work = mkdtempSync(join(tmpdir(), 'reviewlab-tests-'))
const outfile = join(work, 'cases.bundle.mjs')

await build({
    entryPoints: [join(here, 'cases.mjs')],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node20',
    loader: { '.css': 'empty' },
    plugins: [stubPlugin],
    logLevel: 'error',
})

const module = await import(pathToFileURL(outfile).href)
const checks = module.checks

let passed = 0
let failed = 0

for (const entry of checks) {
    try {
        await entry.fn()
        passed += 1
        console.log(`PASS ${entry.id}  ${entry.what}`)
    } catch (error) {
        failed += 1
        console.log(`FAIL ${entry.id}  ${entry.what}`)
        console.log(`      ${error.message.split('\n').slice(0, 4).join('\n      ')}`)
    }
}

console.log(`\n${passed} passed, ${failed} failed, ${checks.length} checks in total`)

// A small note file next to the bundle, so that a failed run leaves a trace.
writeFileSync(join(work, 'last-run.txt'), `${passed} passed, ${failed} failed\n`)

process.exit(failed ? 1 : 0)
