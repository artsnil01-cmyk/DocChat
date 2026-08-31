import { createRequire } from "node:module";

import { MongoClient } from "mongodb";

import { createAtlasSearchIndexes } from "../src/lib/db/search-indexes";
import { readServerEnv } from "../src/lib/env/schema";

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env") as typeof import("@next/env");

loadEnvConfig(process.cwd());

const env = readServerEnv(process.env);
const client = new MongoClient(env.mongodbUri);

try {
  await client.connect();

  const database = client.db(env.mongodbDatabase);
  const createdIndexNames = await createAtlasSearchIndexes(database);

  console.log(
    createdIndexNames.length > 0
      ? `Atlas Search indexes created: ${createdIndexNames.join(", ")}`
      : "Atlas Search indexes are ready.",
  );
} catch (error) {
  console.error("Atlas Search index creation failed.");

  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }

  process.exitCode = 1;
} finally {
  await client.close();
}
