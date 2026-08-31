import { ClientDocumentApiError, type ClientDocument, type UploadProgress } from "@/lib/client/documents";

export type DocumentLibraryItem = ClientDocument & {
  isUploading?: boolean;
  uploadProgress?: UploadProgress;
  pendingAction?: DocumentPendingAction;
  actionError?: string;
};

export type DocumentPendingAction = "process" | "cancel" | "delete";

export function mergeDocuments(
  currentDocuments: DocumentLibraryItem[],
  nextDocuments: ClientDocument[],
): DocumentLibraryItem[] {
  const documentMap = new Map<string, DocumentLibraryItem>();

  for (const document of currentDocuments) {
    documentMap.set(document.id, document);
  }

  for (const document of nextDocuments) {
    documentMap.set(
      document.id,
      mergeDocument(documentMap.get(document.id), document),
    );
  }

  return [...documentMap.values()].sort(compareDocuments);
}

export function mergeDocument(
  currentDocument: DocumentLibraryItem | undefined,
  nextDocument: ClientDocument,
): DocumentLibraryItem {
  return {
    ...currentDocument,
    ...nextDocument,
    error: nextDocument.error,
    isUploading: false,
    uploadProgress: undefined,
    actionError: undefined,
  };
}

export function setDocumentActionError(
  documents: DocumentLibraryItem[],
  documentId: string,
  message?: string,
): DocumentLibraryItem[] {
  return documents.map((document) =>
    document.id === documentId
      ? {
          ...document,
          actionError: message,
        }
      : document,
  );
}

export function withPendingActions(
  documents: DocumentLibraryItem[],
  pendingActions: Map<string, DocumentPendingAction>,
): DocumentLibraryItem[] {
  return documents.map((document) => ({
    ...document,
    pendingAction: pendingActions.get(document.id),
  }));
}

export function getReadyDocuments(
  documents: DocumentLibraryItem[],
): DocumentLibraryItem[] {
  return documents.filter((document) => document.status === "ready");
}

export function getActiveDocuments(
  documents: DocumentLibraryItem[],
): DocumentLibraryItem[] {
  return documents.filter(
    (document) =>
      document.status === "pending_upload" || document.status === "processing",
  );
}

export function shouldPollDocument(document: DocumentLibraryItem): boolean {
  return (
    document.status === "pending_upload" ||
    document.status === "processing" ||
    document.nextAction.type === "wait"
  );
}

export function buildLocalUploadingDocument(
  id: string,
  file: File,
): DocumentLibraryItem {
  const now = new Date().toISOString();

  return {
    id,
    name: file.name,
    sizeBytes: file.size,
    status: "pending_upload",
    nextAction: {
      type: "upload",
    },
    updatedAt: now,
    createdAt: now,
    isUploading: true,
    uploadProgress: {
      loaded: 0,
      total: file.size,
      percentage: 0,
    },
  };
}

export function isPdfUploadFile(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

export function handlePollingFailure(
  documents: DocumentLibraryItem[],
  documentId: string,
  error: unknown,
): DocumentLibraryItem[] {
  if (error instanceof ClientDocumentApiError && error.status === 404) {
    return documents.filter((document) => document.id !== documentId);
  }

  return documents;
}

export function getClientErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Action document impossible.";
}

function compareDocuments(
  firstDocument: DocumentLibraryItem,
  secondDocument: DocumentLibraryItem,
): number {
  return (
    Date.parse(secondDocument.updatedAt) - Date.parse(firstDocument.updatedAt)
  );
}
