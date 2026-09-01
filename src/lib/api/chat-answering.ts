import { NextResponse } from "next/server";

import type { AnswerChatMessageFailure } from "@/lib/chat/answering";

export function chatAnsweringErrorResponse(
  result: AnswerChatMessageFailure,
): NextResponse {
  if (result.reason === "chat_not_found") {
    return NextResponse.json({ error: "Chat not found." }, { status: 404 });
  }

  if (
    result.reason === "document_not_found" ||
    result.reason === "document_not_ready"
  ) {
    return NextResponse.json(
      {
        error: "Document scope is not available.",
        reason: result.reason,
        documentId: result.documentId,
      },
      { status: 409 },
    );
  }

  if (
    result.reason === "invalid_chat_request" ||
    result.reason === "empty_document_scope"
  ) {
    return NextResponse.json(
      {
        error: "Invalid chat request.",
        reason: result.reason,
      },
      { status: 400 },
    );
  }

  return NextResponse.json(
    {
      error: "No evidence was found for this question.",
      reason: result.reason,
    },
    { status: 404 },
  );
}
