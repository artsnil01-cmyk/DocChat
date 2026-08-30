import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import { authenticationErrorResponse } from "@/lib/api/errors";
import { requireAuthenticatedWorkspace } from "@/lib/auth/guards";
import { chatRouteParamsSchema } from "@/lib/chat/schemas";
import { documentRouteParamsSchema } from "@/lib/documents/schemas";
import { removeDocumentFromChat } from "@/lib/documents/service";

type ChatDocumentRouteContext = {
  params: Promise<{
    chatId: string;
    documentId: string;
  }>;
};

export async function DELETE(
  _request: Request,
  context: ChatDocumentRouteContext,
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
  const parsedChatParams = chatRouteParamsSchema.safeParse({
    chatId: params.chatId,
  });
  const parsedDocumentParams = documentRouteParamsSchema.safeParse({
    documentId: params.documentId,
  });

  if (!parsedChatParams.success || !parsedDocumentParams.success) {
    return NextResponse.json(
      { error: "Invalid chat document route params." },
      { status: 400 },
    );
  }

  const result = await removeDocumentFromChat({
    workspaceId,
    chatId: new ObjectId(parsedChatParams.data.chatId),
    documentId: new ObjectId(parsedDocumentParams.data.documentId),
  });

  if (result === "not_found") {
    return NextResponse.json(
      { error: "Chat document attachment not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
