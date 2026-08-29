import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { LoginShell } from "@/components/auth/login-shell";
import { getAuthenticatedWorkspace } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: "DocChat - Connexion",
};

export default async function LoginPage() {
  const authenticatedWorkspace = await getAuthenticatedWorkspace();

  if (authenticatedWorkspace) {
    redirect("/");
  }

  return (
    <LoginShell>
      <LoginForm />
    </LoginShell>
  );
}
