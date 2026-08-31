import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import { authenticationErrorResponse } from "@/lib/api/errors";
import { requireAuthenticatedWorkspace } from "@/lib/auth/guards";
import { documentRouteParamsSchema } from "@/lib/documents/schemas";
import { requestDocumentProcessingCancel } from "@/lib/documents/service";

type CancelDocumentProcessingRouteContext = {
  params: Promise<{
    documentId: string;
  }>;
};

export async function POST(
  _request: Request,
  context: CancelDocumentProcessingRouteContext,
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

  const result = await requestDocumentProcessingCancel({
    workspaceId,
    documentId: new ObjectId(parsedParams.data.documentId),
  });

  if (!result.ok) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  return NextResponse.json({
    requested: result.requested,
    document: result.document,
  });
}
