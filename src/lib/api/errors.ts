import { NextResponse } from "next/server";

import { AuthenticationError } from "@/lib/auth/guards";

export function authenticationErrorResponse(error: unknown): NextResponse | null {
  if (!(error instanceof AuthenticationError)) {
    return null;
  }

  return NextResponse.json({ error: error.message }, { status: 401 });
}
