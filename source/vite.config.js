import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    root: 'client',
    envDir: '..',
    server: {
        // The project folder sits on a Windows drive that is mounted in WSL.
        // The native file events of that mount do not reach the watcher, so
        // the server would keep serving the old file after a change. Polling
        // costs a little speed and makes the change show up.
        watch: {
            usePolling: true,
        },
    },
})
