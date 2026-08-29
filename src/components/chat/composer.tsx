import styles from "./chat.module.css";

export function Composer() {
  return (
    <div className={styles.composerWrap}>
      <form className={styles.composer} aria-label="Composer un message">
        <div className={styles.composerChips} />
        <div className={styles.composeMain}>
          <textarea
            className={styles.composerInput}
            rows={1}
            placeholder="Posez une question sur ces documents..."
            disabled
          />
        </div>
        <div className={styles.composeFooter}>
          <div className={styles.composerTools}>
            <button
              className={styles.inlineUploadButton}
              type="button"
              aria-label="Importer un fichier"
              disabled
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
              </svg>
            </button>
            <div className={styles.mentionAnchor}>
              <button className={styles.mentionButton} type="button" disabled>
                <span aria-hidden="true">@</span>
                Documents
              </button>
            </div>
          </div>
          <button
            className={styles.sendButton}
            type="submit"
            aria-label="Envoyer le message"
            disabled
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 18V6m0 0-5 5m5-5 5 5"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.25"
              />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
