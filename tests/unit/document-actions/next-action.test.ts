import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";

import { getDocumentNextAction } from "@/lib/documents/service/actions";
import type { Document } from "@/models/document";

describe("getDocumentNextAction", () => {
  it("requests upload while a document is pending upload", () => {
    expect(
      getDocumentNextAction(documentWith({ status: "pending_upload" })),
    ).toEqual({ type: "upload" });
  });

  it("waits while a document is processing", () => {
    expect(getDocumentNextAction(documentWith({ status: "processing" }))).toEqual({
      type: "wait",
    });
  });

  it("allows processing retry for failed or cancelled documents with a Blob", () => {
    expect(
      getDocumentNextAction(
        documentWith({ status: "failed", blobPathname: "documents/a.pdf" }),
      ),
    ).toEqual({ type: "process" });
    expect(
      getDocumentNextAction(
        documentWith({ status: "cancelled", blobPathname: "documents/a.pdf" }),
      ),
    ).toEqual({ type: "process" });
  });

  it("requests upload for failed or cancelled documents without a Blob", () => {
    expect(getDocumentNextAction(documentWith({ status: "failed" }))).toEqual({
      type: "upload",
    });
    expect(getDocumentNextAction(documentWith({ status: "cancelled" }))).toEqual({
      type: "upload",
    });
  });

  it("has no next action when a document is ready", () => {
    expect(
      getDocumentNextAction(
        documentWith({ status: "ready", blobPathname: "documents/a.pdf" }),
      ),
    ).toEqual({ type: "none" });
  });
});

function documentWith(params: Partial<Document>): Document {
  const now = new Date("2026-01-01T00:00:00.000Z");

  return {
    _id: new ObjectId("507f1f77bcf86cd799439031"),
    workspaceId: "workspace-test",
    name: "document.pdf",
    contentHash: "a".repeat(64),
    sizeBytes: 1024,
    status: "pending_upload",
    createdAt: now,
    updatedAt: now,
    ...params,
  };
}
