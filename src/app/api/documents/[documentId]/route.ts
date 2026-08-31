import { NextResponse } from "next/server";

import { parseObjectIdParam, requireApiWorkspace } from "@/lib/api/request";
import { documentRouteParamsSchema } from "@/lib/documents/schemas";
import { deleteWorkspaceDocument } from "@/lib/documents/service";

type DocumentRouteContext = {
  params: Promise<{
    documentId: string;
  }>;
};

export async function DELETE(_request: Request, context: DocumentRouteContext) {
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

  const result = await deleteWorkspaceDocument({
    workspaceId: workspace.value.workspaceId,
    documentId: documentId.value,
  });

  if (result === "not_found") {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  if (result === "processing") {
    return NextResponse.json(
      { error: "Document is currently processing." },
      { status: 409 },
    );
  }

  return NextResponse.json({
    ok: true,
    deleted: true,
  });
}
