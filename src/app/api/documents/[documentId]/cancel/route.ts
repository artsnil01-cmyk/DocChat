import { NextResponse } from "next/server";

import { parseObjectIdParam, requireApiWorkspace } from "@/lib/api/request";
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

  const result = await requestDocumentProcessingCancel({
    workspaceId: workspace.value.workspaceId,
    documentId: documentId.value,
  });

  if (!result.ok) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  return NextResponse.json({
    requested: result.requested,
    document: result.document,
  });
}
