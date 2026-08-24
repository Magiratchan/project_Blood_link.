"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// ---- Urgency badge ----
const URGENCY_STYLES: Record<string, string> = {
  CRITICAL: "bg-red-600 text-white hover:bg-red-600 animate-pulse",
  HIGH: "bg-orange-500 text-white hover:bg-orange-500",
  MEDIUM: "bg-amber-400 text-amber-950 hover:bg-amber-400",
  NORMAL: "bg-slate-200 text-slate-700 hover:bg-slate-200",
};

export function UrgencyBadge({ urgency, className }: { urgency: string; className?: string }) {
  return (
    <Badge className={cn(URGENCY_STYLES[urgency] ?? URGENCY_STYLES.NORMAL, className)}>
      {urgency}
    </Badge>
  );
}

// ---- Request status badge ----
const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-slate-100 text-slate-700 border-slate-300",
  MATCHING: "bg-blue-100 text-blue-700 border-blue-300",
  DONOR_FOUND: "bg-emerald-100 text-emerald-700 border-emerald-300",
  PARTIALLY_FULFILLED: "bg-amber-100 text-amber-700 border-amber-300",
  FULFILLED: "bg-emerald-600 text-white border-emerald-600",
  CANCELLED: "bg-slate-200 text-slate-500 border-slate-300",
  EXPIRED: "bg-rose-100 text-rose-600 border-rose-300",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const label = status.replace(/_/g, " ");
  return (
    <Badge variant="outline" className={cn(STATUS_STYLES[status] ?? STATUS_STYLES.PENDING, "font-medium", className)}>
      {label}
    </Badge>
  );
}

// ---- Blood group chip ----
export function BloodGroupBadge({ group, className }: { group: string; className?: string }) {
  const isNeg = group.endsWith("-");
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md font-bold tabular-nums",
        isNeg ? "bg-red-600 text-white" : "bg-red-100 text-red-700",
        "px-2.5 py-1 text-sm min-w-[3rem]",
        className
      )}
    >
      {group}
    </span>
  );
}

// ---- Response status badge (donor chain) ----
const RESPONSE_STYLES: Record<string, string> = {
  SENT: "bg-blue-100 text-blue-700 border-blue-300",
  VIEWED: "bg-indigo-100 text-indigo-700 border-indigo-300",
  ACCEPTED: "bg-emerald-600 text-white border-emerald-600",
  DECLINED: "bg-rose-100 text-rose-700 border-rose-300",
  EXPIRED: "bg-slate-200 text-slate-500 border-slate-300",
};

export function ResponseBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn(RESPONSE_STYLES[status] ?? RESPONSE_STYLES.SENT, className)}>
      {status}
    </Badge>
  );
}

// ---- Verification badge ----
export function VerificationBadge({ status, className }: { status: string; className?: string }) {
  const map: Record<string, string> = {
    VERIFIED: "bg-emerald-100 text-emerald-700 border-emerald-300",
    PENDING: "bg-amber-100 text-amber-700 border-amber-300",
    REJECTED: "bg-rose-100 text-rose-700 border-rose-300",
    SUSPENDED: "bg-slate-300 text-slate-600 border-slate-400",
  };
  return (
    <Badge variant="outline" className={cn(map[status] ?? map.PENDING, "capitalize", className)}>
      {status.toLowerCase()}
    </Badge>
  );
}

// ---- Role badge ----
export function RoleBadge({ role, className }: { role: string; className?: string }) {
  const map: Record<string, string> = {
    DONOR: "bg-rose-100 text-rose-700 border-rose-300",
    HOSPITAL: "bg-teal-100 text-teal-700 border-teal-300",
    BLOOD_BANK: "bg-violet-100 text-violet-700 border-violet-300",
    ADMIN: "bg-slate-800 text-white border-slate-800",
  };
  const label = role.replace(/_/g, " ").toLowerCase();
  return (
    <Badge variant="outline" className={cn(map[role] ?? map.DONOR, "capitalize", className)}>
      {label}
    </Badge>
  );
}
