'use client';

import React, { useState } from 'react';
import { AppSidebar } from '@/components/workspace/AppSidebar';
import { Navbar } from '@/components/workspace/Navbar';
import { useAuth } from '@/providers/AuthProvider';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent } from '@/components/ui/sheet';

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-neutral-200 dark:border-neutral-800 border-t-sky-500 dark:border-t-sky-100 animate-spin" />
        <p className="text-muted-foreground text-xs mt-3 animate-pulse">
          Loading workspace...
        </p>
      </div>
    );
  }

  if (!user) {
    return null; // Let AuthProvider handle the redirect to login
  }

  return (
    <div className="min-h-screen bg-background flex text-foreground transition-colors duration-200">
      {/* Desktop Sidebar (Floating layout with left-4 top-4) */}
      <div className="hidden md:block">
        <AppSidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      </div>

      {/* Mobile Sidebar (Sheet) */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="p-0 w-64 bg-sidebar border-r border-border text-foreground"
        >
          <AppSidebar collapsed={false} setCollapsed={() => {}} />
        </SheetContent>
      </Sheet>

      {/* Main Content Area: padded to fit the floating sidebar */}
      <div
        className={cn(
          'flex-1 flex flex-col transition-all duration-300 min-w-0',
          collapsed ? 'md:pl-[6rem]' : 'md:pl-[17rem]',
        )}
      >
        <Navbar
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          onMobileToggle={() => setMobileOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-neutral-50/30 dark:bg-neutral-950/20">
          <div className="max-w-7xl mx-auto space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
