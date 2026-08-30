import "server-only";

import { del, get, head, list } from "@vercel/blob";

import { documentConfig } from "@/config/documents";
import {
  calculateBytesSha256Hex,
  calculateSha256Hex,
} from "@/lib/documents/hashing";
import { serverEnv } from "@/lib/env/server";

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
    maximumSizeInBytes: documentConfig.maxPdfSizeBytes,
    allowedContentTypes: [...documentConfig.pdfContentTypes],
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

export async function readDocumentBlobBytes(pathname: string): Promise<Uint8Array> {
  const result = await get(pathname, {
    access: "private",
    useCache: false,
    token: serverEnv.blobReadWriteToken,
  });

  if (!result || result.statusCode !== 200) {
    throw new Error("Blob content not found.");
  }

  const chunks: Uint8Array[] = [];
  const reader = result.stream.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks);
}

export function verifyDocumentBlobHash(params: {
  bytes: Uint8Array;
  expectedHash: string;
}): boolean {
  return calculateBytesSha256Hex(params.bytes) === params.expectedHash;
}

export async function deleteBlob(pathname: string): Promise<void> {
  await del(pathname, {
    token: serverEnv.blobReadWriteToken,
  });
}
