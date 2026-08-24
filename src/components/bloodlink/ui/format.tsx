"use client";

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export function formatRelativeTime(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return date.toLocaleDateString();
}

export function formatDateTime(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTimeRemaining(deadlineIso: string): string {
  const diff = new Date(deadlineIso).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const hr = Math.floor(diff / 3600000);
  const min = Math.floor((diff % 3600000) / 60000);
  if (hr > 0) return `${hr}h ${min}m left`;
  return `${min}m left`;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function scoreColor(score: number): string {
  if (score >= 85) return "text-emerald-600";
  if (score >= 70) return "text-teal-600";
  if (score >= 50) return "text-amber-600";
  return "text-rose-600";
}

export function scoreBg(score: number): string {
  if (score >= 85) return "bg-emerald-500";
  if (score >= 70) return "bg-teal-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-rose-500";
}

export function riskColor(risk: number): string {
  if (risk >= 75) return "text-red-600";
  if (risk >= 50) return "text-orange-600";
  if (risk >= 30) return "text-amber-600";
  return "text-emerald-600";
}
