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

type PositionedTextItem = {
  text: string;
  x: number;
  y: number;
  fontSize: number;
};

type ReconstructedLine = {
  text: string;
  y: number;
  fontSize: number;
};

const lineMergeTolerance = 3;
const paragraphGapMultiplier = 1.6;
const headingFontSizeMultiplier = 1.2;
const headingMaxLength = 120;

function isPdfTextItem(
  item: TextItem | TextMarkedContent,
): item is TextItem {
  return "str" in item;
}

function toPositionedTextItem(item: TextItem): PositionedTextItem | null {
  const text = item.str.trim();

  if (!text) {
    return null;
  }

  return {
    text,
    x: getTransformNumber(item.transform, 4),
    y: getTransformNumber(item.transform, 5),
    fontSize: getFontSize(item.transform),
  };
}

function hasExtractableText(document: PdfTextExtraction): boolean {
  return document.pages.some((page) => page.text.length > 0);
}

function getTransformNumber(transform: unknown[], index: number): number {
  const value = transform[index];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function getFontSize(transform: unknown[]): number {
  const scaleY = getTransformNumber(transform, 3);

  return Math.abs(scaleY);
}

function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const sortedValues = [...values].sort((first, second) => first - second);
  const middleIndex = Math.floor(sortedValues.length / 2);

  return sortedValues.length % 2 === 0
    ? (sortedValues[middleIndex - 1] + sortedValues[middleIndex]) / 2
    : sortedValues[middleIndex];
}

function groupItemsIntoLines(items: PositionedTextItem[]): ReconstructedLine[] {
  const sortedItems = [...items].sort((first, second) => {
    const yDifference = second.y - first.y;

    if (Math.abs(yDifference) > lineMergeTolerance) {
      return yDifference;
    }

    return first.x - second.x;
  });

  const lines: PositionedTextItem[][] = [];

  for (const item of sortedItems) {
    const line = lines.find(
      (candidate) => Math.abs(candidate[0].y - item.y) <= lineMergeTolerance,
    );

    if (line) {
      line.push(item);
    } else {
      lines.push([item]);
    }
  }

  return lines.map((line) => {
    const sortedLine = [...line].sort((first, second) => first.x - second.x);

    return {
      text: sortedLine.map((item) => item.text).join(" ").replace(/[ \t]+/g, " "),
      y: median(sortedLine.map((item) => item.y)),
      fontSize: median(sortedLine.map((item) => item.fontSize)),
    };
  });
}

function getNormalLineGap(lines: ReconstructedLine[]): number {
  const gaps = lines
    .slice(1)
    .map((line, index) => lines[index].y - line.y)
    .filter((gap) => gap > 0);

  return median(gaps);
}

function isProbableHeading(
  line: ReconstructedLine,
  bodyFontSize: number,
): boolean {
  return (
    bodyFontSize > 0 &&
    line.fontSize >= bodyFontSize * headingFontSizeMultiplier &&
    line.text.length <= headingMaxLength
  );
}

function dehyphenateLineWraps(text: string): string {
  return text.replace(/([A-Za-zÀ-ÖØ-öø-ÿ])-\n([a-zà-öø-ÿ])/g, "$1$2");
}

function getLineSeparator(params: {
  previousLine?: ReconstructedLine;
  line: ReconstructedLine;
  normalLineGap: number;
}): string {
  if (!params.previousLine || params.normalLineGap <= 0) {
    return "";
  }

  const gap = params.previousLine.y - params.line.y;

  return gap > params.normalLineGap * paragraphGapMultiplier ? "\n\n" : "\n";
}

function reconstructPageText(items: TextItem[]): string {
  const positionedItems = items
    .map(toPositionedTextItem)
    .filter((item): item is PositionedTextItem => item !== null);
  const lines = groupItemsIntoLines(positionedItems);
  const normalLineGap = getNormalLineGap(lines);
  const bodyFontSize = median(lines.map((line) => line.fontSize));
  let pageText = "";

  for (const [index, line] of lines.entries()) {
    const previousLine = lines[index - 1];
    const lineSeparator = getLineSeparator({
      previousLine,
      line,
      normalLineGap,
    });
    const headingSeparator =
      index > 0 && isProbableHeading(line, bodyFontSize) ? "\n" : "";

    pageText += `${lineSeparator}${headingSeparator}${line.text}`;
  }

  return dehyphenateLineWraps(pageText)
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
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
        text: reconstructPageText(items),
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
