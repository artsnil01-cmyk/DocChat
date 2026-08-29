import "server-only";

import { createHash, randomBytes } from "node:crypto";

export const AUTH_COOKIE_NAME = "docchat_auth";

export function generateAuthToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashAuthToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}
