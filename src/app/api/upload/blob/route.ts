import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

import { authenticationErrorResponse } from "@/lib/api/errors";
import { requireAuthenticatedWorkspace } from "@/lib/auth/guards";
import {
  blobUploadClientPayloadSchema,
  blobUploadTokenPayloadSchema,
} from "@/lib/documents/schemas";
import {
  authorizeDocumentBlobUpload,
  completeDocumentBlobUpload,
} from "@/lib/documents/service";
import { serverEnv } from "@/lib/env/server";
import { getBlobMetadata } from "@/lib/documents/storage";

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
      let workspaceId: string;

      try {
        ({ workspaceId } = await requireAuthenticatedWorkspace());
      } catch (error) {
        const response = authenticationErrorResponse(error);

        if (response) {
          throw new Error("Unauthenticated upload token request.");
        }

        throw error;
      }

      const parsedPayload = blobUploadClientPayloadSchema.safeParse(
        parseClientPayload(clientPayload),
      );

      if (!parsedPayload.success) {
        throw new Error("Invalid upload client payload.");
      }

      const result = await authorizeDocumentBlobUpload({
        workspaceId,
        documentId: new ObjectId(parsedPayload.data.documentId),
        pathname,
      });

      if (!result.ok) {
        throw new Error("Document is not ready for upload.");
      }

      return {
        allowedContentTypes: result.authorization.allowedContentTypes,
        maximumSizeInBytes: result.authorization.maximumSizeInBytes,
        validUntil: Date.now() + 10 * 60 * 1000,
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

async function readJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
