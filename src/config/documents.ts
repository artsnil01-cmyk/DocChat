export const documentConfig = {
  maxPdfSizeBytes: 10 * 1024 * 1024,
  pdfContentTypes: ["application/pdf"],
  pendingUploadLifetimeMs: 60 * 1000,
  blobUploadTokenLifetimeMs: 10 * 60 * 1000,
  processingLockLifetimeMs: 3 * 60 * 1000,
} as const;
