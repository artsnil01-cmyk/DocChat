import { NextResponse } from "next/server";

import { requireAuthenticatedWorkspace } from "@/lib/auth/guards";
import { authenticationErrorResponse } from "@/lib/api/errors";

export async function GET() {
  try {
    await requireAuthenticatedWorkspace();
  } catch (error) {
    const response = authenticationErrorResponse(error);

    if (response) {
      return response;
    }

    throw error;
  }

  return NextResponse.json(
    { error: "Document status polling is not implemented yet." },
    { status: 501 },
  );
}
