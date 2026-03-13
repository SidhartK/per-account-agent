import { NextResponse } from "next/server";
import { generateText } from "ai";
import { prisma } from "@/lib/db";
import { getModel } from "@/lib/llm/provider";
import { buildThinkMorePrompt } from "@/lib/llm/prompts";
import { refreshStaleSummary } from "@/lib/llm/summary";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const account = await prisma.account.findUnique({ where: { id } });
  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  account.stateSummary = await refreshStaleSummary(account);

  const [pendingTasks, completedTasks, clearedTasks, recentMessages] =
    await Promise.all([
      prisma.accountTask.findMany({
        where: { accountId: id, status: "pending" },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { content: true, rationale: true },
      }),
      prisma.accountTask.findMany({
        where: { accountId: id, status: "completed" },
        orderBy: { resolvedAt: "desc" },
        take: 10,
        select: { content: true },
      }),
      prisma.accountTask.findMany({
        where: { accountId: id, status: "cleared" },
        orderBy: { resolvedAt: "desc" },
        take: 10,
        select: { content: true, clearReason: true },
      }),
      prisma.message.findMany({
        where: { accountId: id },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { role: true, content: true },
      }),
    ]);

  const prompt = buildThinkMorePrompt(
    account.stateSummary,
    pendingTasks,
    completedTasks,
    clearedTasks,
    recentMessages.reverse().map((m) => ({ role: m.role, content: m.content }))
  );

  const { text } = await generateText({
    model: getModel(account.llmProvider, account.llmModel),
    prompt,
  });

  const responseText = `**Thinking About This Account**\n\n${text}`;

  await prisma.message.create({
    data: {
      accountId: id,
      role: "assistant",
      content: responseText,
    },
  });

  return NextResponse.json({ response: text });
}
