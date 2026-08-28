import "server-only";

import { MongoClient } from "mongodb";

import { serverEnv } from "@/lib/env/server";

type MongoGlobal = typeof globalThis & {
  __docchatMongoClientPromise?: Promise<MongoClient>;
};

const globalForMongo = globalThis as MongoGlobal;

let clientPromise: Promise<MongoClient> | undefined;

export function getMongoClient(): Promise<MongoClient> {
  if (serverEnv.isProduction) {
    clientPromise ??= createMongoClient();
    return clientPromise;
  }

  globalForMongo.__docchatMongoClientPromise ??= createMongoClient();
  return globalForMongo.__docchatMongoClientPromise;
}

function createMongoClient(): Promise<MongoClient> {
  const client = new MongoClient(serverEnv.mongodbUri);
  return client.connect();
}
