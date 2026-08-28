export const collectionNames = {
  accounts: "accounts",
  sessions: "sessions",
  documents: "documents",
  chunks: "chunks",
  chats: "chats",
  messages: "messages",
} as const;

export type CollectionName = keyof typeof collectionNames;
