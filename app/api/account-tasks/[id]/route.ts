import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const task = await prisma.accountTask.findUnique({ where: { id } });
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const body = await request.json();
  const { status, clearReason } = body;

  if (!status || !["completed", "cleared"].includes(status)) {
    return NextResponse.json(
      { error: "status must be 'completed' or 'cleared'" },
      { status: 400 }
    );
  }

  if (status === "cleared" && (!clearReason || typeof clearReason !== "string")) {
    return NextResponse.json(
      { error: "clearReason is required when status is 'cleared'" },
      { status: 400 }
    );
  }

  const updatedTask = await prisma.accountTask.update({
    where: { id },
    data: {
      status,
      clearReason: status === "cleared" ? clearReason : null,
      resolvedAt: new Date(),
    },
  });

  if (status === "cleared") {
    await prisma.message.createMany({
      data: [
        {
          accountId: task.accountId,
          role: "assistant",
          content: `[TASK] ${task.content}`,
        },
        {
          accountId: task.accountId,
          role: "user",
          content: `[TASK_CLEARED] ${clearReason}`,
        },
      ],
    });
  }

  return NextResponse.json(updatedTask);
}
