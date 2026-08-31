import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import type { z } from "zod";

import { requireAuthenticatedWorkspace } from "@/lib/auth/guards";
import { authenticationErrorResponse } from "@/lib/api/errors";

export type ApiResult<TValue> =
  | {
      ok: true;
      value: TValue;
    }
  | {
      ok: false;
      response: NextResponse;
    };

export async function requireApiWorkspace(): Promise<
  ApiResult<{ workspaceId: string }>
> {
  try {
    const { workspaceId } = await requireAuthenticatedWorkspace();

    return {
      ok: true,
      value: { workspaceId },
    };
  } catch (error) {
    const response = authenticationErrorResponse(error);

    if (response) {
      return {
        ok: false,
        response,
      };
    }

    throw error;
  }
}

export async function readJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function parseObjectIdParam<TParams extends Record<string, unknown>>(
  params: TParams,
  schema: z.ZodType<TParams>,
  key: keyof TParams,
  invalidMessage: string,
): ApiResult<ObjectId> {
  const parsedParams = schema.safeParse(params);

  if (!parsedParams.success) {
    return {
      ok: false,
      response: NextResponse.json({ error: invalidMessage }, { status: 400 }),
    };
  }

  const value = parsedParams.data[key];

  if (typeof value !== "string") {
    return {
      ok: false,
      response: NextResponse.json({ error: invalidMessage }, { status: 400 }),
    };
  }

  return {
    ok: true,
    value: new ObjectId(value),
  };
}
