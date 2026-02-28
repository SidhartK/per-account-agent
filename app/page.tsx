"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccountCard } from "@/components/dashboard/account-card";
import { NewAccountDialog } from "@/components/dashboard/new-account-dialog";
import type { AccountWithMessages } from "@/lib/types";

export default function DashboardPage() {
  const [accounts, setAccounts] = useState<AccountWithMessages[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/accounts")
      .then((res) => res.json())
      .then((data) => {
        setAccounts(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const activeAccounts = accounts.filter((a) => a.status !== "archived");
  const archivedAccounts = accounts.filter((a) => a.status === "archived");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Per-Account Agent</h1>
            <p className="text-sm text-muted-foreground">
              Manage your accounts, each with its own AI agent
            </p>
          </div>
          <NewAccountDialog />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-muted-foreground">Loading accounts...</p>
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold">No accounts yet</h2>
              <p className="text-muted-foreground max-w-md">
                Create your first account to get started. Each account gets its
                own AI agent that helps you track progress and suggests next
                actions.
              </p>
            </div>
            <NewAccountDialog />
          </div>
        ) : (
          <Tabs defaultValue="active">
            <TabsList>
              <TabsTrigger value="active">
                Active ({activeAccounts.length})
              </TabsTrigger>
              <TabsTrigger value="archived">
                Archived ({archivedAccounts.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="active" className="mt-6">
              {activeAccounts.length === 0 ? (
                <p className="text-muted-foreground text-center py-10">
                  No active accounts. Create one to get started.
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {activeAccounts.map((account) => (
                    <AccountCard key={account.id} account={account} />
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="archived" className="mt-6">
              {archivedAccounts.length === 0 ? (
                <p className="text-muted-foreground text-center py-10">
                  No archived accounts.
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {archivedAccounts.map((account) => (
                    <AccountCard key={account.id} account={account} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
