import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import './index.css'
import FileView from './views/FileView.jsx'

function App() {
    return <FileView />
}

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <App />
    </StrictMode>,
)