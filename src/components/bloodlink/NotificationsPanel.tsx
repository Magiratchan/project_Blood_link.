"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Bell, BellRing, CheckCheck, Info, MessageSquare, AlertTriangle,
} from "lucide-react";
import { useApp } from "@/stores/app-store";
import { useApi, apiCall } from "@/lib/api/hooks";
import type { NotificationItem } from "@/lib/client-types";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SectionCard, EmptyState } from "@/components/bloodlink/ui/cards";
import { formatRelativeTime } from "@/components/bloodlink/ui/format";

interface NotificationsResponse {
  notifications: NotificationItem[];
  unreadCount: number;
}

function notifIcon(type: string) {
  if (type === "EMERGENCY_REQUEST") return BellRing;
  if (type === "REQUEST_RESPONSE") return MessageSquare;
  if (type === "REQUEST_UPDATE") return AlertTriangle;
  return Info;
}

function notifColor(type: string) {
  if (type === "EMERGENCY_REQUEST") return "bg-red-100 text-red-600";
  if (type === "REQUEST_RESPONSE") return "bg-teal-100 text-teal-600";
  if (type === "REQUEST_UPDATE") return "bg-amber-100 text-amber-600";
  return "bg-slate-100 text-slate-600";
}

export function NotificationsPanel() {
  const { user } = useApp();
  const { data, loading, error, refetch } = useApi<NotificationsResponse>(
    user ? "/api/notifications?limit=100" : null
  );
  const [markingAll, setMarkingAll] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  async function handleMarkAll() {
    setMarkingAll(true);
    try {
      await apiCall("/api/notifications", { method: "PATCH", body: { all: true } });
      toast.success("All notifications marked as read");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to mark as read");
    } finally {
      setMarkingAll(false);
    }
  }

  async function handleMarkOne(id: string) {
    setMarkingId(id);
    try {
      await apiCall("/api/notifications", { method: "PATCH", body: { id } });
      await refetch();
    } catch {
      // silent — already visually updated optimistically in list
    } finally {
      setMarkingId(null);
    }
  }

  const notifications = data?.notifications ?? [];
  const unread = data?.unreadCount ?? 0;

  return (
    <div className="space-y-5">
      <SectionCard
        title="Notifications"
        description={unread > 0 ? `${unread} unread notification${unread === 1 ? "" : "s"}` : "You're all caught up"}
        action={
          <Button
            size="sm"
            variant="outline"
            onClick={handleMarkAll}
            disabled={markingAll || unread === 0}
          >
            <CheckCheck className="mr-1.5 h-4 w-4" />
            {markingAll ? "Marking…" : "Mark all read"}
          </Button>
        }
      >
        {loading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : error ? (
          <EmptyState
            title="Couldn't load notifications"
            description={error}
            icon={AlertTriangle}
          />
        ) : notifications.length === 0 ? (
          <EmptyState
            title="No notifications yet"
            description="Emergency requests and system alerts will appear here."
            icon={Bell}
          />
        ) : (
          <ScrollArea className="h-[70vh] pr-3">
            <ul className="space-y-2">
              {notifications.map((n) => {
                const Icon = notifIcon(n.type);
                const isUnread = !n.read;
                return (
                  <li
                    key={n.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => isUnread && handleMarkOne(n.id)}
                    onKeyDown={(e) => {
                      if ((e.key === "Enter" || e.key === " ") && isUnread) {
                        e.preventDefault();
                        handleMarkOne(n.id);
                      }
                    }}
                    className={[
                      "flex items-start gap-3 rounded-lg border px-3 py-3 transition cursor-pointer",
                      isUnread
                        ? "border-red-200 bg-red-50/60 hover:bg-red-50"
                        : "border-slate-200 bg-white hover:bg-slate-50",
                      markingId === n.id ? "opacity-60" : "",
                    ].join(" ")}
                    aria-label={`${isUnread ? "Unread" : "Read"} notification: ${n.title}`}
                  >
                    <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${notifColor(n.type)}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm ${isUnread ? "font-semibold text-slate-900" : "font-medium text-slate-700"}`}>
                          {n.title}
                        </p>
                        {isUnread && (
                          <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-600" />
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-slate-600">{n.message}</p>
                      <p className="mt-1 text-xs text-slate-400">{formatRelativeTime(n.createdAt)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
      </SectionCard>
    </div>
  );
}
