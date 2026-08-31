import "server-only";

import { ObjectId } from "mongodb";

import { getWorkspaceChatRecord } from "@/lib/chat/service";
import { listWorkspaceDocumentRecordsByIds } from "@/lib/documents/service/queries";
import type { Chat } from "@/models/chat";
import type { Document } from "@/models/document";

export type RetrievalScopeResult =
  | {
      ok: true;
      chat: Chat;
      question: string;
      documentIds: ObjectId[];
      documents: Document[];
    }
  | {
      ok: false;
      reason:
        | "chat_not_found"
        | "empty_document_scope"
        | "document_not_found"
        | "document_not_ready";
      documentId?: ObjectId;
    };

export async function resolveRetrievalScope(params: {
  workspaceId: string;
  chatId: ObjectId;
  question: string;
  documentIds?: ObjectId[];
}): Promise<RetrievalScopeResult> {
  const chat = await getWorkspaceChatRecord({
    workspaceId: params.workspaceId,
    chatId: params.chatId,
  });

  if (!chat) {
    return { ok: false, reason: "chat_not_found" };
  }

  const documentIds = uniqueObjectIds(params.documentIds ?? chat.documentIds);

  if (documentIds.length === 0) {
    return { ok: false, reason: "empty_document_scope" };
  }

  const documents = await listWorkspaceDocumentRecordsByIds({
    workspaceId: params.workspaceId,
    documentIds,
  });
  const documentById = new Map(
    documents.map((document) => [document._id.toHexString(), document]),
  );
  const orderedDocuments: Document[] = [];

  for (const documentId of documentIds) {
    const document = documentById.get(documentId.toHexString());

    if (!document) {
      return {
        ok: false,
        reason: "document_not_found",
        documentId,
      };
    }

    if (document.status !== "ready") {
      return {
        ok: false,
        reason: "document_not_ready",
        documentId,
      };
    }

    orderedDocuments.push(document);
  }

  return {
    ok: true,
    chat,
    question: params.question,
    documentIds,
    documents: orderedDocuments,
  };
}

function uniqueObjectIds(documentIds: ObjectId[]): ObjectId[] {
  const seen = new Set<string>();

  return documentIds.filter((documentId) => {
    const value = documentId.toHexString();

    if (seen.has(value)) {
      return false;
    }

    seen.add(value);
    return true;
  });
}
