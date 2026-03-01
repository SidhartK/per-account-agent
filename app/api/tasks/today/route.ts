import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tasks = await prisma.dailyTask.findMany({
    where: { date: today },
    orderBy: { sortOrder: "asc" },
    include: {
      account: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ date: today.toISOString(), tasks });
}
