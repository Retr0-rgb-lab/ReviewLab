import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'

function App() {
    return <p>ReviewLab</p>
}

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <App></App>
    </StrictMode>,
)