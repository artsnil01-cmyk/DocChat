import { z } from "zod";

import {
  documentNameSchema,
  objectIdStringSchema,
  pdfMimeTypeSchema,
  positiveIntegerSchema,
  sha256HexSchema,
} from "@/lib/validation/common";

export const uploadPreflightRequestSchema = z.object({
  chatId: objectIdStringSchema,
  name: documentNameSchema,
  mimeType: pdfMimeTypeSchema,
  sizeBytes: positiveIntegerSchema.max(10 * 1024 * 1024),
  contentHash: sha256HexSchema,
});

export const blobUploadClientPayloadSchema = z.object({
  documentId: objectIdStringSchema,
});

export const blobUploadTokenPayloadSchema = z.object({
  documentId: objectIdStringSchema,
  workspaceId: z.string().trim().min(1),
  pathname: z.string().trim().min(1),
  sizeBytes: positiveIntegerSchema.max(10 * 1024 * 1024),
  contentHash: sha256HexSchema,
});

export const documentRouteParamsSchema = z.object({
  documentId: objectIdStringSchema,
});

export const listDocumentsQuerySchema = z.object({
  chatId: objectIdStringSchema.optional(),
});

export type UploadPreflightRequest = z.infer<
  typeof uploadPreflightRequestSchema
>;
export type BlobUploadClientPayload = z.infer<
  typeof blobUploadClientPayloadSchema
>;
export type BlobUploadTokenPayload = z.infer<typeof blobUploadTokenPayloadSchema>;
export type DocumentRouteParams = z.infer<typeof documentRouteParamsSchema>;
export type ListDocumentsQuery = z.infer<typeof listDocumentsQuerySchema>;
