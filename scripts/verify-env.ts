import { createRequire } from "node:module";

import { readServerEnv } from "../src/lib/env/schema";

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env") as typeof import("@next/env");

loadEnvConfig(process.cwd());

try {
  const env = readServerEnv(process.env);

  console.log("Environment validation passed.");
  console.log(`- NODE_ENV: ${env.nodeEnv}`);
  console.log(`- RAG_STRATEGY_VERSION: ${env.ragStrategyVersion}`);
  console.log(`- MONGODB_DATABASE: ${env.mongodbDatabase}`);
  console.log(`- TEST_USER_EMAIL: ${env.testUserEmail}`);
} catch (error) {
  console.error("Environment validation failed.");

  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }

  process.exitCode = 1;
}
