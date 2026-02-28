import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";
import type { LlmProvider } from "@/lib/types";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export function getModel(provider: LlmProvider, model: string): LanguageModel {
  switch (provider) {
    case "openai":
      return openai(model);
    case "anthropic":
      return anthropic(model);
    default:
      throw new Error(`Unknown LLM provider: ${provider}`);
  }
}

export const DEFAULT_PROVIDER: LlmProvider = "openai";
export const DEFAULT_MODEL = "gpt-4o";

export const AVAILABLE_MODELS: Record<LlmProvider, string[]> = {
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o3-mini"],
  anthropic: ["claude-sonnet-4-20250514", "claude-3-5-haiku-20241022"],
};
