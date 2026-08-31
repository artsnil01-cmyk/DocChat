import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { ObjectId } from "mongodb";
import { after, NextRequest, NextResponse } from "next/server";

import { documentConfig } from "@/config/documents";
import { readJson, requireApiWorkspace } from "@/lib/api/request";
import {
  blobUploadClientPayloadSchema,
  blobUploadTokenPayloadSchema,
} from "@/lib/documents/schemas";
import {
  authorizeDocumentBlobUpload,
  completeDocumentBlobUpload,
  processDocument,
} from "@/lib/documents/service";
import { getBlobMetadata } from "@/lib/documents/storage";
import { serverEnv } from "@/lib/env/server";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const body = await readJson(request);

  if (!isBlobUploadBody(body)) {
    return NextResponse.json({ error: "Invalid Blob upload request." }, { status: 400 });
  }

  const response = await handleUpload({
    request,
    body,
    token: serverEnv.blobReadWriteToken,
    onBeforeGenerateToken: async (pathname, clientPayload) => {
      const workspace = await requireApiWorkspace();

      if (!workspace.ok) {
        throw new Error("Unauthenticated upload token request.");
      }

      const parsedPayload = blobUploadClientPayloadSchema.safeParse(
        parseClientPayload(clientPayload),
      );

      if (!parsedPayload.success) {
        throw new Error("Invalid upload client payload.");
      }

      const result = await authorizeDocumentBlobUpload({
        workspaceId: workspace.value.workspaceId,
        documentId: new ObjectId(parsedPayload.data.documentId),
        pathname,
      });

      if (!result.ok) {
        throw new Error("Document is not ready for upload.");
      }

      return {
        allowedContentTypes: result.authorization.allowedContentTypes,
        maximumSizeInBytes: result.authorization.maximumSizeInBytes,
        validUntil: Date.now() + documentConfig.blobUploadTokenLifetimeMs,
        addRandomSuffix: false,
        allowOverwrite: false,
        tokenPayload: JSON.stringify(result.tokenPayload),
      };
    },
    onUploadCompleted: async ({ blob, tokenPayload }) => {
      const parsedPayload = blobUploadTokenPayloadSchema.safeParse(
        parseClientPayload(tokenPayload ?? null),
      );

      if (!parsedPayload.success) {
        throw new Error("Invalid upload token payload.");
      }

      const result = await completeDocumentBlobUpload({
        tokenPayload: parsedPayload.data,
        blob: await getBlobMetadata(blob.pathname),
      });

      if (!result.ok) {
        throw new Error(`Blob upload completion rejected: ${result.reason}.`);
      }

      if (!result.duplicate) {
        after(async () => {
          try {
            const processResult = await processDocument({
              workspaceId: parsedPayload.data.workspaceId,
              documentId: new ObjectId(parsedPayload.data.documentId),
            });

            if (!processResult.ok) {
              console.error("Document ingestion trigger failed.", {
                documentId: parsedPayload.data.documentId,
                reason: processResult.reason,
              });
            }
          } catch (error) {
            console.error("Document ingestion trigger errored.", {
              documentId: parsedPayload.data.documentId,
              error,
            });
          }
        });
      }
    },
  });

  return NextResponse.json(response);
}

function isBlobUploadBody(body: unknown): body is HandleUploadBody {
  return (
    typeof body === "object" &&
    body !== null &&
    "type" in body &&
    "payload" in body
  );
}

function parseClientPayload(payload: string | null): unknown {
  if (!payload) {
    return null;
  }

  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}
