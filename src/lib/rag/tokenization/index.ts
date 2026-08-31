import { getEncoding } from "js-tiktoken";

const tokenizer = getEncoding("o200k_base");

export function countTokens(text: string): number {
  if (!text) {
    return 0;
  }

  return tokenizer.encode(text).length;
}
