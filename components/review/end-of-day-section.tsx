"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import type { DailyTaskWithAccount } from "@/lib/types";

interface EndOfDaySectionProps {
  accountId: string;
  accountName: string;
  tasks: DailyTaskWithAccount[];
  onTaskToggle: (taskId: string, completed: boolean) => void;
}

export function EndOfDaySection({
  accountId,
  accountName,
  tasks,
  onTaskToggle,
}: EndOfDaySectionProps) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [agentResponse, setAgentResponse] = useState<string | null>(null);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/accounts/${accountId}/end-of-day`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progressNote: note }),
      });
      if (res.ok) {
        const data = await res.json();
        setAgentResponse(data.response);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{accountName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.map((task) => (
          <label
            key={task.id}
            className="flex items-start gap-3 cursor-pointer group"
          >
            <input
              type="checkbox"
              checked={task.completed}
              onChange={(e) => onTaskToggle(task.id, e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-input accent-primary"
            />
            <span
              className={`text-sm ${
                task.completed ? "line-through text-muted-foreground" : ""
              }`}
            >
              {task.content}
            </span>
          </label>
        ))}

        <Textarea
          placeholder="Progress notes for today..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="mt-2"
        />

        <Button
          onClick={handleSubmit}
          disabled={submitting}
          size="sm"
          className="w-full"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit End-of-Day"
          )}
        </Button>

        {agentResponse && (
          <div className="rounded-lg border bg-muted/50 p-3 text-sm whitespace-pre-wrap">
            {agentResponse}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
