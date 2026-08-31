"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  cancelClientDocumentProcessing,
  ClientDocumentApiError,
  deleteClientDocument,
  getClientDocumentStatus,
  listClientDocuments,
  processClientDocument,
  uploadClientDocumentFile,
  type ClientDocument,
  type UploadProgress,
} from "@/lib/client/documents";

const pollingIntervalMs = 2500;
const processAfterUploadAttempts = 6;
const processAfterUploadDelayMs = 1000;

export type DocumentLibraryItem = ClientDocument & {
  isUploading?: boolean;
  uploadProgress?: UploadProgress;
  actionError?: string;
};

type DocumentActionState = {
  loading: boolean;
  refreshing: boolean;
  uploading: boolean;
  error?: string;
};

type UploadDocumentParams = {
  file: File;
};

type UseDocumentLibraryResult = DocumentActionState & {
  documents: DocumentLibraryItem[];
  readyDocuments: DocumentLibraryItem[];
  activeDocuments: DocumentLibraryItem[];
  refreshDocuments: () => Promise<void>;
  uploadDocument: (params: UploadDocumentParams) => Promise<void>;
  processDocument: (documentId: string) => Promise<void>;
  cancelProcessing: (documentId: string) => Promise<void>;
  deleteDocument: (documentId: string) => Promise<void>;
};

