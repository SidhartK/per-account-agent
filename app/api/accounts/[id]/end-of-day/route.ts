import { NextResponse } from "next/server";
import { generateText } from "ai";
import { prisma } from "@/lib/db";
import { getModel } from "@/lib/llm/provider";
import { buildEndOfDayPrompt, buildSummaryUpdatePrompt } from "@/lib/llm/prompts";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { progressNote } = await request.json();

  const account = await prisma.account.findUnique({ where: { id } });
  if (!account || account.status !== "active") {
    return NextResponse.json({ error: "Account not found or not active" }, { status: 404 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tasks = await prisma.dailyTask.findMany({
    where: { accountId: id, date: today },
  });

  const completedTasks = tasks.filter((t) => t.completed).map((t) => t.content);
  const skippedTasks = tasks.filter((t) => !t.completed).map((t) => t.content);

  const eodPrompt = buildEndOfDayPrompt(
    completedTasks,
    skippedTasks,
    progressNote || "",
    account.stateSummary
  );

  const { text: agentResponse } = await generateText({
    model: getModel(account.llmProvider, account.llmModel),
    prompt: eodPrompt,
  });

  await prisma.message.createMany({
    data: [
      {
        accountId: id,
        role: "user",
        content: formatUserEodMessage(completedTasks, skippedTasks, progressNote),
      },
      {
        accountId: id,
        role: "assistant",
        content: agentResponse,
      },
    ],
  });

  const recentMessages = await prisma.message.findMany({
    where: { accountId: id },
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
    where: { id },
    data: { stateSummary: updatedSummary },
  });

  return NextResponse.json({ response: agentResponse, updatedSummary });
}

function formatUserEodMessage(
  completed: string[],
  skipped: string[],
  note: string
): string {
  let msg = "**End-of-Day Update**\n\n";
  if (completed.length > 0) {
    msg += "Completed:\n" + completed.map((t) => `- ${t}`).join("\n") + "\n\n";
  }
  if (skipped.length > 0) {
    msg += "Not done:\n" + skipped.map((t) => `- ${t}`).join("\n") + "\n\n";
  }
  if (note) {
    msg += `Notes: ${note}`;
  }
  return msg.trim();
}
