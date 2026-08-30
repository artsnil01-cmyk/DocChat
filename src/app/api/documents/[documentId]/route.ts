import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import { requireAuthenticatedWorkspace } from "@/lib/auth/guards";
import { authenticationErrorResponse } from "@/lib/api/errors";
import {
  detachDocumentQuerySchema,
  documentRouteParamsSchema,
} from "@/lib/documents/schemas";
import { removeDocumentFromChat } from "@/lib/documents/service";

type DocumentRouteContext = {
  params: Promise<{
    documentId: string;
  }>;
};

export async function DELETE(request: Request, context: DocumentRouteContext) {
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
  const parsedQuery = detachDocumentQuerySchema.safeParse({
    chatId: new URL(request.url).searchParams.get("chatId"),
  });

  if (!parsedParams.success || !parsedQuery.success) {
    return NextResponse.json(
      { error: "Invalid document detach request." },
      { status: 400 },
    );
  }

  const result = await removeDocumentFromChat({
    workspaceId,
    chatId: new ObjectId(parsedQuery.data.chatId),
    documentId: new ObjectId(parsedParams.data.documentId),
  });

  if (result === "not_found") {
    return NextResponse.json(
      { error: "Chat document attachment not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
