import type { ObjectId } from "mongodb";

export type DocumentStatus =
  | "pending_upload"
  | "processing"
  | "ready"
  | "failed";

export type DocumentStage = "reading" | "preparing" | "indexing";

export type DocumentError = {
  code: string;
  message: string;
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
  createdAt: Date;
  updatedAt: Date;
};
