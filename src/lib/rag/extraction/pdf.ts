import { getDocument } from "pdfjs-dist";
import type {
  TextItem,
  TextMarkedContent,
} from "pdfjs-dist/types/src/display/api";

import {
  pdfNoExtractableText,
  pdfParseFailed,
} from "@/lib/rag/extraction/errors";
import type {
  PdfExtractionResult,
  PdfPageText,
  PdfTextExtraction,
} from "@/lib/rag/extraction/types";

function isPdfTextItem(
  item: TextItem | TextMarkedContent,
): item is TextItem {
  return "str" in item;
}

function getTextItemValue(item: TextItem): string | null {
  const text = item.str.trim();

  if (!text) {
    return null;
  }

  return text;
}

function hasExtractableText(document: PdfTextExtraction): boolean {
  return document.pages.some((page) => page.text.length > 0);
}

function joinPageText(items: TextItem[]): string {
  return items
    .map(getTextItemValue)
    .filter((text): text is string => text !== null)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function extractPdfText(
  fileBuffer: Buffer | Uint8Array,
): Promise<PdfExtractionResult> {
  try {
    const loadingTask = getDocument({
      data: new Uint8Array(fileBuffer),
      disableFontFace: true,
      useSystemFonts: true,
    });
    const pdfDocument = await loadingTask.promise;
    const pages: PdfPageText[] = [];

    for (let pageIndex = 1; pageIndex <= pdfDocument.numPages; pageIndex += 1) {
      const page = await pdfDocument.getPage(pageIndex);
      const textContent = await page.getTextContent({
        disableNormalization: false,
        includeMarkedContent: false,
      });
      const items = textContent.items
        .filter(isPdfTextItem)
        .filter((item) => item.str.trim().length > 0);

      pages.push({
        page: pageIndex,
        text: joinPageText(items),
      });
    }

    const document: PdfTextExtraction = {
      pageCount: pdfDocument.numPages,
      pages,
    };

    await loadingTask.destroy();

    if (!hasExtractableText(document)) {
      return pdfNoExtractableText();
    }

    return {
      ok: true,
      document,
    };
  } catch (error) {
    return pdfParseFailed(
      error instanceof Error ? error.message : "PDF parsing failed.",
    );
  }
}
