"use client";

import { useEffect, useRef, useState, use } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/components/chat/chat-message";
import { AccountHeader } from "@/components/chat/account-header";
import { Lightbulb, Send, RefreshCw } from "lucide-react";
import type { Account, AccountWithMessages } from "@/lib/types";
import type { UIMessage } from "ai";

function getTextContent(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export default function AccountChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [account, setAccount] = useState<AccountWithMessages | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [actionsLoading, setActionsLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    sendMessage,
    status,
    setMessages,
  } = useChat({
    id: `account-${id}`,
    transport: new DefaultChatTransport({
      api: `/api/accounts/${id}/chat`,
    }),
  });

  const isStreaming = status === "streaming" || status === "submitted";

  useEffect(() => {
    fetch(`/api/accounts/${id}`)
      .then((res) => res.json())
      .then((data: AccountWithMessages) => {
        setAccount(data);
        if (data.messages.length > 0) {
          const uiMessages: UIMessage[] = data.messages.map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant" | "system",
            parts: [{ type: "text" as const, text: m.content }],
          }));
          setMessages(uiMessages);
        }
        setPageLoading(false);
      })
      .catch(() => setPageLoading(false));
  }, [id, setMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend() {
    const text = inputValue.trim();
    if (!text || isStreaming) return;
    setInputValue("");
    await sendMessage({ text });
  }

  async function handleGetActions() {
    setActionsLoading(true);
    try {
      const res = await fetch(`/api/accounts/${id}/actions`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant" as const,
            parts: [{ type: "text" as const, text: `**Suggested Next Actions**\n\n${data.actions}` }],
          },
        ]);
      }
    } finally {
      setActionsLoading(false);
    }
  }

  async function handleRefreshSummary() {
    await fetch(`/api/accounts/${id}/summary`, { method: "POST" });
    const res = await fetch(`/api/accounts/${id}`);
    if (res.ok) {
      const updated = await res.json();
      setAccount(updated);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading account...</p>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Account not found</p>
      </div>
    );
  }

  const isInitializing = account.status === "initializing";

  return (
    <div className="flex flex-col h-screen">
      <AccountHeader
        account={account}
        onAccountUpdate={(a) => setAccount({ ...account, ...a })}
      />

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="max-w-3xl mx-auto space-y-4 pb-4">
          {messages.length === 0 && isInitializing && (
            <div className="text-center py-10 space-y-3">
              <h2 className="text-lg font-semibold">
                Let&apos;s set up this account
              </h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Start by telling the agent what this account is about. It will
                ask you questions to understand the context, then create a
                tailored setup.
              </p>
            </div>
          )}
          {messages.length === 0 && !isInitializing && (
            <div className="text-center py-10 space-y-3">
              <h2 className="text-lg font-semibold">Ready to chat</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Provide updates, ask questions, or request next actions for this
                account.
              </p>
            </div>
          )}
          {messages.map((m) => (
            <ChatMessage
              key={m.id}
              role={m.role as "user" | "assistant" | "system"}
              content={getTextContent(m)}
            />
          ))}
          {isStreaming && messages.length > 0 && getTextContent(messages[messages.length - 1]) === "" && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 text-sm text-muted-foreground">
                Thinking...
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t bg-background p-4">
        <div className="max-w-3xl mx-auto">
          {account.status === "active" && (
            <div className="flex gap-2 mb-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGetActions}
                disabled={actionsLoading}
              >
                <Lightbulb className="mr-1 h-3 w-3" />
                {actionsLoading ? "Generating..." : "Suggest Next Actions"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshSummary}
              >
                <RefreshCw className="mr-1 h-3 w-3" />
                Refresh Summary
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={
                isInitializing
                  ? "Describe what this account is about..."
                  : "Type an update or question..."
              }
              className="min-h-[44px] max-h-[200px] resize-none"
              rows={1}
            />
            <Button
              type="button"
              size="icon"
              disabled={!inputValue.trim() || isStreaming}
              onClick={handleSend}
              className="shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
