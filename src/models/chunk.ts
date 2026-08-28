import type { ObjectId } from "mongodb";

export type ChunkLanguage = "fr" | "ar" | "mixed";

export type Chunk = {
  _id: ObjectId;
  documentId: ObjectId;
  strategyVersion: string;
  kind: "parent" | "child";
  text: string;
  tokenCount: number;
  parentId?: ObjectId;
  sectionPath?: string[];
  pageStart: number;
  pageEnd: number;
  startOffset?: number;
  endOffset?: number;
  language: ChunkLanguage;
  embedding?: number[];
};
