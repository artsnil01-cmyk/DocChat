import type { ObjectId } from "mongodb";

export type DocumentStatus =
  | "pending_upload"
  | "processing"
  | "ready"
  | "failed"
  | "cancelled";

export type DocumentStage =
  | "reading"
  | "embedding"
  | "indexing";

export type DocumentError = {
  code: string;
  message: string;
};

export type DocumentProcessingLock = {
  token: string;
  expiresAt: Date;
};

export type Document = {
  _id: ObjectId;
  workspaceId: string;
  name: string;
  contentHash: string;
  blobPathname?: string;
  sizeBytes: number;
  pageCount?: number;
  status: DocumentStatus;
  stage?: DocumentStage;
  progress?: number;
  error?: DocumentError;
  uploadExpiresAt?: Date;
  processingLock?: DocumentProcessingLock;
  cancelRequestedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};
