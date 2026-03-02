import { generateText } from "ai";
import { prisma } from "@/lib/db";
import { getModel } from "@/lib/llm/provider";
import { buildSummaryUpdatePrompt } from "@/lib/llm/prompts";
import type { LlmProvider } from "@/lib/types";

interface AccountForSummary {
  id: string;
  llmProvider: LlmProvider;
  llmModel: string;
  stateSummary: string | null;
  updatedAt: Date;
}

/**
 * Refreshes the account's stateSummary if it is stale — i.e. the latest
 * message was created after the account was last updated. Returns the
 * (possibly refreshed) summary.
 */
export async function refreshStaleSummary(
  account: AccountForSummary
): Promise<string | null> {
  const latestMessage = await prisma.message.findFirst({
    where: { accountId: account.id },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  if (!latestMessage || latestMessage.createdAt <= account.updatedAt) {
    return account.stateSummary;
  }

  const recentMessages = await prisma.message.findMany({
    where: { accountId: account.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const summaryPrompt = buildSummaryUpdatePrompt(
    account.stateSummary,
    recentMessages.reverse().map((m) => ({ role: m.role, content: m.content }))
  );

  const { text: updatedSummary } = await generateText({
    model: getModel(account.llmProvider, account.llmModel),
    prompt: summaryPrompt,
  });

  await prisma.account.update({
    where: { id: account.id },
    data: { stateSummary: updatedSummary },
  });

  return updatedSummary;
}
