import type { ChunkLanguage } from "@/models/chunk";

export type TextSpan = {
  page: number;
  text: string;
  pageStartOffset: number;
  pageEndOffset: number;
};

export type ParentChunkDraft = {
  localId: string;
  kind: "parent";
  order: number;
  text: string;
  tokenCount: number;
  pageStart: number;
  pageEnd: number;
  spans: TextSpan[];
  language: ChunkLanguage;
};

export type ChildChunkDraft = {
  localId: string;
  parentLocalId: string;
  kind: "child";
  order: number;
  text: string;
  tokenCount: number;
  pageStart: number;
  pageEnd: number;
  startOffset: number;
  endOffset: number;
  language: ChunkLanguage;
};

export type ChunkingResult =
  | {
      ok: true;
      parents: ParentChunkDraft[];
      children: ChildChunkDraft[];
    }
  | {
      ok: false;
      code: "NO_CHUNKS_CREATED";
      message: string;
    };
