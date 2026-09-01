"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { documentConfig } from "@/config/documents";
import { listClientDocuments, type ClientDocument } from "@/lib/client/documents";
import {
  cancelLibraryDocumentProcessing,
  deleteLibraryDocument,
  processLibraryDocument,
  uploadLibraryDocument,
} from "./document-library-actions";
import {
  buildLocalUploadingDocument,
  getActiveDocuments,
  getClientErrorMessage,
  getReadyDocuments,
  handlePollingFailure,
  isPdfUploadFile,
  mergeDocument,
  mergeDocuments,
  setDocumentActionError as setDocumentActionErrorOnList,
  shouldPollDocument,
  withPendingActions,
  type DocumentLibraryItem,
  type DocumentPendingAction,
} from "./document-library-state";
import { useDocumentPolling, type DocumentPollingResult } from "./use-document-polling";

export type { DocumentLibraryItem, DocumentPendingAction };

type DocumentActionState = {
  loading: boolean;
  refreshing: boolean;
  uploading: boolean;
  error?: string;
  notice?: string;
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
  const [pendingActions, setPendingActions] = useState(
    () => new Map<string, DocumentPendingAction>(),
  );
  const [state, setState] = useState<DocumentActionState>({
    loading: true,
    refreshing: false,
    uploading: false,
  });
  const uploadAbortControllers = useRef(new Map<string, AbortController>());
  const noticeTimeoutRef = useRef<number | undefined>(undefined);

  const setDocumentActionError = useCallback(
    (documentId: string, message?: string) => {
      setDocuments((currentDocuments) =>
        setDocumentActionErrorOnList(currentDocuments, documentId, message),
      );
    },
    [],
  );

  const setDocumentPendingAction = useCallback(
    (documentId: string, pendingAction?: DocumentPendingAction) => {
      setPendingActions((currentActions) => {
        const nextActions = new Map(currentActions);

        if (pendingAction) {
          nextActions.set(documentId, pendingAction);
        } else {
          nextActions.delete(documentId);
        }

        return nextActions;
      });
    },
    [],
  );

  const runDocumentAction = useCallback(
    async (
      documentId: string,
      pendingAction: DocumentPendingAction,
      action: () => Promise<ClientDocument>,
    ): Promise<void> => {
      setDocumentPendingAction(documentId, pendingAction);
      setDocumentActionError(documentId);

      try {
        const document = await action();
        setDocuments((currentDocuments) =>
          mergeDocuments(currentDocuments, [document]),
        );
      } catch (error) {
        setDocumentActionError(documentId, getClientErrorMessage(error));
      } finally {
        setDocumentPendingAction(documentId);
      }
    },
    [setDocumentActionError, setDocumentPendingAction],
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
      await runDocumentAction(documentId, "process", () =>
        processLibraryDocument(documentId),
      );
    },
    [runDocumentAction],
  );

  const uploadDocument = useCallback(async ({ file }: UploadDocumentParams) => {
    if (!isPdfUploadFile(file)) {
      showNotice("Seuls les fichiers PDF sont acceptes.");
      return;
    }

    if (file.size > documentConfig.maxPdfSizeBytes) {
      showNotice("Le fichier depasse la limite de 10 Mo.");
      return;
    }

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
      const result = await uploadLibraryDocument({
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

      if (result.duplicate && !result.uploaded) {
        showNotice(`Ce document existe deja : ${result.document.name}`);
      }
    } catch (error) {
      const message = getClientErrorMessage(error);
      setDocuments((currentDocuments) =>
        currentDocuments.filter((document) => document.id !== localId),
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
  }, []);

  const cancelProcessing = useCallback(async (documentId: string) => {
    await runDocumentAction(documentId, "cancel", () =>
      cancelLibraryDocumentProcessing(documentId),
    );
  }, [runDocumentAction]);

  const removeDocument = useCallback(async (documentId: string) => {
    setDocumentPendingAction(documentId, "delete");
    setDocumentActionError(documentId);

    try {
      await deleteLibraryDocument(documentId);
      setDocuments((currentDocuments) =>
        currentDocuments.filter((document) => document.id !== documentId),
      );
    } catch (error) {
      setDocumentActionError(documentId, getClientErrorMessage(error));
    } finally {
      setDocumentPendingAction(documentId);
    }
  }, [setDocumentActionError, setDocumentPendingAction]);

  const pollableDocumentIds = useMemo(
    () =>
      documents
        .filter((document) => shouldPollDocument(document))
        .map((document) => document.id),
    [documents],
  );

  const documentsWithPendingActions = useMemo(
    () => withPendingActions(documents, pendingActions),
    [documents, pendingActions],
  );

  const readyDocuments = useMemo(
    () => getReadyDocuments(documentsWithPendingActions),
    [documentsWithPendingActions],
  );

  const activeDocuments = useMemo(
    () => getActiveDocuments(documentsWithPendingActions),
    [documentsWithPendingActions],
  );

  useEffect(() => {
    void refreshDocuments();
  }, [refreshDocuments]);

  const handlePollingResults = useCallback((results: DocumentPollingResult[]) => {
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
  }, []);

  useDocumentPolling({
    documentIds: pollableDocumentIds,
    onResults: handlePollingResults,
  });

  useEffect(() => {
    return () => {
      if (noticeTimeoutRef.current) {
        window.clearTimeout(noticeTimeoutRef.current);
      }
    };
  }, []);

  function showNotice(message: string): void {
    if (noticeTimeoutRef.current) {
      window.clearTimeout(noticeTimeoutRef.current);
    }

    setState((currentState) => ({
      ...currentState,
      notice: message,
    }));

    noticeTimeoutRef.current = window.setTimeout(() => {
      setState((currentState) => ({
        ...currentState,
        notice: undefined,
      }));
      noticeTimeoutRef.current = undefined;
    }, 4200);
  }

  return {
    ...state,
    documents: documentsWithPendingActions,
    readyDocuments,
    activeDocuments,
    refreshDocuments,
    uploadDocument,
    processDocument,
    cancelProcessing,
    deleteDocument: removeDocument,
  };
}
