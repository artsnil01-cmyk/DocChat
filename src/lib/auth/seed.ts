import { ObjectId, type Db } from "mongodb";

import { hashPassword } from "@/lib/auth/passwords";
import { collectionNames } from "@/lib/db/collection-names";
import type { ServerEnv } from "@/lib/env/schema";
import type { Account } from "@/models/account";

export type SeedSharedAccountResult = {
  email: string;
  created: boolean;
};

export async function seedSharedAccount(
  database: Db,
  env: ServerEnv,
): Promise<SeedSharedAccountResult> {
  const accounts = database.collection<Account>(collectionNames.accounts);
  const existingAccount = await accounts.findOne({ email: env.testUserEmail });

  if (existingAccount) {
    return {
      email: env.testUserEmail,
      created: false,
    };
  }

  await accounts.insertOne({
    _id: new ObjectId(),
    email: env.testUserEmail,
    passwordHash: await hashPassword(env.testUserPassword),
    createdAt: new Date(),
  });

  return {
    email: env.testUserEmail,
    created: true,
  };
}
