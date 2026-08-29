import "server-only";

import { cookies } from "next/headers";
import type { ObjectId } from "mongodb";

import { findValidSessionByToken } from "@/lib/auth/sessions";
import { AUTH_COOKIE_NAME } from "@/lib/auth/tokens";

export type AuthenticatedWorkspace = {
  sessionId: ObjectId;
  accountId: ObjectId;
  workspaceId: string;
};

export class AuthenticationError extends Error {
  constructor(message = "Authentication required.") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export async function requireAuthenticatedWorkspace(): Promise<AuthenticatedWorkspace> {
  const cookieStore = await cookies();
  const authToken = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!authToken) {
    throw new AuthenticationError();
  }

  const session = await findValidSessionByToken(authToken);

  if (!session) {
    throw new AuthenticationError("Authentication session is invalid or expired.");
  }

  return {
    sessionId: session._id,
    accountId: session.accountId,
    workspaceId: session.workspaceId,
  };
}
