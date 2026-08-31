"use client";

import { upload } from "@vercel/blob/client";

import { hashFileSha256 } from "@/lib/client/documents/hash";
import type {
  CancelDocumentProcessingResponse,
  ClientDocument,
  DocumentStatusResponse,
  ProcessDocumentResponse,
  UploadDocumentFileResult,
  UploadPreflightResponse,
  UploadProgress,
} from "@/lib/client/documents/types";

type ApiErrorPayload = {
  error?: string;
  reason?: string;
};

export class ClientDocumentApiError extends Error {
  readonly status: number;
  readonly reason?: string;

  constructor(params: { message: string; status: number; reason?: string }) {
    super(params.message);
    this.name = "ClientDocumentApiError";
    this.status = params.status;
    this.reason = params.reason;
  }
}

export async function listClientDocuments(): Promise<ClientDocument[]> {
  const response = await fetch("/api/documents", {
    method: "GET",
  });
  const body = await readApiResponse<{ documents: ClientDocument[] }>(response);

  return body.documents;
}

export async function preflightClientDocumentUpload(params: {
  file: File;
  contentHash: string;
}): Promise<UploadPreflightResponse> {
  const response = await fetch("/api/documents", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: params.file.name,
      mimeType: params.file.type || "application/pdf",
      sizeBytes: params.file.size,
      contentHash: params.contentHash,
    }),
  });

  return readApiResponse<UploadPreflightResponse>(response);
}

export async function uploadClientDocumentFile(params: {
  file: File;
  abortSignal?: AbortSignal;
  onUploadProgress?: (progress: UploadProgress) => void;
}): Promise<UploadDocumentFileResult> {
  const contentHash = await hashFileSha256(params.file);
  const preflight = await preflightClientDocumentUpload({
    file: params.file,
    contentHash,
  });

  if (!preflight.requiresUpload || !preflight.upload) {
    return {
      ...preflight,
      uploaded: false,
    };
  }

  await upload(preflight.upload.pathname, params.file, {
    access: "private",
    contentType: params.file.type || "application/pdf",
    handleUploadUrl: preflight.upload.handleUploadUrl,
    clientPayload: JSON.stringify({
      documentId: preflight.document.id,
    }),
    multipart: true,
    abortSignal: params.abortSignal,
    onUploadProgress: params.onUploadProgress,
  });

  return {
    ...preflight,
    uploaded: true,
  };
}

export async function processClientDocument(
  documentId: string,
): Promise<ProcessDocumentResponse> {
  const response = await fetch(`/api/documents/${documentId}/process`, {
    method: "POST",
  });

  return readApiResponse<ProcessDocumentResponse>(response);
}

export async function cancelClientDocumentProcessing(
  documentId: string,
): Promise<CancelDocumentProcessingResponse> {
  const response = await fetch(`/api/documents/${documentId}/cancel`, {
    method: "POST",
  });

  return readApiResponse<CancelDocumentProcessingResponse>(response);
}

export async function deleteClientDocument(documentId: string): Promise<void> {
  const response = await fetch(`/api/documents/${documentId}`, {
    method: "DELETE",
  });

  await readApiResponse<{ ok: true }>(response);
}

export async function getClientDocumentStatus(
  documentId: string,
): Promise<DocumentStatusResponse["document"]> {
  const response = await fetch(`/api/documents/${documentId}/status`, {
    method: "GET",
  });
  const body = await readApiResponse<DocumentStatusResponse>(response);

  return body.document;
}

async function readApiResponse<TValue>(response: Response): Promise<TValue> {
  const body = await readResponseBody(response);

  if (!response.ok) {
    const errorPayload = getApiErrorPayload(body);

    throw new ClientDocumentApiError({
      message: errorPayload.error ?? "Document request failed.",
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
