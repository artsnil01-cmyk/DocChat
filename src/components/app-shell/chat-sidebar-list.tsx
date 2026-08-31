import { useState } from "react";
import { MessageSquareText, MoreHorizontal, Trash2 } from "lucide-react";

import type { UseChatLibraryResult } from "@/components/chat/use-chat-library";

import styles from "./app-shell.module.css";

type ChatSidebarListProps = {
  chatLibrary: UseChatLibraryResult;
  isNavigationLocked: boolean;
};

export function ChatSidebarList({
  chatLibrary,
  isNavigationLocked,
}: ChatSidebarListProps) {
  const [openMenuChatId, setOpenMenuChatId] = useState<string | null>(null);

  if (chatLibrary.loading) {
    return (
      <div className={styles.emptySidebarState}>
        <span>Chargement des conversations...</span>
      </div>
    );
  }

  if (chatLibrary.chats.length === 0) {
    return (
      <div className={styles.emptySidebarState}>
        <span>Aucune conversation</span>
      </div>
    );
  }

  return (
    <div className={styles.chatList} aria-label="Liste des conversations">
      <div className={styles.sideLabel}>CONVERSATIONS</div>
      {chatLibrary.chats.map((chat) => {
        const isActive = chat.id === chatLibrary.activeChatId;
        const isLoading = chat.id === chatLibrary.loadingChatId;
        const isMenuOpen = chat.id === openMenuChatId;
        const isDisabled = isNavigationLocked || isLoading;

        return (
          <div
            className={`${styles.chatRowWrap} ${
              isActive ? styles.chatRowActive : ""
            } ${isNavigationLocked ? styles.chatRowLocked : ""}`}
            key={chat.id}
          >
            <button
              className={styles.chatRow}
              type="button"
              disabled={isDisabled}
              onClick={() => {
                setOpenMenuChatId(null);
                void chatLibrary.selectChat(chat.id);
              }}
            >
              <span className={styles.chatRowGlyph} aria-hidden="true">
                {isLoading ? (
                  <span className={styles.chatRowSpinner} />
                ) : (
                  <MessageSquareText aria-hidden="true" />
                )}
              </span>
              <span className={styles.chatRowCopy}>
                <span className={styles.chatTitle}>{chat.title}</span>
                <span className={styles.chatRowMeta}>
                  {formatChatDocumentCount(chat.documentIds.length)}
                </span>
              </span>
            </button>
            <button
              className={styles.chatOptions}
              type="button"
              aria-label="Options de la conversation"
              aria-expanded={isMenuOpen}
              disabled={isDisabled}
              onClick={() =>
                setOpenMenuChatId((currentChatId) =>
                  currentChatId === chat.id ? null : chat.id,
                )
              }
            >
              <MoreHorizontal aria-hidden="true" />
            </button>
            {isMenuOpen ? (
              <div className={styles.chatMenu}>
                <button
                  className={styles.chatMenuDelete}
                  type="button"
                  onClick={() => {
                    setOpenMenuChatId(null);
                    void chatLibrary.deleteChat(chat.id);
                  }}
                >
                  <Trash2 aria-hidden="true" />
                  Supprimer
                </button>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function formatChatDocumentCount(documentCount: number): string {
  if (documentCount === 0) {
    return "Aucun document";
  }

  return `${documentCount} ${documentCount === 1 ? "document" : "documents"}`;
}
