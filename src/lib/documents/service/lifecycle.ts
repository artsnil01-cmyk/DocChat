import "server-only";

import { ObjectId } from "mongodb";

import { documentsCollection } from "@/lib/db/collections";
import { toDocumentView, type DocumentView } from "@/lib/documents/service/views";
import {
  buildDocumentBlobPathname,
  calculateBlobSha256Hex,
  deleteBlob,
  type BlobMetadata,
} from "@/lib/documents/storage";
import type { DocumentUploadTokenPayload } from "@/lib/documents/service/upload";

export type CompleteDocumentUploadResult =
  | {
      ok: true;
      document: DocumentView;
    }
  | {
      ok: false;
      reason:
        | "not_found"
        | "invalid_state"
        | "pathname_mismatch"
        | "blob_mismatch"
        | "content_hash_mismatch";
    };

export async function completeDocumentBlobUpload(params: {
  tokenPayload: DocumentUploadTokenPayload;
  blob: BlobMetadata;
}): Promise<CompleteDocumentUploadResult> {
  const documents = await documentsCollection();
  const document = await documents.findOne({
    _id: new ObjectId(params.tokenPayload.documentId),
    workspaceId: params.tokenPayload.workspaceId,
  });

  if (!document) {
    return { ok: false, reason: "not_found" };
  }

  if (document.status !== "pending_upload" || document.blobPathname) {
    return { ok: false, reason: "invalid_state" };
  }

  const expectedPathname = buildDocumentBlobPathname(document._id.toHexString());

  if (
    params.tokenPayload.pathname !== expectedPathname ||
    params.blob.pathname !== expectedPathname
  ) {
    return { ok: false, reason: "pathname_mismatch" };
  }

  if (
    params.tokenPayload.sizeBytes !== document.sizeBytes ||
    params.tokenPayload.contentHash !== document.contentHash ||
    params.blob.size !== document.sizeBytes ||
    params.blob.contentType !== "application/pdf"
  ) {
    return { ok: false, reason: "blob_mismatch" };
  }

  const verifiedContentHash = await calculateBlobSha256Hex(expectedPathname);

  if (verifiedContentHash !== document.contentHash) {
    await deleteUntrustedUpload({
      documentId: document._id,
      workspaceId: document.workspaceId,
      pathname: expectedPathname,
    });

    return { ok: false, reason: "content_hash_mismatch" };
  }

  const now = new Date();
  const result = await documents.findOneAndUpdate(
    {
      _id: document._id,
      workspaceId: params.tokenPayload.workspaceId,
      status: "pending_upload",
      blobPathname: { $exists: false },
    },
    {
      $set: {
        blobPathname: expectedPathname,
        status: "processing",
        stage: "reading",
        progress: 0,
        updatedAt: now,
      },
    },
    {
      returnDocument: "after",
    },
  );

  if (!result) {
    return { ok: false, reason: "invalid_state" };
  }

  return {
    ok: true,
    document: toDocumentView(result),
  };
}

async function deleteUntrustedUpload(params: {
  documentId: ObjectId;
  workspaceId: string;
  pathname: string;
}): Promise<void> {
  await deleteBlob(params.pathname).catch(() => undefined);

  const documents = await documentsCollection();
  await documents.deleteOne({
    _id: params.documentId,
    workspaceId: params.workspaceId,
    status: "pending_upload",
  });
}
