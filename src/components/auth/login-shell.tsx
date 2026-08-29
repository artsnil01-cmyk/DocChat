import type { ReactNode } from "react";

import { BrandLockup } from "@/components/brand/brand-lockup";

import styles from "./login.module.css";

type LoginShellProps = {
  children: ReactNode;
};

export function LoginShell({ children }: LoginShellProps) {
  return (
    <main className={styles.loginView} data-docchat-theme="green">
      <section className={styles.loginShell} aria-labelledby="loginTitle">
        <div className={styles.formPanel}>
          <div className={styles.topline}>
            <BrandLockup />
            <div className={styles.loginMark} aria-hidden="true" />
          </div>

          <div className={styles.copy}>
            <span className={styles.eyebrow}>ESPACE SECURISE</span>
            <h1 id="loginTitle">Bienvenue</h1>
            <p>{"Accedez a l'espace d'evaluation DocChat."}</p>
          </div>

          {children}

          <div className={styles.formNote}>
            <span className={styles.noteDot} aria-hidden="true" />
            {"Environnement d'evaluation technique"}
          </div>
        </div>

        <aside className={styles.visualPanel} aria-label="Apercu DocChat">
          <div className={styles.visualKicker}>DOCUMENT INTELLIGENCE</div>
          <div className={styles.visualCopy}>
            <span>Recherche augmentee</span>
            <h2>
              Interrogez vos <em>documents</em> avec contexte.
            </h2>
            <p>
              DocChat conserve les sources, les pages et le contexte documentaire
              pour chaque reponse generee.
            </p>
          </div>

          <div className={styles.sculpture} aria-hidden="true">
            <span className={styles.formA} />
            <span className={styles.formB} />
            <span className={styles.formC} />
          </div>

          <div className={styles.proofPills} aria-hidden="true">
            <span>PDF natifs</span>
            <span>FR / AR</span>
            <span>Sources</span>
          </div>
        </aside>
      </section>
    </main>
  );
}
