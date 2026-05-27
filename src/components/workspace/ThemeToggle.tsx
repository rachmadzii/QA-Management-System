'use client';

import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSyncExternalStore } from 'react';

function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  const mounted = useMounted();

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 text-neutral-400 rounded-md border border-transparent"
        disabled
      >
        <div className="h-4 w-4 rounded-full bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
      </Button>
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="h-9 w-9 text-neutral-500 hover:text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-lg border border-neutral-200/40 dark:border-neutral-800/40 transition-colors shadow-xs"
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={isDark ? 'dark' : 'light'}
          initial={{ y: -10, opacity: 0, rotate: -45 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={{ y: 10, opacity: 0, rotate: 45 }}
          transition={{ duration: 0.15 }}
          className="flex items-center justify-center"
        >
          {isDark ? (
            <Sun className="h-4.5 w-4.5 text-amber-500 shrink-0" />
          ) : (
            <Moon className="h-4.5 w-4.5 text-indigo-600 shrink-0" />
          )}
        </motion.div>
      </AnimatePresence>
    </Button>
  );
}
