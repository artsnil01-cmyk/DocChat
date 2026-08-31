import "server-only";

import { getRagStrategy } from "@/config/rag";
import {
  resolveChatAnsweringPolicy,
  type ChatAnsweringPolicy,
} from "@/lib/chat/answering/policy";
import {
  prepareChatAnsweringSession,
  type PreparedChatAnsweringSession,
} from "@/lib/chat/answering/session";
import {
  createAssistantMessage,
  createUserMessage,
  loadRecentCompleteChatHistory,
} from "@/lib/chat/messages";
import type { ChatMessageRequest } from "@/lib/chat/schemas";
import {
  updateChatTitleIfDefault,
  type ChatMessageView,
  type ChatSummary,
  toChatMessageView,
  toChatSummary,
} from "@/lib/chat/service";
import { buildAnswerContext, type AnswerEvidenceBlock } from "@/lib/rag/context";
import { serverEnv } from "@/lib/env/server";
import {
  enrichRetrievalQuery,
  type EnrichedRetrievalQuery,
} from "@/lib/rag/enrichment";
import {
  generateGroundedAnswer,
  type GroundedAnswerOutput,
} from "@/lib/rag/answer";
import {
  resolveReadyWorkspaceDocuments,
  resolveRetrievalScope,
  retrieveDocumentEvidence,
  type ReadyWorkspaceDocumentsResult,
  type RetrievalScopeResult,
} from "@/lib/rag/retrieval";
import type { Message } from "@/models/message";

type ValidChatAnsweringPolicy = Extract<ChatAnsweringPolicy, { ok: true }>;
type ValidPreparedSession = Extract<PreparedChatAnsweringSession, { ok: true }>;
type ValidRetrievalScope = Extract<RetrievalScopeResult, { ok: true }>;
type ValidReadyWorkspaceDocuments = Extract<
  ReadyWorkspaceDocumentsResult,
  { ok: true }
>;

export type AnswerChatMessageResult =
  | {
      ok: true;
      chat: ChatSummary;
      userMessage: ChatMessageView;
      assistantMessage: ChatMessageView;
      answer: string;
      citations: string[];
      evidence: AnswerEvidenceBlock[];
    }
  | {
      ok: false;
      reason:
        | "invalid_chat_request"
        | "chat_not_found"
        | "empty_document_scope"
        | "document_not_found"
        | "document_not_ready"
        | "empty_evidence";
      documentId?: string;
    };

export async function answerChatMessage(params: {
  workspaceId: string;
  request: ChatMessageRequest;
}): Promise<AnswerChatMessageResult> {
  const policy = resolveChatAnsweringPolicy(params.request);

  if (!policy.ok) {
    return invalidChatRequest();
  }

  const explicitDocuments = await validateExplicitDocumentScope({
    workspaceId: params.workspaceId,
    policy,
  });

  if (explicitDocuments && !explicitDocuments.ok) {
    return mapDocumentScopeFailure(explicitDocuments);
  }

  const session = await prepareChatAnsweringSession({
    workspaceId: params.workspaceId,
    policy,
  });

  if (!session.ok) {
    return chatNotFound();
  }

  const scope = await resolveAnswerScope({
    workspaceId: params.workspaceId,
    session,
    explicitDocuments: explicitDocuments?.ok ? explicitDocuments : null,
  });

  if (!scope.ok) {
    return mapRetrievalScopeFailure(scope);
  }

  const history = await loadHistoryForSession(session);
  const userMessage = await createUserMessage({
    chatId: session.chat._id,
    content: session.question,
  });

  const enrichedQuery = await resolveRetrievalQuery({
    session,
    history,
  });
  const answerContext = await retrieveAnswerContext({
    scope,
    retrievalQuery: enrichedQuery.retrievalQuery,
  });

  if (answerContext.evidence.length === 0) {
    return emptyEvidence();
  }

  const groundedAnswer = await generateGroundedAnswer({
    question: session.question,
    retrievalQuery: enrichedQuery.retrievalQuery,
    answerContext,
    shouldGenerateTitle: session.shouldGenerateTitle,
  });

  return persistAssistantResponse({
    workspaceId: params.workspaceId,
    session,
    userMessage,
    groundedAnswer,
    evidence: answerContext.evidence,
  });
}

