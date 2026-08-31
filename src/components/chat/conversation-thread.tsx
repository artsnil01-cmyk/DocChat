import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { RefObject } from "react";

import type { ClientChatEvidence, ClientChatMessage } from "@/lib/client/chats";

import styles from "./chat.module.css";

type ConversationThreadProps = {
  messages: ClientChatMessage[];
  scrollRef?: RefObject<HTMLDivElement | null>;
};

export function ConversationThread({
  messages,
  scrollRef,
}: ConversationThreadProps) {
  return (
    <div className={styles.conversation} id="conversation" ref={scrollRef}>
      <div className={styles.chatContainer}>
        <div className={styles.messageList}>
          {messages.map((message) =>
            message.role === "user" ? (
              <UserMessage key={message.id} message={message} />
            ) : (
              <AssistantMessage key={message.id} message={message} />
            ),
          )}
        </div>
      </div>
    </div>
  );
}

function UserMessage({ message }: { message: ClientChatMessage }) {
  return (
    <div className={`${styles.messageBlock} ${styles.questionBlock}`}>
      <div className={styles.userWrap}>
        <span className={styles.questionLabel}>Vous</span>
        <div className={styles.userMessage}>{message.content}</div>
      </div>
    </div>
  );
}

function AssistantMessage({ message }: { message: ClientChatMessage }) {
  if (message.status === "streaming" && !message.content) {
    return <ThinkingMessage />;
  }

  return (
    <div className={`${styles.messageBlock} ${styles.assistantBlock}`}>
      <span className={styles.assistantHead}>DocChat</span>
      <div className={styles.assistantText}>
        {splitParagraphs(message.content).map((paragraph, index) => (
          <p key={`${message.id}:${index}`}>{paragraph}</p>
        ))}
      </div>
      <MessageSources message={message} />
    </div>
  );
}

function MessageSources({ message }: { message: ClientChatMessage }) {
  const [isOpen, setIsOpen] = useState(true);

  if (message.evidence?.length) {
    return (
      <div className={`${styles.sources} ${isOpen ? styles.sourcesOpen : ""}`}>
        <button
          className={styles.sourcesToggle}
          type="button"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((currentState) => !currentState)}
        >
          <span className={styles.sourcesCount}>{message.evidence.length}</span>
          Sources consultees
          <ChevronDown aria-hidden="true" />
        </button>
        {isOpen ? (
          <div className={styles.sourceGrid}>
            {message.evidence.map((source) => (
              <SourceCard source={source} key={source.citationId} />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  if (!message.sources?.length) {
    return null;
  }

  return (
    <div className={styles.sourcesSummary}>
      {message.sources.length} {message.sources.length === 1 ? "source" : "sources"}
    </div>
  );
}

function SourceCard({ source }: { source: ClientChatEvidence }) {
  return (
    <button className={styles.sourceCard} type="button">
      <span className={styles.sourceMeta}>
        <strong>{source.documentName}</strong>
        <span className={styles.sourcePage}>
          p. {formatPageRange(source)}
        </span>
        <span className={styles.sourceBadge}>{source.citationId}</span>
        {source.relevance?.rerankScore !== undefined ? (
          <span className={styles.sourceScore}>
            {formatScore(source.relevance.rerankScore)}
          </span>
        ) : null}
      </span>
      <span className={styles.sourceExcerpt}>{source.text}</span>
    </button>
  );
}

function ThinkingMessage() {
  return (
    <div className={`${styles.messageBlock} ${styles.assistantBlock}`}>
      <span className={styles.assistantHead}>DocChat</span>
      <div className={styles.thinking}>
        <span className={styles.thinkingBars} aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span>Recherche dans les documents...</span>
      </div>
    </div>
  );
}

function splitParagraphs(content: string): string[] {
  return content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function formatPageRange(source: ClientChatEvidence): string {
  if (source.pageStart === source.pageEnd) {
    return String(source.pageStart);
  }

  return `${source.pageStart}-${source.pageEnd}`;
}

function formatScore(score: number): string {
  return `${Math.round(score * 100)}%`;
}
