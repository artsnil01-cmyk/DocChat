import "server-only";

import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

import { authConfig } from "@/config/auth";
import { serverEnv } from "@/lib/env/server";

export const authCookieOptions = {
  httpOnly: true,
  secure: serverEnv.isProduction,
  sameSite: "lax",
  path: "/",
  maxAge: authConfig.authCookieMaxAgeSeconds,
} satisfies Partial<ResponseCookie>;

export const workspaceCookieOptions = {
  httpOnly: true,
  secure: serverEnv.isProduction,
  sameSite: "lax",
  path: "/",
  maxAge: authConfig.workspaceCookieMaxAgeSeconds,
} satisfies Partial<ResponseCookie>;

export const expiredAuthCookieOptions = {
  ...authCookieOptions,
  maxAge: 0,
  expires: new Date(0),
} satisfies Partial<ResponseCookie>;
