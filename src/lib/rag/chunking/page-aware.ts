import type { RagStrategy } from "@/config/rag";
import type { NormalizedPdfText } from "@/lib/rag/normalization";
import type { ChunkLanguage } from "@/models/chunk";
import type {
  ChildChunkDraft,
  ChunkingResult,
  ParentChunkDraft,
  TextSpan,
} from "@/lib/rag/chunking/types";
import { countTokens } from "@/lib/rag/tokenization";

type Paragraph = TextSpan & {
  tokenCount: number;
};

type ParentSpan = TextSpan & {
  parentStartOffset: number;
  parentEndOffset: number;
};

type WordSpan = {
  startOffset: number;
  endOffset: number;
};

type TokenWindow = {
  startOffset: number;
  endOffset: number;
  tokenCount: number;
};

const arabicCharacterPattern = /[\u0600-\u06FF]/g;
const latinCharacterPattern = /[A-Za-zÀ-ÖØ-öø-ÿ]/g;
const wordPattern = /\S+/g;
const paragraphSeparator = "\n\n";

export function buildPageAwareChunks(params: {
  document: NormalizedPdfText;
  strategy: RagStrategy;
}): ChunkingResult {
  const paragraphs = getParagraphs(params.document);
  const parents = buildParentChunks({
    paragraphs,
    strategy: params.strategy,
  });

  if (parents.length === 0) {
    return {
      ok: false,
      code: "NO_CHUNKS_CREATED",
      message: "No chunks could be created from normalized PDF text.",
    };
  }

  return {
    ok: true,
    parents,
    children: parents.flatMap((parent) =>
      buildChildChunks({
        parent,
        strategy: params.strategy,
      }),
    ),
  };
}

function getParagraphs(document: NormalizedPdfText): Paragraph[] {
  return document.pages.flatMap((page) => {
    let searchOffset = 0;

    const paragraphs = page.text
      .split(/\n{2,}/)
      .map((paragraphText) => paragraphText.trim())
      .filter((paragraphText) => paragraphText.length > 0)
      .map((paragraphText) => {
        const pageStartOffset = page.text.indexOf(paragraphText, searchOffset);
        const safeStartOffset =
          pageStartOffset >= 0 ? pageStartOffset : searchOffset;
        const pageEndOffset = safeStartOffset + paragraphText.length;
        searchOffset = pageEndOffset;

        return {
          page: page.page,
          text: paragraphText,
          pageStartOffset: safeStartOffset,
          pageEndOffset,
          tokenCount: countTokens(paragraphText),
        };
      });

    return paragraphs;
  });
}

function buildParentChunks(params: {
  paragraphs: Paragraph[];
  strategy: RagStrategy;
}): ParentChunkDraft[] {
  const parents: ParentChunkDraft[] = [];
  let currentParagraphs: Paragraph[] = [];
  let currentTokenCount = 0;

  for (const paragraph of splitOversizedParagraphs({
    paragraphs: params.paragraphs,
    maxTokens: params.strategy.parent.maxTokens,
  })) {
    const nextTokenCount = getJoinedParagraphTokenCount([
      ...currentParagraphs,
      paragraph,
    ]);
    const shouldFlush =
      currentParagraphs.length > 0 &&
      nextTokenCount > params.strategy.parent.maxTokens;

    if (shouldFlush) {
      parents.push(createParentChunk(currentParagraphs, parents.length));
      currentParagraphs = [];
      currentTokenCount = 0;
    }

    currentParagraphs.push(paragraph);
    currentTokenCount = getJoinedParagraphTokenCount(currentParagraphs);

    if (currentTokenCount >= params.strategy.parent.targetTokens) {
      parents.push(createParentChunk(currentParagraphs, parents.length));
      currentParagraphs = [];
      currentTokenCount = 0;
    }
  }

  if (currentParagraphs.length > 0) {
    parents.push(createParentChunk(currentParagraphs, parents.length));
  }

  return parents.filter((parent) => parent.text.length > 0);
}

function createParentChunk(
  paragraphs: Paragraph[],
  order: number,
): ParentChunkDraft {
  const spans: TextSpan[] = paragraphs.map((paragraph) => ({
    page: paragraph.page,
    text: paragraph.text,
    pageStartOffset: paragraph.pageStartOffset,
    pageEndOffset: paragraph.pageEndOffset,
  }));
  const text = paragraphs.map((paragraph) => paragraph.text).join(paragraphSeparator);

  return {
    localId: `parent-${order + 1}`,
    kind: "parent",
    order,
    text,
    tokenCount: countTokens(text),
    pageStart: Math.min(...spans.map((span) => span.page)),
    pageEnd: Math.max(...spans.map((span) => span.page)),
    spans,
    language: detectLanguage(text),
  };
}

