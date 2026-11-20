import { orderLevel } from "../views/FileView";

export default function ItemGrid({ items, renderFolder, renderCard }) {
    // The tiles of one level. The folders and the cards of a level belong to the
    // same list.
    // 1. items is the result of orderLevel from FileView, ordered by creation
    //    time and then by insertion order. Nothing is sorted again here.
    // 2. kind === 'folder' calls renderFolder, kind === 'card' calls renderCard.
    // 3. Every item stays one li. The li holds no "folder ..." text button and
    //    no Rename button.
    // 4. The list keeps wrapping in a row and follows the flex of
    //    .file-view__main ul.

    return (
        <ul>
            {items.map((item) => (
                <li key={`${item.kind}-${item.id}`}>
                    {item.kind === 'folder' ? renderFolder(item) : renderCard(item)}
                </li>
            ))}
        </ul>
    );
}
