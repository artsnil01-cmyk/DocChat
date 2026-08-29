import { redirect } from "next/navigation";

import { getAuthenticatedWorkspace } from "@/lib/auth/guards";

export default async function MainPage() {
  const authenticatedWorkspace = await getAuthenticatedWorkspace();

  if (!authenticatedWorkspace) {
    redirect("/login");
  }

  return (
    <main className="page-shell">
      <section className="placeholder-panel" aria-labelledby="app-title">
        <h1 id="app-title">DocChat workspace</h1>
        <p>
          Main chat and document workspace UI will be implemented after the
          design source is provided. This route is reserved for the authenticated
          application shell.
        </p>
      </section>
    </main>
  );
}