function buildChildChunks(params: {
  parent: ParentChunkDraft;
  strategy: RagStrategy;
}): ChildChunkDraft[] {
  const slices = splitTextByTokenWindow({
    text: params.parent.text,
    targetTokens: params.strategy.child.targetTokens,
    maxTokens: params.strategy.child.maxTokens,
    overlapTokens: params.strategy.child.overlapTokens,
  });

  if (slices.length === 0) {
    return [];
  }

  const parentSpans = getParentSpans(params.parent);
  const children: ChildChunkDraft[] = [];

  for (const slice of slices) {
    const text = params.parent.text
      .slice(slice.startOffset, slice.endOffset)
      .trim();
    const pageRange = getPageRangeForOffsets({
      spans: parentSpans,
      startOffset: slice.startOffset,
      endOffset: slice.endOffset,
    });

    if (text.length > 0) {
      children.push({
        localId: `child-${params.parent.order + 1}-${children.length + 1}`,
        parentLocalId: params.parent.localId,
        kind: "child",
        order: children.length,
        text,
        tokenCount: slice.tokenCount,
        pageStart: pageRange.pageStart,
        pageEnd: pageRange.pageEnd,
        startOffset: slice.startOffset,
        endOffset: slice.endOffset,
        language: detectLanguage(text),
      });
    }
  }

  return children;
}

function splitOversizedParagraphs(params: {
  paragraphs: Paragraph[];
  maxTokens: number;
}): Paragraph[] {
  return params.paragraphs.flatMap((paragraph) => {
    if (paragraph.tokenCount <= params.maxTokens) {
      return [paragraph];
    }

    return splitTextByTokenWindow({
      text: paragraph.text,
      targetTokens: params.maxTokens,
      maxTokens: params.maxTokens,
      overlapTokens: 0,
    }).map((slice) => ({
      page: paragraph.page,
      text: paragraph.text.slice(slice.startOffset, slice.endOffset).trim(),
      pageStartOffset: paragraph.pageStartOffset + slice.startOffset,
      pageEndOffset: paragraph.pageStartOffset + slice.endOffset,
      tokenCount: slice.tokenCount,
    }));
  });
}

function getParentSpans(parent: ParentChunkDraft): ParentSpan[] {
  let searchOffset = 0;

  return parent.spans.map((span) => {
    const startOffset = parent.text.indexOf(span.text, searchOffset);
    const parentStartOffset = startOffset >= 0 ? startOffset : searchOffset;
    const parentEndOffset = parentStartOffset + span.text.length;
    searchOffset = parentEndOffset;

    return {
      ...span,
      parentStartOffset,
      parentEndOffset,
    };
  });
}

function getPageRangeForOffsets(params: {
  spans: ParentSpan[];
  startOffset: number;
  endOffset: number;
}): {
  pageStart: number;
  pageEnd: number;
} {
  const matchingSpans = params.spans.filter(
    (span) =>
      span.parentStartOffset < params.endOffset &&
      span.parentEndOffset > params.startOffset,
  );

  if (matchingSpans.length === 0) {
    return {
      pageStart: params.spans[0].page,
      pageEnd: params.spans[params.spans.length - 1].page,
    };
  }

  return {
    pageStart: Math.min(...matchingSpans.map((span) => span.page)),
    pageEnd: Math.max(...matchingSpans.map((span) => span.page)),
  };
}

function splitTextByTokenWindow(params: {
  text: string;
  targetTokens: number;
  maxTokens: number;
  overlapTokens: number;
}): TokenWindow[] {
  const words = getWordSpans(params.text);
  const slices: TokenWindow[] = [];
  let startWordIndex = 0;
  const tokenLimit = Math.min(params.targetTokens, params.maxTokens);

  while (startWordIndex < words.length) {
    const endWordIndex = findWindowEndWordIndex({
      text: params.text,
      words,
      startWordIndex,
      tokenLimit,
    });

    if (endWordIndex === null) {
      const word = words[startWordIndex];
      slices.push(
        ...splitLongTextRangeByTokenLimit({
          text: params.text,
          startOffset: word.startOffset,
          endOffset: word.endOffset,
          maxTokens: params.maxTokens,
        }),
      );

      startWordIndex += 1;
      continue;
    }

    const selectedWords = words.slice(startWordIndex, endWordIndex);
    const startOffset = selectedWords[0].startOffset;
    const endOffset = selectedWords[selectedWords.length - 1].endOffset;
    const tokenCount = countTokens(params.text.slice(startOffset, endOffset));

    slices.push({
      startOffset,
      endOffset,
      tokenCount,
    });

    if (endWordIndex === words.length) {
      break;
    }

    startWordIndex = getNextWindowStartWordIndex({
      text: params.text,
      words,
      startWordIndex,
      endWordIndex,
      overlapTokens: params.overlapTokens,
    });
  }

  return slices;
}

