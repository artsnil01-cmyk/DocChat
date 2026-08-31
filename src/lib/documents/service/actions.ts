import type { Document } from "@/models/document";

export type DocumentNextAction =
  | {
      type: "upload";
    }
  | {
      type: "process";
    }
  | {
      type: "wait";
    }
  | {
      type: "none";
    };

export function getDocumentNextAction(document: Document): DocumentNextAction {
  if (document.status === "pending_upload") {
    return { type: "upload" };
  }

  if (document.status === "processing") {
    return { type: "wait" };
  }

  if (document.status === "failed" || document.status === "cancelled") {
    return document.blobPathname ? { type: "process" } : { type: "upload" };
  }

  return { type: "none" };
}
