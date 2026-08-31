import "server-only";

import type { ObjectId } from "mongodb";

import { documentsCollection } from "@/lib/db/collections";
import type { Document } from "@/models/document";

const pendingUploadExpiredError = {
  code: "upload_expired",
  message: "Document upload confirmation expired.",
} as const;

export async function expireWorkspacePendingUploads(
  workspaceId: string,
): Promise<void> {
  const documents = await documentsCollection();
  await documents.updateMany(
    {
      workspaceId,
      status: "pending_upload",
      $or: [
        { uploadExpiresAt: { $lte: new Date() } },
        { uploadExpiresAt: { $exists: false } },
      ],
    },
    buildPendingUploadExpiredUpdate(),
  );
}

export async function expirePendingUploadIfNeeded(params: {
  workspaceId: string;
  documentId: ObjectId;
}): Promise<Document | null> {
  const documents = await documentsCollection();
  const document = await documents.findOne({
    _id: params.documentId,
    workspaceId: params.workspaceId,
  });

  if (!isExpiredPendingUpload(document)) {
    return document;
  }

  const expiredDocument = await documents.findOneAndUpdate(
    {
      _id: document._id,
      workspaceId: document.workspaceId,
      status: "pending_upload",
      $or: [
        { uploadExpiresAt: { $lte: new Date() } },
        { uploadExpiresAt: { $exists: false } },
      ],
    },
    buildPendingUploadExpiredUpdate(),
    {
      returnDocument: "after",
    },
  );

  return expiredDocument ?? document;
}

function isExpiredPendingUpload(document: Document | null): document is Document {
  if (!document || document.status !== "pending_upload") {
    return false;
  }

  return !document.uploadExpiresAt || document.uploadExpiresAt <= new Date();
}

function buildPendingUploadExpiredUpdate() {
  return {
    $set: {
      status: "failed",
      error: pendingUploadExpiredError,
      updatedAt: new Date(),
    },
    $unset: {
      uploadExpiresAt: "",
    },
  } as const;
}
