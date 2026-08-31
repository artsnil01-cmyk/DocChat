"use client";

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { BrandLockup } from "@/components/brand/brand-lockup";
import {
  canSendMessage,
  getDocumentsByIds,
  getMentionableDocuments,
  getSelectedDocuments,
  removeMissingDocumentIds,
  toggleSelectedDocumentId,
} from "@/components/chat/chat-ui-state";
import { ChatContextDocuments } from "@/components/chat/chat-context-documents";
import { Composer } from "@/components/chat/composer";
import { ConversationEmptyState } from "@/components/chat/conversation-empty-state";
import { ConversationThread } from "@/components/chat/conversation-thread";
import { useChatLibrary } from "@/components/chat/use-chat-library";
import { DocumentPanelShell } from "@/components/documents/document-panel-shell";
import { useDocumentLibrary } from "@/components/documents/use-document-library";

import { ChatSidebarList } from "./chat-sidebar-list";
import styles from "./app-shell.module.css";

const sidebarCollapsedStorageKey = "docchat-sidebar-collapsed";
const themeStorageKey = "docchat-theme";

type AppTheme = "ivory" | "green";

export function AppShellClient() {
  const router = useRouter();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<AppTheme>("ivory");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDocumentPanelOpen, setIsDocumentPanelOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [composerText, setComposerText] = useState("");
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [isMentionOpen, setIsMentionOpen] = useState(false);
  const composerFileInputRef = useRef<HTMLInputElement>(null);
  const composerInputRef = useRef<HTMLTextAreaElement>(null);
  const conversationScrollRef = useRef<HTMLDivElement>(null);
  const documentLibrary = useDocumentLibrary();
  const chatLibrary = useChatLibrary();

  const hasOverlay = isMobileSidebarOpen || isDocumentPanelOpen;
  const overlayMode = isMobileSidebarOpen ? styles.overlaySidebarMode : styles.overlayDocumentsMode;
  const isDarkTheme = theme === "green";
  const validSelectedDocumentIds = useMemo(
    () =>
      removeMissingDocumentIds({
        selectedDocumentIds,
        documents: documentLibrary.documents,
      }),
    [documentLibrary.documents, selectedDocumentIds],
  );
  const isAnswering = chatLibrary.answering;
  const selectedDocuments = useMemo(
    () =>
      getSelectedDocuments({
        selectedDocumentIds: validSelectedDocumentIds,
        documents: documentLibrary.documents,
      }),
    [documentLibrary.documents, validSelectedDocumentIds],
  );
  const mentionableDocuments = useMemo(
    () => getMentionableDocuments(documentLibrary.documents),
    [documentLibrary.documents],
  );
  const activeChatDocuments = useMemo(
    () =>
      getDocumentsByIds({
        documentIds: chatLibrary.activeChat?.documentIds ?? [],
        documents: documentLibrary.documents,
      }),
    [chatLibrary.activeChat?.documentIds, documentLibrary.documents],
  );
  const sendAvailability = useMemo(
    () =>
      canSendMessage({
        activeChatId: chatLibrary.activeChatId,
        isAnswering,
        text: composerText,
        selectedDocuments,
      }),
    [chatLibrary.activeChatId, composerText, isAnswering, selectedDocuments],
  );
  const activeMessages = chatLibrary.activeChat?.messages ?? [];

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setIsSidebarCollapsed(
        window.localStorage.getItem(sidebarCollapsedStorageKey) === "true",
      );

      const storedLoginTheme = window.localStorage.getItem(themeStorageKey);

      if (storedLoginTheme === "green") {
        setTheme("ivory");
      } else if (storedLoginTheme === "ivory") {
        setTheme("green");
      }
    });

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      setIsMobileSidebarOpen(false);
      setIsDocumentPanelOpen(false);
      setIsAccountMenuOpen(false);
      setIsMentionOpen(false);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  async function handleLogout() {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  function closeOverlays() {
    setIsMobileSidebarOpen(false);
    setIsDocumentPanelOpen(false);
    setIsAccountMenuOpen(false);
    setIsMentionOpen(false);
  }

  function toggleSidebar() {
    setIsSidebarCollapsed((isCollapsed) => {
      const nextState = !isCollapsed;
      window.localStorage.setItem(sidebarCollapsedStorageKey, String(nextState));
      return nextState;
    });
  }

  function toggleTheme() {
    setTheme((currentTheme) => {
      const nextTheme = currentTheme === "green" ? "ivory" : "green";
      const nextLoginTheme = nextTheme === "ivory" ? "green" : "ivory";
      window.localStorage.setItem(themeStorageKey, nextLoginTheme);
      return nextTheme;
    });
  }

  function toggleDocumentSelection(documentId: string) {
    setSelectedDocumentIds((currentIds) =>
      toggleSelectedDocumentId(currentIds, documentId),
    );
  }

  function removeSelectedDocument(documentId: string) {
    setSelectedDocumentIds((currentIds) =>
      currentIds.filter((currentId) => currentId !== documentId),
    );
  }

  function handlePromptSelect(prompt: string) {
    setComposerText(prompt);
    setIsMentionOpen(false);
    composerInputRef.current?.focus();
  }

  function startNewConversation() {
    chatLibrary.startNewConversation();
    setComposerText("");
    setSelectedDocumentIds([]);
    setIsMentionOpen(false);
  }

  function triggerComposerUpload() {
    composerFileInputRef.current?.click();
  }

  async function handleComposerFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";

    if (!file) {
      return;
    }

    await documentLibrary.uploadDocument({ file });
  }

  async function handleSubmitMessage() {
    if (!sendAvailability.canSend) {
      return;
    }

    setIsMentionOpen(false);
    const submittedText = composerText;
    const submittedDocumentIds = validSelectedDocumentIds;
    setComposerText("");
    setSelectedDocumentIds([]);

    const sent = await chatLibrary.sendMessage({
      question: submittedText,
      documentIds: submittedDocumentIds.length
        ? submittedDocumentIds
        : undefined,
    });

    if (!sent) {
      setComposerText(submittedText);
      setSelectedDocumentIds(submittedDocumentIds);
    }
  }

  useEffect(() => {
    conversationScrollRef.current?.scrollTo({
      top: conversationScrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [activeMessages.length]);

  useEffect(() => {
    if (!chatLibrary.activeChatId) {
      return;
    }

    composerInputRef.current?.focus();
  }, [chatLibrary.activeChatId]);

  return (
    <main
      className={`${styles.appView} ${isSidebarCollapsed ? styles.sidebarCollapsed : ""}`}
      data-docchat-theme={theme}
    >
      <button
        className={`${styles.overlayBackdrop} ${hasOverlay ? styles.overlayBackdropVisible : ""} ${hasOverlay ? overlayMode : ""}`}
        type="button"
        aria-label="Fermer les panneaux"
        aria-hidden={!hasOverlay}
        tabIndex={hasOverlay ? 0 : -1}
        onClick={closeOverlays}
      />

      <input
        ref={composerFileInputRef}
        className={styles.hiddenFileInput}
        type="file"
        accept=".pdf,application/pdf"
        tabIndex={-1}
        onChange={handleComposerFileChange}
      />

      <aside
        className={`${styles.sidebar} ${isMobileSidebarOpen ? styles.sidebarOpen : ""}`}
        id="conversation-sidebar"
        aria-label="Conversations"
      >
        <div className={styles.sidebarHeader}>
          <div className={styles.sidebarBrandRow}>
            <div className={styles.sidebarBrand}>
              <BrandLockup />
            </div>
            <button
              className={styles.sidebarToggle}
              type="button"
              aria-label={isSidebarCollapsed ? "Étendre la barre latérale" : "Réduire la barre latérale"}
              title={isSidebarCollapsed ? "Étendre la barre latérale" : "Réduire la barre latérale"}
              onClick={toggleSidebar}
            >
              <svg className={styles.sidebarToggleCollapse} viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3.75" y="4.25" width="16.5" height="15.5" rx="2.25" stroke="currentColor" strokeWidth="1.45" />
                <path d="M9 4.5v15M15 9l-3 3 3 3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.45" />
              </svg>
              <svg className={styles.sidebarToggleExpand} viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3.75" y="4.25" width="16.5" height="15.5" rx="2.25" stroke="currentColor" strokeWidth="1.45" />
                <path d="M9 4.5v15M12 9l3 3-3 3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.45" />
              </svg>
            </button>
          </div>

          <div className={styles.sidebarSectionTitle}>VOTRE ESPACE</div>
          <button
            className={styles.newChatButton}
            type="button"
            disabled={isAnswering}
            onClick={startNewConversation}
          >
            <span className={styles.newChatIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
              </svg>
            </span>
            <span className={styles.newChatLabel}>Nouvelle conversation</span>
          </button>
        </div>

        <div className={styles.sidebarScroll}>
          <ChatSidebarList
            chatLibrary={chatLibrary}
            isNavigationLocked={isAnswering}
          />
        </div>

        <div className={styles.sidebarFooter}>
          <div className={styles.themeRow}>
            <span className={styles.themeLabel}>Thème</span>
            <button
              className={styles.sidebarThemeToggle}
              type="button"
              aria-label={isDarkTheme ? "Passer en mode clair" : "Passer en mode sombre"}
              title={isDarkTheme ? "Passer en mode clair" : "Passer en mode sombre"}
              onClick={toggleTheme}
            >
              <svg className={styles.sidebarThemeSun} viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.55" />
                <path
                  d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M5.9 5.9l1.4 1.4M16.7 16.7l1.4 1.4M18.1 5.9l-1.4 1.4M7.3 16.7l-1.4 1.4"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="1.45"
                />
              </svg>
              <svg className={styles.sidebarThemeMoon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M18.2 15.25A7 7 0 0 1 8.75 5.8 7.1 7.1 0 1 0 18.2 15.25Z"
                  stroke="currentColor"
                  strokeWidth="1.55"
                />
              </svg>
            </button>
          </div>

          <button
            className={styles.profileTrigger}
            type="button"
            aria-label="Ouvrir le menu du compte"
            aria-expanded={isAccountMenuOpen}
            aria-controls="account-menu"
            onClick={() => setIsAccountMenuOpen((isOpen) => !isOpen)}
          >
            <span className={styles.avatar} aria-hidden="true">
              T
            </span>
            <span className={styles.profileName}>Tester</span>
            <span className={styles.profileMore} aria-hidden="true">
              •••
            </span>
          </button>

          <div
            className={`${styles.accountMenu} ${isAccountMenuOpen ? styles.accountMenuOpen : ""}`}
            id="account-menu"
            hidden={!isAccountMenuOpen}
          >
            <div className={styles.accountMenuHead}>
              <span className={styles.avatar} aria-hidden="true">
                T
              </span>
              <div className={styles.accountIdentity}>
                <strong>Tester</strong>
                <span>Espace d&rsquo;évaluation</span>
              </div>
            </div>
            <div className={styles.accountMenuList}>
              <button className={styles.workspaceAction} type="button" disabled>
                <svg className={styles.menuIcon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M8 9h8M8 13h5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
                </svg>
                Espace de travail
              </button>
              <button
                className={styles.logoutButton}
                type="button"
                disabled={isLoggingOut}
                onClick={handleLogout}
              >
                <svg className={styles.menuIcon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M10 5H6.75A1.75 1.75 0 0 0 5 6.75v10.5A1.75 1.75 0 0 0 6.75 19H10M15 8l4 4-4 4M19 12H9"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="1.5"
                  />
                </svg>
                {isLoggingOut ? "Déconnexion..." : "Se déconnecter"}
              </button>
            </div>
          </div>
        </div>
      </aside>

      <section className={styles.main} aria-label="Espace de travail DocChat">
        <header className={styles.topbar}>
          <button
            className={styles.mobileMenuButton}
            type="button"
            aria-label="Ouvrir les conversations"
            aria-controls="conversation-sidebar"
            aria-expanded={isMobileSidebarOpen}
            onClick={() => {
              setIsMobileSidebarOpen(true);
              setIsAccountMenuOpen(false);
            }}
          >
            <span className={styles.hamburgerSleek} aria-hidden="true">
              <span />
              <span />
            </span>
          </button>
          <div className={styles.mobileBrand}>DocChat</div>
          <div className={styles.topbarSpacer} />
          <button
            className={styles.documentsButton}
            type="button"
            aria-label="Ouvrir les documents"
            aria-controls="document-panel"
            aria-expanded={isDocumentPanelOpen}
            onClick={() => {
              setIsDocumentPanelOpen(true);
              setIsAccountMenuOpen(false);
            }}
          >
            <span className={styles.documentsButtonIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M7 3.75h7l4 4v12.5H7V3.75Z" stroke="currentColor" strokeWidth="1.45" />
                <path d="M14 3.75v4h4" stroke="currentColor" strokeWidth="1.45" />
              </svg>
            </span>
            <span className={styles.documentsButtonCopy}>
              <strong>Documents</strong>
            </span>
            <span className={styles.documentsCount}>
              {documentLibrary.documents.length}
            </span>
          </button>
          <button
            className={styles.mobileDocumentButton}
            type="button"
            aria-label="Documents"
            aria-controls="document-panel"
            aria-expanded={isDocumentPanelOpen}
            onClick={() => {
              setIsDocumentPanelOpen(true);
              setIsAccountMenuOpen(false);
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M7 3.75h7l4 4v12.5H7V3.75Z" stroke="currentColor" strokeWidth="1.55" />
              <path d="M14 3.75v4h4" stroke="currentColor" strokeWidth="1.55" />
            </svg>
          </button>
        </header>

        <div className={styles.workbench}>
          <section className={styles.threadSheet} aria-label="Conversation">
            <div className={styles.sheetPattern} aria-hidden="true" />
            <ChatContextDocuments documents={activeChatDocuments} />
            {activeMessages.length > 0 ? (
              <ConversationThread
                messages={activeMessages}
                scrollRef={conversationScrollRef}
              />
            ) : (
              <ConversationEmptyState
                readyDocumentCount={documentLibrary.readyDocuments.length}
                onOpenDocuments={() => setIsDocumentPanelOpen(true)}
                onUploadDocument={triggerComposerUpload}
                onSelectPrompt={handlePromptSelect}
              />
            )}
            <Composer
              value={composerText}
              selectedDocuments={selectedDocuments}
              mentionableDocuments={mentionableDocuments}
              sendAvailability={sendAvailability}
              isAnswering={isAnswering}
              isMentionOpen={isMentionOpen}
              error={chatLibrary.error}
              inputRef={composerInputRef}
              onValueChange={setComposerText}
              onSubmit={handleSubmitMessage}
              onUploadDocument={triggerComposerUpload}
              onToggleMention={() => setIsMentionOpen((isOpen) => !isOpen)}
              onCloseMention={() => setIsMentionOpen(false)}
              onToggleDocument={toggleDocumentSelection}
              onRemoveDocument={removeSelectedDocument}
            />
          </section>
        </div>
      </section>

      <DocumentPanelShell
        isOpen={isDocumentPanelOpen}
        onClose={() => setIsDocumentPanelOpen(false)}
        library={documentLibrary}
        selectedDocumentIds={validSelectedDocumentIds}
        onToggleDocumentSelection={toggleDocumentSelection}
      />
    </main>
  );
}
