export const documentConfig = {
  maxPdfSizeBytes: 10 * 1024 * 1024,
  pdfContentTypes: ["application/pdf"],
  blobUploadTokenLifetimeMs: 10 * 60 * 1000,
} as const;
