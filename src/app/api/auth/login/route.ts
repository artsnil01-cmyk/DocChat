import { NextRequest, NextResponse } from "next/server";

import { authCookieOptions, workspaceCookieOptions } from "@/lib/auth/cookies";
import { createAuthSession } from "@/lib/auth/sessions";
import { loginRequestSchema } from "@/lib/auth/schemas";
import { AUTH_COOKIE_NAME } from "@/lib/auth/tokens";
import { verifyPassword } from "@/lib/auth/passwords";
import {
  createSignedWorkspaceCookieValue,
  generateWorkspaceId,
  resolveWorkspaceIdFromCookie,
  WORKSPACE_COOKIE_NAME,
} from "@/lib/auth/workspace-cookie";
import { accountsCollection } from "@/lib/db/collections";

export async function POST(request: NextRequest) {
  const body = await readJson(request);
  const parsedBody = loginRequestSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json({ error: "Invalid login request." }, { status: 400 });
  }

  const accounts = await accountsCollection();
  const account = await accounts.findOne({ email: parsedBody.data.email });

  if (
    !account ||
    !(await verifyPassword(account.passwordHash, parsedBody.data.password))
  ) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 },
    );
  }

  const workspaceCookie = request.cookies.get(WORKSPACE_COOKIE_NAME)?.value;
  const workspaceId = workspaceCookie
    ? (resolveWorkspaceIdFromCookie(workspaceCookie) ?? generateWorkspaceId())
    : generateWorkspaceId();
  const { rawToken } = await createAuthSession({
    accountId: account._id,
    workspaceId,
  });
  const response = NextResponse.json({ ok: true });

  response.cookies.set(AUTH_COOKIE_NAME, rawToken, authCookieOptions);
  response.cookies.set(
    WORKSPACE_COOKIE_NAME,
    createSignedWorkspaceCookieValue(workspaceId),
    workspaceCookieOptions,
  );

  return response;
}

async function readJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
