import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import { authenticationErrorResponse } from "@/lib/api/errors";
import { requireAuthenticatedWorkspace } from "@/lib/auth/guards";
import { chatRouteParamsSchema } from "@/lib/chat/schemas";
import { deleteChat, getChatDetail } from "@/lib/chat/service";

type ChatRouteContext = {
  params: Promise<{
    chatId: string;
  }>;
};

export async function GET(_request: Request, context: ChatRouteContext) {
  const resolvedContext = await resolveChatRouteContext(context);

  if (resolvedContext instanceof NextResponse) {
    return resolvedContext;
  }

  const chat = await getChatDetail(resolvedContext);

  if (!chat) {
    return NextResponse.json({ error: "Chat not found." }, { status: 404 });
  }

  return NextResponse.json({ chat });
}

export async function DELETE(_request: Request, context: ChatRouteContext) {
  const resolvedContext = await resolveChatRouteContext(context);

  if (resolvedContext instanceof NextResponse) {
    return resolvedContext;
  }

  const deleted = await deleteChat(resolvedContext);

  if (!deleted) {
    return NextResponse.json({ error: "Chat not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

async function resolveChatRouteContext(
  context: ChatRouteContext,
): Promise<{ chatId: ObjectId; workspaceId: string } | NextResponse> {
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

  const params = await context.params;
  const parsedParams = chatRouteParamsSchema.safeParse(params);

  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid chat route params." }, { status: 400 });
  }

  return {
    chatId: new ObjectId(parsedParams.data.chatId),
    workspaceId,
  };
}
