import type { DocumentLibraryItem } from "@/components/documents/use-document-library";

export type ChatUiState = {
  activeChatId: string | null;
  isAnswering: boolean;
  composerText: string;
  selectedDocumentIds: string[];
};

export type SendAvailability = {
  canSend: boolean;
  reason?: string;
};

export const examplePrompts = [
  "Resume les points essentiels de ce document.",
  "Quelles obligations importantes dois-je retenir ?",
  "Liste les risques ou clauses a verifier.",
] as const;

export function canSendMessage(params: {
  activeChatId: string | null;
  isAnswering: boolean;
  text: string;
  selectedDocuments: DocumentLibraryItem[];
}): SendAvailability {
  if (params.isAnswering) {
    return {
      canSend: false,
      reason: "Une reponse est deja en cours.",
    };
  }

  if (!params.text.trim()) {
    return {
      canSend: false,
      reason: "Ecrivez un message pour envoyer.",
    };
  }

  if (params.selectedDocuments.some((document) => document.status !== "ready")) {
    return {
      canSend: false,
      reason: "Attendez que les documents selectionnes soient prets.",
    };
  }

  if (!params.activeChatId && params.selectedDocuments.length === 0) {
    return {
      canSend: false,
      reason: "Selectionnez au moins un document pret.",
    };
  }

  return { canSend: true };
}

export function toggleSelectedDocumentId(
  selectedDocumentIds: string[],
  documentId: string,
): string[] {
  if (selectedDocumentIds.includes(documentId)) {
    return selectedDocumentIds.filter((selectedId) => selectedId !== documentId);
  }

  return [...selectedDocumentIds, documentId];
}

export function removeMissingDocumentIds(params: {
  selectedDocumentIds: string[];
  documents: DocumentLibraryItem[];
}): string[] {
  const documentIds = new Set(params.documents.map((document) => document.id));

  return params.selectedDocumentIds.filter((documentId) =>
    documentIds.has(documentId),
  );
}

export function getSelectedDocuments(params: {
  selectedDocumentIds: string[];
  documents: DocumentLibraryItem[];
}): DocumentLibraryItem[] {
  const selectedIds = new Set(params.selectedDocumentIds);

  return params.documents.filter((document) => selectedIds.has(document.id));
}

export function getDocumentsByIds(params: {
  documentIds: string[];
  documents: DocumentLibraryItem[];
}): DocumentLibraryItem[] {
  const documentsById = new Map(
    params.documents.map((document) => [document.id, document]),
  );

  return params.documentIds.flatMap((documentId) => {
    const document = documentsById.get(documentId);

    return document ? [document] : [];
  });
}

export function getMentionableDocuments(
  documents: DocumentLibraryItem[],
): DocumentLibraryItem[] {
  return documents
    .filter((document) => document.status === "ready")
    .sort((firstDocument, secondDocument) =>
      firstDocument.name.localeCompare(secondDocument.name),
    );
}
