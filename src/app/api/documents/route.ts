import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

import { authenticationErrorResponse } from "@/lib/api/errors";
import { requireAuthenticatedWorkspace } from "@/lib/auth/guards";
import {
  listDocumentsQuerySchema,
  uploadPreflightRequestSchema,
} from "@/lib/documents/schemas";
import {
  listChatDocuments,
  listWorkspaceDocuments,
  preflightDocumentUpload,
} from "@/lib/documents/service";

export async function GET(request: NextRequest) {
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

  const parsedQuery = listDocumentsQuerySchema.safeParse({
    chatId: request.nextUrl.searchParams.get("chatId") ?? undefined,
  });

  if (!parsedQuery.success) {
    return NextResponse.json({ error: "Invalid document query." }, { status: 400 });
  }

  if (!parsedQuery.data.chatId) {
    return NextResponse.json({
      documents: await listWorkspaceDocuments(workspaceId),
    });
  }

  const documents = await listChatDocuments({
    workspaceId,
    chatId: new ObjectId(parsedQuery.data.chatId),
  });

  if (!documents) {
    return NextResponse.json({ error: "Chat not found." }, { status: 404 });
  }

  return NextResponse.json({ documents });
}

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
    return NextResponse.json({ error: "Invalid document request." }, { status: 400 });
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
      upload: result.upload,
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
