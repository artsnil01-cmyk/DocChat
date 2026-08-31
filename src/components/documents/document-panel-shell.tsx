import type { CSSProperties, ChangeEvent } from "react";

import type { DocumentLibraryItem, useDocumentLibrary } from "./use-document-library";
import styles from "./documents.module.css";

type DocumentLibrary = ReturnType<typeof useDocumentLibrary>;

type DocumentPanelShellProps = {
  isOpen: boolean;
  onClose: () => void;
  library: DocumentLibrary;
};

export function DocumentPanelShell({
  isOpen,
  onClose,
  library,
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
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M7 3.75h7l4 4v12.5H7V3.75Z" stroke="currentColor" strokeWidth="1.45" />
              <path d="M14 3.75v4h4" stroke="currentColor" strokeWidth="1.45" />
            </svg>
          </span>
          <span className={styles.panelTitleCopy}>
            <strong>Bibliothèque</strong>
            <small>{documentCount} {documentCount > 1 ? "fichiers" : "fichier"}</small>
          </span>
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
        <label className={styles.uploadDropzone}>
          <input
            className={styles.fileInput}
            type="file"
            accept=".pdf,application/pdf"
            disabled={library.uploading}
            onChange={handleFileChange}
          />
          <span className={styles.uploadIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
            </svg>
          </span>
          <span className={styles.uploadCopy}>
            <strong>{library.uploading ? "Envoi en cours" : "Importer un PDF"}</strong>
            <small>Ajoute le document à l’espace de travail.</small>
          </span>
        </label>

        {library.error ? (
          <div className={styles.panelError}>{library.error}</div>
        ) : null}

        {library.loading ? (
          <DocumentPanelLoading />
        ) : library.documents.length > 0 ? (
          <div className={styles.documentList}>
            {library.documents.map((document) => (
              <DocumentRow
                key={document.id}
                document={document}
                onProcess={() => library.processDocument(document.id)}
                onCancel={() => library.cancelProcessing(document.id)}
                onDelete={() => library.deleteDocument(document.id)}
              />
            ))}
          </div>
        ) : (
          <div className={styles.emptyPanelState}>
            <span className={styles.emptyPanelIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M7 3.75h7l4 4v12.5H7V3.75Z" stroke="currentColor" strokeWidth="1.45" />
                <path d="M14 3.75v4h4" stroke="currentColor" strokeWidth="1.45" />
              </svg>
            </span>
            <strong>Aucun document</strong>
            <span>Importez un PDF pour préparer la recherche documentaire.</span>
          </div>
        )}
      </div>
    </aside>
  );
}

function DocumentRow({
  document,
  onProcess,
  onCancel,
  onDelete,
}: {
  document: DocumentLibraryItem;
  onProcess: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const statusView = getDocumentStatusView(document);
  const canDelete = document.status !== "processing";

  return (
    <article className={`${styles.documentRow} ${styles[statusView.rowClass]}`}>
      <span className={styles.documentIcon} aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M7 3.75h7l4 4v12.5H7V3.75Z" stroke="currentColor" strokeWidth="1.45" />
          <path d="M14 3.75v4h4" stroke="currentColor" strokeWidth="1.45" />
          <path d="M9.5 12.2h5M9.5 15.4h4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.35" />
        </svg>
        <span className={`${styles.statusDot} ${styles[statusView.dotClass]}`} />
      </span>

      <div className={styles.documentMain}>
        <div className={styles.documentTopline}>
          <span className={styles.documentName}>{document.name}</span>
        </div>
        <div className={styles.documentMetaLine}>
          <span className={`${styles.documentState} ${styles[statusView.textClass]}`}>
            {statusView.label}
          </span>
          {statusView.meta.length > 0 ? (
            <>
              <span className={styles.metaSeparator}>·</span>
              <span>{statusView.meta.join(" · ")}</span>
            </>
          ) : null}
        </div>

        {document.status === "processing" || document.isUploading ? (
          <div
            className={styles.documentProcessing}
            style={{ "--document-progress": `${statusView.progress}%` } as CSSProperties}
          >
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} />
            </div>
            <div className={styles.stageLine}>
              <span>{statusView.step}</span>
              <strong>{statusView.stageLabel}</strong>
            </div>
          </div>
        ) : null}

        {document.actionError || getDocumentErrorMessage(document) ? (
          <div className={styles.documentError}>
            {document.actionError ?? getDocumentErrorMessage(document)}
          </div>
        ) : null}
      </div>

      <div className={styles.documentActions}>
        <PrimaryDocumentAction
          document={document}
          onProcess={onProcess}
          onCancel={onCancel}
        />
        {canDelete ? (
          <button
            className={`${styles.documentActionButton} ${styles.deleteButton}`}
            type="button"
            aria-label={`Supprimer ${document.name}`}
            title="Supprimer"
            onClick={onDelete}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M9 4.75h6l.9 1.75H19a.9.9 0 1 1 0 1.8H5a.9.9 0 1 1 0-1.8h3.1L9 4.75Z" fill="currentColor" />
              <path d="M8.25 9.1h7.5l-.55 9.2a1.7 1.7 0 0 1-1.7 1.6h-3a1.7 1.7 0 0 1-1.7-1.6l-.55-9.2Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
              <path d="M10.3 11.2v5.6M13.7 11.2v5.6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
            </svg>
          </button>
        ) : null}
      </div>
    </article>
  );
}

function PrimaryDocumentAction({
  document,
  onProcess,
  onCancel,
}: {
  document: DocumentLibraryItem;
  onProcess: () => void;
  onCancel: () => void;
}) {
  if (document.status === "processing") {
    return (
      <button
        className={styles.documentActionButton}
        type="button"
        aria-label="Annuler le traitement"
        title="Annuler le traitement"
        onClick={onCancel}
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M7 7l10 10M17 7 7 17" stroke="currentColor" strokeLinecap="round" strokeWidth="1.55" />
        </svg>
      </button>
    );
  }

  if (document.nextAction.type === "process") {
    return (
      <button
        className={`${styles.documentActionButton} ${styles.retryButton}`}
        type="button"
        aria-label="Reprendre le traitement"
        title="Reprendre le traitement"
        onClick={onProcess}
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5.5 8.2v4.3H10M18.5 15.8v-4.3H14M7.3 16.7A7 7 0 0 0 18.5 11.5M5.5 12.5A7 7 0 0 1 16.7 7.3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.45" />
        </svg>
      </button>
    );
  }

  return null;
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

function getDocumentStatusView(document: DocumentLibraryItem) {
  const meta = [
    document.pageCount ? `${document.pageCount} pages` : undefined,
    document.sizeBytes ? formatFileSize(document.sizeBytes) : undefined,
  ].filter((item): item is string => Boolean(item));

  if (document.isUploading) {
    return {
      label: "Envoi",
      stageLabel: "Transfert du fichier",
      step: "1/3",
      progress: document.uploadProgress?.percentage ?? 0,
      meta,
      rowClass: "statePending",
      dotClass: "dotPending",
      textClass: "textPending",
    };
  }

  if (document.status === "ready") {
    return {
      label: "Prêt",
      stageLabel: "",
      step: "",
      progress: 100,
      meta,
      rowClass: "stateReady",
      dotClass: "dotReady",
      textClass: "textReady",
    };
  }

  if (document.status === "processing") {
    const stage = getStageView(document.stage);

    return {
      label: "Traitement",
      stageLabel: stage.label,
      step: stage.step,
      progress: document.progress ?? stage.progress,
      meta,
      rowClass: "stateProcessing",
      dotClass: "dotProcessing",
      textClass: "textProcessing",
    };
  }

  if (document.status === "failed") {
    return {
      label: document.nextAction.type === "upload" ? "Envoi incomplet" : "Échec du traitement",
      stageLabel: "",
      step: "",
      progress: 0,
      meta,
      rowClass: "stateFailed",
      dotClass: "dotFailed",
      textClass: "textFailed",
    };
  }

  if (document.status === "cancelled") {
    return {
      label: "Annulé",
      stageLabel: "",
      step: "",
      progress: 0,
      meta,
      rowClass: "stateCancelled",
      dotClass: "dotCancelled",
      textClass: "textCancelled",
    };
  }

  return {
    label: "Envoi incomplet",
    stageLabel: "",
    step: "",
    progress: 0,
    meta,
    rowClass: "statePending",
    dotClass: "dotPending",
    textClass: "textPending",
  };
}

function getDocumentErrorMessage(document: DocumentLibraryItem): string | undefined {
  if (document.nextAction.type === "upload") {
    return "L’envoi n’a pas été finalisé. Supprimez ce document puis réimportez-le.";
  }

  return document.error?.message;
}

function getStageView(stage: DocumentLibraryItem["stage"]) {
  if (stage === "embedding") {
    return {
      label: "Vectorisation",
      step: "2/3",
      progress: 66,
    };
  }

  if (stage === "indexing") {
    return {
      label: "Indexation",
      step: "3/3",
      progress: 88,
    };
  }

  return {
    label: "Lecture du PDF",
    step: "1/3",
    progress: 28,
  };
}

function formatFileSize(sizeBytes: number): string {
  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
  }

  return `${Math.max(1, Math.round(sizeBytes / 1024))} Ko`;
}
