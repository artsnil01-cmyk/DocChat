import "server-only";

import { del, get, head, list } from "@vercel/blob";

import { calculateSha256Hex } from "@/lib/documents/hashing";
import { serverEnv } from "@/lib/env/server";

export const PDF_CONTENT_TYPES = ["application/pdf"];
export const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;

export type DocumentBlobUploadConstraints = {
  pathname: string;
  maximumSizeInBytes: number;
  allowedContentTypes: string[];
};

export type BlobMetadata = {
  pathname: string;
  size: number;
  contentType: string;
};

export async function verifyBlobAccess(): Promise<void> {
  await list({
    limit: 1,
    token: serverEnv.blobReadWriteToken,
  });
}

export function buildDocumentBlobPathname(documentId: string): string {
  return `documents/${documentId}/original.pdf`;
}

export function getPrivatePdfUploadConstraints(params: {
  pathname: string;
}): DocumentBlobUploadConstraints {
  return {
    pathname: params.pathname,
    maximumSizeInBytes: MAX_PDF_SIZE_BYTES,
    allowedContentTypes: PDF_CONTENT_TYPES,
  };
}

export async function getBlobMetadata(pathname: string): Promise<BlobMetadata> {
  const metadata = await head(pathname, {
    token: serverEnv.blobReadWriteToken,
  });

  return {
    pathname: metadata.pathname,
    size: metadata.size,
    contentType: metadata.contentType,
  };
}

export async function calculateBlobSha256Hex(pathname: string): Promise<string> {
  const result = await get(pathname, {
    access: "private",
    useCache: false,
    token: serverEnv.blobReadWriteToken,
  });

  if (!result || result.statusCode !== 200) {
    throw new Error("Blob content not found.");
  }

  return calculateSha256Hex(result.stream);
}

export async function deleteBlob(pathname: string): Promise<void> {
  await del(pathname, {
    token: serverEnv.blobReadWriteToken,
  });
}
