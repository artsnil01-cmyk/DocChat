import "server-only";

import type { Collection, Document as MongoDocument } from "mongodb";

import type { Account } from "@/models/account";
import type { Chat } from "@/models/chat";
import type { Chunk } from "@/models/chunk";
import type { Document } from "@/models/document";
import type { Message } from "@/models/message";
import type { Session } from "@/models/session";
import { collectionNames } from "@/lib/db/collection-names";
import { getDatabase } from "@/lib/db/database";

export async function accountsCollection(): Promise<Collection<Account>> {
  return getTypedCollection(collectionNames.accounts);
}

export async function sessionsCollection(): Promise<Collection<Session>> {
  return getTypedCollection(collectionNames.sessions);
}

export async function documentsCollection(): Promise<Collection<Document>> {
  return getTypedCollection(collectionNames.documents);
}

export async function chunksCollection(): Promise<Collection<Chunk>> {
  return getTypedCollection(collectionNames.chunks);
}

export async function chatsCollection(): Promise<Collection<Chat>> {
  return getTypedCollection(collectionNames.chats);
}

export async function messagesCollection(): Promise<Collection<Message>> {
  return getTypedCollection(collectionNames.messages);
}

async function getTypedCollection<TSchema extends MongoDocument>(
  name: string,
): Promise<Collection<TSchema>> {
  const database = await getDatabase();
  return database.collection<TSchema>(name);
}
