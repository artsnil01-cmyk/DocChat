import type { DocumentLibraryItem, DocumentPendingAction } from "./use-document-library";

export type DocumentRowAction = "process" | "cancel" | "delete";

export type DocumentStatusView = {
  label: string;
  stageLabel: string;
  step: string;
  progress: number;
  meta: string[];
  rowClass: "stateReady" | "stateProcessing" | "statePending" | "stateFailed" | "stateCancelled";
  dotClass: "dotReady" | "dotProcessing" | "dotPending" | "dotFailed" | "dotCancelled";
  textClass: "textReady" | "textProcessing" | "textPending" | "textFailed" | "textCancelled";
  error?: string;
  actions: DocumentRowAction[];
  pendingAction?: DocumentPendingAction;
  showsProgress: boolean;
};

export function getDocumentStatusView(document: DocumentLibraryItem): DocumentStatusView {
  const baseView = getBaseStatusView(document);
  const actions = getDocumentActions(document);

  return {
    ...baseView,
    meta: getDocumentMeta(document),
    error: getDocumentErrorMessage(document),
    actions,
    pendingAction: document.pendingAction,
    showsProgress: document.isUploading || document.status === "processing",
  };
}

export function formatFileSize(sizeBytes: number): string {
  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
  }

  return `${Math.max(1, Math.round(sizeBytes / 1024))} Ko`;
}

function getBaseStatusView(document: DocumentLibraryItem) {
  if (document.isUploading) {
    return {
      label: "Envoi",
      stageLabel: "Transfert du fichier",
      step: "1/3",
      progress: document.uploadProgress?.percentage ?? 0,
      rowClass: "statePending",
      dotClass: "dotPending",
      textClass: "textPending",
    } as const;
  }

  if (isPendingUploadAwaitingConfirmation(document)) {
    return {
      label: "Envoi en cours",
      stageLabel: "Confirmation de l'envoi",
      step: "1/3",
      progress: 100,
      rowClass: "statePending",
      dotClass: "dotProcessing",
      textClass: "textProcessing",
    } as const;
  }

  if (document.status === "ready") {
    return {
      label: "Pret",
      stageLabel: "",
      step: "",
      progress: 100,
      rowClass: "stateReady",
      dotClass: "dotReady",
      textClass: "textReady",
    } as const;
  }

  if (document.status === "processing") {
    const stage = getStageView(document.stage);

    return {
      label: "Traitement",
      stageLabel: stage.label,
      step: stage.step,
      progress: document.progress ?? stage.progress,
      rowClass: "stateProcessing",
      dotClass: "dotProcessing",
      textClass: "textProcessing",
    } as const;
  }

  if (document.status === "failed") {
    return {
      label: document.nextAction.type === "upload" ? "Envoi incomplet" : "Echec du traitement",
      stageLabel: "",
      step: "",
      progress: 0,
      rowClass: "stateFailed",
      dotClass: "dotFailed",
      textClass: "textFailed",
    } as const;
  }

  if (document.status === "cancelled") {
    return {
      label: "Annule",
      stageLabel: "",
      step: "",
      progress: 0,
      rowClass: "stateCancelled",
      dotClass: "dotCancelled",
      textClass: "textCancelled",
    } as const;
  }

  return {
    label: "Envoi incomplet",
    stageLabel: "",
    step: "",
    progress: 0,
    rowClass: "statePending",
    dotClass: "dotPending",
    textClass: "textPending",
  } as const;
}

function getDocumentActions(document: DocumentLibraryItem): DocumentRowAction[] {
  if (document.isUploading || document.pendingAction) {
    return [];
  }

  if (document.status === "processing") {
    return ["cancel"];
  }

  if (document.status === "ready") {
    return ["delete"];
  }

  if (document.status === "failed" || document.status === "cancelled") {
    return document.nextAction.type === "process"
      ? ["process", "delete"]
      : ["delete"];
  }

  if (document.status === "pending_upload") {
    return [];
  }

  return [];
}

function getDocumentMeta(document: DocumentLibraryItem): string[] {
  return [
    document.pageCount ? `${document.pageCount} pages` : undefined,
    document.sizeBytes ? formatFileSize(document.sizeBytes) : undefined,
  ].filter((item): item is string => Boolean(item));
}

function getDocumentErrorMessage(document: DocumentLibraryItem): string | undefined {
  if (document.isUploading || isPendingUploadAwaitingConfirmation(document)) {
    return undefined;
  }

  if (document.status === "failed" && document.nextAction.type === "upload") {
    return "L'envoi n'a pas ete finalise. Supprimez ce document puis reimportez-le.";
  }

  return document.error?.message;
}

function isPendingUploadAwaitingConfirmation(
  document: DocumentLibraryItem,
): boolean {
  return (
    document.status === "pending_upload" &&
    Boolean(document.uploadExpiresAt)
  );
}

function getStageView(stage: DocumentLibraryItem["stage"]) {
  if (stage === "embedding") {
    return {
      label: "Vectorisation",
      step: "2/3",
      progress: 66,
    };
  }

  if (stage === "indexing") {
    return {
      label: "Indexation",
      step: "3/3",
      progress: 88,
    };
  }

  return {
    label: "Lecture du PDF",
    step: "1/3",
    progress: 28,
  };
}
