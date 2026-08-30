import type { Document } from "@/models/document";

export type DocumentView = {
  id: string;
  workspaceId: string;
  name: string;
  contentHash: string;
  blobPathname?: string;
  sizeBytes: number;
  pageCount?: number;
  status: Document["status"];
  stage?: Document["stage"];
  progress?: number;
  error?: Document["error"];
  createdAt: string;
  updatedAt: string;
};

export function toDocumentView(document: Document): DocumentView {
  return {
    id: document._id.toHexString(),
    workspaceId: document.workspaceId,
    name: document.name,
    contentHash: document.contentHash,
    blobPathname: document.blobPathname,
    sizeBytes: document.sizeBytes,
    pageCount: document.pageCount,
    status: document.status,
    stage: document.stage,
    progress: document.progress,
    error: document.error,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}
