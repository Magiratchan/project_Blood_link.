"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { BloodGroupBadge, ResponseBadge } from "@/components/bloodlink/ui/badges";
import { formatRelativeTime } from "@/components/bloodlink/ui/format";
import type { ChainEvent } from "@/lib/client-types";
import { cn } from "@/lib/utils";
import { Link2, Check, X, Clock, Mail, Eye, Send } from "lucide-react";

const STATUS_META: Record<string, { icon: typeof Send; color: string; ring: string; label: string }> = {
  SENT: { icon: Send, color: "bg-blue-500 text-white", ring: "ring-blue-200", label: "Notified" },
  VIEWED: { icon: Eye, color: "bg-indigo-500 text-white", ring: "ring-indigo-200", label: "Viewed" },
  ACCEPTED: { icon: Check, color: "bg-emerald-600 text-white", ring: "ring-emerald-300", label: "Accepted" },
  DECLINED: { icon: X, color: "bg-rose-600 text-white", ring: "ring-rose-200", label: "Declined" },
  EXPIRED: { icon: Clock, color: "bg-slate-400 text-white", ring: "ring-slate-200", label: "Expired" },
};

export function DonorChain({ events, matchedDonorId }: { events: ChainEvent[]; matchedDonorId?: string | null }) {
  if (events.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center py-8 text-center">
          <Link2 className="h-8 w-8 text-slate-300" />
          <p className="mt-2 text-sm font-medium text-slate-700">Donor chain not started</p>
          <p className="mt-1 text-xs text-slate-500">Run AI matching to notify top-ranked donors and start the chain.</p>
        </CardContent>
      </Card>
    );
  }

  // sort by chainOrder
  const sorted = [...events].sort((a, b) => a.chainOrder - b.chainOrder);

  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
              <Link2 className="h-4 w-4 text-red-600" /> Donor chain
              <motion.span
                key={sorted.length}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 20 }}
                className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600"
              >
                {sorted.length}
              </motion.span>
            </h3>
            <p className="text-xs text-slate-500">Automatic fallback — if a donor declines, the next is engaged.</p>
          </div>
        </div>

        <ol className="relative">
          {/* animated vertical line grows in */}
          <motion.div
            className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-slate-200 via-slate-200 to-slate-100"
            initial={{ scaleY: 0, transformOrigin: "top" }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
          />
          {sorted.map((e, idx) => {
            const meta = STATUS_META[e.status] ?? STATUS_META.SENT;
            const Icon = meta.icon;
            const isSelected = matchedDonorId && e.donor.id === matchedDonorId;
            return (
              <motion.li
                key={e.id}
                className="relative flex items-start gap-3 pb-4 last:pb-0"
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay: 0.15 + idx * 0.12 }}
              >
                <motion.div
                  className={cn("relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-2", meta.color, meta.ring)}
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 16, delay: 0.2 + idx * 0.12 }}
                >
                  <Icon className="h-4 w-4" />
                  {/* Pulsing ring for the selected/accepted donor */}
                  {isSelected && (
                    <motion.span
                      className="absolute inset-0 rounded-full ring-2 ring-emerald-400"
                      animate={{ scale: [1, 1.5], opacity: [0.8, 0] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                    />
                  )}
                </motion.div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-xs font-medium text-slate-400">#{e.chainOrder + 1}</span>
                    <p className="text-sm font-semibold text-slate-900">{e.donor.name}</p>
                    <BloodGroupBadge group={e.donor.bloodGroup} className="scale-90" />
                    <ResponseBadge status={e.status} className="scale-90" />
                    {isSelected && <span className="inline-flex items-center gap-0.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700"><Check className="h-2.5 w-2.5" /> SELECTED</span>}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                    <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> Notified {formatRelativeTime(e.sentAt)}</span>
                    {e.viewedAt && <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" /> Viewed {formatRelativeTime(e.viewedAt)}</span>}
                    {e.respondedAt && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> Responded {formatRelativeTime(e.respondedAt)}</span>}
                    <span>Response rate {e.donor.responseRate}%</span>
                  </div>
                  {e.note && <p className="mt-1 text-[11px] italic text-slate-400">“{e.note}”</p>}
                </div>
                {idx < sorted.length - 1 && (
                  <div className="absolute left-[11px] top-8 -z-0 h-4 w-0 border-l-2 border-dashed border-slate-300" />
                )}
              </motion.li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
