import "server-only";

import type { ObjectId } from "mongodb";

import { documentsCollection } from "@/lib/db/collections";
import { toDocumentView, type DocumentView } from "@/lib/documents/service/views";
import type { Document } from "@/models/document";

export async function listWorkspaceDocuments(
  workspaceId: string,
): Promise<DocumentView[]> {
  const documents = await documentsCollection();
  const workspaceDocuments = await documents
    .find({ workspaceId })
    .sort({ updatedAt: -1 })
    .toArray();

  return workspaceDocuments.map(toDocumentView);
}

export async function getWorkspaceDocument(params: {
  workspaceId: string;
  documentId: ObjectId;
}): Promise<DocumentView | null> {
  const document = await getWorkspaceDocumentRecord(params);

  return document ? toDocumentView(document) : null;
}

export async function getWorkspaceDocumentRecord(params: {
  workspaceId: string;
  documentId: ObjectId;
}): Promise<Document | null> {
  const documents = await documentsCollection();
  return documents.findOne({
    _id: params.documentId,
    workspaceId: params.workspaceId,
  });
}

export async function listWorkspaceDocumentRecordsByIds(params: {
  workspaceId: string;
  documentIds: ObjectId[];
}): Promise<Document[]> {
  if (params.documentIds.length === 0) {
    return [];
  }

  const documents = await documentsCollection();
  return documents
    .find({
      _id: { $in: params.documentIds },
      workspaceId: params.workspaceId,
    })
    .toArray();
}

export async function findWorkspaceDocumentByContentHash(params: {
  workspaceId: string;
  contentHash: string;
}): Promise<Document | null> {
  const documents = await documentsCollection();
  return documents.findOne({
    workspaceId: params.workspaceId,
    contentHash: params.contentHash,
  });
}
