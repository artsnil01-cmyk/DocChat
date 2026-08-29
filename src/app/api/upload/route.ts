import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

import { requireAuthenticatedWorkspace } from "@/lib/auth/guards";
import { authenticationErrorResponse } from "@/lib/api/errors";
import { uploadPreflightRequestSchema } from "@/lib/documents/schemas";
import { preflightDocumentUpload } from "@/lib/documents/service";

export async function POST(request: NextRequest) {
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

  const body = await readJson(request);
  const parsedBody = uploadPreflightRequestSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json({ error: "Invalid upload request." }, { status: 400 });
  }

  const result = await preflightDocumentUpload({
    workspaceId,
    chatId: new ObjectId(parsedBody.data.chatId),
    name: parsedBody.data.name,
    contentHash: parsedBody.data.contentHash,
    sizeBytes: parsedBody.data.sizeBytes,
  });

  if (!result) {
    return NextResponse.json({ error: "Chat not found." }, { status: 404 });
  }

  return NextResponse.json(
    {
      document: result.document,
      duplicate: result.duplicate,
      requiresUpload: result.requiresUpload,
    },
    { status: result.duplicate ? 200 : 201 },
  );
}

async function readJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
