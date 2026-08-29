import "server-only";

import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

import { serverEnv } from "@/lib/env/server";

const THIRTY_DAYS_IN_SECONDS = 60 * 60 * 24 * 30;
const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

export const authCookieOptions = {
  httpOnly: true,
  secure: serverEnv.isProduction,
  sameSite: "lax",
  path: "/",
  maxAge: THIRTY_DAYS_IN_SECONDS,
} satisfies Partial<ResponseCookie>;

export const workspaceCookieOptions = {
  httpOnly: true,
  secure: serverEnv.isProduction,
  sameSite: "lax",
  path: "/",
  maxAge: ONE_YEAR_IN_SECONDS,
} satisfies Partial<ResponseCookie>;

export const expiredAuthCookieOptions = {
  ...authCookieOptions,
  maxAge: 0,
  expires: new Date(0),
} satisfies Partial<ResponseCookie>;