export function useDocumentLibrary(): UseDocumentLibraryResult {
  const [documents, setDocuments] = useState<DocumentLibraryItem[]>([]);
  const [state, setState] = useState<DocumentActionState>({
    loading: true,
    refreshing: false,
    uploading: false,
  });
  const uploadAbortControllers = useRef(new Map<string, AbortController>());

  const setDocumentActionError = useCallback(
    (documentId: string, message?: string) => {
      setDocuments((currentDocuments) =>
        currentDocuments.map((document) =>
          document.id === documentId
            ? {
                ...document,
                actionError: message,
              }
            : document,
        ),
      );
    },
    [],
  );

  const runDocumentAction = useCallback(
    async (
      documentId: string,
      action: () => Promise<ClientDocument>,
    ): Promise<void> => {
      setDocumentActionError(documentId);

      try {
        const document = await action();
        setDocuments((currentDocuments) =>
          mergeDocuments(currentDocuments, [document]),
        );
      } catch (error) {
        setDocumentActionError(documentId, getClientErrorMessage(error));
      }
    },
    [setDocumentActionError],
  );

  const refreshDocuments = useCallback(async () => {
    setState((currentState) => ({
      ...currentState,
      refreshing: true,
      error: undefined,
    }));

    try {
      const nextDocuments = await listClientDocuments();
      setDocuments((currentDocuments) =>
        mergeDocuments(currentDocuments, nextDocuments),
      );
    } catch (error) {
      setState((currentState) => ({
        ...currentState,
        error: getClientErrorMessage(error),
      }));
    } finally {
      setState((currentState) => ({
        ...currentState,
        loading: false,
        refreshing: false,
      }));
    }
  }, []);

  const processDocument = useCallback(
    async (documentId: string) => {
      await runDocumentAction(documentId, async () => {
        const response = await processClientDocument(documentId);

        return response.document;
      });
    },
    [runDocumentAction],
  );

  const startProcessingAfterUpload = useCallback(
    async (documentId: string) => {
      await runDocumentAction(documentId, async () => {
        let latestDocument: ClientDocument | undefined;

        for (let attempt = 0; attempt < processAfterUploadAttempts; attempt += 1) {
          const response = await processClientDocument(documentId);
          latestDocument = response.document;

          if (response.state !== "upload_required") {
            return response.document;
          }

          await wait(processAfterUploadDelayMs);
        }

        return latestDocument ?? (await processClientDocument(documentId)).document;
      });
    },
    [runDocumentAction],
  );

  const uploadDocument = useCallback(async ({ file }: UploadDocumentParams) => {
    const localId = `upload:${crypto.randomUUID()}`;
    const abortController = new AbortController();

    uploadAbortControllers.current.set(localId, abortController);
    setState((currentState) => ({
      ...currentState,
      uploading: true,
      error: undefined,
    }));
    setDocuments((currentDocuments) => [
      buildLocalUploadingDocument(localId, file),
      ...currentDocuments,
    ]);

    try {
      const result = await uploadClientDocumentFile({
        file,
        abortSignal: abortController.signal,
        onUploadProgress: (progress) => {
          setDocuments((currentDocuments) =>
            currentDocuments.map((document) =>
              document.id === localId
                ? {
                    ...document,
                    uploadProgress: progress,
                  }
                : document,
            ),
          );
        },
      });

      setDocuments((currentDocuments) =>
        mergeDocuments(
          currentDocuments.filter((document) => document.id !== localId),
          [result.document],
        ),
      );

      if (result.uploaded) {
        await startProcessingAfterUpload(result.document.id);
      } else if (result.document.nextAction.type === "process") {
        await processDocument(result.document.id);
      }
    } catch (error) {
      const message = getClientErrorMessage(error);
      setDocuments((currentDocuments) =>
        currentDocuments.map((document) =>
          document.id === localId
            ? {
                ...document,
                isUploading: false,
                status: "failed",
                actionError: message,
                error: {
                  code: "upload_failed",
                  message,
                },
                nextAction: {
                  type: "upload",
                },
              }
            : document,
        ),
      );
      setState((currentState) => ({
        ...currentState,
        error: message,
      }));
    } finally {
      uploadAbortControllers.current.delete(localId);
      setState((currentState) => ({
        ...currentState,
        uploading: false,
      }));
    }
  }, [processDocument, startProcessingAfterUpload]);

  const cancelProcessing = useCallback(async (documentId: string) => {
    await runDocumentAction(documentId, async () => {
      const response = await cancelClientDocumentProcessing(documentId);

      return response.document;
    });
  }, [runDocumentAction]);

  const removeDocument = useCallback(async (documentId: string) => {
    setDocumentActionError(documentId);

    try {
      await deleteClientDocument(documentId);
      setDocuments((currentDocuments) =>
        currentDocuments.filter((document) => document.id !== documentId),
      );
    } catch (error) {
      setDocumentActionError(documentId, getClientErrorMessage(error));
    }
  }, [setDocumentActionError]);

  const pollableDocumentIds = useMemo(
    () =>
      documents
        .filter((document) => shouldPollDocument(document))
        .map((document) => document.id),
    [documents],
  );

  const readyDocuments = useMemo(
    () => documents.filter((document) => document.status === "ready"),
    [documents],
  );

  const activeDocuments = useMemo(
    () =>
      documents.filter(
        (document) =>
          document.status === "pending_upload" ||
          document.status === "processing",
      ),
    [documents],
  );

  useEffect(() => {
    void refreshDocuments();
  }, [refreshDocuments]);

  useEffect(() => {
    if (pollableDocumentIds.length === 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void pollDocumentStatuses(pollableDocumentIds);
    }, pollingIntervalMs);

    return () => window.clearInterval(intervalId);
  }, [pollableDocumentIds]);

  async function pollDocumentStatuses(documentIds: string[]): Promise<void> {
    const results = await Promise.all(
      documentIds.map((documentId) => pollDocumentStatus(documentId)),
    );

    setDocuments((currentDocuments) =>
      results.reduce((nextDocuments, result) => {
        if (!result.ok) {
          return handlePollingFailure(nextDocuments, result.documentId, result.error);
        }

        return nextDocuments.map((document) =>
          document.id === result.documentId
            ? mergeDocument(document, result.document)
            : document,
        );
      }, currentDocuments),
    );
  }

  return {
    ...state,
    documents,
    readyDocuments,
    activeDocuments,
    refreshDocuments,
    uploadDocument,
    processDocument,
    cancelProcessing,
    deleteDocument: removeDocument,
  };
}

function mergeDocuments(
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

function mergeDocument(
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

function compareDocuments(
  firstDocument: DocumentLibraryItem,
  secondDocument: DocumentLibraryItem,
): number {
  return (
    Date.parse(secondDocument.updatedAt) - Date.parse(firstDocument.updatedAt)
  );
}

function shouldPollDocument(document: DocumentLibraryItem): boolean {
  return (
    document.status === "pending_upload" ||
    document.status === "processing" ||
    document.nextAction.type === "wait"
  );
}

function buildLocalUploadingDocument(
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

async function pollDocumentStatus(documentId: string): Promise<
  | {
      ok: true;
      documentId: string;
      document: Awaited<ReturnType<typeof getClientDocumentStatus>>;
    }
  | {
      ok: false;
      documentId: string;
      error: unknown;
    }
> {
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

function handlePollingFailure(
  documents: DocumentLibraryItem[],
  documentId: string,
  error: unknown,
): DocumentLibraryItem[] {
  if (error instanceof ClientDocumentApiError && error.status === 404) {
    return documents.filter((document) => document.id !== documentId);
  }

  return documents;
}

function getClientErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Action document impossible.";
}

function wait(durationMs: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, durationMs);
  });
}
