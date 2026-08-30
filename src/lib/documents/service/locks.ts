import "server-only";

import { randomUUID } from "node:crypto";

import type { ObjectId } from "mongodb";

import { documentConfig } from "@/config/documents";
import { documentsCollection } from "@/lib/db/collections";
import { getWorkspaceDocumentRecord } from "@/lib/documents/service/queries";
import type { Document } from "@/models/document";

export type AcquiredDocumentProcessingLock = {
  token: string;
  expiresAt: Date;
  document: Document;
};

export type AcquireDocumentProcessingLockResult =
  | {
      ok: true;
      lock: AcquiredDocumentProcessingLock;
    }
  | {
      ok: false;
      reason: "not_found" | "not_processable" | "locked";
    };

export async function acquireDocumentProcessingLock(params: {
  workspaceId: string;
  documentId: ObjectId;
}): Promise<AcquireDocumentProcessingLockResult> {
  const document = await getWorkspaceDocumentRecord(params);

  if (!document) {
    return { ok: false, reason: "not_found" };
  }

  if (!document.blobPathname || !canAcquireProcessingLock(document.status)) {
    return { ok: false, reason: "not_processable" };
  }

  const now = new Date();
  const lock = {
    token: randomUUID(),
    expiresAt: new Date(now.getTime() + documentConfig.processingLockLifetimeMs),
  };

  const documents = await documentsCollection();
  const result = await documents.findOneAndUpdate(
    {
      _id: params.documentId,
      workspaceId: params.workspaceId,
      blobPathname: { $exists: true },
      status: { $in: ["processing", "failed"] },
      $or: [
        { processingLock: { $exists: false } },
        { "processingLock.expiresAt": { $lte: now } },
      ],
    },
    {
      $set: {
        processingLock: lock,
        updatedAt: now,
      },
    },
    {
      returnDocument: "after",
    },
  );

  if (!result) {
    return { ok: false, reason: "locked" };
  }

  return {
    ok: true,
    lock: {
      ...lock,
      document: result,
    },
  };
}

export async function releaseDocumentProcessingLock(params: {
  workspaceId: string;
  documentId: ObjectId;
  token: string;
}): Promise<boolean> {
  const documents = await documentsCollection();
  const result = await documents.updateOne(
    {
      _id: params.documentId,
      workspaceId: params.workspaceId,
      "processingLock.token": params.token,
    },
    {
      $unset: {
        processingLock: "",
      },
      $set: {
        updatedAt: new Date(),
      },
    },
  );

  return result.modifiedCount === 1;
}

function canAcquireProcessingLock(status: Document["status"]): boolean {
  return status === "processing" || status === "failed";
}
