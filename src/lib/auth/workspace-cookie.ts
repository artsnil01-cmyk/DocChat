import "server-only";

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import { serverEnv } from "@/lib/env/server";

export const WORKSPACE_COOKIE_NAME = "docchat_workspace";

const WORKSPACE_SIGNATURE_PURPOSE = WORKSPACE_COOKIE_NAME;

export function generateWorkspaceId(): string {
  return randomUUID();
}

export function createSignedWorkspaceCookieValue(workspaceId: string): string {
  return `${workspaceId}.${signWorkspaceId(workspaceId)}`;
}

export function resolveWorkspaceIdFromCookie(cookieValue: string): string | null {
  const parsed = parseSignedWorkspaceCookieValue(cookieValue);

  if (!parsed) {
    return null;
  }

  if (!isValidWorkspaceSignature(parsed.workspaceId, parsed.signature)) {
    return null;
  }

  return parsed.workspaceId;
}

function parseSignedWorkspaceCookieValue(
  cookieValue: string,
): { workspaceId: string; signature: string } | null {
  const separatorIndex = cookieValue.lastIndexOf(".");

  if (separatorIndex <= 0 || separatorIndex === cookieValue.length - 1) {
    return null;
  }

  return {
    workspaceId: cookieValue.slice(0, separatorIndex),
    signature: cookieValue.slice(separatorIndex + 1),
  };
}

function signWorkspaceId(workspaceId: string): string {
  return createHmac("sha256", serverEnv.sessionSecret)
    .update(`${WORKSPACE_SIGNATURE_PURPOSE}:${workspaceId}`)
    .digest("base64url");
}

function isValidWorkspaceSignature(
  workspaceId: string,
  signature: string,
): boolean {
  const expectedSignature = signWorkspaceId(workspaceId);
  const expected = Buffer.from(expectedSignature);
  const received = Buffer.from(signature);

  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
}
