import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { completed } = await request.json();

  if (typeof completed !== "boolean") {
    return NextResponse.json({ error: "completed must be a boolean" }, { status: 400 });
  }

  const task = await prisma.dailyTask.update({
    where: { id },
    data: { completed },
  });

  return NextResponse.json(task);
}
