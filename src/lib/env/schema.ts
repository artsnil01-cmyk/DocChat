import {
  ragStrategyVersions,
  type RagStrategyVersion,
} from "@/config/rag";

const SUPPORTED_RAG_STRATEGY_VERSIONS = ragStrategyVersions;

type EnvSource = Record<string, string | undefined>;

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

export function readServerEnv(source: EnvSource): ServerEnv {
  const nodeEnv = readNodeEnv(source);

  return {
    sessionSecret: readSecret(source, "SESSION_SECRET", { minLength: 32 }),
    ragStrategyVersion: readEnum(
      source,
      "RAG_STRATEGY_VERSION",
      SUPPORTED_RAG_STRATEGY_VERSIONS,
    ),
    testUserEmail: readEmail(source, "TEST_USER_EMAIL"),
    testUserPassword: readSecret(source, "TEST_USER_PASSWORD", {
      minLength: 8,
    }),
    mongodbUri: readMongoUri(source, "MONGODB_URI"),
    mongodbDatabase: readDatabaseName(source, "MONGODB_DATABASE"),
    blobReadWriteToken: readSecret(source, "BLOB_READ_WRITE_TOKEN"),
    blobWebhookPublicKey: readSecret(source, "BLOB_WEBHOOK_PUBLIC_KEY"),
    cohereApiKey: readSecret(source, "COHERE_API_KEY"),
    openaiApiKey: readSecret(source, "OPENAI_API_KEY"),
    nodeEnv,
    isProduction: nodeEnv === "production",
  };
}

function readRequired(source: EnvSource, name: string): string {
  const value = source[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function readSecret(
  source: EnvSource,
  name: string,
  options: { minLength?: number } = {},
): string {
  const value = readRequired(source, name);

  if (options.minLength && value.length < options.minLength) {
    throw new Error(
      `Environment variable ${name} must be at least ${options.minLength} characters long.`,
    );
  }

  return value;
}

function readEmail(source: EnvSource, name: string): string {
  const value = readRequired(source, name).toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new Error(`Environment variable ${name} must be a valid email.`);
  }

  return value;
}

function readMongoUri(source: EnvSource, name: string): string {
  const value = readRequired(source, name);

  if (!value.startsWith("mongodb://") && !value.startsWith("mongodb+srv://")) {
    throw new Error(
      `Environment variable ${name} must start with mongodb:// or mongodb+srv://.`,
    );
  }

  return value;
}

function readDatabaseName(source: EnvSource, name: string): string {
  const value = readRequired(source, name);

  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error(
      `Environment variable ${name} may only contain letters, numbers, underscores, and hyphens.`,
    );
  }

  return value;
}

function readEnum<const T extends readonly string[]>(
  source: EnvSource,
  name: string,
  allowedValues: T,
): T[number] {
  const value = readRequired(source, name);

  if (!allowedValues.includes(value)) {
    throw new Error(
      `Environment variable ${name} must be one of: ${allowedValues.join(", ")}.`,
    );
  }

  return value;
}

function readNodeEnv(source: EnvSource): ServerEnv["nodeEnv"] {
  const value = source.NODE_ENV ?? "development";

  if (value !== "development" && value !== "production" && value !== "test") {
    throw new Error("NODE_ENV must be development, production, or test.");
  }

  return value;
}
