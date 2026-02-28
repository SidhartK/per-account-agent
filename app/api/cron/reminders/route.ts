import { NextResponse } from "next/server";
import { generateText } from "ai";
import { prisma } from "@/lib/db";
import { getModel } from "@/lib/llm/provider";
import { buildNextActionsPrompt } from "@/lib/llm/prompts";

export async function GET() {
  const now = new Date();

  const accounts = await prisma.account.findMany({
    where: {
      status: "active",
      reminderIntervalDays: { not: null },
    },
  });

  const results: { accountId: string; triggered: boolean; error?: string }[] = [];

  for (const account of accounts) {
    if (!account.reminderIntervalDays) continue;

    const intervalMs = account.reminderIntervalDays * 24 * 60 * 60 * 1000;
    const lastReminder = account.lastReminderAt || account.createdAt;
    const nextDue = new Date(lastReminder.getTime() + intervalMs);

    if (now < nextDue) {
      results.push({ accountId: account.id, triggered: false });
      continue;
    }

    try {
      const prompt = buildNextActionsPrompt(account.stateSummary);

      const { text } = await generateText({
        model: getModel(account.llmProvider, account.llmModel),
        prompt,
      });

      await prisma.message.create({
        data: {
          accountId: account.id,
          role: "assistant",
          content: `**Scheduled Reminder — Suggested Next Actions**\n\n${text}`,
        },
      });

      await prisma.account.update({
        where: { id: account.id },
        data: { lastReminderAt: now },
      });

      results.push({ accountId: account.id, triggered: true });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unknown error";
      results.push({ accountId: account.id, triggered: false, error: errorMessage });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
