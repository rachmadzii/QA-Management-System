"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "open" | "in_progress" | "need_confirmation" | "resolved" | "closed" | "reopened";
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const getStatusStyle = (s: string) => {
    switch (s) {
      case "open":
        return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
      case "in_progress":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "need_confirmation":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
      case "resolved":
        return "bg-emerald-500/10 text-emerald-650 dark:text-emerald-400 border-emerald-500/20";
      case "closed":
        return "bg-neutral-100 dark:bg-neutral-900/60 text-neutral-500 dark:text-neutral-400 border-border";
      case "reopened":
        return "bg-pink-500/10 text-pink-650 dark:text-pink-400 border-pink-500/20";
      default:
        return "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-550/20";
    }
  };

  const getStatusLabel = (s: string) => {
    return s.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  };

  return (
    <Badge variant="outline" className={cn("px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider justify-center w-24 shrink-0 rounded-md", getStatusStyle(status))}>
      {getStatusLabel(status)}
    </Badge>
  );
}
