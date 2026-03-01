"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, Pencil, Save, X } from "lucide-react";
import type { Account } from "@/lib/types";

interface AccountSidebarProps {
  account: Account;
  refreshing: boolean;
  onRefreshSummary: () => void;
  onSaveSummary: (text: string) => Promise<void>;
}

export function AccountSidebar({
  account,
  refreshing,
  onRefreshSummary,
  onSaveSummary,
}: AccountSidebarProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(account.stateSummary ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) {
      setDraft(account.stateSummary ?? "");
    }
  }, [account.stateSummary, editing]);

  async function handleSave() {
    setSaving(true);
    try {
      await onSaveSummary(draft);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setDraft(account.stateSummary ?? "");
    setEditing(false);
  }

  const created = new Date(account.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="w-80 border-l flex flex-col h-full bg-muted/30">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <h2 className="text-sm font-semibold">Account Summary</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefreshSummary}
          disabled={refreshing || editing}
          title="Refresh summary via LLM"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <ScrollArea className="flex-1">
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
              {!editing && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                  onClick={() => setEditing(true)}
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  <span className="text-xs">Edit</span>
                </Button>
              )}
            </div>

            {editing ? (
              <div className="space-y-2">
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="min-h-[200px] text-sm"
                  placeholder="Enter account summary..."
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    <Save className="h-3 w-3 mr-1" />
                    {saving ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                {account.stateSummary || "No summary yet."}
              </p>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
