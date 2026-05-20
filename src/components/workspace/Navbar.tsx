"use client";

import React from "react";
import { useAuth } from "@/providers/AuthProvider";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/workspace/ThemeToggle";
import { Menu, ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";

interface NavbarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  onMobileToggle: () => void;
}

export function Navbar({ collapsed, setCollapsed, onMobileToggle }: NavbarProps) {
  const { profile } = useAuth();
  const pathname = usePathname();

  // Create simple breadcrumbs from pathname
  const getBreadcrumbs = () => {
    const paths = pathname.split("/").filter(Boolean);
    if (paths.length === 0) return [{ label: "Home", href: "/" }];

    return paths.map((path, index) => {
      const href = "/" + paths.slice(0, index + 1).join("/");
      let label = path.charAt(0).toUpperCase() + path.slice(1);
      
      // Simplify ID paths
      if (path.length > 15) {
        label = "Details";
      }

      return { label, href };
    });
  };

  const breadcrumbs = getBreadcrumbs();

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
      case "qa":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
      case "developer":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      default:
        return "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20";
    }
  };

  return (
    <header className="h-16 border-b border-neutral-200/50 dark:border-neutral-800/50 bg-background/80 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between px-6 transition-colors">
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onMobileToggle}
          className="md:hidden text-muted-foreground hover:text-foreground hover:bg-neutral-150 dark:hover:bg-neutral-900"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Desktop Sidebar Toggle when collapsed */}
        {collapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(false)}
            className="hidden md:flex h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-md mr-2"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}

        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.href}>
              {idx > 0 && <ChevronRight className="h-3.5 w-3.5 text-neutral-350 dark:text-neutral-700 shrink-0" />}
              <span
                className={cn(
                  "truncate max-w-[120px] md:max-w-xs transition-colors",
                  idx === breadcrumbs.length - 1 ? "text-foreground font-semibold" : "text-muted-foreground"
                )}
              >
                {crumb.label}
              </span>
            </React.Fragment>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        {profile && (
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-xs text-muted-foreground font-medium">
              Signed in as:
            </span>
            <Badge 
              variant="outline" 
              className={cn("px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider", getRoleColor(profile.role))}
            >
              {profile.role}
            </Badge>
          </div>
        )}
        <div className="border-l border-neutral-200 dark:border-neutral-800 h-5 my-auto" />
        <ThemeToggle />
      </div>
    </header>
  );
}
