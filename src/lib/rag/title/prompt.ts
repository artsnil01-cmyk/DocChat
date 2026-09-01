export type ChatTitleInput = {
  question: string;
};

export const chatTitleInstructions = [
  "Generate a concise chat title from the user's question.",
  "Use the same language as the user's question.",
  "Do not use em dashes.",
  "Return only the requested JSON object.",
].join("\n");

export function buildChatTitleInput(input: ChatTitleInput): string {
  return JSON.stringify({
    question: input.question,
  });
}
