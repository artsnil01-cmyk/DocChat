import type { CSSProperties } from "react";
import { FileText, RotateCcw, Trash2, X } from "lucide-react";

import { getDocumentStatusView, type DocumentRowAction } from "./document-status";
import type { DocumentLibraryItem } from "./use-document-library";
import styles from "./documents.module.css";

type DocumentRowProps = {
  document: DocumentLibraryItem;
  isSelected: boolean;
  onToggleSelection: () => void;
  onProcess: () => void;
  onCancel: () => void;
  onDelete: () => void;
};

export function DocumentRow({
  document,
  isSelected,
  onToggleSelection,
  onProcess,
  onCancel,
  onDelete,
}: DocumentRowProps) {
  const statusView = getDocumentStatusView(document);
  const isBusy = Boolean(document.pendingAction);
  const isSelectable = document.status === "ready";

  return (
    <article
      className={`${styles.documentRow} ${styles[statusView.rowClass]} ${
        isBusy ? styles.documentRowBusy : ""
      } ${isSelected ? styles.documentRowSelected : ""} ${
        isSelectable ? styles.documentRowSelectable : ""
      }`}
      aria-busy={isBusy}
      onClick={isSelectable ? onToggleSelection : undefined}
    >
      <span className={styles.documentIcon} aria-hidden="true">
        <FileText aria-hidden="true" />
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
              <span className={styles.metaSeparator}>-</span>
              <span>{statusView.meta.join(" - ")}</span>
            </>
          ) : null}
        </div>

        {statusView.showsProgress ? (
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

        {document.actionError || statusView.error ? (
          <div className={styles.documentError}>
            {document.actionError ?? statusView.error}
          </div>
        ) : null}
      </div>

      <div className={styles.documentActions}>
        {statusView.actions.map((action) => (
          <DocumentActionButton
            key={action}
            action={action}
            document={document}
            disabled={isBusy}
            onProcess={onProcess}
            onCancel={onCancel}
            onDelete={onDelete}
          />
        ))}
      </div>
    </article>
  );
}

function DocumentActionButton({
  action,
  document,
  disabled,
  onProcess,
  onCancel,
  onDelete,
}: {
  action: DocumentRowAction;
  document: DocumentLibraryItem;
  disabled: boolean;
  onProcess: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const button = getDocumentActionButton(action, document);

  return (
    <button
      className={`${styles.documentActionButton} ${styles[button.className]}`}
      type="button"
      aria-label={button.ariaLabel}
      title={button.title}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();

        if (action === "process") {
          onProcess();
          return;
        }

        if (action === "cancel") {
          onCancel();
          return;
        }

        onDelete();
      }}
    >
      {document.pendingAction === action ? <ActionSpinner /> : button.icon}
    </button>
  );
}

function getDocumentActionButton(
  action: DocumentRowAction,
  document: DocumentLibraryItem,
) {
  if (action === "process") {
    return {
      className: "retryButton",
      ariaLabel: "Reprendre le traitement",
      title: "Reprendre le traitement",
      icon: <RotateCcw aria-hidden="true" />,
    } as const;
  }

  if (action === "cancel") {
    return {
      className: "cancelButton",
      ariaLabel: "Annuler le traitement",
      title: "Annuler le traitement",
      icon: <X aria-hidden="true" />,
    } as const;
  }

  return {
    className: "deleteButton",
    ariaLabel: `Supprimer ${document.name}`,
    title: "Supprimer",
    icon: <Trash2 aria-hidden="true" />,
  } as const;
}

function ActionSpinner() {
  return <span className={styles.documentActionSpinner} aria-hidden="true" />;
}
