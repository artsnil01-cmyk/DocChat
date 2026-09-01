export type ClientChatSummary = {
  id: string;
  title: string;
  documentIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type ClientChatMessage = {
  id: string;
  chatId: string;
  role: "user" | "assistant";
  content: string;
  status: "streaming" | "completed" | "failed";
  sources?: {
    chunkId: string;
    relevanceScore: number;
  }[];
  evidence?: ClientChatEvidence[];
  createdAt: string;
};

export type ClientChatDetail = ClientChatSummary & {
  messages: ClientChatMessage[];
};

export type SendClientChatMessageRequest = {
  chatId?: string;
  question: string;
  documentIds?: string[];
};

export type ClientChatCitation = {
  sourceId: string;
  chunkId: string;
  documentId: string;
  pageStart: number;
  pageEnd: number;
};

export type ClientChatEvidence = {
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
    bestChildChunkId?: string;
    rerankRank?: number;
    rerankScore?: number;
    fusedScore?: number;
    denseScore?: number;
    denseRank?: number;
    lexicalScore?: number;
    lexicalRank?: number;
  };
};

export type SendClientChatMessageResponse = {
  chat: ClientChatSummary;
  messages: {
    user: ClientChatMessage;
    assistant: ClientChatMessage;
  };
  answer: string;
  citations: ClientChatCitation[];
  evidence: ClientChatEvidence[];
};

export type ClientChatStreamEvent =
  | {
      type: "prepared";
      chat: ClientChatSummary;
      userMessage: ClientChatMessage;
      evidence: ClientChatEvidence[];
    }
  | {
      type: "title";
      chat: ClientChatSummary;
    }
  | {
      type: "delta";
      text: string;
    }
  | {
      type: "done";
      chat: ClientChatSummary;
      assistantMessage: ClientChatMessage;
      answer: string;
      citations: string[];
      evidence: ClientChatEvidence[];
    }
  | {
      type: "error";
      error: string;
      reason?: string;
      documentId?: string;
    };
