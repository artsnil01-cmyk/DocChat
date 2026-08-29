import styles from "./chat.module.css";

export function ConversationEmptyState() {
  return (
    <div className={styles.conversation}>
      <div className={styles.chatContainer}>
        <section className={styles.emptyState} aria-labelledby="emptyTitle">
          <div className={styles.emptyArt} aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className={styles.emptyKicker}>NOUVELLE CONVERSATION</div>
          <h1 id="emptyTitle">Importez vos documents</h1>
          <p>Les conversations et documents apparaitront ici apres connexion aux donnees.</p>
        </section>
      </div>
    </div>
  );
}
