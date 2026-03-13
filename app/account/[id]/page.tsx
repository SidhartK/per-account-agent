"use client";

import { useCallback, useEffect, useRef, useState, use } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/components/chat/chat-message";
import { AccountHeader } from "@/components/chat/account-header";
import { AccountSidebar } from "@/components/chat/account-sidebar";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Lightbulb, Send, MessageSquare, FileText, Brain } from "lucide-react";
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
  const [thinkLoading, setThinkLoading] = useState(false);
  const [summaryRefreshing, setSummaryRefreshing] = useState(false);
  const [sidebarKey, setSidebarKey] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [activeView, setActiveView] = useState<"chat" | "summary">("chat");
  const [showActivationBanner, setShowActivationBanner] = useState(false);
  const isMobile = useMediaQuery("(max-width: 767px)");
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevAccountStatusRef = useRef<Account["status"] | null>(null);
  const prevChatStatusRef = useRef<string | null>(null);

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
  const showInitializingProgress =
    !showActivationBanner && account?.status === "initializing" && isStreaming;

  const refreshAccount = useCallback(async (): Promise<AccountWithMessages | null> => {
    const res = await fetch(`/api/accounts/${id}`);
    if (!res.ok) return null;
    const updated = (await res.json()) as AccountWithMessages;
    setAccount(updated);
    return updated;
  }, [id]);

  const maybeTriggerActivationBanner = useCallback(
    (prevStatus: Account["status"] | null, nextStatus: Account["status"]) => {
    if (prevStatus === "initializing" && nextStatus === "active") {
      setShowActivationBanner(true);
    }
    },
    []
  );

  useEffect(() => {
    fetch(`/api/accounts/${id}`)
      .then((res) => res.json())
      .then((data: AccountWithMessages) => {
        setAccount(data);
        prevAccountStatusRef.current = data.status;
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

  // While initializing, re-fetch once after each streamed assistant response finishes.
  useEffect(() => {
    if (!account || account.status !== "initializing") return;
    const prev = prevChatStatusRef.current;
    prevChatStatusRef.current = status;
    if (!prev) return;

    const wasStreaming = prev === "streaming" || prev === "submitted";
    const nowStreaming = status === "streaming" || status === "submitted";
    if (wasStreaming && !nowStreaming) {
      refreshAccount().then((updated) => {
        if (!updated) return;
        maybeTriggerActivationBanner(prevAccountStatusRef.current, updated.status);
        prevAccountStatusRef.current = updated.status;
      });
    }
  }, [status, account, refreshAccount, maybeTriggerActivationBanner]);

  // Safety net polling while initializing (covers cases where status flips without a chat status transition).
  useEffect(() => {
    if (!account || account.status !== "initializing") return;

    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const startedAt = Date.now();
    const poll = async (delayMs: number) => {
      timeout = setTimeout(async () => {
        if (cancelled) return;
        const updated = await refreshAccount();
        if (cancelled || !updated) return;

        maybeTriggerActivationBanner(prevAccountStatusRef.current, updated.status);
        prevAccountStatusRef.current = updated.status;

        if (updated.status !== "initializing") return;

        const elapsed = Date.now() - startedAt;
        if (elapsed > 90_000) return;
        poll(delayMs);
      }, delayMs);
    };

    poll(2000);
    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [account, refreshAccount, maybeTriggerActivationBanner]);

  // Auto-dismiss activation banner.
  useEffect(() => {
    if (!showActivationBanner) return;
    const t = setTimeout(() => setShowActivationBanner(false), 8000);
    return () => clearTimeout(t);
  }, [showActivationBanner]);

  useEffect(() => {
    const viewport = scrollRef.current?.querySelector(
      "[data-slot='scroll-area-viewport']"
    );
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight;
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
            parts: [{ type: "text" as const, text: data.actions }],
          },
        ]);
        // Refresh sidebar to show newly created tasks
        setSidebarKey((k) => k + 1);
      }
    } finally {
      setActionsLoading(false);
    }
  }

  async function handleThinkMore() {
    setThinkLoading(true);
    try {
      const res = await fetch(`/api/accounts/${id}/think`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant" as const,
            parts: [{ type: "text" as const, text: `**Thinking About This Account**\n\n${data.response}` }],
          },
        ]);
      }
    } finally {
      setThinkLoading(false);
    }
  }

  async function handleRefreshSummary() {
    setSummaryRefreshing(true);
    try {
      await fetch(`/api/accounts/${id}/summary`, { method: "POST" });
      const res = await fetch(`/api/accounts/${id}`);
      if (res.ok) {
        const updated = await res.json();
        setAccount(updated);
      }
    } finally {
      setSummaryRefreshing(false);
    }
  }

  async function handleSaveSummary(text: string) {
    const res = await fetch(`/api/accounts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stateSummary: text }),
    });
    if (res.ok) {
      const updated = await res.json();
      setAccount((prev) => (prev ? { ...prev, ...updated } : prev));
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

  const showSidebar = !isInitializing;
  const showMobileToggle = isMobile && showSidebar;

  const chatPanel = (
    <>
      <ScrollArea className="flex-1 min-h-0 p-4" ref={scrollRef}>
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
          {(account.status === "active" || account.status === "paused") && (
            <div className="flex flex-wrap gap-2 mb-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGetActions}
                disabled={actionsLoading || thinkLoading}
              >
                <Lightbulb className="mr-1 h-3 w-3" />
                {actionsLoading ? "Generating..." : "Suggest Next Actions"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleThinkMore}
                disabled={thinkLoading || actionsLoading}
              >
                <Brain className="mr-1 h-3 w-3" />
                {thinkLoading ? "Thinking..." : "Think More About It"}
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
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="flex flex-col flex-1 min-w-0 h-full">
        <AccountHeader
          account={account}
          onAccountUpdate={(a) => setAccount({ ...account, ...a })}
        />

        {showInitializingProgress && (
          <div className="border-b bg-muted/30">
            <div className="px-4 py-3 max-w-6xl mx-auto flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold">Initializing account…</p>
                <p className="text-sm text-muted-foreground">
                  Creating your system prompt and summary.
                </p>
              </div>
              <div className="hidden sm:block w-64">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-1/2 rounded-full bg-primary motion-safe:animate-[progress_1.2s_ease-in-out_infinite]" />
                </div>
              </div>
            </div>
          </div>
        )}

        {showActivationBanner && (
          <div className="border-b bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100">
            <div className="px-4 py-3 max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Account is ready</p>
                <p className="text-sm opacity-90">
                  Setup is complete. You can now use summary, actions, and normal chat.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowActivationBanner(false);
                    setActiveView("summary");
                  }}
                  className="border-green-200/60 dark:border-green-900"
                >
                  View summary
                </Button>
                <Button size="sm" onClick={() => setShowActivationBanner(false)}>
                  Continue
                </Button>
              </div>
            </div>
          </div>
        )}

        {showMobileToggle && (
          <div className="flex border-b bg-muted/30 px-4 py-1.5 gap-1">
            <Button
              variant={activeView === "chat" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveView("chat")}
              className="flex-1"
            >
              <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
              Chat
            </Button>
            <Button
              variant={activeView === "summary" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveView("summary")}
              className="flex-1"
            >
              <FileText className="mr-1.5 h-3.5 w-3.5" />
              Summary
            </Button>
          </div>
        )}

        {isMobile ? (
          activeView === "chat" || !showSidebar ? (
            chatPanel
        ) : (
          <AccountSidebar
            key={sidebarKey}
            account={account}
            refreshing={summaryRefreshing}
            onRefreshSummary={handleRefreshSummary}
            onSaveSummary={handleSaveSummary}
            className="w-full flex-1 min-h-0"
          />
        )
      ) : (
        chatPanel
      )}
    </div>

    {!isMobile && showSidebar && (
      <AccountSidebar
        key={sidebarKey}
        account={account}
        refreshing={summaryRefreshing}
        onRefreshSummary={handleRefreshSummary}
        onSaveSummary={handleSaveSummary}
        className="w-80 border-l"
      />
    )}
    </div>
  );
}
