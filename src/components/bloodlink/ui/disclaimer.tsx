"use client";

import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { MEDICAL_DISCLAIMER, COMPATIBILITY_NOTE } from "@/lib/client-types";

export function MedicalDisclaimer({ variant = "banner", className }: { variant?: "banner" | "compact"; className?: string }) {
  if (variant === "compact") {
    return (
      <p className={cn("flex items-start gap-1.5 text-xs text-muted-foreground", className)}>
        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
        <span>{COMPATIBILITY_NOTE}</span>
      </p>
    );
  }
  return (
    <div className={cn("flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800", className)}>
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
      <span>{MEDICAL_DISCLAIMER}</span>
    </div>
  );
}
