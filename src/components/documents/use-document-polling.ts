"use client";

import { useEffect } from "react";

import { getClientDocumentStatus, type DocumentStatusResponse } from "@/lib/client/documents";

const pollingIntervalMs = 2500;

export type DocumentPollingResult =
  | {
      ok: true;
      documentId: string;
      document: DocumentStatusResponse["document"];
    }
  | {
      ok: false;
      documentId: string;
      error: unknown;
    };

export function useDocumentPolling(params: {
  documentIds: string[];
  onResults: (results: DocumentPollingResult[]) => void;
}) {
  useEffect(() => {
    if (params.documentIds.length === 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void pollDocumentStatuses(params.documentIds).then(params.onResults);
    }, pollingIntervalMs);

    return () => window.clearInterval(intervalId);
  }, [params.documentIds, params.onResults]);
}

async function pollDocumentStatuses(
  documentIds: string[],
): Promise<DocumentPollingResult[]> {
  return Promise.all(documentIds.map((documentId) => pollDocumentStatus(documentId)));
}

async function pollDocumentStatus(
  documentId: string,
): Promise<DocumentPollingResult> {
  try {
    return {
      ok: true,
      documentId,
      document: await getClientDocumentStatus(documentId),
    };
  } catch (error) {
    return {
      ok: false,
      documentId,
      error,
    };
  }
}
