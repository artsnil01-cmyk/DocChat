import { NextResponse } from "next/server";

import { parseObjectIdParam, requireApiWorkspace } from "@/lib/api/request";
import { documentRouteParamsSchema } from "@/lib/documents/schemas";
import { getWorkspaceDocument } from "@/lib/documents/service";

type DocumentStatusRouteContext = {
  params: Promise<{
    documentId: string;
  }>;
};

export async function GET(_request: Request, context: DocumentStatusRouteContext) {
  const workspace = await requireApiWorkspace();

  if (!workspace.ok) {
    return workspace.response;
  }

  const params = await context.params;
  const documentId = parseObjectIdParam(
    params,
    documentRouteParamsSchema,
    "documentId",
    "Invalid document route params.",
  );

  if (!documentId.ok) {
    return documentId.response;
  }

  const document = await getWorkspaceDocument({
    workspaceId: workspace.value.workspaceId,
    documentId: documentId.value,
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
      uploadExpiresAt: document.uploadExpiresAt,
      nextAction: document.nextAction,
      updatedAt: document.updatedAt,
    },
  });
}
