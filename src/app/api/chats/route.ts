import { NextRequest, NextResponse } from "next/server";

import { authenticationErrorResponse } from "@/lib/api/errors";
import { requireAuthenticatedWorkspace } from "@/lib/auth/guards";
import { createChatRequestSchema } from "@/lib/chat/schemas";
import { createChat, listChats } from "@/lib/chat/service";

export async function GET() {
  let workspaceId: string;

  try {
    ({ workspaceId } = await requireAuthenticatedWorkspace());
  } catch (error) {
    const response = authenticationErrorResponse(error);

    if (response) {
      return response;
    }

    throw error;
  }

  return NextResponse.json({ chats: await listChats(workspaceId) });
}

export async function POST(request: NextRequest) {
  let workspaceId: string;

  try {
    ({ workspaceId } = await requireAuthenticatedWorkspace());
  } catch (error) {
    const response = authenticationErrorResponse(error);

    if (response) {
      return response;
    }

    throw error;
  }

  const body = await readJson(request);
  const parsedBody = createChatRequestSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json({ error: "Invalid chat request." }, { status: 400 });
  }

  const chat = await createChat({
    workspaceId,
    title: parsedBody.data.title,
  });

  return NextResponse.json({ chat }, { status: 201 });
}

async function readJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
