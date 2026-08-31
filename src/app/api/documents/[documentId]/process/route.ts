import { NextResponse } from "next/server";

import { parseObjectIdParam, requireApiWorkspace } from "@/lib/api/request";
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

  const result = await processDocument({
    workspaceId: workspace.value.workspaceId,
    documentId: documentId.value,
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