function splitLongTextRangeByTokenLimit(params: {
  text: string;
  startOffset: number;
  endOffset: number;
  maxTokens: number;
}): TokenWindow[] {
  const slices: TokenWindow[] = [];
  let startOffset = params.startOffset;

  while (startOffset < params.endOffset) {
    const endOffset = findLargestEndOffset({
      text: params.text,
      startOffset,
      endOffset: params.endOffset,
      tokenLimit: params.maxTokens,
    });
    const tokenCount = countTokens(params.text.slice(startOffset, endOffset));

    slices.push({
      startOffset,
      endOffset,
      tokenCount,
    });

    startOffset = endOffset;
  }

  return slices;
}

function findLargestEndOffset(params: {
  text: string;
  startOffset: number;
  endOffset: number;
  tokenLimit: number;
}): number {
  let low = params.startOffset + 1;
  let high = params.endOffset;
  let best = low;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const tokenCount = countTokens(params.text.slice(params.startOffset, middle));

    if (tokenCount <= params.tokenLimit) {
      best = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return best;
}

function getJoinedParagraphTokenCount(paragraphs: Paragraph[]): number {
  return countTokens(
    paragraphs.map((paragraph) => paragraph.text).join(paragraphSeparator),
  );
}

function findWindowEndWordIndex(params: {
  text: string;
  words: WordSpan[];
  startWordIndex: number;
  tokenLimit: number;
}): number | null {
  let endWordIndex = params.startWordIndex + 1;
  let bestEndWordIndex: number | null = null;

  while (endWordIndex <= params.words.length) {
    const tokenCount = countWordWindowTokens({
      text: params.text,
      words: params.words,
      startWordIndex: params.startWordIndex,
      endWordIndex,
    });

    if (tokenCount > params.tokenLimit) {
      break;
    }

    bestEndWordIndex = endWordIndex;
    endWordIndex += 1;
  }

  return bestEndWordIndex;
}

function getNextWindowStartWordIndex(params: {
  text: string;
  words: WordSpan[];
  startWordIndex: number;
  endWordIndex: number;
  overlapTokens: number;
}): number {
  if (params.overlapTokens <= 0) {
    return params.endWordIndex;
  }

  let startWordIndex = params.endWordIndex - 1;

  while (startWordIndex > 0) {
    const tokenCount = countWordWindowTokens({
      text: params.text,
      words: params.words,
      startWordIndex,
      endWordIndex: params.endWordIndex,
    });

    if (tokenCount >= params.overlapTokens) {
      break;
    }

    startWordIndex -= 1;
  }

  return Math.max(startWordIndex, params.startWordIndex + 1);
}

function getWordSpans(text: string): WordSpan[] {
  return Array.from(text.matchAll(wordPattern)).map((match) => ({
    startOffset: match.index,
    endOffset: match.index + match[0].length,
  }));
}

function countWordWindowTokens(params: {
  text: string;
  words: WordSpan[];
  startWordIndex: number;
  endWordIndex: number;
}): number {
  const firstWord = params.words[params.startWordIndex];
  const lastWord = params.words[params.endWordIndex - 1];

  return countTokens(
    params.text.slice(firstWord.startOffset, lastWord.endOffset),
  );
}

function detectLanguage(text: string): ChunkLanguage {
  const arabicCount = text.match(arabicCharacterPattern)?.length ?? 0;
  const latinCount = text.match(latinCharacterPattern)?.length ?? 0;
  const total = arabicCount + latinCount;

  if (total === 0) {
    return "fr";
  }

  if (arabicCount / total >= 0.9) {
    return "ar";
  }

  if (latinCount / total >= 0.9) {
    return "fr";
  }

  return "mixed";
}
