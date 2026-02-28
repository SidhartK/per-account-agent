import { NextResponse } from "next/server";
import { generateText } from "ai";
import { prisma } from "@/lib/db";
import { getModel } from "@/lib/llm/provider";
import { buildSummaryUpdatePrompt } from "@/lib/llm/prompts";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const account = await prisma.account.findUnique({
    where: { id },
  });

  if (!account || account.status !== "active") {
    return NextResponse.json(
      { error: "Account not found or not active" },
      { status: 404 }
    );
  }

  const recentMessages = await prisma.message.findMany({
    where: { accountId: id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  if (recentMessages.length === 0) {
    return NextResponse.json({ summary: account.stateSummary });
  }

  const messagesForPrompt = recentMessages.reverse().map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const prompt = buildSummaryUpdatePrompt(account.stateSummary, messagesForPrompt);

  const { text } = await generateText({
    model: getModel(account.llmProvider, account.llmModel),
    prompt,
  });

  await prisma.account.update({
    where: { id },
    data: { stateSummary: text },
  });

  return NextResponse.json({ summary: text });
}
