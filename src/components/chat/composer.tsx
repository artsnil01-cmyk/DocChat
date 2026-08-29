import styles from "./chat.module.css";

export function Composer() {
  return (
    <div className={styles.composerWrap}>
      <form className={styles.composer} aria-label="Composer un message">
        <div className={styles.composerChips} />
        <textarea
          className={styles.composerInput}
          rows={1}
          placeholder="Posez une question sur ces documents..."
          disabled
        />
        <div className={styles.composeFooter}>
          <div className={styles.composerTools}>
            <button
              className={styles.inlineUploadButton}
              type="button"
              aria-label="Importer un fichier"
              disabled
            >
              +
            </button>
            <button className={styles.mentionButton} type="button" disabled>
              <span aria-hidden="true">@</span>
              Documents
            </button>
          </div>
          <button
            className={styles.sendButton}
            type="submit"
            aria-label="Envoyer le message"
            disabled
          >
            ↑
          </button>
        </div>
      </form>
    </div>
  );
}
