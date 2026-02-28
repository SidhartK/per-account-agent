"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowLeft, Settings, Archive, ArchiveRestore } from "lucide-react";
import Link from "next/link";
import type { Account } from "@/lib/types";

interface AccountHeaderProps {
  account: Account;
  onAccountUpdate: (account: Account) => void;
}

export function AccountHeader({ account, onAccountUpdate }: AccountHeaderProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reminderDays, setReminderDays] = useState<string>(
    account.reminderIntervalDays?.toString() || ""
  );
  const router = useRouter();

  async function handleArchiveToggle() {
    const newStatus = account.status === "archived" ? "active" : "archived";
    const res = await fetch(`/api/accounts/${account.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      const updated = await res.json();
      onAccountUpdate(updated);
      if (newStatus === "archived") router.push("/");
    }
  }

  async function handleSaveSettings() {
    const interval = reminderDays ? parseInt(reminderDays, 10) : null;
    const res = await fetch(`/api/accounts/${account.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reminderIntervalDays: interval }),
    });
    if (res.ok) {
      const updated = await res.json();
      onAccountUpdate(updated);
      setSettingsOpen(false);
    }
  }

  const statusLabel = account.status === "initializing" ? "Setting up" : account.status;

  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold">{account.name}</h1>
              <Badge variant="secondary" className="text-xs">
                {statusLabel}
              </Badge>
            </div>
            {account.stateSummary && (
              <p className="text-xs text-muted-foreground line-clamp-1 max-w-md">
                {account.stateSummary.slice(0, 100)}...
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {account.status === "active" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleArchiveToggle}
              title="Archive account"
            >
              <Archive className="h-4 w-4" />
            </Button>
          )}
          {account.status === "archived" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleArchiveToggle}
              title="Reactivate account"
            >
              <ArchiveRestore className="h-4 w-4" />
            </Button>
          )}

          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Account Settings</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <p className="text-sm text-muted-foreground">
                    {account.llmProvider} / {account.llmModel}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reminder">Reminder Interval (days)</Label>
                  <Input
                    id="reminder"
                    type="number"
                    min="1"
                    placeholder="e.g., 5 (leave empty to disable)"
                    value={reminderDays}
                    onChange={(e) => setReminderDays(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    The agent will suggest next actions at this interval.
                  </p>
                </div>
                <Button onClick={handleSaveSettings} className="w-full">
                  Save Settings
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
