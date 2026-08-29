"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { BrandLockup } from "@/components/brand/brand-lockup";
import { Composer } from "@/components/chat/composer";
import { ConversationEmptyState } from "@/components/chat/conversation-empty-state";
import { DocumentPanelShell } from "@/components/documents/document-panel-shell";

import styles from "./app-shell.module.css";

export function AppShellClient() {
  const router = useRouter();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDocumentPanelOpen, setIsDocumentPanelOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const hasOverlay = isMobileSidebarOpen || isDocumentPanelOpen;

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      setIsMobileSidebarOpen(false);
      setIsDocumentPanelOpen(false);
      setIsAccountMenuOpen(false);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
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
  }

  return (
    <main className={styles.appView} data-docchat-theme="ivory">
      <button
        className={`${styles.overlayBackdrop} ${hasOverlay ? styles.overlayBackdropVisible : ""}`}
        type="button"
        aria-label="Fermer les panneaux"
        aria-hidden={!hasOverlay}
        tabIndex={hasOverlay ? 0 : -1}
        onClick={closeOverlays}
      />

      <aside
        className={`${styles.sidebar} ${isMobileSidebarOpen ? styles.sidebarOpen : ""}`}
        id="conversation-sidebar"
        aria-label="Conversations"
      >
        <div className={styles.sidebarHeader}>
          <div className={styles.sidebarBrandRow}>
            <BrandLockup />
            <button
              className={styles.iconButton}
              type="button"
              aria-label="Fermer les conversations"
              onClick={() => {
                setIsMobileSidebarOpen(false);
                setIsAccountMenuOpen(false);
              }}
            >
              <span aria-hidden="true">&lsaquo;</span>
            </button>
          </div>

          <div className={styles.sidebarSectionTitle}>CONVERSATIONS</div>
          <button className={styles.newChatButton} type="button" disabled>
            <span className={styles.newChatIcon} aria-hidden="true">
              +
            </span>
            Nouvelle conversation
          </button>
        </div>

        <div className={styles.sidebarScroll}>
          <div className={styles.emptySidebarState}>
            <span>Aucune conversation</span>
          </div>
        </div>

        <div className={styles.sidebarFooter}>
          <button
            className={styles.profileTrigger}
            type="button"
            aria-label="Ouvrir le menu du compte"
            aria-expanded={isAccountMenuOpen}
            aria-controls="account-menu"
            onClick={() => setIsAccountMenuOpen((isOpen) => !isOpen)}
          >
            <span className={styles.avatar} aria-hidden="true">
              DC
            </span>
            <span className={styles.profileName}>Compte test</span>
            <span className={styles.profileMore} aria-hidden="true">
              ...
            </span>
          </button>

          <div
            className={`${styles.accountMenu} ${isAccountMenuOpen ? styles.accountMenuOpen : ""}`}
            id="account-menu"
            hidden={!isAccountMenuOpen}
          >
            <button
              className={styles.logoutButton}
              type="button"
              disabled={isLoggingOut}
              onClick={handleLogout}
            >
              {isLoggingOut ? "Deconnexion..." : "Deconnexion"}
            </button>
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
            <span aria-hidden="true">&#9776;</span>
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
              &#9633;
            </span>
            <span className={styles.documentsButtonCopy}>
              <strong>Documents</strong>
            </span>
            <span className={styles.documentsCount}>0</span>
          </button>
        </header>

        <div className={styles.workbench}>
          <section className={styles.threadSheet} aria-label="Conversation">
            <ConversationEmptyState />
            <Composer />
          </section>
        </div>
      </section>

      <DocumentPanelShell
        isOpen={isDocumentPanelOpen}
        onClose={() => setIsDocumentPanelOpen(false)}
      />
    </main>
  );
}
