"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";

export default function RootPage() {
  const { user, loading, firebaseConfigured } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!firebaseConfigured) {
        router.replace("/setup");
      } else if (user) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    }
  }, [user, loading, firebaseConfigured, router]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center">
      <div className="relative">
        <div className="h-12 w-12 rounded-full border-2 border-border border-t-primary animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-primary font-mono font-bold">
          QA
        </div>
      </div>
      <p className="text-muted-foreground text-sm mt-4 font-medium animate-pulse">
        Initializing workspace...
      </p>
    </div>
  );
}
