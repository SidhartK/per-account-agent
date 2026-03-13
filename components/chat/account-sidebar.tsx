"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { RefreshCw, Pencil, Save, X, Check, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Account, AccountTask } from "@/lib/types";

interface AccountSidebarProps {
  account: Account;
  refreshing: boolean;
  onRefreshSummary: () => void;
  onSaveSummary: (text: string) => Promise<void>;
  className?: string;
}

export function AccountSidebar({
  account,
  refreshing,
  onRefreshSummary,
  onSaveSummary,
  className,
}: AccountSidebarProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(account.stateSummary ?? "");
  const [saving, setSaving] = useState(false);

  const [tasks, setTasks] = useState<AccountTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Clear-task dialog state
  const [clearingTask, setClearingTask] = useState<AccountTask | null>(null);
  const [clearReason, setClearReason] = useState("");
  const [clearSubmitting, setClearSubmitting] = useState(false);

  const fetchTasks = useCallback(async () => {
    setTasksLoading(true);
    try {
      const res = await fetch(`/api/accounts/${account.id}/tasks`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } finally {
      setTasksLoading(false);
    }
  }, [account.id]);

  useEffect(() => {
    if (account.status === "active" || account.status === "paused") {
      fetchTasks();
    }
  }, [account.id, account.status, fetchTasks]);

  useEffect(() => {
    if (!editing) {
      setDraft(account.stateSummary ?? "");
    }
  }, [account.stateSummary, editing]);

  function handleOpen() {
    setDraft(account.stateSummary ?? "");
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSaveSummary(draft);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleCompleteTask(task: AccountTask) {
    const res = await fetch(`/api/account-tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    }
  }

  function openClearDialog(task: AccountTask) {
    setClearingTask(task);
    setClearReason("");
  }

  async function handleClearTask() {
    if (!clearingTask || !clearReason.trim()) return;
    setClearSubmitting(true);
    try {
      const res = await fetch(`/api/account-tasks/${clearingTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cleared", clearReason: clearReason.trim() }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === clearingTask.id ? updated : t)));
        setClearingTask(null);
        setClearReason("");
      }
    } finally {
      setClearSubmitting(false);
    }
  }

  const pendingTasks = tasks.filter((t) => t.status === "pending");
  const resolvedTasks = tasks.filter((t) => t.status !== "pending");

  const created = new Date(account.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const showTaskSection =
    account.status === "active" || account.status === "paused";

  return (
    <>
      <div className={cn("flex flex-col h-full bg-muted/30", className)}>
        <div className="px-4 py-3 border-b flex items-center justify-between shrink-0">
          <h2 className="text-sm font-semibold">Account Summary</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefreshSummary}
            disabled={refreshing}
            title="Refresh summary via LLM"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 space-y-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Status
              </p>
              <Badge variant="secondary" className="text-xs">
                {account.status}
              </Badge>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Provider
              </p>
              <p className="text-sm">
                {account.llmProvider} / {account.llmModel}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Created
              </p>
              <p className="text-sm">{created}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Summary
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                  onClick={handleOpen}
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  <span className="text-xs">Edit</span>
                </Button>
              </div>

              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                {account.stateSummary || "No summary yet."}
              </p>
            </div>

            {showTaskSection && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Tasks
                  </p>
                  {tasksLoading && (
                    <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
                  )}
                </div>

                {pendingTasks.length === 0 && !tasksLoading && (
                  <p className="text-xs text-muted-foreground italic">
                    No pending tasks. Use &ldquo;Suggest Next Actions&rdquo; to generate some.
                  </p>
                )}

                <div className="space-y-2">
                  {pendingTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-2 rounded-md border bg-background p-2.5"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-snug">{task.content}</p>
                        {task.rationale && (
                          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                            {task.rationale}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0 mt-0.5">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                          onClick={() => handleCompleteTask(task)}
                          title="Mark as completed"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => openClearDialog(task)}
                          title="Clear task"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {resolvedTasks.length > 0 && (
                  <div>
                    <button
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setShowHistory((v) => !v)}
                    >
                      {showHistory ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                      History ({resolvedTasks.length})
                    </button>

                    {showHistory && (
                      <div className="mt-2 space-y-1.5">
                        {resolvedTasks.map((task) => (
                          <div
                            key={task.id}
                            className="rounded-md border border-dashed bg-muted/30 px-2.5 py-2"
                          >
                            <div className="flex items-start gap-1.5">
                              <Badge
                                variant={task.status === "completed" ? "secondary" : "outline"}
                                className="text-xs shrink-0 mt-0.5"
                              >
                                {task.status}
                              </Badge>
                              <p className="text-xs text-muted-foreground leading-snug line-through">
                                {task.content}
                              </p>
                            </div>
                            {task.status === "cleared" && task.clearReason && (
                              <p className="text-xs text-muted-foreground mt-1 pl-0.5 italic">
                                Cleared: {task.clearReason}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Edit summary dialog */}
      <Dialog open={editing} onOpenChange={(open) => !saving && !open && setEditing(false)}>
        <DialogContent className="sm:max-w-3xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Account Summary</DialogTitle>
          </DialogHeader>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="flex-1 min-h-0 resize-none text-sm leading-relaxed font-mono"
            placeholder="Enter account summary..."
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditing(false)}
              disabled={saving}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-3.5 w-3.5 mr-1" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear task dialog */}
      <Dialog
        open={!!clearingTask}
        onOpenChange={(open) => !clearSubmitting && !open && setClearingTask(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Clear this task?</DialogTitle>
          </DialogHeader>
          {clearingTask && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground border rounded-md p-2.5 bg-muted/30">
                {clearingTask.content}
              </p>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Why are you clearing this task?
                </label>
                <Textarea
                  value={clearReason}
                  onChange={(e) => setClearReason(e.target.value)}
                  placeholder="e.g. No longer relevant, decided to go a different direction..."
                  className="resize-none"
                  rows={3}
                  autoFocus
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setClearingTask(null)}
              disabled={clearSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearTask}
              disabled={clearSubmitting || !clearReason.trim()}
            >
              {clearSubmitting ? "Clearing..." : "Clear Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
