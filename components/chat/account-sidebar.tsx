"use client";

import { useState, useEffect } from "react";
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
import { Pencil, RefreshCw, Save, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Account } from "@/lib/types";
import ReactMarkdown from "react-markdown";

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

  const created = new Date(account.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <>
      <div className={cn("flex flex-col h-full bg-muted/30", className)}>
        <div className="px-4 py-3 border-b shrink-0">
          <h2 className="text-sm font-semibold">Account Summary</h2>
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
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={onRefreshSummary}
                    disabled={refreshing}
                    title="Regenerate summary via LLM"
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${refreshing ? "animate-spin" : ""}`} />
                    <span className="text-xs">{refreshing ? "Regenerating..." : "Regenerate"}</span>
                  </Button>
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
              </div>

              {account.stateSummary ? (
                <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-headings:text-sm prose-headings:font-semibold prose-headings:my-1.5 prose-strong:font-semibold">
                  <ReactMarkdown>{account.stateSummary}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No summary yet.</p>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>

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
    </>
  );
}
