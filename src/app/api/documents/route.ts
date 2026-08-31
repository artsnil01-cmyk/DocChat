import { NextRequest, NextResponse } from "next/server";

import { readJson, requireApiWorkspace } from "@/lib/api/request";
import { uploadPreflightRequestSchema } from "@/lib/documents/schemas";
import {
  listWorkspaceDocuments,
  preflightDocumentUpload,
} from "@/lib/documents/service";

export async function GET() {
  const workspace = await requireApiWorkspace();

  if (!workspace.ok) {
    return workspace.response;
  }

  return NextResponse.json({
    documents: await listWorkspaceDocuments(workspace.value.workspaceId),
  });
}

export async function POST(request: NextRequest) {
  const workspace = await requireApiWorkspace();

  if (!workspace.ok) {
    return workspace.response;
  }

  const body = await readJson(request);
  const parsedBody = uploadPreflightRequestSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json({ error: "Invalid document request." }, { status: 400 });
  }

  const result = await preflightDocumentUpload({
    workspaceId: workspace.value.workspaceId,
    name: parsedBody.data.name,
    contentHash: parsedBody.data.contentHash,
    sizeBytes: parsedBody.data.sizeBytes,
  });

  return NextResponse.json(
    {
      document: result.document,
      duplicate: result.duplicate,
      requiresUpload: result.requiresUpload,
      upload: result.upload,
    },
    { status: result.duplicate ? 200 : 201 },
  );
}
