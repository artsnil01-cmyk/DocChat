import { useEffect, useRef, type RefObject } from "react";
import { AtSign, FilePlus2, FileText, SendHorizontal, X } from "lucide-react";

import type { SendAvailability } from "./chat-ui-state";
import type { DocumentLibraryItem } from "@/components/documents/use-document-library";
import styles from "./chat.module.css";

type ComposerProps = {
  value: string;
  selectedDocuments: DocumentLibraryItem[];
  mentionableDocuments: DocumentLibraryItem[];
  sendAvailability: SendAvailability;
  isAnswering: boolean;
  isMentionOpen: boolean;
  error?: string;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
  onValueChange: (value: string) => void;
  onSubmit: () => void | Promise<void>;
  onUploadDocument: () => void;
  onToggleMention: () => void;
  onCloseMention: () => void;
  onToggleDocument: (documentId: string) => void;
  onRemoveDocument: (documentId: string) => void;
};

export function Composer({
  value,
  selectedDocuments,
  mentionableDocuments,
  sendAvailability,
  isAnswering,
  isMentionOpen,
  error,
  inputRef,
  onValueChange,
  onSubmit,
  onUploadDocument,
  onToggleMention,
  onCloseMention,
  onToggleDocument,
  onRemoveDocument,
}: ComposerProps) {
  const composerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMentionOpen) {
      return;
    }

    function closeMentionOnOutsideClick(event: MouseEvent) {
      if (
        event.target instanceof Node &&
        !composerRef.current?.contains(event.target)
      ) {
        onCloseMention();
      }
    }

    document.addEventListener("mousedown", closeMentionOnOutsideClick);
    return () =>
      document.removeEventListener("mousedown", closeMentionOnOutsideClick);
  }, [isMentionOpen, onCloseMention]);

  function handleSubmit(event: { preventDefault: () => void }) {
    event.preventDefault();

    if (sendAvailability.canSend) {
      void onSubmit();
    }
  }

  function handleInputChange(value: string) {
    onValueChange(value);

    if (value.endsWith("@")) {
      onToggleMention();
    }
  }

  return (
    <div className={styles.composerWrap} ref={composerRef}>
      {error ? (
        <div className={styles.composerError} role="alert">
          {error}
        </div>
      ) : null}
      <form className={styles.composer} aria-label="Composer un message" onSubmit={handleSubmit}>
        <div className={styles.composerChips}>
          {selectedDocuments.map((document) => (
            <button
              className={styles.composerDocChip}
              type="button"
              key={document.id}
              title="Retirer de la selection"
              onClick={() => onRemoveDocument(document.id)}
            >
              <FileText aria-hidden="true" />
              <span>{document.name}</span>
              <X aria-hidden="true" />
            </button>
          ))}
        </div>
        <div className={styles.composeMain}>
          <textarea
            ref={inputRef}
            className={styles.composerInput}
            rows={1}
            placeholder="Posez une question sur ces documents..."
            value={value}
            disabled={isAnswering}
            onChange={(event) => handleInputChange(event.currentTarget.value)}
          />
        </div>
        <div className={styles.composeFooter}>
          <div className={styles.composerTools}>
            <button
              className={styles.inlineUploadButton}
              type="button"
              aria-label="Importer un fichier"
              title="Importer un fichier"
              disabled={isAnswering}
              onClick={onUploadDocument}
            >
              <FilePlus2 aria-hidden="true" />
            </button>
            <div className={styles.mentionAnchor}>
              <button
                className={styles.mentionButton}
                type="button"
                disabled={isAnswering || mentionableDocuments.length === 0}
                aria-expanded={isMentionOpen}
                onClick={isMentionOpen ? onCloseMention : onToggleMention}
              >
                <AtSign aria-hidden="true" />
                Documents
              </button>
              {isMentionOpen ? (
                <div className={styles.mentionPopover}>
                  <div className={styles.mentionTitle}>Choisir un document</div>
                  {mentionableDocuments.length > 0 ? (
                    <div className={styles.mentionList}>
                      {mentionableDocuments.map((document) => {
                        const isSelected = selectedDocuments.some(
                          (selectedDocument) => selectedDocument.id === document.id,
                        );

                        return (
                          <button
                            className={`${styles.mentionItem} ${
                              isSelected ? styles.mentionItemSelected : ""
                            }`}
                            type="button"
                            key={document.id}
                            onClick={() => {
                              onToggleDocument(document.id);
                              onCloseMention();
                            }}
                          >
                            <FileText aria-hidden="true" />
                            <span>
                              <strong>{document.name}</strong>
                              <small>
                                {document.pageCount
                                  ? `${document.pageCount} pages`
                                  : "Document pret"}
                              </small>
                            </span>
                            <em>{isSelected ? "Selectionne" : ""}</em>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className={styles.mentionEmpty}>
                      Aucun document pret.
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
          <button
            className={`${styles.sendButton} ${
              sendAvailability.canSend ? styles.sendButtonActive : ""
            }`}
            type="submit"
            aria-label="Envoyer le message"
            title={sendAvailability.reason}
            disabled={!sendAvailability.canSend}
          >
            <SendHorizontal aria-hidden="true" />
          </button>
        </div>
      </form>
    </div>
  );
}
