import { streamText } from "ai";
import { prisma } from "@/lib/db";
import { getModel } from "@/lib/llm/provider";
import {
  INITIALIZATION_META_PROMPT,
  buildAccountSystemPrompt,
} from "@/lib/llm/prompts";

export const maxDuration = 60;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { messages } = await request.json();

  const account = await prisma.account.findUnique({
    where: { id },
  });

  if (!account) {
    return new Response("Account not found", { status: 404 });
  }

  const isInitializing = account.status === "initializing";

  const systemPrompt = isInitializing
    ? INITIALIZATION_META_PROMPT
    : buildAccountSystemPrompt(
        account.systemPrompt || "You are a helpful assistant for this account.",
        account.stateSummary
      );

  const lastUserMessage = [...messages].reverse().find(
    (m: { role: string }) => m.role === "user"
  );
  if (lastUserMessage) {
    const textContent = extractTextFromParts(lastUserMessage);
    if (textContent) {
      await prisma.message.create({
        data: {
          accountId: id,
          role: "user",
          content: textContent,
        },
      });
    }
  }

  const convertedMessages = messages.map((m: { role: string; parts?: Array<{ type: string; text?: string }>; content?: string }) => ({
    role: m.role as "user" | "assistant" | "system",
    content: m.parts
      ? m.parts
          .filter((p: { type: string }) => p.type === "text")
          .map((p: { text?: string }) => p.text || "")
          .join("")
      : m.content || "",
  }));

  const result = streamText({
    model: getModel(account.llmProvider, account.llmModel),
    system: systemPrompt,
    messages: convertedMessages,
    onFinish: async ({ text }) => {
      await prisma.message.create({
        data: {
          accountId: id,
          role: "assistant",
          content: text,
        },
      });

      if (isInitializing) {
        await handleInitializationResponse(id, text);
      } else {
        triggerSummaryUpdate(id).catch(console.error);
      }
    },
  });

  return result.toUIMessageStreamResponse();
}

function extractTextFromParts(message: { parts?: Array<{ type: string; text?: string }>; content?: string }): string {
  if (message.parts) {
    return message.parts
      .filter((p) => p.type === "text")
      .map((p) => p.text || "")
      .join("");
  }
  return message.content || "";
}

async function handleInitializationResponse(accountId: string, text: string) {
  const marker = "---ACCOUNT_READY---";
  const endMarker = "---END_ACCOUNT_READY---";

  if (!text.includes(marker)) return;

  const block = text.substring(
    text.indexOf(marker) + marker.length,
    text.includes(endMarker) ? text.indexOf(endMarker) : undefined
  );

  const systemPromptMatch = block.match(
    /SYSTEM_PROMPT:\s*([\s\S]*?)(?=STATE_SUMMARY:|ACCOUNT_NAME:|$)/
  );
  const stateSummaryMatch = block.match(
    /STATE_SUMMARY:\s*([\s\S]*?)(?=ACCOUNT_NAME:|$)/
  );
  const accountNameMatch = block.match(/ACCOUNT_NAME:\s*(.*?)(?:\n|$)/);

  const systemPrompt = systemPromptMatch?.[1]?.trim();
  const stateSummary = stateSummaryMatch?.[1]?.trim();
  const accountName = accountNameMatch?.[1]?.trim();

  if (systemPrompt && stateSummary) {
    await prisma.account.update({
      where: { id: accountId },
      data: {
        status: "active",
        systemPrompt,
        stateSummary,
        ...(accountName ? { name: accountName } : {}),
      },
    });
  }
}

async function triggerSummaryUpdate(accountId: string) {
  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  try {
    await fetch(`${origin}/api/accounts/${accountId}/summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Failed to trigger summary update:", e);
  }
}
