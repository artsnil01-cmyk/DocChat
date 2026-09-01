"use client";

import type {
  ClientChatDetail,
  ClientChatStreamEvent,
  ClientChatSummary,
  SendClientChatMessageRequest,
} from "@/lib/client/chats/types";

type ApiErrorPayload = {
  error?: string;
  reason?: string;
};

export class ClientChatApiError extends Error {
  readonly status: number;
  readonly reason?: string;

  constructor(params: { message: string; status: number; reason?: string }) {
    super(params.message);
    this.name = "ClientChatApiError";
    this.status = params.status;
    this.reason = params.reason;
  }
}

export async function listClientChats(): Promise<ClientChatSummary[]> {
  const response = await fetch("/api/chats", {
    method: "GET",
  });
  const body = await readApiResponse<{ chats: ClientChatSummary[] }>(response);

  return body.chats;
}

export async function getClientChat(
  chatId: string,
): Promise<ClientChatDetail> {
  const response = await fetch(`/api/chats/${chatId}`, {
    method: "GET",
  });
  const body = await readApiResponse<{ chat: ClientChatDetail }>(response);

  return body.chat;
}

export async function* streamClientChatMessage(
  request: SendClientChatMessageRequest,
): AsyncGenerator<ClientChatStreamEvent> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    await readApiResponse(response);
    return;
  }

  if (!response.body) {
    throw new ClientChatApiError({
      message: "Chat stream is not available.",
      status: response.status,
    });
  }

  yield* parseNdjsonStream(response.body);
}

export async function deleteClientChat(chatId: string): Promise<void> {
  const response = await fetch(`/api/chats/${chatId}`, {
    method: "DELETE",
  });

  await readApiResponse<{ ok: true }>(response);
}

async function readApiResponse<TValue>(response: Response): Promise<TValue> {
  const body = await readResponseBody(response);

  if (!response.ok) {
    const errorPayload = getApiErrorPayload(body);

    throw new ClientChatApiError({
      message: errorPayload.error ?? "Chat request failed.",
      status: response.status,
      reason: errorPayload.reason,
    });
  }

  return body as TValue;
}

async function readResponseBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function getApiErrorPayload(body: unknown): ApiErrorPayload {
  if (!body || typeof body !== "object") {
    return {};
  }

  const payload = body as Record<string, unknown>;

  return {
    error: typeof payload.error === "string" ? payload.error : undefined,
    reason: typeof payload.reason === "string" ? payload.reason : undefined,
  };
}

async function* parseNdjsonStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<ClientChatStreamEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const event = parseChatStreamLine(line);

        if (event) {
          yield event;
        }
      }
    }

    buffer += decoder.decode();
    const event = parseChatStreamLine(buffer);

    if (event) {
      yield event;
    }
  } finally {
    reader.releaseLock();
  }
}

function parseChatStreamLine(line: string): ClientChatStreamEvent | null {
  const value = line.trim();

  if (!value) {
    return null;
  }

  return JSON.parse(value) as ClientChatStreamEvent;
}
