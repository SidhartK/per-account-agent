import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const accounts = await prisma.account.findMany({
    where: status ? { status: status as "active" | "archived" | "initializing" } : undefined,
    orderBy: { updatedAt: "desc" },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return NextResponse.json(accounts);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, llmProvider, llmModel } = body;

  const account = await prisma.account.create({
    data: {
      name: name || "New Account",
      llmProvider: llmProvider || "openai",
      llmModel: llmModel || "gpt-4o",
      status: "initializing",
    },
  });

  return NextResponse.json(account, { status: 201 });
}
