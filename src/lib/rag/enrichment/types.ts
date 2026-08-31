export type ConversationHistoryEntry = {
  role: "user" | "assistant";
  content: string;
};

export type QueryEnrichmentInput = {
  question: string;
  conversationHistory: ConversationHistoryEntry[];
};

export type QueryEnrichmentOutput = {
  needsRewrite: boolean;
  query: string;
};

export type EnrichedRetrievalQuery = {
  originalQuestion: string;
  retrievalQuery: string;
  needsRewrite: boolean;
  fallbackUsed: boolean;
};
