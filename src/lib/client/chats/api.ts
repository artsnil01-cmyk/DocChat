"use client";

import type {
  ClientChatDetail,
  ClientChatSummary,
  SendClientChatMessageRequest,
  SendClientChatMessageResponse,
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

export async function sendClientChatMessage(
  request: SendClientChatMessageRequest,
): Promise<SendClientChatMessageResponse> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  return readApiResponse<SendClientChatMessageResponse>(response);
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
