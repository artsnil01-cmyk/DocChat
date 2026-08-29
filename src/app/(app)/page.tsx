import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell/app-shell";
import { getAuthenticatedWorkspace } from "@/lib/auth/guards";

export default async function MainPage() {
  const authenticatedWorkspace = await getAuthenticatedWorkspace();

  if (!authenticatedWorkspace) {
    redirect("/login");
  }

  return <AppShell />;
}
