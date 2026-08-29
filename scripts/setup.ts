import { createRequire } from "node:module";

import { MongoClient } from "mongodb";

import { seedSharedAccount } from "../src/lib/auth/seed";
import { createMongoIndexes } from "../src/lib/db/indexes";
import { readServerEnv } from "../src/lib/env/schema";

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env") as typeof import("@next/env");
const { list } = require("@vercel/blob") as typeof import("@vercel/blob");

loadEnvConfig(process.cwd());

const env = readServerEnv(process.env);
const client = new MongoClient(env.mongodbUri);

try {
  console.log("Environment validation passed.");

  await client.connect();
  console.log("MongoDB connection passed.");

  const database = client.db(env.mongodbDatabase);

  await createMongoIndexes(database);
  console.log("MongoDB base indexes are ready.");

  await list({
    limit: 1,
    token: env.blobReadWriteToken,
  });
  console.log("Vercel Blob access passed.");

  const seedResult = await seedSharedAccount(database, env);
  console.log(
    seedResult.created
      ? `Shared account seeded: ${seedResult.email}`
      : `Shared account already exists: ${seedResult.email}`,
  );

  console.log("Setup completed.");
} catch (error) {
  console.error("Setup failed.");

  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }

  process.exitCode = 1;
} finally {
  await client.close();
}
