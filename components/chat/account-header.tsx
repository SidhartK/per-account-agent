"use client";

import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Settings, Archive, ArchiveRestore, Pause, Play } from "lucide-react";
import Link from "next/link";
import { AVAILABLE_MODELS } from "@/lib/llm/provider";
import type { Account } from "@/lib/types";
import type { LlmProvider } from "@/lib/types";

interface AccountHeaderProps {
  account: Account;
  onAccountUpdate: (account: Account) => void;
}

export function AccountHeader({ account, onAccountUpdate }: AccountHeaderProps) {
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [provider, setProvider] = useState<LlmProvider>(account.llmProvider);
  const [model, setModel] = useState(account.llmModel);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settingsOpen && account) {
      const models = AVAILABLE_MODELS[account.llmProvider];
      const validModel = models.includes(account.llmModel) ? account.llmModel : models[0];
      setProvider(account.llmProvider);
      setModel(validModel);
    }
  }, [settingsOpen, account?.llmProvider, account?.llmModel]);

  function handleProviderChange(value: LlmProvider) {
    setProvider(value);
    setModel(AVAILABLE_MODELS[value][0]);
  }

  async function handleSaveLlm() {
    setSaving(true);
    const res = await fetch(`/api/accounts/${account.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ llmProvider: provider, llmModel: model }),
    });
    if (res.ok) {
      const updated = await res.json();
      onAccountUpdate(updated);
      setSettingsOpen(false);
    }
    setSaving(false);
  }

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
                  <Label>LLM Provider</Label>
                  <Select value={provider} onValueChange={handleProviderChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="anthropic">Anthropic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Model</Label>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_MODELS[provider].map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSaveLlm} className="w-full" disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
