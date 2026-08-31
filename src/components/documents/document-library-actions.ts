"use client";

import {
  cancelClientDocumentProcessing,
  deleteClientDocument,
  processClientDocument,
  uploadClientDocumentFile,
  type ClientDocument,
  type UploadDocumentFileResult,
  type UploadProgress,
} from "@/lib/client/documents";

export async function processLibraryDocument(
  documentId: string,
): Promise<ClientDocument> {
  const response = await processClientDocument(documentId);

  return response.document;
}

export async function cancelLibraryDocumentProcessing(
  documentId: string,
): Promise<ClientDocument> {
  const response = await cancelClientDocumentProcessing(documentId);

  return response.document;
}

export async function deleteLibraryDocument(documentId: string): Promise<void> {
  await deleteClientDocument(documentId);
}

export async function uploadLibraryDocument(params: {
  file: File;
  abortSignal?: AbortSignal;
  onUploadProgress?: (progress: UploadProgress) => void;
}): Promise<UploadDocumentFileResult> {
  return uploadClientDocumentFile(params);
}
