import type { PdfTextExtraction } from "@/lib/rag/extraction";
import type {
  NormalizedPdfText,
  PdfNormalizationResult,
} from "@/lib/rag/normalization/types";

function normalizePageText(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function normalizePdfText(
  extraction: PdfTextExtraction,
): PdfNormalizationResult {
  const pages = extraction.pages
    .map((page) => ({
      page: page.page,
      text: normalizePageText(page.text),
    }))
    .filter((page) => page.text.length > 0);

  if (pages.length === 0) {
    return {
      ok: false,
      code: "PDF_NO_USABLE_TEXT",
      message: "PDF has no usable text after normalization.",
    };
  }

  const document: NormalizedPdfText = {
    pageCount: extraction.pageCount,
    pages,
  };

  return {
    ok: true,
    document,
  };
}
