import { createRequire } from "node:module";

import { MongoClient } from "mongodb";

import { createMongoIndexes } from "../src/lib/db/indexes";
import { readServerEnv } from "../src/lib/env/schema";

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env") as typeof import("@next/env");

loadEnvConfig(process.cwd());

const env = readServerEnv(process.env);
const client = new MongoClient(env.mongodbUri);

try {
  await client.connect();

  const database = client.db(env.mongodbDatabase);
  await createMongoIndexes(database);

  console.log("MongoDB base indexes are ready.");
} catch (error) {
  console.error("MongoDB index creation failed.");

  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }

  process.exitCode = 1;
} finally {
  await client.close();
}
