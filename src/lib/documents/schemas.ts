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

export const documentRouteParamsSchema = z.object({
  documentId: objectIdStringSchema,
});

export type UploadPreflightRequest = z.infer<
  typeof uploadPreflightRequestSchema
>;
export type DocumentRouteParams = z.infer<typeof documentRouteParamsSchema>;
