import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getModel } from "@/lib/llm/provider";
import { buildDailyTasksPrompt } from "@/lib/llm/prompts";

const DailyTasksSchema = z.object({
  tasks: z.array(
    z.object({
      content: z.string(),
      rationale: z.string(),
    })
  ),
});

export async function GET() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const accounts = await prisma.account.findMany({
    where: { status: "active" },
  });

  const results: { accountId: string; tasksCreated: number; skipped?: boolean; error?: string }[] = [];

  for (const account of accounts) {
    const existing = await prisma.dailyTask.count({
      where: { accountId: account.id, date: today },
    });

    if (existing > 0) {
      results.push({ accountId: account.id, tasksCreated: 0, skipped: true });
      continue;
    }

    try {
      const prompt = buildDailyTasksPrompt(account.stateSummary);

      const { object } = await generateObject({
        model: getModel(account.llmProvider, account.llmModel),
        schema: DailyTasksSchema,
        prompt,
      });

      const tasks = object.tasks;

      if (tasks.length > 0) {
        await prisma.dailyTask.createMany({
          data: tasks.map((task, index) => ({
            date: today,
            accountId: account.id,
            content: task.content,
            rationale: task.rationale,
            sortOrder: index,
          })),
        });
      }

      results.push({ accountId: account.id, tasksCreated: tasks.length });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unknown error";
      results.push({ accountId: account.id, tasksCreated: 0, error: errorMessage });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
