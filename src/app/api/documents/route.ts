import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

import { authenticationErrorResponse } from "@/lib/api/errors";
import { requireAuthenticatedWorkspace } from "@/lib/auth/guards";
import { listDocumentsQuerySchema } from "@/lib/documents/schemas";
import {
  listChatDocuments,
  listWorkspaceDocuments,
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
