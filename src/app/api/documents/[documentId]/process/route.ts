import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import { authenticationErrorResponse } from "@/lib/api/errors";
import { requireAuthenticatedWorkspace } from "@/lib/auth/guards";
import { documentRouteParamsSchema } from "@/lib/documents/schemas";
import { processDocument } from "@/lib/documents/service";

type ProcessDocumentRouteContext = {
  params: Promise<{
    documentId: string;
  }>;
};

export async function POST(
  _request: Request,
  context: ProcessDocumentRouteContext,
) {
  let workspaceId: string;

  try {
    ({ workspaceId } = await requireAuthenticatedWorkspace());
  } catch (error) {
    const response = authenticationErrorResponse(error);

    if (response) {
      return response;
    }

    throw error;
  }

  const params = await context.params;
  const parsedParams = documentRouteParamsSchema.safeParse(params);

  if (!parsedParams.success) {
    return NextResponse.json(
      { error: "Invalid document route params." },
      { status: 400 },
    );
  }

  const result = await processDocument({
    workspaceId,
    documentId: new ObjectId(parsedParams.data.documentId),
  });

  if (!result.ok) {
    if (result.reason === "not_found") {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    return NextResponse.json(
      {
        error: "Document cannot be processed now.",
        reason: result.reason,
        document: result.document,
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    state: result.state,
    document: result.document,
  });
}
