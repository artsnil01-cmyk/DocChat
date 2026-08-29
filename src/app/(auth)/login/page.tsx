import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAuthenticatedWorkspace } from "@/lib/auth/guards";
import { LoginForm } from "./login-form";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "DocChat - Connexion",
};

export default async function LoginPage() {
  const authenticatedWorkspace = await getAuthenticatedWorkspace();

  if (authenticatedWorkspace) {
    redirect("/");
  }

  return (
    <main className={styles.loginView} data-theme="dark">
      <section className={styles.loginCard} aria-labelledby="loginTitle">
        <div className={styles.loginBrandRow}>
          <div className={styles.brandLockup}>
            <span className={styles.brandName}>
              Doc<span>Chat</span>
            </span>
            <span className={styles.brandBy}>by Smartly.ai</span>
          </div>
          <div className={styles.loginMark} aria-hidden="true" />
        </div>

        <h1 id="loginTitle">Bienvenue</h1>
        <p>{"Accedez a l'espace d'evaluation DocChat."}</p>

        <LoginForm />
      </section>

      <div className={styles.loginFooter}>
        {"Environnement d'evaluation technique"}
      </div>
    </main>
  );
}
