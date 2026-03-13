import { NextResponse } from "next/server";
import { generateText, generateObject } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getModel } from "@/lib/llm/provider";
import { buildNextActionsPrompt, buildThinkMorePrompt } from "@/lib/llm/prompts";
import { refreshStaleSummary } from "@/lib/llm/summary";

const TasksSchema = z.object({
  tasks: z.array(
    z.object({
      content: z.string(),
      rationale: z.string(),
    })
  ),
});

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

  const pendingTasks = await prisma.accountTask.findMany({
    where: { accountId: id, status: "pending" },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { content: true, rationale: true },
  });

  // If there are already 2+ pending tasks, the user is stuck — run think-more instead
  if (pendingTasks.length >= 2) {
    const [completedTasks, clearedTasks, recentMessages] = await Promise.all([
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

    const responseText = `**You already have tasks to work on — let's think about what's getting in the way**\n\n${text}`;

    await prisma.message.create({
      data: { accountId: id, role: "assistant", content: responseText },
    });

    return NextResponse.json({ actions: text, mode: "think-more" });
  }

  // 0-1 pending tasks — generate new tasks
  const prompt = buildNextActionsPrompt(account.stateSummary, pendingTasks);

  let newTasks: { content: string; rationale: string }[] = [];

  try {
    const { object } = await generateObject({
      model: getModel(account.llmProvider, account.llmModel),
      schema: TasksSchema,
      prompt,
    });
    newTasks = object.tasks;
  } catch {
    // Fall back to freeform text if structured output fails
    const { text } = await generateText({
      model: getModel(account.llmProvider, account.llmModel),
      prompt: buildNextActionsPrompt(account.stateSummary, pendingTasks),
    });

    await prisma.message.create({
      data: {
        accountId: id,
        role: "assistant",
        content: `**Suggested Next Actions**\n\n${text}`,
      },
    });

    return NextResponse.json({ actions: text, mode: "suggest" });
  }

  if (newTasks.length > 0) {
    const maxOrder = await prisma.accountTask.aggregate({
      where: { accountId: id },
      _max: { sortOrder: true },
    });

    await prisma.accountTask.createMany({
      data: newTasks.map((task, index) => ({
        accountId: id,
        content: task.content,
        rationale: task.rationale,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1 + index,
      })),
    });
  }

  const tasksText = newTasks
    .map((t, i) => `${i + 1}. **${t.content}**\n   _${t.rationale}_`)
    .join("\n\n");

  const responseText = `**Suggested Next Actions**\n\n${tasksText}`;

  await prisma.message.create({
    data: { accountId: id, role: "assistant", content: responseText },
  });

  return NextResponse.json({ actions: tasksText, tasks: newTasks, mode: "suggest" });
}
