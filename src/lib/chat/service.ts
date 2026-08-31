import "server-only";

import { ObjectId } from "mongodb";

import { chatConfig } from "@/config/chat";
import {
  chatsCollection,
  chunksCollection,
  documentsCollection,
  messagesCollection,
} from "@/lib/db/collections";
import { serverEnv } from "@/lib/env/server";
import type { Chat } from "@/models/chat";
import type { Chunk } from "@/models/chunk";
import type { Document } from "@/models/document";
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
  evidence?: ChatMessageEvidenceView[];
  createdAt: string;
};

export type ChatMessageEvidenceView = {
  citationId: string;
  parentChunkId: string;
  matchedChildChunkIds: string[];
  documentId: string;
  documentName: string;
  text: string;
  pageStart: number;
  pageEnd: number;
  tokenCount: number;
  relevance?: {
    rerankScore?: number;
    fusedScore?: number;
    denseScore?: number;
    lexicalScore?: number;
  };
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
  const orderedMessages = recentMessages.reverse();
  const evidenceByMessageId = await hydrateMessageEvidence({
    workspaceId: params.workspaceId,
    messages: orderedMessages,
  });

  return {
    ...toChatSummary(chat),
    messages: orderedMessages.map((message) =>
      toChatMessageView(message, evidenceByMessageId.get(message._id.toHexString())),
    ),
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

export function toChatSummary(chat: Chat): ChatSummary {
  return {
    id: chat._id.toHexString(),
    title: chat.title,
    documentIds: chat.documentIds.map((documentId) => documentId.toHexString()),
    createdAt: chat.createdAt.toISOString(),
    updatedAt: chat.updatedAt.toISOString(),
  };
}

export function toChatMessageView(
  message: Message,
  evidence?: ChatMessageEvidenceView[],
): ChatMessageView {
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
    evidence,
    createdAt: message.createdAt.toISOString(),
  };
}

async function hydrateMessageEvidence(params: {
  workspaceId: string;
  messages: Message[];
}): Promise<Map<string, ChatMessageEvidenceView[]>> {
  const messagesWithSources = params.messages.filter(
    (message) => message.sources?.length,
  );

  if (messagesWithSources.length === 0) {
    return new Map();
  }

  const sourceChunkIds = messagesWithSources.flatMap((message) =>
    message.sources?.map((source) => source.chunkId) ?? [],
  );
  const sourceChunks = await listChunksByIds(sourceChunkIds);
  const sourceChunksById = indexChunksById(sourceChunks);
  const parentChunks = await listChunksByIds(
    sourceChunks.map((chunk) => chunk.parentId ?? chunk._id),
  );
  const parentChunksById = indexChunksById(parentChunks);
  const documentsById = await indexWorkspaceDocumentsById({
    workspaceId: params.workspaceId,
    documentIds: parentChunks.map((chunk) => chunk.documentId),
  });
  const evidenceByMessageId = new Map<string, ChatMessageEvidenceView[]>();

  for (const message of messagesWithSources) {
    const evidence: ChatMessageEvidenceView[] = [];

    for (const source of message.sources ?? []) {
      const sourceChunk = sourceChunksById.get(source.chunkId.toHexString());
      const parentChunk = sourceChunk
        ? parentChunksById.get((sourceChunk.parentId ?? sourceChunk._id).toHexString())
        : undefined;
      const document = parentChunk
        ? documentsById.get(parentChunk.documentId.toHexString())
        : undefined;

      if (!sourceChunk || !parentChunk || !document) {
        continue;
      }

      evidence.push({
        citationId: `S${evidence.length + 1}`,
        parentChunkId: parentChunk._id.toHexString(),
        matchedChildChunkIds: [sourceChunk._id.toHexString()],
        documentId: document._id.toHexString(),
        documentName: document.name,
        text: parentChunk.text,
        pageStart: parentChunk.pageStart,
        pageEnd: parentChunk.pageEnd,
        tokenCount: parentChunk.tokenCount,
        relevance: {
          rerankScore: source.relevanceScore,
        },
      });
    }

    if (evidence.length > 0) {
      evidenceByMessageId.set(message._id.toHexString(), evidence);
    }
  }

  return evidenceByMessageId;
}

async function listChunksByIds(chunkIds: ObjectId[]): Promise<Chunk[]> {
  if (chunkIds.length === 0) {
    return [];
  }

  const chunks = await chunksCollection();
  return chunks
    .find({
      _id: {
        $in: uniqueObjectIds(chunkIds),
      },
      strategyVersion: serverEnv.ragStrategyVersion,
    })
    .toArray();
}

async function indexWorkspaceDocumentsById(params: {
  workspaceId: string;
  documentIds: ObjectId[];
}): Promise<Map<string, Document>> {
  if (params.documentIds.length === 0) {
    return new Map();
  }

  const documents = await documentsCollection();
  const workspaceDocuments = await documents
    .find({
      _id: {
        $in: uniqueObjectIds(params.documentIds),
      },
      workspaceId: params.workspaceId,
    })
    .toArray();

  return new Map(
    workspaceDocuments.map((document) => [document._id.toHexString(), document]),
  );
}

function indexChunksById(chunks: Chunk[]): Map<string, Chunk> {
  return new Map(chunks.map((chunk) => [chunk._id.toHexString(), chunk]));
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
