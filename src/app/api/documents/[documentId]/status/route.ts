import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import { requireAuthenticatedWorkspace } from "@/lib/auth/guards";
import { authenticationErrorResponse } from "@/lib/api/errors";
import { documentRouteParamsSchema } from "@/lib/documents/schemas";
import { getWorkspaceDocument } from "@/lib/documents/service";

type DocumentStatusRouteContext = {
  params: Promise<{
    documentId: string;
  }>;
};

export async function GET(_request: Request, context: DocumentStatusRouteContext) {
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
    return NextResponse.json({ error: "Invalid document route params." }, { status: 400 });
  }

  const document = await getWorkspaceDocument({
    workspaceId,
    documentId: new ObjectId(parsedParams.data.documentId),
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  return NextResponse.json({
    document: {
      id: document.id,
      name: document.name,
      status: document.status,
      stage: document.stage,
      progress: document.progress,
      error: document.error,
      nextAction: document.nextAction,
      updatedAt: document.updatedAt,
    },
  });
}
