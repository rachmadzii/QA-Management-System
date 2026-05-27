"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  LayoutDashboard, 
  FolderKanban, 
  ChevronLeft, 
  LogOut, 
  Terminal 
} from "lucide-react";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface AppSidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export function AppSidebar({ collapsed, setCollapsed }: AppSidebarProps) {
  const pathname = usePathname();
  const { profile, logout, firebaseConfigured } = useAuth();
  const [recentProjects, setRecentProjects] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!firebaseConfigured) return;

    const fetchRecentProjects = async () => {
      try {
        const q = query(collection(db, "projects"), orderBy("createdAt", "desc"), limit(4));
        const querySnapshot = await getDocs(q);
        const projectsList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
        }));
        setRecentProjects(projectsList);
      } catch (err) {
        // Silently handle error
      }
    };

    fetchRecentProjects();
  }, [firebaseConfigured]);

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Projects", href: "/projects", icon: FolderKanban },
  ];

  return (
    <aside
      className={cn(
        "h-[calc(100vh-2rem)] fixed left-4 top-4 z-30 border border-neutral-200/50 dark:border-neutral-800/50 bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-300 rounded-2xl shadow-sm",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Sidebar Header */}
      <div className="h-14 px-4 border-b border-neutral-200/40 dark:border-neutral-800/40 flex items-center justify-between">
        <div className="flex items-center gap-2.5 overflow-hidden select-none">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-sm shadow-sky-500/10">
            <Terminal className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <span className="font-extrabold text-sm tracking-tight text-foreground bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
              QABug
            </span>
          )}
        </div>
        {!collapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(true)}
            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent rounded-lg"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-4 px-3 space-y-6 overflow-y-auto">
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <a
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all group relative border border-transparent",
                  isActive 
                    ? "bg-sidebar-accent text-foreground shadow-xs border-neutral-200/50 dark:border-neutral-800/30" 
                    : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <item.icon className={cn("h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-105", isActive ? "text-sky-500 dark:text-sky-400" : "text-muted-foreground group-hover:text-foreground")} />
                {!collapsed && <span>{item.name}</span>}
                {collapsed && (
                  <span className="absolute left-14 bg-neutral-900 dark:bg-neutral-800 text-white text-[10px] px-2 py-1 rounded shadow-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 whitespace-nowrap z-50">
                    {item.name}
                  </span>
                )}
              </a>
            );
          })}
        </div>

        {/* Pinned/Recent Projects Section */}
        {!collapsed && recentProjects.length > 0 && (
          <div className="space-y-2">
            <h3 className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75">
              Recent Projects
            </h3>
            <div className="space-y-0.5">
              {recentProjects.map((proj) => {
                const isActive = pathname.includes(`/projects/${proj.id}`);
                return (
                  <a
                    key={proj.id}
                    href={`/projects/${proj.id}`}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 text-xs rounded-md transition-colors",
                      isActive 
                        ? "text-sky-500 dark:text-sky-400 font-semibold" 
                        : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/30"
                    )}
                  >
                    <div className={cn("h-1.5 w-1.5 rounded-full transition-colors", isActive ? "bg-sky-500" : "bg-neutral-400 dark:bg-neutral-600")} />
                    <span className="truncate">{proj.name}</span>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* User Footer Profile */}
      <div className="p-3 border-t border-neutral-200/40 dark:border-neutral-800/40 bg-sidebar-accent/20 rounded-b-2xl">
        {collapsed ? (
          <div className="flex flex-col items-center gap-3 py-1">
            <Avatar className="h-8 w-8 border border-neutral-250 dark:border-neutral-700">
              <AvatarFallback className="bg-neutral-100 dark:bg-neutral-800 text-foreground text-xs font-bold">
                {profile?.name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10 h-7 w-7 rounded-lg"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 border border-neutral-250 dark:border-neutral-700 shrink-0">
              <AvatarFallback className="bg-neutral-100 dark:bg-neutral-800 text-foreground text-xs font-semibold">
                {profile?.name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-foreground truncate leading-tight">
                {profile?.name || "User"}
              </p>
              <span className="text-[9px] px-1 py-0.2 rounded bg-neutral-200 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-muted-foreground font-extrabold uppercase tracking-wider mt-0.5 inline-block">
                {profile?.role || "Viewer"}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10 h-7 w-7 rounded-lg shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}
