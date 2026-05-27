"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/providers/AuthProvider";
import { cn } from "@/lib/utils";
import { Globe, ExternalLink, MoreVertical, Edit2, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { db } from "@/lib/firebase";
import { doc, deleteDoc } from "firebase/firestore";
import { toast } from "sonner";

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    description: string;
    baseUrl: string;
    swaggerUrl: string;
    environment: "development" | "staging" | "production";
    createdAt: any;
  };
  onEdit: () => void;
  onRefresh: () => void;
}

export function ProjectCard({ project, onEdit, onRefresh }: ProjectCardProps) {
  const { role } = useAuth();
  const isAdmin = role === "admin";

  const getEnvBadgeColor = (env: string) => {
    switch (env) {
      case "production":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "staging":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      default:
        return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20";
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete project "${project.name}"? This will delete all linked configuration.`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, "projects", project.id));
      toast.success("Project deleted successfully");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete project");
    }
  };

  const handleCardClick = () => {
    // Navigate to project details
    window.location.href = `/projects/${project.id}`;
  };

  return (
    <Card
      onClick={handleCardClick}
      className="border border-border/80 bg-card/60 hover:bg-card hover:border-neutral-300 dark:hover:border-neutral-700 cursor-pointer transition-all duration-300 shadow-xs hover:shadow-md rounded-2xl group flex flex-col justify-between"
    >
      <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <CardTitle className="text-foreground text-sm font-bold truncate group-hover:text-sky-500 dark:group-hover:text-sky-400 transition-colors">
              {project.name}
            </CardTitle>
            <Badge
              variant="outline"
              className={cn("px-1.5 py-0 text-[9px] uppercase font-extrabold tracking-wider shrink-0", getEnvBadgeColor(project.environment))}
            >
              {project.environment}
            </Badge>
          </div>
          <CardDescription className="text-muted-foreground text-xs line-clamp-2 mt-1 leading-relaxed">
            {project.description || "No description provided."}
          </CardDescription>
        </div>

        {isAdmin && (
          <div onClick={(e) => e.stopPropagation()} className="ml-2 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-lg flex items-center justify-center transition-colors border border-transparent hover:border-border">
                <MoreVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card border border-border text-foreground rounded-xl shadow-md p-1 min-w-[130px]">
                <DropdownMenuItem onClick={onEdit} className="hover:bg-neutral-100 dark:hover:bg-neutral-900 text-xs gap-2 py-1.5 rounded-lg cursor-pointer">
                  <Edit2 className="h-3.5 w-3.5" />
                  Edit Project
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="hover:bg-neutral-100 dark:hover:bg-neutral-900 text-xs text-red-500 hover:text-red-550 dark:hover:text-red-400 gap-2 py-1.5 rounded-lg cursor-pointer">
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </CardHeader>

      <CardContent className="pb-4 pt-1 space-y-2 mt-auto">
        {project.baseUrl && (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
            <span className="truncate">{project.baseUrl}</span>
          </div>
        )}
        {project.swaggerUrl && (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
            <span className="truncate">{project.swaggerUrl}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
