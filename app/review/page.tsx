"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { SortableTaskItem } from "@/components/review/sortable-task-item";
import { EndOfDaySection } from "@/components/review/end-of-day-section";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";
import type { DailyTaskWithAccount } from "@/lib/types";

export default function ReviewPage() {
  const [tasks, setTasks] = useState<DailyTaskWithAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [focusedAccountIds, setFocusedAccountIds] = useState<Set<string>>(
    new Set()
  );
  const initializedRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchTasks = useCallback(() => {
    fetch("/api/tasks/today")
      .then((res) => res.json())
      .then((data) => {
        setTasks(data.tasks || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      await fetch("/api/cron/reminders");
      fetchTasks();
    } finally {
      setGenerating(false);
    }
  }, [fetchTasks]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      setTasks((prev) => {
        const oldIndex = prev.findIndex((t) => t.id === active.id);
        const newIndex = prev.findIndex((t) => t.id === over.id);
        const reordered = arrayMove(prev, oldIndex, newIndex);

        fetch("/api/tasks/reorder", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskIds: reordered.map((t) => t.id) }),
        }).catch(console.error);

        return reordered;
      });
    },
    []
  );

  const handleTaskToggle = useCallback(
    (taskId: string, completed: boolean) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, completed } : t))
      );
      fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      }).catch(console.error);
    },
    []
  );

  useEffect(() => {
    if (tasks.length > 0 && !initializedRef.current) {
      initializedRef.current = true;
      setFocusedAccountIds(new Set(tasks.map((t) => t.accountId)));
    }
  }, [tasks]);

  const uniqueAccounts = useMemo(() => {
    const map = new Map<string, string>();
    tasks.forEach((t) => {
      if (!map.has(t.accountId)) map.set(t.accountId, t.account.name);
    });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [tasks]);

  const allSelected =
    uniqueAccounts.length > 0 &&
    uniqueAccounts.every((a) => focusedAccountIds.has(a.id));

  const toggleAccount = useCallback((accountId: string) => {
    setFocusedAccountIds((prev) => {
      const next = new Set(prev);
      if (next.has(accountId)) next.delete(accountId);
      else next.add(accountId);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setFocusedAccountIds((prev) => {
      const allIds = new Set(uniqueAccounts.map((a) => a.id));
      const everySelected = uniqueAccounts.every((a) => prev.has(a.id));
      return everySelected ? new Set<string>() : allIds;
    });
  }, [uniqueAccounts]);

  const filteredTasks = useMemo(
    () => tasks.filter((t) => focusedAccountIds.has(t.accountId)),
    [tasks, focusedAccountIds]
  );

  const accountGroups = filteredTasks.reduce<
    Record<string, { name: string; tasks: DailyTaskWithAccount[] }>
  >((acc, task) => {
    if (!acc[task.accountId]) {
      acc[task.accountId] = { name: task.account.name, tasks: [] };
    }
    acc[task.accountId].tasks.push(task);
    return acc;
  }, {});

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold">Daily Review</h1>
              <p className="text-sm text-muted-foreground">{today}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              {tasks.length} task{tasks.length !== 1 ? "s" : ""}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="mr-1 h-3 w-3" />
              )}
              {generating ? "Generating..." : "Generate Tasks"}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {loading ? (
          <p className="text-center text-muted-foreground py-20">
            Loading tasks...
          </p>
        ) : tasks.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <h2 className="text-lg font-semibold">No tasks for today</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Tasks are generated by the daily cron job at 9am. You can also
              generate them manually.
            </p>
            <Button
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {generating ? "Generating..." : "Generate Tasks Now"}
            </Button>
          </div>
        ) : (
          <>
          {uniqueAccounts.length > 1 && (
            <div className="mb-6 rounded-lg border p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium">Focus Accounts</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto py-1 px-2 text-xs"
                  onClick={toggleAll}
                >
                  {allSelected ? "Deselect All" : "Select All"}
                </Button>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {uniqueAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center gap-2"
                  >
                    <Checkbox
                      id={`focus-${account.id}`}
                      checked={focusedAccountIds.has(account.id)}
                      onCheckedChange={() => toggleAccount(account.id)}
                    />
                    <Label
                      htmlFor={`focus-${account.id}`}
                      className="text-sm cursor-pointer"
                    >
                      {account.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Tabs defaultValue="morning">
            <TabsList className="mb-6">
              <TabsTrigger value="morning">Morning</TabsTrigger>
              <TabsTrigger value="eod">End of Day</TabsTrigger>
            </TabsList>

            <TabsContent value="morning">
              <p className="text-sm text-muted-foreground mb-4">
                Drag to reorder tasks by priority. The order persists across
                reloads.
              </p>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={filteredTasks.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {filteredTasks.map((task) => (
                      <SortableTaskItem key={task.id} task={task} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </TabsContent>

            <TabsContent value="eod">
              <p className="text-sm text-muted-foreground mb-4">
                Check off completed tasks, add notes, then submit per account.
              </p>
              <div className="space-y-4">
                {Object.entries(accountGroups).map(
                  ([accountId, { name, tasks: accountTasks }]) => (
                    <EndOfDaySection
                      key={accountId}
                      accountId={accountId}
                      accountName={name}
                      tasks={accountTasks}
                      onTaskToggle={handleTaskToggle}
                    />
                  )
                )}
              </div>
            </TabsContent>
          </Tabs>
          </>
        )}
      </main>
    </div>
  );
}
