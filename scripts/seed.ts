import { createRequire } from "node:module";

import { MongoClient } from "mongodb";

import { seedSharedAccount } from "../src/lib/auth/seed";
import { readServerEnv } from "../src/lib/env/schema";

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env") as typeof import("@next/env");

loadEnvConfig(process.cwd());

const env = readServerEnv(process.env);
const client = new MongoClient(env.mongodbUri);

try {
  await client.connect();

  const database = client.db(env.mongodbDatabase);
  const result = await seedSharedAccount(database, env);

  console.log(
    result.created
      ? `Shared account seeded: ${result.email}`
      : `Shared account already exists: ${result.email}`,
  );
} catch (error) {
  console.error("Shared account seed failed.");

  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }

  process.exitCode = 1;
} finally {
  await client.close();
}
