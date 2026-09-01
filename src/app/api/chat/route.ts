import { NextRequest, NextResponse } from "next/server";

import { chatAnsweringErrorResponse } from "@/lib/api/chat-answering";
import { readJson, requireApiWorkspace } from "@/lib/api/request";
import {
  streamChatAnswer,
  type AnswerChatMessageFailure,
  type StreamChatAnswerEvent,
} from "@/lib/chat/answering";
import { chatMessageRequestSchema } from "@/lib/chat/schemas";

type ChatStreamEvent =
  | StreamChatAnswerEvent
  | {
      type: "error";
      error: string;
      reason?: AnswerChatMessageFailure["reason"];
      documentId?: string;
    };

const encoder = new TextEncoder();

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

  const events = streamChatAnswer({
    workspaceId: workspace.value.workspaceId,
    request: parsedBody.data,
  });
  const firstEvent = await events.next();

  if (firstEvent.done) {
    return NextResponse.json(
      { error: "Chat stream did not produce a response." },
      { status: 500 },
    );
  }

  if (isFailureEvent(firstEvent.value)) {
    return chatAnsweringErrorResponse(firstEvent.value);
  }

  return new Response(createChatStream(events, firstEvent.value), {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "X-Accel-Buffering": "no",
    },
  });
}

function createChatStream(
  events: AsyncGenerator<StreamChatAnswerEvent | AnswerChatMessageFailure>,
  firstEvent: StreamChatAnswerEvent,
): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async start(controller) {
      controller.enqueue(encodeStreamEvent(firstEvent));

      try {
        for await (const event of events) {
          controller.enqueue(
            encodeStreamEvent(
              isFailureEvent(event) ? toFailureStreamEvent(event) : event,
            ),
          );
        }
      } catch {
        controller.enqueue(
          encodeStreamEvent({
            type: "error",
            error: "Chat stream failed.",
          }),
        );
      } finally {
        controller.close();
      }
    },
  });
}

function encodeStreamEvent(event: ChatStreamEvent): Uint8Array {
  return encoder.encode(`${JSON.stringify(event)}\n`);
}

function isFailureEvent(
  event: StreamChatAnswerEvent | AnswerChatMessageFailure,
): event is AnswerChatMessageFailure {
  return "ok" in event && event.ok === false;
}

function toFailureStreamEvent(result: AnswerChatMessageFailure): ChatStreamEvent {
  if (result.reason === "chat_not_found") {
    return {
      type: "error",
      error: "Chat not found.",
      reason: result.reason,
    };
  }

  if (
    result.reason === "document_not_found" ||
    result.reason === "document_not_ready"
  ) {
    return {
      type: "error",
      error: "Document scope is not available.",
      reason: result.reason,
      documentId: result.documentId,
    };
  }

  if (
    result.reason === "invalid_chat_request" ||
    result.reason === "empty_document_scope"
  ) {
    return {
      type: "error",
      error: "Invalid chat request.",
      reason: result.reason,
    };
  }

  return {
    type: "error",
    error: "No evidence was found for this question.",
    reason: result.reason,
  };
}
