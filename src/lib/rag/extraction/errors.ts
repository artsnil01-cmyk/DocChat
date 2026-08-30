import type {
  PdfExtractionErrorCode,
  PdfExtractionFailure,
} from "@/lib/rag/extraction/types";

export function pdfExtractionFailure(
  code: PdfExtractionErrorCode,
  message: string,
): PdfExtractionFailure {
  return {
    ok: false,
    code,
    message,
  };
}

export function pdfParseFailed(message = "PDF parsing failed."): PdfExtractionFailure {
  return pdfExtractionFailure("PDF_PARSE_FAILED", message);
}

export function pdfNoExtractableText(
  message = "PDF has no extractable native text.",
): PdfExtractionFailure {
  return pdfExtractionFailure("PDF_NO_EXTRACTABLE_TEXT", message);
}

export function pdfUnsupported(message = "PDF is unsupported."): PdfExtractionFailure {
  return pdfExtractionFailure("PDF_UNSUPPORTED", message);
}
