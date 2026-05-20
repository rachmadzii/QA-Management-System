"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SeverityBadgeProps {
  severity: "critical" | "major" | "minor" | "low";
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const getSeverityStyle = (s: string) => {
    switch (s) {
      case "critical":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-450 border-rose-500/20";
      case "major":
        return "bg-orange-500/10 text-orange-600 dark:text-orange-450 border-orange-500/20";
      case "minor":
        return "bg-sky-500/10 text-sky-650 dark:text-sky-400 border-sky-500/20";
      default:
        return "bg-neutral-100 dark:bg-neutral-900/60 text-neutral-500 dark:text-neutral-400 border-border";
    }
  };

  const getSeverityLabel = (s: string) => {
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  return (
    <Badge variant="outline" className={cn("px-1.5 py-0.5 text-[9px] uppercase font-extrabold tracking-wider shrink-0 rounded-md", getSeverityStyle(severity))}>
      {getSeverityLabel(severity)}
    </Badge>
  );
}
