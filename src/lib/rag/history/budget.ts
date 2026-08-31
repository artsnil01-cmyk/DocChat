import { countTokens } from "@/lib/rag/tokenization";

export type RagHistoryEntry = {
  role: "user" | "assistant";
  content: string;
};

export function limitConversationHistory<TEntry extends RagHistoryEntry>(params: {
  history: TEntry[];
  maxCompleteTurns: number;
  maxTokens: number;
}): TEntry[] {
  const completeTurns = getRecentCompleteTurns({
    history: params.history,
    maxCompleteTurns: params.maxCompleteTurns,
  });
  const boundedTurns = [];
  let tokenCount = 0;

  for (let index = completeTurns.length - 1; index >= 0; index -= 1) {
    const turn = completeTurns[index];
    const turnTokens = getTurnTokenCount(turn);

    if (tokenCount + turnTokens > params.maxTokens) {
      continue;
    }

    boundedTurns.unshift(turn);
    tokenCount += turnTokens;
  }

  return boundedTurns.flat();
}

function getRecentCompleteTurns<TEntry extends RagHistoryEntry>(params: {
  history: TEntry[];
  maxCompleteTurns: number;
}): TEntry[][] {
  const turns: TEntry[][] = [];

  for (let index = 0; index < params.history.length - 1; index += 1) {
    const userMessage = params.history[index];
    const assistantMessage = params.history[index + 1];

    if (userMessage.role === "user" && assistantMessage.role === "assistant") {
      turns.push([userMessage, assistantMessage]);
      index += 1;
    }
  }

  return turns.slice(-params.maxCompleteTurns);
}

function getTurnTokenCount<TEntry extends RagHistoryEntry>(turn: TEntry[]): number {
  return turn.reduce(
    (total, entry) => total + countTokens(`${entry.role}: ${entry.content}`),
    0,
  );
}
