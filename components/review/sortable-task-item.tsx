"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DailyTaskWithAccount } from "@/lib/types";

interface SortableTaskItemProps {
  task: DailyTaskWithAccount;
}

export function SortableTaskItem({ task }: SortableTaskItemProps) {
  const [expanded, setExpanded] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-3 rounded-lg border bg-card p-3 ${
        isDragging ? "opacity-50 shadow-lg" : ""
      }`}
    >
      <button
        className="mt-0.5 cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <Badge variant="secondary" className="shrink-0 text-xs">
            {task.account.name}
          </Badge>
          <span className="text-sm">{task.content}</span>
        </div>
        {task.rationale && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {expanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            Why
          </button>
        )}
        {expanded && task.rationale && (
          <p className="mt-1 text-xs text-muted-foreground pl-4">
            {task.rationale}
          </p>
        )}
      </div>
    </div>
  );
}
