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
            &#9633;
          </span>
          Documents de la conversation
        </div>
        <button
          className={styles.closeButton}
          type="button"
          aria-label="Fermer les documents"
          onClick={onClose}
        >
          &times;
        </button>
      </div>
      <div className={styles.panelBody}>
        <div className={styles.emptyPanelState}>Aucun document</div>
      </div>
    </aside>
  );
}
