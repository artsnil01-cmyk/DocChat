import type { ObjectId } from "mongodb";

export type MessageRole = "user" | "assistant";

export type MessageStatus = "streaming" | "completed" | "failed";

export type MessageSource = {
  chunkId: ObjectId;
  relevanceScore: number;
};

export type Message = {
  _id: ObjectId;
  chatId: ObjectId;
  role: MessageRole;
  content: string;
  status: MessageStatus;
  sources?: MessageSource[];
  createdAt: Date;
};
