import "server-only";

import type { Db } from "mongodb";

import { serverEnv } from "@/lib/env/server";
import { getMongoClient } from "@/lib/db/mongodb";

export async function getDatabase(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(serverEnv.mongodbDatabase);
}
