import { BookOpen, FilePlus2, Library, Sparkles } from "lucide-react";

import { examplePrompts } from "./chat-ui-state";
import styles from "./chat.module.css";

type ConversationEmptyStateProps = {
  readyDocumentCount: number;
  onOpenDocuments: () => void;
  onUploadDocument: () => void;
  onSelectPrompt: (prompt: string) => void;
};

export function ConversationEmptyState({
  readyDocumentCount,
  onOpenDocuments,
  onUploadDocument,
  onSelectPrompt,
}: ConversationEmptyStateProps) {
  return (
    <div className={styles.conversation} id="conversation">
      <div className={styles.chatContainer}>
        <section className={styles.emptyState} aria-labelledby="emptyTitle">
          <div className={styles.emptyArt} aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className={styles.emptyKicker}>NOUVELLE CONVERSATION</div>
          <h1 id="emptyTitle">Interrogez vos documents</h1>
          <p>
            Choisissez un PDF pret, posez une question, puis DocChat construit
            une reponse ancree dans vos sources.
          </p>

          <div className={styles.emptyActions} aria-label="Actions documents">
            <button
              className={styles.emptyFileAction}
              type="button"
              onClick={onOpenDocuments}
            >
              <Library aria-hidden="true" />
              Documents
              {readyDocumentCount > 0 ? (
                <span>{readyDocumentCount}</span>
              ) : null}
            </button>
            <button
              className={styles.emptyFileAction}
              type="button"
              onClick={onUploadDocument}
            >
              <FilePlus2 aria-hidden="true" />
              Importer un PDF
            </button>
          </div>

          <div className={styles.promptList} aria-label="Exemples de questions">
            {examplePrompts.map((prompt) => (
              <button
                className={styles.promptRow}
                type="button"
                key={prompt}
                onClick={() => onSelectPrompt(prompt)}
              >
                <Sparkles aria-hidden="true" />
                <span>{prompt}</span>
              </button>
            ))}
          </div>

          <div className={styles.emptyHint}>
            <BookOpen aria-hidden="true" />
            Une nouvelle conversation commence avec un message et au moins un
            document selectionne.
          </div>
        </section>
      </div>
    </div>
  );
}
