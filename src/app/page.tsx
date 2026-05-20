"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center">
      <div className="relative">
        <div className="h-12 w-12 rounded-full border-2 border-neutral-800 border-t-sky-500 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-sky-400 font-mono font-bold">
          QA
        </div>
      </div>
      <p className="text-neutral-500 text-sm mt-4 font-medium animate-pulse">
        Initializing workspace...
      </p>
    </div>
  );
}
