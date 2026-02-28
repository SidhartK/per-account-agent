import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const account = await prisma.account.findUnique({
    where: { id },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  return NextResponse.json(account);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const allowedFields = [
    "name",
    "status",
    "llmProvider",
    "llmModel",
    "systemPrompt",
    "stateSummary",
    "reminderIntervalDays",
  ];

  const data: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) {
      data[field] = body[field];
    }
  }

  const account = await prisma.account.update({
    where: { id },
    data,
  });

  return NextResponse.json(account);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.account.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
