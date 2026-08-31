import { z } from "zod";

import { documentConfig } from "@/config/documents";
import {
  documentNameSchema,
  objectIdStringSchema,
  pdfMimeTypeSchema,
  positiveIntegerSchema,
  sha256HexSchema,
} from "@/lib/validation/common";

export const uploadPreflightRequestSchema = z.object({
  name: documentNameSchema,
  mimeType: pdfMimeTypeSchema,
  sizeBytes: positiveIntegerSchema.max(documentConfig.maxPdfSizeBytes),
  contentHash: sha256HexSchema,
});

export const blobUploadClientPayloadSchema = z.object({
  documentId: objectIdStringSchema,
});

export const blobUploadTokenPayloadSchema = z.object({
  documentId: objectIdStringSchema,
  workspaceId: z.string().trim().min(1),
  pathname: z.string().trim().min(1),
  sizeBytes: positiveIntegerSchema.max(documentConfig.maxPdfSizeBytes),
  contentHash: sha256HexSchema,
});

export const documentRouteParamsSchema = z.object({
  documentId: objectIdStringSchema,
});

export type UploadPreflightRequest = z.infer<
  typeof uploadPreflightRequestSchema
>;
export type BlobUploadClientPayload = z.infer<
  typeof blobUploadClientPayloadSchema
>;
export type BlobUploadTokenPayload = z.infer<typeof blobUploadTokenPayloadSchema>;
export type DocumentRouteParams = z.infer<typeof documentRouteParamsSchema>;
