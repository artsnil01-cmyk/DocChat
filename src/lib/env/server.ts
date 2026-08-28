import "server-only";

const SUPPORTED_RAG_STRATEGY_VERSIONS = ["parent-child-v1"] as const;

type RagStrategyVersion = (typeof SUPPORTED_RAG_STRATEGY_VERSIONS)[number];

export type ServerEnv = {
  sessionSecret: string;
  ragStrategyVersion: RagStrategyVersion;
  testUserEmail: string;
  testUserPassword: string;
  mongodbUri: string;
  mongodbDatabase: string;
  blobReadWriteToken: string;
  blobWebhookPublicKey: string;
  cohereApiKey: string;
  openaiApiKey: string;
  nodeEnv: "development" | "production" | "test";
  isProduction: boolean;
};

export const serverEnv: ServerEnv = {
  sessionSecret: readSecret("SESSION_SECRET", { minLength: 32 }),
  ragStrategyVersion: readEnum(
    "RAG_STRATEGY_VERSION",
    SUPPORTED_RAG_STRATEGY_VERSIONS,
  ),
  testUserEmail: readEmail("TEST_USER_EMAIL"),
  testUserPassword: readSecret("TEST_USER_PASSWORD", { minLength: 8 }),
  mongodbUri: readMongoUri("MONGODB_URI"),
  mongodbDatabase: readDatabaseName("MONGODB_DATABASE"),
  blobReadWriteToken: readSecret("BLOB_READ_WRITE_TOKEN"),
  blobWebhookPublicKey: readSecret("BLOB_WEBHOOK_PUBLIC_KEY"),
  cohereApiKey: readSecret("COHERE_API_KEY"),
  openaiApiKey: readSecret("OPENAI_API_KEY"),
  nodeEnv: readNodeEnv(),
  isProduction: process.env.NODE_ENV === "production",
};

function readRequired(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function readSecret(
  name: string,
  options: { minLength?: number } = {},
): string {
  const value = readRequired(name);

  if (options.minLength && value.length < options.minLength) {
    throw new Error(
      `Environment variable ${name} must be at least ${options.minLength} characters long.`,
    );
  }

  return value;
}

function readEmail(name: string): string {
  const value = readRequired(name).toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new Error(`Environment variable ${name} must be a valid email.`);
  }

  return value;
}

function readMongoUri(name: string): string {
  const value = readRequired(name);

  if (!value.startsWith("mongodb://") && !value.startsWith("mongodb+srv://")) {
    throw new Error(
      `Environment variable ${name} must start with mongodb:// or mongodb+srv://.`,
    );
  }

  return value;
}

function readDatabaseName(name: string): string {
  const value = readRequired(name);

  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error(
      `Environment variable ${name} may only contain letters, numbers, underscores, and hyphens.`,
    );
  }

  return value;
}

function readEnum<const T extends readonly string[]>(
  name: string,
  allowedValues: T,
): T[number] {
  const value = readRequired(name);

  if (!allowedValues.includes(value)) {
    throw new Error(
      `Environment variable ${name} must be one of: ${allowedValues.join(", ")}.`,
    );
  }

  return value;
}

function readNodeEnv(): ServerEnv["nodeEnv"] {
  const value = process.env.NODE_ENV ?? "development";

  if (value !== "development" && value !== "production" && value !== "test") {
    throw new Error("NODE_ENV must be development, production, or test.");
  }

  return value;
}
