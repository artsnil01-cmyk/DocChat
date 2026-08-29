import { NextRequest, NextResponse } from "next/server";

import { expiredAuthCookieOptions } from "@/lib/auth/cookies";
import { revokeSessionByToken } from "@/lib/auth/sessions";
import { AUTH_COOKIE_NAME } from "@/lib/auth/tokens";

export async function POST(request: NextRequest) {
  const authToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (authToken) {
    await revokeSessionByToken(authToken);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE_NAME, "", expiredAuthCookieOptions);

  return response;
}
