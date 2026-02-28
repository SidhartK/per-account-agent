"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AccountWithMessages } from "@/lib/types";

function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(date).toLocaleDateString();
}

const statusStyles: Record<string, string> = {
  initializing: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  archived: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

export function AccountCard({ account }: { account: AccountWithMessages }) {
  const summarySnippet = account.stateSummary
    ? account.stateSummary.slice(0, 120) + (account.stateSummary.length > 120 ? "..." : "")
    : account.status === "initializing"
      ? "Setup in progress..."
      : "No summary yet";

  return (
    <Link href={`/account/${account.id}`}>
      <Card className="h-full transition-all hover:shadow-md hover:border-primary/30 cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg leading-tight">{account.name}</CardTitle>
            <Badge
              variant="secondary"
              className={`shrink-0 text-xs ${statusStyles[account.status] || ""}`}
            >
              {account.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Updated {formatRelativeTime(account.updatedAt)}
          </p>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-3">
            {summarySnippet}
          </p>
          {account.reminderIntervalDays && (
            <p className="text-xs text-muted-foreground mt-2">
              Reminder every {account.reminderIntervalDays}d
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
