import "server-only";

import { ObjectId } from "mongodb";

import { chatConfig } from "@/config/chat";
import { messagesCollection } from "@/lib/db/collections";
import type { AnswerEvidenceBlock } from "@/lib/rag/context";
import type { Message, MessageRole, MessageSource } from "@/models/message";

export type ChatHistoryMessage = {
  role: MessageRole;
  content: string;
};

export async function createUserMessage(params: {
  chatId: ObjectId;
  content: string;
}): Promise<Message> {
  return createMessage({
    chatId: params.chatId,
    role: "user",
    content: params.content,
    status: "completed",
  });
}

export async function createAssistantMessage(params: {
  chatId: ObjectId;
  content: string;
  evidence: AnswerEvidenceBlock[];
}): Promise<Message> {
  return createMessage({
    chatId: params.chatId,
    role: "assistant",
    content: params.content,
    status: "completed",
    sources: buildMessageSources(params.evidence),
  });
}

export async function loadRecentCompleteChatHistory(params: {
  chatId: ObjectId;
}): Promise<ChatHistoryMessage[]> {
  const messages = await messagesCollection();
  const recentMessages = await messages
    .find({
      chatId: params.chatId,
      status: "completed",
    })
    .sort({ createdAt: -1 })
    .limit(chatConfig.recentMessageLimit)
    .toArray();

  return recentMessages.reverse().map((message) => ({
    role: message.role,
    content: message.content,
  }));
}

async function createMessage(params: {
  chatId: ObjectId;
  role: MessageRole;
  content: string;
  status: Message["status"];
  sources?: MessageSource[];
}): Promise<Message> {
  const message: Message = {
    _id: new ObjectId(),
    chatId: params.chatId,
    role: params.role,
    content: params.content,
    status: params.status,
    sources: params.sources,
    createdAt: new Date(),
  };
  const messages = await messagesCollection();
  await messages.insertOne(message);

  return message;
}

function buildMessageSources(evidence: AnswerEvidenceBlock[]): MessageSource[] {
  return evidence.map((block) => ({
    chunkId: new ObjectId(block.relevance.bestChildChunkId),
    relevanceScore: block.relevance.rerankScore,
  }));
}
