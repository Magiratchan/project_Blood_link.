"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { BloodGroupBadge, VerificationBadge } from "@/components/bloodlink/ui/badges";
import { formatDistance, scoreColor } from "@/components/bloodlink/ui/format";
import { MedicalDisclaimer } from "@/components/bloodlink/ui/disclaimer";
import { apiCall } from "@/lib/api/hooks";
import { toast } from "sonner";
import type { MatchingResultItem } from "@/lib/client-types";
import { MapPin, Star, ChevronDown, ChevronUp, Brain, Check, X, Loader2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export function MatchingResults({
  requestId, results, onResponded,
}: {
  requestId: string;
  results: MatchingResultItem[];
  onResponded: () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(results[0]?.donor.id ?? null);
  const [busy, setBusy] = useState<string | null>(null);

  async function respond(donorId: string, response: "ACCEPT" | "DECLINE") {
    setBusy(donorId + response);
    try {
      const res = await apiCall<{ ok: boolean; requestStatus: string }>(`/api/donors/${donorId}/respond`, {
        method: "POST",
        body: { requestId, response, simulate: true, note: "Simulated by hospital (demo)" },
      });
      toast.success(res.response === "ACCEPTED" ? "Donor accepted — request marked DONOR_FOUND" : "Donor declined — chain advances to next donor");
      onResponded();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (results.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center py-10 text-center">
          <Brain className="h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-700">No matching results yet</p>
          <p className="mt-1 max-w-sm text-xs text-slate-500">
            Run AI matching to rank compatible donors. No suitable donors are currently available nearby? BloodLink will continue monitoring for eligible donors.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
            <Brain className="h-4 w-4 text-violet-600" /> AI-ranked donors
            <span className="rounded-md bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-700">{results.length}</span>
          </h3>
          <p className="text-xs text-slate-500">AI-assisted donor matching score — decision support only.</p>
        </div>
      </div>

      {results.map((r, idx) => {
        const isOpen = expanded === r.donor.id;
        const isTop = idx === 0;
        return (
          <Card key={r.id} className={cn("overflow-hidden transition", isTop && "ring-2 ring-emerald-300")}>
            <Collapsible open={isOpen} onOpenChange={() => setExpanded(isOpen ? null : r.donor.id)}>
              <div className="p-3.5 sm:p-4">
                <div className="flex items-center gap-3">
                  {/* Rank + score */}
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold",
                      isTop ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-600"
                    )}>
                      {r.rank}
                    </div>
                  </div>
                  {/* Donor info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-slate-900">{r.donor.name}</p>
                      <BloodGroupBadge group={r.donor.bloodGroup} className="scale-90" />
                      {isTop && <span className="inline-flex items-center gap-0.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700"><Star className="h-2.5 w-2.5 fill-current" /> TOP</span>}
                      {r.donor.verificationStatus === "VERIFIED" && <VerificationBadge status="VERIFIED" className="scale-90" />}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-0.5"><MapPin className="h-3 w-3" /> {formatDistance(r.distanceKm)}</span>
                      <span>Response {r.donor.responseRate}%</span>
                      <span>{r.donor.donationCount} donations</span>
                      {!r.donor.available && <span className="text-amber-600">Currently unavailable</span>}
                    </div>
                  </div>
                  {/* Match score */}
                  <div className="flex flex-col items-end">
                    <p className={cn("text-2xl font-bold tabular-nums", scoreColor(r.matchScore))}>{Math.round(r.matchScore)}<span className="text-sm">%</span></p>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">match score</p>
                  </div>
                </div>

                {/* Score bar */}
                <div className="mt-3">
                  <Progress value={r.matchScore} className="h-1.5" />
                </div>

                {/* Score breakdown mini-bars */}
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {[
                    { label: "Distance", val: r.distanceScore, max: 30, color: "bg-red-400" },
                    { label: "Avail.", val: r.availabilityScore, max: 25, color: "bg-orange-400" },
                    { label: "Urgency", val: r.urgencyScore, max: 20, color: "bg-amber-400" },
                    { label: "Response", val: r.responseScore, max: 25, color: "bg-emerald-400" },
                  ].map((s) => (
                    <div key={s.label}>
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span>{s.label}</span>
                        <span className="tabular-nums">{Math.round(s.val)}/{s.max}</span>
                      </div>
                      <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-slate-100">
                        <div className={cn("h-full rounded-full", s.color)} style={{ width: `${(s.val / s.max) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="mt-3 flex items-center gap-2">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                      {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      {isOpen ? "Hide reason" : "Why this rank?"}
                    </Button>
                  </CollapsibleTrigger>
                  <div className="ml-auto flex items-center gap-1.5">
                    <Button
                      size="sm" variant="outline"
                      className="h-7 border-rose-200 px-2 text-xs text-rose-600 hover:bg-rose-50"
                      disabled={!!busy}
                      onClick={() => respond(r.donor.id, "DECLINE")}
                    >
                      {busy === r.donor.id + "DECLINE" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 bg-emerald-600 px-2 text-xs hover:bg-emerald-700"
                      disabled={!!busy || !r.donor.available}
                      onClick={() => respond(r.donor.id, "ACCEPT")}
                    >
                      {busy === r.donor.id + "ACCEPT" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      Accept
                    </Button>
                  </div>
                </div>

                <CollapsibleContent>
                  <div className="mt-3 rounded-lg bg-slate-50 p-3">
                    <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500"><Info className="h-3 w-3" /> Recommendation reason</p>
                    <p className="mt-1 text-xs text-slate-700">{r.recommendationReason}</p>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          </Card>
        );
      })}

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
        <p className="text-[11px] text-amber-800">
          <strong>Demo control:</strong> Accept/Decline here simulates the donor&apos;s response on their behalf — useful for demonstrating the donor-chain fallback in a single session. In production, donors respond from their own dashboard.
        </p>
      </div>
      <MedicalDisclaimer variant="compact" />
    </div>
  );
}
