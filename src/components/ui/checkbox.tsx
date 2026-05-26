"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckboxProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function Checkbox({ checked, onCheckedChange, disabled, className, ...props }: CheckboxProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "peer h-4.5 w-4.5 shrink-0 rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-sky-500 data-[state=checked]:text-white flex items-center justify-center transition-all",
        checked ? "bg-sky-500 border-sky-500 text-white" : "hover:border-neutral-400 dark:hover:border-neutral-600",
        className
      )}
      {...props}
    >
      {checked && <Check className="h-3 w-3 stroke-[3]" />}
    </button>
  );
}
