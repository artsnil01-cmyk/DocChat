import type { ChangeEvent } from "react";
import { FileText, Plus, X } from "lucide-react";

import { DocumentRow } from "./document-row";
import type { useDocumentLibrary } from "./use-document-library";
import styles from "./documents.module.css";

type DocumentLibrary = ReturnType<typeof useDocumentLibrary>;

type DocumentPanelShellProps = {
  isOpen: boolean;
  onClose: () => void;
  library: DocumentLibrary;
  selectedDocumentIds: string[];
  onToggleDocumentSelection: (documentId: string) => void;
};

export function DocumentPanelShell({
  isOpen,
  onClose,
  library,
  selectedDocumentIds,
  onToggleDocumentSelection,
}: DocumentPanelShellProps) {
  const documentCount = library.documents.length;

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";

    if (!file) {
      return;
    }

    await library.uploadDocument({ file });
  }

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
            <FileText aria-hidden="true" />
          </span>
          <span className={styles.panelTitleCopy}>
            <strong>Bibliotheque</strong>
            <small>
              {documentCount} {documentCount > 1 ? "fichiers" : "fichier"}
            </small>
          </span>
        </div>
        <div className={styles.panelSpacer} />
        <button
          className={styles.closeButton}
          type="button"
          aria-label="Fermer les documents"
          onClick={onClose}
        >
          <X aria-hidden="true" />
        </button>
      </div>

      <div className={styles.panelBody}>
        <label className={styles.uploadDropzone}>
          <input
            className={styles.fileInput}
            type="file"
            accept=".pdf,application/pdf"
            disabled={library.uploading}
            onChange={handleFileChange}
          />
          <span className={styles.uploadIcon} aria-hidden="true">
            <Plus aria-hidden="true" />
          </span>
          <span className={styles.uploadCopy}>
            <strong>{library.uploading ? "Envoi en cours" : "Importer un PDF"}</strong>
            <small>Ajoute le document a l&apos;espace de travail.</small>
          </span>
        </label>

        {library.error ? (
          <div className={styles.panelError}>{library.error}</div>
        ) : null}

        {library.notice ? (
          <div className={styles.panelNotice}>{library.notice}</div>
        ) : null}

        {library.loading ? (
          <DocumentPanelLoading />
        ) : library.documents.length > 0 ? (
          <div className={styles.documentList}>
            {library.documents.map((document) => (
              <DocumentRow
                key={document.id}
                document={document}
                isSelected={selectedDocumentIds.includes(document.id)}
                onToggleSelection={() => onToggleDocumentSelection(document.id)}
                onProcess={() => library.processDocument(document.id)}
                onCancel={() => library.cancelProcessing(document.id)}
                onDelete={() => library.deleteDocument(document.id)}
              />
            ))}
          </div>
        ) : (
          <div className={styles.emptyPanelState}>
            <span className={styles.emptyPanelIcon} aria-hidden="true">
              <FileText aria-hidden="true" />
            </span>
            <strong>Aucun document</strong>
            <span>Importez un PDF pour preparer la recherche documentaire.</span>
          </div>
        )}
      </div>
    </aside>
  );
}

function DocumentPanelLoading() {
  return (
    <div className={styles.documentList} aria-label="Chargement des documents">
      {[0, 1, 2].map((index) => (
        <div className={styles.documentSkeleton} key={index}>
          <span />
          <div>
            <span />
            <span />
          </div>
        </div>
      ))}
    </div>
  );
}
