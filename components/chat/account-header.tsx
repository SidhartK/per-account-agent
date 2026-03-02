"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowLeft, Settings, Archive, ArchiveRestore, Pause, Play } from "lucide-react";
import Link from "next/link";
import type { Account } from "@/lib/types";

interface AccountHeaderProps {
  account: Account;
  onAccountUpdate: (account: Account) => void;
}

export function AccountHeader({ account, onAccountUpdate }: AccountHeaderProps) {
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

  async function handlePauseToggle() {
    const newStatus = account.status === "paused" ? "active" : "paused";
    const res = await fetch(`/api/accounts/${account.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      const updated = await res.json();
      onAccountUpdate(updated);
    }
  }

  const statusLabels: Record<string, string> = {
    initializing: "Setting up",
    active: "Active",
    paused: "Paused",
    archived: "Archived",
  };
  const statusLabel = statusLabels[account.status] ?? account.status;

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
          </div>
        </div>

        <div className="flex items-center gap-1">
          {account.status === "active" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePauseToggle}
              title="Pause account"
            >
              <Pause className="h-4 w-4" />
            </Button>
          )}
          {account.status === "paused" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePauseToggle}
              title="Resume account"
            >
              <Play className="h-4 w-4" />
            </Button>
          )}
          {(account.status === "active" || account.status === "paused") && (
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

          <Dialog>
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
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
