# Milestone 006: Chat Frontend

## Goal

Implement the user-facing chat and document workspace on top of the stable backend domains.

Current scope: one active streamed answer at a time.

## Steps

- [x] Build login page UI from provided design.
- [x] Build authenticated app shell.
- [x] Add chat sidebar.
- [x] Add app shell overlay interactions.
- [x] Add new-chat flow without creating unused chat records.
- [x] Add document upload surface.
- [x] Show document processing states.
- [x] Add document selector.
- [x] Add selected document scope display.
- [x] Add `@document` interaction.
- [x] Render streamed assistant messages.
- [x] Present readable sources.
- [x] Hydrate persisted sources when reopening a chat.
- [x] Show active chat document context.
- [x] Lock chat navigation during answering.
- [x] Add chat deletion menu.

## Validation

- [x] Login page matches provided design.
- [x] Main app supports desktop and mobile layouts.
- [x] New chat requires text and a selected ready document.
- [x] Existing chat supports text-only follow-up using stored documents.
- [x] Document selection clears after send and restores on failure.
- [x] One active answer locks chat switching.
- [x] Chat delete returns to new conversation when deleting the active chat.
