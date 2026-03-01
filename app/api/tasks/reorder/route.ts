import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(request: Request) {
  const { taskIds } = await request.json();

  if (!Array.isArray(taskIds) || taskIds.length === 0) {
    return NextResponse.json({ error: "taskIds must be a non-empty array" }, { status: 400 });
  }

  await prisma.$transaction(
    taskIds.map((id: string, index: number) =>
      prisma.dailyTask.update({
        where: { id },
        data: { sortOrder: index },
      })
    )
  );

  return NextResponse.json({ success: true });
}
