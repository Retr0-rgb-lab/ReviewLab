import {HugeiconsIcon} from '@hugeicons/react';
import {AiGenerateIcon} from '@hugeicons/core-free-icons';

export function SidebarCreateCardButton({ disabled, onCreateCard }) {
    // The only place a card is created. It sits in the sidebar, above the
    // branch menu. The card is written by the file view flow and the user is
    // sent to Focus on the new card.
    return (
        <button
            type="button"
            className="sidebar__create-card"
            onClick={onCreateCard}
            disabled={disabled}
            aria-label="Create card"
            title="Create card"
        >
            <HugeiconsIcon icon={AiGenerateIcon} size={20} strokeWidth={1.8} />
            <span>Create card</span>
        </button>
    );
}

export function CreateFolderButton({ disabled, onBeginDraft }) {
    // The only place a folder is created. It opens the unsaved folder row in
    // the level; nothing is written before the name is valid.
    return (
        <button
            type="button"
            className="file-view__button"
            onClick={onBeginDraft}
            disabled={disabled}
        >
            Create folder
        </button>
    );
}
