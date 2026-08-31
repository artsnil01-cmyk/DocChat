export type ClientDocumentStatus =
  | "pending_upload"
  | "processing"
  | "ready"
  | "failed"
  | "cancelled";

export type ClientDocumentStage = "reading" | "embedding" | "indexing";

export type ClientDocumentNextAction =
  | {
      type: "upload";
    }
  | {
      type: "process";
    }
  | {
      type: "wait";
    }
  | {
      type: "none";
    };

export type ClientDocumentError = {
  code: string;
  message: string;
};

export type ClientDocument = {
  id: string;
  workspaceId?: string;
  name: string;
  contentHash?: string;
  blobPathname?: string;
  sizeBytes?: number;
  pageCount?: number;
  status: ClientDocumentStatus;
  stage?: ClientDocumentStage;
  progress?: number;
  error?: ClientDocumentError;
  cancelRequestedAt?: string;
  nextAction: ClientDocumentNextAction;
  createdAt?: string;
  updatedAt: string;
};

export type DocumentUploadInstructions = {
  pathname: string;
  handleUploadUrl: "/api/documents/blob";
};

export type UploadPreflightResponse = {
  document: ClientDocument;
  duplicate: boolean;
  requiresUpload: boolean;
  upload?: DocumentUploadInstructions;
};

export type ProcessDocumentResponse = {
  state: "processing_started" | "upload_required" | "already_processing" | "ready";
  document: ClientDocument;
};

export type CancelDocumentProcessingResponse = {
  requested: boolean;
  document: ClientDocument;
};

export type DocumentStatusResponse = {
  document: Pick<
    ClientDocument,
    | "id"
    | "name"
    | "status"
    | "stage"
    | "progress"
    | "error"
    | "nextAction"
    | "updatedAt"
  >;
};

export type UploadDocumentFileResult = UploadPreflightResponse & {
  uploaded: boolean;
};

export type UploadProgress = {
  loaded: number;
  total: number;
  percentage: number;
};
