import { NextRequest, NextResponse } from "next/server";

import { readJson, requireApiWorkspace } from "@/lib/api/request";
import { answerChatMessage } from "@/lib/chat/answering";
import { chatMessageRequestSchema } from "@/lib/chat/schemas";

export async function POST(request: NextRequest) {
  const workspace = await requireApiWorkspace();

  if (!workspace.ok) {
    return workspace.response;
  }

  const body = await readJson(request);
  const parsedBody = chatMessageRequestSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json({ error: "Invalid chat request." }, { status: 400 });
  }

  const result = await answerChatMessage({
    workspaceId: workspace.value.workspaceId,
    request: parsedBody.data,
  });

  if (!result.ok) {
    return chatAnsweringErrorResponse(result);
  }

  return NextResponse.json({
    chat: result.chat,
    messages: {
      user: result.userMessage,
      assistant: result.assistantMessage,
    },
    answer: result.answer,
    citations: result.citations,
    evidence: result.evidence,
  });
}

function chatAnsweringErrorResponse(
  result: Exclude<Awaited<ReturnType<typeof answerChatMessage>>, { ok: true }>,
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
