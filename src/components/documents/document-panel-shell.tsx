import styles from "./documents.module.css";

type DocumentPanelShellProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function DocumentPanelShell({ isOpen, onClose }: DocumentPanelShellProps) {
  return (
    <aside
      className={`${styles.panel} ${isOpen ? styles.panelOpen : ""}`}
      id="document-panel"
      aria-label="Documents"
      aria-hidden={!isOpen}
    >
      <div className={styles.panelHeader}>
        <div className={styles.panelTitle}>
          <span className={styles.panelTitleIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M7 3.75h7l4 4v12.5H7V3.75Z" stroke="currentColor" strokeWidth="1.45" />
              <path d="M14 3.75v4h4" stroke="currentColor" strokeWidth="1.45" />
            </svg>
          </span>
          Documents de la conversation
        </div>
        <div className={styles.panelSpacer} />
        <button
          className={styles.closeButton}
          type="button"
          aria-label="Fermer les documents"
          onClick={onClose}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
          </svg>
        </button>
      </div>
      <div className={styles.panelBody}>
        <div className={styles.emptyPanelState}>Aucun document</div>
      </div>
    </aside>
  );
}