async function validateExplicitDocumentScope(params: {
  workspaceId: string;
  policy: ValidChatAnsweringPolicy;
}): Promise<ReadyWorkspaceDocumentsResult | null> {
  if (!params.policy.documentIds) {
    return null;
  }

  return resolveReadyWorkspaceDocuments({
    workspaceId: params.workspaceId,
    documentIds: params.policy.documentIds,
  });
}

async function resolveAnswerScope(params: {
  workspaceId: string;
  session: ValidPreparedSession;
  explicitDocuments: ValidReadyWorkspaceDocuments | null;
}): Promise<RetrievalScopeResult> {
  if (params.explicitDocuments) {
    return {
      ok: true,
      chat: params.session.chat,
      question: params.session.question,
      documentIds: params.explicitDocuments.documentIds,
      documents: params.explicitDocuments.documents,
    };
  }

  return resolveRetrievalScope({
    workspaceId: params.workspaceId,
    chatId: params.session.chat._id,
    question: params.session.question,
  });
}

async function loadHistoryForSession(
  session: ValidPreparedSession,
): ReturnType<typeof loadRecentCompleteChatHistory> {
  if (!session.shouldEnrichQuery) {
    return [];
  }

  return loadRecentCompleteChatHistory({
    chatId: session.chat._id,
  });
}

async function resolveRetrievalQuery(params: {
  session: ValidPreparedSession;
  history: Awaited<ReturnType<typeof loadRecentCompleteChatHistory>>;
}): Promise<EnrichedRetrievalQuery> {
  if (!params.session.shouldEnrichQuery) {
    return {
      originalQuestion: params.session.question,
      retrievalQuery: params.session.question,
      needsRewrite: false,
      fallbackUsed: false,
    };
  }

  return enrichRetrievalQuery({
    question: params.session.question,
    conversationHistory: params.history,
  });
}

async function retrieveAnswerContext(params: {
  scope: ValidRetrievalScope;
  retrievalQuery: string;
}) {
  const strategy = getRagStrategy(serverEnv.ragStrategyVersion);
  const retrieval = await retrieveDocumentEvidence({
    scope: params.scope,
    retrievalQuery: params.retrievalQuery,
    strategy,
  });

  return buildAnswerContext({
    scope: params.scope,
    rerankedCandidates: retrieval.rerankedCandidates,
    strategy,
  });
}

async function persistAssistantResponse(params: {
  workspaceId: string;
  session: ValidPreparedSession;
  userMessage: Message;
  groundedAnswer: GroundedAnswerOutput;
  evidence: AnswerEvidenceBlock[];
}): Promise<AnswerChatMessageResult> {
  const assistantMessage = await createAssistantMessage({
    chatId: params.session.chat._id,
    content: params.groundedAnswer.answer,
    evidence: params.evidence,
  });
  const chat = params.groundedAnswer.title
    ? await updateChatTitleIfDefault({
        chatId: params.session.chat._id,
        workspaceId: params.workspaceId,
        title: params.groundedAnswer.title,
      })
    : params.session.chat;

  return {
    ok: true,
    chat: toChatSummary(chat ?? params.session.chat),
    userMessage: toChatMessageView(params.userMessage),
    assistantMessage: toChatMessageView(assistantMessage),
    answer: params.groundedAnswer.answer,
    citations: params.groundedAnswer.citations.map(
      (citation) => citation.citationId,
    ),
    evidence: params.evidence,
  };
}

function invalidChatRequest(): AnswerChatMessageResult {
  return {
    ok: false,
    reason: "invalid_chat_request",
  };
}

function chatNotFound(): AnswerChatMessageResult {
  return {
    ok: false,
    reason: "chat_not_found",
  };
}

function emptyEvidence(): AnswerChatMessageResult {
  return {
    ok: false,
    reason: "empty_evidence",
  };
}

function mapDocumentScopeFailure(
  result: Exclude<
    Awaited<ReturnType<typeof resolveReadyWorkspaceDocuments>>,
    { ok: true }
  >,
): AnswerChatMessageResult {
  return {
    ok: false,
    reason: result.reason,
    documentId: result.documentId?.toHexString(),
  };
}

function mapRetrievalScopeFailure(
  result: Exclude<Awaited<ReturnType<typeof resolveRetrievalScope>>, { ok: true }>,
): AnswerChatMessageResult {
  return {
    ok: false,
    reason: result.reason,
    documentId: result.documentId?.toHexString(),
  };
}
