"use client";

import { cn } from "@/lib/utils";

interface ChatMessageProps {
  role: "user" | "assistant" | "system";
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === "user";
  const isSystem = role === "system";

  return (
    <div
      className={cn(
        "flex w-full",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-md"
            : isSystem
              ? "bg-muted/50 border border-dashed text-muted-foreground rounded-bl-md italic"
              : "bg-muted text-foreground rounded-bl-md"
        )}
      >
        {formatContent(content)}
      </div>
    </div>
  );
}

function formatContent(content: string): React.ReactNode {
  const parts = content.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}
