"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "./StatusBadge";
import { SeverityBadge } from "./SeverityBadge";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, Minus, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface BugCardProps {
  bug: {
    id: string;
    title: string;
    description: string;
    status: any;
    severity: any;
    priority: "high" | "medium" | "low";
    endpointPath?: string;
    endpointMethod?: string;
    httpStatus?: number;
    assignedToName?: string;
    createdAt: any;
  };
}

export function BugCard({ bug }: BugCardProps) {
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high":
        return <ArrowUp className="h-3 w-3 text-red-500 shrink-0" />;
      case "low":
        return <ArrowDown className="h-3 w-3 text-sky-500 shrink-0" />;
      default:
        return <Minus className="h-3 w-3 text-amber-500 shrink-0" />;
    }
  };

  const handleCardClick = () => {
    window.location.href = `/bugs/${bug.id}`;
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <Card
      onClick={handleCardClick}
      className="border border-border/80 bg-card/60 hover:bg-card hover:border-neutral-300 dark:hover:border-neutral-700 cursor-pointer transition-all duration-300 shadow-xs hover:shadow-sm rounded-2xl"
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0 flex-1">
            <CardTitle className="text-foreground text-sm font-bold truncate group-hover:text-sky-500 dark:group-hover:text-sky-400 transition-colors">
              {bug.title}
            </CardTitle>
            
            {/* Linked Endpoint details */}
            {bug.endpointPath ? (
              <div className="flex items-center gap-1.5 mt-1 font-mono text-[10px] text-muted-foreground font-semibold">
                <span className="font-extrabold text-sky-600 dark:text-sky-400 shrink-0">{bug.endpointMethod}</span>
                <span className="truncate bg-neutral-100 dark:bg-neutral-900/50 px-1 py-0.2 rounded border border-border/40">{bug.endpointPath}</span>
                {bug.httpStatus && (
                  <span className="text-red-500 dark:text-red-400 font-extrabold shrink-0">({bug.httpStatus})</span>
                )}
              </div>
            ) : (
              <div className="text-[10px] text-muted-foreground/80 mt-1 font-semibold">General Application Bug</div>
            )}
          </div>

          <div className="shrink-0">
            <StatusBadge status={bug.status} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 pt-1 flex items-center justify-between gap-4">
        {/* Badges container */}
        <div className="flex items-center gap-2">
          <SeverityBadge severity={bug.severity} />
          
          <Badge variant="outline" className="px-1.5 py-0.5 text-[9px] bg-neutral-50/40 dark:bg-neutral-950/40 text-muted-foreground border-border gap-1 font-bold uppercase tracking-wider shrink-0">
            {getPriorityIcon(bug.priority)}
            {bug.priority}
          </Badge>
        </div>

        {/* Assignee / Date */}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-semibold shrink-0">
          <div className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-900 px-2 py-0.5 rounded-lg border border-border">
            <User className="h-3 w-3 text-muted-foreground/75" />
            <span className="max-w-[80px] truncate text-foreground/80 text-[9px]">
              {bug.assignedToName || "Unassigned"}
            </span>
          </div>
          <span>•</span>
          <span>{formatDate(bug.createdAt)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
