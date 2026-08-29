import { createRequire } from "node:module";

import { MongoClient, ObjectId } from "mongodb";

import { hashPassword } from "../src/lib/auth/passwords";
import { collectionNames } from "../src/lib/db/collection-names";
import { readServerEnv } from "../src/lib/env/schema";
import type { Account } from "../src/models/account";

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env") as typeof import("@next/env");

loadEnvConfig(process.cwd());

const env = readServerEnv(process.env);
const client = new MongoClient(env.mongodbUri);

try {
  await client.connect();

  const database = client.db(env.mongodbDatabase);
  const accounts = database.collection<Account>(collectionNames.accounts);
  const existingAccount = await accounts.findOne({ email: env.testUserEmail });

  if (existingAccount) {
    console.log(`Shared account already exists: ${env.testUserEmail}`);
    process.exit(0);
  }

  const account: Account = {
    _id: new ObjectId(),
    email: env.testUserEmail,
    passwordHash: await hashPassword(env.testUserPassword),
    createdAt: new Date(),
  };

  await accounts.insertOne(account);

  console.log(`Shared account seeded: ${env.testUserEmail}`);
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
