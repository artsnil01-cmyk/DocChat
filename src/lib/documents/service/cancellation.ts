import "server-only";

import type { ObjectId } from "mongodb";

import { documentsCollection } from "@/lib/db/collections";
import { getWorkspaceDocumentRecord } from "@/lib/documents/service/queries";
import { toDocumentView, type DocumentView } from "@/lib/documents/service/views";

export type RequestDocumentProcessingCancelResult =
  | {
      ok: true;
      requested: boolean;
      document: DocumentView;
    }
  | {
      ok: false;
      reason: "not_found";
    };

export async function requestDocumentProcessingCancel(params: {
  workspaceId: string;
  documentId: ObjectId;
}): Promise<RequestDocumentProcessingCancelResult> {
  const document = await getWorkspaceDocumentRecord(params);

  if (!document) {
    return { ok: false, reason: "not_found" };
  }

  if (document.status !== "processing") {
    return {
      ok: true,
      requested: false,
      document: toDocumentView(document),
    };
  }

  const documents = await documentsCollection();
  const updatedDocument = await documents.findOneAndUpdate(
    {
      _id: params.documentId,
      workspaceId: params.workspaceId,
      status: "processing",
    },
    {
      $set: {
        cancelRequestedAt: new Date(),
        updatedAt: new Date(),
      },
    },
    {
      returnDocument: "after",
    },
  );

  return {
    ok: true,
    requested: true,
    document: toDocumentView(updatedDocument ?? document),
  };
}

export async function isDocumentProcessingCancelRequested(params: {
  workspaceId: string;
  documentId: ObjectId;
}): Promise<boolean> {
  const document = await getWorkspaceDocumentRecord(params);

  return Boolean(document?.cancelRequestedAt);
}
