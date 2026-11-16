//Implement the design of cardtile with SpotlightCard feature from react-bits

import SpotlightCard from './react-bits/SpotlightCard.jsx'
import './CardTile.css'


export function cardLabel(title) {
    if (!title) return "card";
    return "card " + title;
}


export function spotlightTheme(theme) {
    if (theme === "Dark") return "dark";
    return "light";
}

export function activateOnKey(event, onOpen) {
    if (event.key === "Enter" || event.key === " "){
        event.preventDefault();
        if (typeof onOpen === "function"){
            onOpen();
        }
    }
}

export default function CardTile({ title, onOpen, theme = 'White' }) {
    return (
        <SpotlightCard
            className="card-tile"
            theme={spotlightTheme(theme)}
            onClick={onOpen}
            onKeyDown={(event) => activateOnKey(event, onOpen)}
            tabIndex={0}
            role="button"
        >
            {cardLabel(title)}
        </SpotlightCard>
    )
}
