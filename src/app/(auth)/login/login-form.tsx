"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import styles from "./page.module.css";

type FieldErrors = {
  email?: string;
  password?: string;
};

type FormSubmitEvent = {
  preventDefault: () => void;
  currentTarget: HTMLFormElement;
};

export function LoginForm() {
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormSubmitEvent) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "").trim();
    const errors: FieldErrors = {};

    if (!email) {
      errors.email = "Saisissez votre adresse e-mail.";
    }

    if (!password) {
      errors.password = "Saisissez votre mot de passe.";
    }

    setFieldErrors(errors);
    setFormError(null);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        setFormError("Adresse e-mail ou mot de passe incorrect.");
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setFormError("La connexion a echoue. Reessayez dans un instant.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className={styles.loginForm} onSubmit={handleSubmit} noValidate>
      <div className={styles.field}>
        <label htmlFor="emailInput">Adresse e-mail</label>
        <input
          className={styles.textInput}
          id="emailInput"
          name="email"
          type="email"
          autoComplete="email"
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? "emailError" : undefined}
        />
        {fieldErrors.email ? (
          <div className={styles.validation} id="emailError">
            {fieldErrors.email}
          </div>
        ) : null}
      </div>

      <div className={styles.field}>
        <label htmlFor="passwordInput">Mot de passe</label>
        <input
          className={styles.textInput}
          id="passwordInput"
          name="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(fieldErrors.password)}
          aria-describedby={fieldErrors.password ? "passwordError" : undefined}
        />
        {fieldErrors.password ? (
          <div className={styles.validation} id="passwordError">
            {fieldErrors.password}
          </div>
        ) : null}
      </div>

      {formError ? (
        <div className={styles.formError} role="alert">
          {formError}
        </div>
      ) : null}

      <button className={styles.primaryButton} type="submit" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <span className={styles.spinner} aria-hidden="true" />
            Connexion...
          </>
        ) : (
          "Se connecter"
        )}
      </button>
    </form>
  );
}
