"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { BrandLockup } from "@/components/brand/brand-lockup";

import styles from "./login.module.css";

type LoginShellProps = {
  children: ReactNode;
};

type LoginTheme = "ivory" | "green";

const themeStorageKey = "docchat-theme";

export function LoginShell({ children }: LoginShellProps) {
  const [theme, setTheme] = useState<LoginTheme>("green");
  const isDarkTheme = theme === "green";

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(themeStorageKey);

    if (storedTheme !== "ivory" && storedTheme !== "green") {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      setTheme(storedTheme);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  function toggleTheme() {
    setTheme((currentTheme) => {
      const nextTheme = currentTheme === "green" ? "ivory" : "green";
      window.localStorage.setItem(themeStorageKey, nextTheme);
      return nextTheme;
    });
  }

  return (
    <main className={styles.loginView} data-docchat-theme={theme}>
      <section className={styles.loginShell} aria-labelledby="loginTitle">
        <div className={styles.formPanel}>
          <div className={styles.topline}>
            <BrandLockup />
            <button
              className={styles.themeToggle}
              type="button"
              aria-label={isDarkTheme ? "Passer en mode clair" : "Passer en mode sombre"}
              title={isDarkTheme ? "Passer en mode clair" : "Passer en mode sombre"}
              onClick={toggleTheme}
            >
              <svg className={styles.themeSun} viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.55" />
                <path
                  d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M5.9 5.9l1.4 1.4M16.7 16.7l1.4 1.4M18.1 5.9l-1.4 1.4M7.3 16.7l-1.4 1.4"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="1.45"
                />
              </svg>
              <svg className={styles.themeMoon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M18.2 15.25A7 7 0 0 1 8.75 5.8 7.1 7.1 0 1 0 18.2 15.25Z"
                  stroke="currentColor"
                  strokeWidth="1.55"
                />
              </svg>
            </button>
          </div>

          <div className={styles.copy}>
            <span className={styles.eyebrow}>ESPACE DOCUMENTAIRE</span>
            <h1 id="loginTitle">
              Retrouvez l&rsquo;essentiel
              <br />
              Interrogez vos sources
            </h1>
            <p>
              Connectez-vous à votre espace DocChat pour poursuivre vos conversations documentaires.
            </p>
          </div>

          {children}

          <div className={styles.formNote}>
            <span className={styles.noteDot} aria-hidden="true" />
            Environnement d&rsquo;évaluation sécurisé
          </div>
        </div>

        <aside className={styles.visualPanel} aria-label="Aperçu DocChat">
          <div className={styles.visualKicker}>INTELLIGENCE DOCUMENTAIRE</div>
          <div className={styles.visualCopy}>
            <span>Recherche documentaire</span>
            <h2>
              Des réponses ancrées
              <br />
              dans <em>vos documents.</em>
            </h2>
            <p>
              Chaque réponse garde ses sources à portée de clic, sans interrompre votre lecture.
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
      <div className={styles.loginFooter}>DocChat by Smartly.ai</div>
    </main>
  );
}
