import "server-only";

import { ObjectId } from "mongodb";

import { chatConfig } from "@/config/chat";
import { chatsCollection, messagesCollection } from "@/lib/db/collections";
import type { Chat } from "@/models/chat";
import type { Message } from "@/models/message";

export type ChatSummary = {
  id: string;
  title: string;
  documentIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type ChatMessageView = {
  id: string;
  chatId: string;
  role: Message["role"];
  content: string;
  status: Message["status"];
  sources?: {
    chunkId: string;
    relevanceScore: number;
  }[];
  createdAt: string;
};

export type ChatDetail = ChatSummary & {
  messages: ChatMessageView[];
};

export async function createChat(params: {
  workspaceId: string;
  title?: string;
}): Promise<ChatSummary> {
  const chat = await createChatRecord(params);

  return toChatSummary(chat);
}

export async function createChatRecord(params: {
  workspaceId: string;
  title?: string;
  documentIds?: ObjectId[];
}): Promise<Chat> {
  const now = new Date();
  const chat: Chat = {
    _id: new ObjectId(),
    workspaceId: params.workspaceId,
    title: params.title ?? chatConfig.defaultTitle,
    documentIds: uniqueObjectIds(params.documentIds ?? []),
    createdAt: now,
    updatedAt: now,
  };

  const chats = await chatsCollection();
  await chats.insertOne(chat);

  return chat;
}

export async function listChats(workspaceId: string): Promise<ChatSummary[]> {
  const chats = await chatsCollection();
  const workspaceChats = await chats
    .find({ workspaceId })
    .sort({ updatedAt: -1 })
    .toArray();

  return workspaceChats.map(toChatSummary);
}

export async function getChatDetail(params: {
  chatId: ObjectId;
  workspaceId: string;
}): Promise<ChatDetail | null> {
  const chat = await getWorkspaceChatRecord(params);

  if (!chat) {
    return null;
  }

  const messages = await messagesCollection();
  const recentMessages = await messages
    .find({ chatId: chat._id })
    .sort({ createdAt: -1 })
    .limit(chatConfig.recentMessageLimit)
    .toArray();

  return {
    ...toChatSummary(chat),
    messages: recentMessages.reverse().map(toChatMessageView),
  };
}

export async function getWorkspaceChatRecord(params: {
  chatId: ObjectId;
  workspaceId: string;
}): Promise<Chat | null> {
  const chats = await chatsCollection();
  return chats.findOne({
    _id: params.chatId,
    workspaceId: params.workspaceId,
  });
}

export async function deleteChat(params: {
  chatId: ObjectId;
  workspaceId: string;
}): Promise<boolean> {
  const chat = await getWorkspaceChatRecord(params);

  if (!chat) {
    return false;
  }

  const chats = await chatsCollection();
  const messages = await messagesCollection();
  await Promise.all([
    messages.deleteMany({ chatId: chat._id }),
    chats.deleteOne({ _id: chat._id }),
  ]);

  return true;
}

export async function attachDocumentsToChat(params: {
  chatId: ObjectId;
  workspaceId: string;
  documentIds: ObjectId[];
}): Promise<Chat | null> {
  const chats = await chatsCollection();
  const now = new Date();

  await chats.updateOne(
    {
      _id: params.chatId,
      workspaceId: params.workspaceId,
    },
    {
      $addToSet: {
        documentIds: {
          $each: params.documentIds,
        },
      },
      $set: {
        updatedAt: now,
      },
    },
  );

  return getWorkspaceChatRecord({
    chatId: params.chatId,
    workspaceId: params.workspaceId,
  });
}

export async function updateChatTitleIfDefault(params: {
  chatId: ObjectId;
  workspaceId: string;
  title: string;
}): Promise<Chat | null> {
  const chats = await chatsCollection();
  const now = new Date();
  const result = await chats.findOneAndUpdate(
    {
      _id: params.chatId,
      workspaceId: params.workspaceId,
      title: chatConfig.defaultTitle,
    },
    {
      $set: {
        title: params.title,
        updatedAt: now,
      },
    },
    {
      returnDocument: "after",
    },
  );

  return result ?? getWorkspaceChatRecord({
    chatId: params.chatId,
    workspaceId: params.workspaceId,
  });
}

function toChatSummary(chat: Chat): ChatSummary {
  return {
    id: chat._id.toHexString(),
    title: chat.title,
    documentIds: chat.documentIds.map((documentId) => documentId.toHexString()),
    createdAt: chat.createdAt.toISOString(),
    updatedAt: chat.updatedAt.toISOString(),
  };
}

function toChatMessageView(message: Message): ChatMessageView {
  return {
    id: message._id.toHexString(),
    chatId: message.chatId.toHexString(),
    role: message.role,
    content: message.content,
    status: message.status,
    sources: message.sources?.map((source) => ({
      chunkId: source.chunkId.toHexString(),
      relevanceScore: source.relevanceScore,
    })),
    createdAt: message.createdAt.toISOString(),
  };
}

function uniqueObjectIds(documentIds: ObjectId[]): ObjectId[] {
  const seen = new Set<string>();

  return documentIds.filter((documentId) => {
    const value = documentId.toHexString();

    if (seen.has(value)) {
      return false;
    }

    seen.add(value);
    return true;
  });
}
