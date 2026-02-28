import { NextResponse } from "next/server";
import { generateText } from "ai";
import { prisma } from "@/lib/db";
import { getModel } from "@/lib/llm/provider";
import { buildNextActionsPrompt } from "@/lib/llm/prompts";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const account = await prisma.account.findUnique({
    where: { id },
  });

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const prompt = buildNextActionsPrompt(account.stateSummary);

  const { text } = await generateText({
    model: getModel(account.llmProvider, account.llmModel),
    prompt,
  });

  await prisma.message.create({
    data: {
      accountId: id,
      role: "assistant",
      content: `**Suggested Next Actions**\n\n${text}`,
    },
  });

  return NextResponse.json({ actions: text });
}
