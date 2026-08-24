"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BloodGroupBadge, UrgencyBadge, StatusBadge } from "@/components/bloodlink/ui/badges";
import { SectionCard } from "@/components/bloodlink/ui/cards";
import { formatDistance, formatDateTime, formatTimeRemaining, formatRelativeTime } from "@/components/bloodlink/ui/format";
import { MedicalDisclaimer } from "@/components/bloodlink/ui/disclaimer";
import { MatchingResults } from "./MatchingResults";
import { DonorChain } from "./DonorChain";
import DonorMapLazy from "./RequestMap";
import { useApi, apiCall } from "@/lib/api/hooks";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Clock, Brain, CheckCircle2, XCircle, Loader2, RefreshCw, Building2, FileText, Droplet, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface RequestDetail {
  request: {
    id: string;
    requestId: string;
    bloodGroup: string;
    unitsRequired: number;
    unitsFulfilled: number;
    urgency: string;
    requiredBy: string;
    status: string;
    matchedDonorId: string | null;
    hospitalName: string;
    lat: number;
    lng: number;
    address: string;
    region: string;
    notes: string | null;
    patientCondition: string | null;
    createdAt: string;
    matchingResults: Array<{
      id: string; rank: number; matchScore: number; distanceKm: number; distanceScore: number;
      availabilityScore: number; urgencyScore: number; responseScore: number; recommendationReason: string;
      donor: { id: string; name: string; bloodGroup: string; region: string; available: boolean; responseRate: number; donationCount: number; verificationStatus: string; lat: number; lng: number; user?: { name: string } };
    }>;
    notificationEvents: Array<{
      id: string; chainOrder: number; status: string; sentAt: string; viewedAt: string | null; respondedAt: string | null; note: string | null;
      donor: { id: string; name: string; bloodGroup: string; responseRate: number };
    }>;
    hospital: { name: string; address: string; lat: number; lng: number; phone: string | null };
  };
}

export function RequestDetailPanel({ requestId, onBack }: { requestId: string; onBack: () => void }) {
  const [tick, setTick] = useState(0);
  const { data, loading, refetch } = useApi<RequestDetail>(`/api/blood-requests/${requestId}?t=${tick}`, [tick, requestId]);
  const [runningMatching, setRunningMatching] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setTick((t) => t + 1);
    refetch();
  }, [refetch]);

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="mr-1.5 h-4 w-4" /> Back to requests</Button>
        <div className="h-64 animate-pulse rounded-lg bg-slate-100" />
      </div>
    );
  }

  const req = data.request;
  const canRunMatching = ["PENDING", "MATCHING"].includes(req.status);
  const canFulfill = ["DONOR_FOUND", "PARTIALLY_FULFILLED"].includes(req.status);
  const canCancel = !["FULFILLED", "CANCELLED", "EXPIRED"].includes(req.status);

  async function runMatching() {
    setRunningMatching(true);
    try {
      const res = await apiCall<{ ranked: unknown[]; notifiedDonors: unknown[] }>(`/api/matching/run`, {
        method: "POST", body: { requestId, notifyTopN: 5 },
      });
      toast.success(`AI matching complete — ${res.ranked.length} donors ranked, top ${res.notifiedDonors.length} notified.`);
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRunningMatching(false);
    }
  }

  async function fulfill() {
    setActing("fulfill");
    try {
      await apiCall(`/api/blood-requests/${requestId}`, { method: "PATCH", body: { action: "fulfill" } });
      toast.success("Request fulfilled — units delivered.");
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setActing(null);
    }
  }

  async function cancel() {
    setActing("cancel");
    try {
      await apiCall(`/api/blood-requests/${requestId}`, { method: "PATCH", body: { action: "cancel" } });
      toast.success("Request cancelled.");
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setActing(null);
    }
  }

  const mapMarkers = [
    { lat: req.lat, lng: req.lng, type: "hospital" as const, popup: `<b>${req.hospitalName}</b><br/>Request ${req.requestId}`, label: "Hospital" },
    ...req.matchingResults.slice(0, 10).map((r) => ({
      lat: r.donor.lat, lng: r.donor.lng, type: "donor" as const, score: r.matchScore, highlighted: r.rank <= 3,
      popup: `<b>#${r.rank} ${r.donor.name}</b><br/>${r.donor.bloodGroup} · ${formatDistance(r.distanceKm)}<br/>Match ${Math.round(r.matchScore)}%`,
    })),
  ];

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="mr-1.5 h-4 w-4" /> Back to requests</Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refresh}><RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh</Button>
          {canRunMatching && (
            <Button size="sm" onClick={runMatching} disabled={runningMatching} className="bg-violet-600 hover:bg-violet-700">
              {runningMatching ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Brain className="mr-1.5 h-3.5 w-3.5" />}
              {req.matchingResults.length > 0 ? "Re-run AI Matching" : "Run AI Matching"}
            </Button>
          )}
          {canFulfill && (
            <Button size="sm" onClick={fulfill} disabled={acting === "fulfill"} className="bg-emerald-600 hover:bg-emerald-700">
              {acting === "fulfill" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />}
              Mark Fulfilled
            </Button>
          )}
          {canCancel && (
            <Button size="sm" variant="outline" onClick={cancel} disabled={acting === "cancel"} className="border-rose-200 text-rose-600 hover:bg-rose-50">
              {acting === "cancel" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <XCircle className="mr-1.5 h-3.5 w-3.5" />}
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Request summary */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-semibold text-slate-900">{req.requestId}</span>
                <StatusBadge status={req.status} />
                <UrgencyBadge urgency={req.urgency} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <BloodGroupBadge group={req.bloodGroup} />
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Required</p>
                    <p className="text-sm font-semibold text-slate-900">{req.bloodGroup}</p>
                  </div>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Units</p>
                  <p className="text-sm font-semibold text-slate-900">{req.unitsFulfilled}/{req.unitsRequired}</p>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Required by</p>
                  <p className="flex items-center gap-1 text-sm font-semibold text-slate-900"><Clock className="h-3.5 w-3.5 text-slate-400" /> {formatDateTime(req.requiredBy)}</p>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Time remaining</p>
                  <p className={cn("text-sm font-semibold", req.status === "FULFILLED" ? "text-emerald-600" : "text-rose-600")}>{formatTimeRemaining(req.requiredBy)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-slate-400">Hospital</p>
                <p className="truncate text-sm font-medium text-slate-900">{req.hospitalName}</p>
                <p className="flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3 w-3" /> {req.address}</p>
              </div>
            </div>
            {(req.patientCondition || req.notes) && (
              <div className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Clinical notes</p>
                  {req.patientCondition && <p className="text-sm font-medium text-slate-900">{req.patientCondition}</p>}
                  {req.notes && <p className="text-xs text-slate-500">{req.notes}</p>}
                </div>
              </div>
            )}
          </div>

          {/* progress bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Fulfillment progress</span>
              <span className="font-semibold">{Math.round((req.unitsFulfilled / req.unitsRequired) * 100)}%</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className={cn("h-full rounded-full", req.status === "FULFILLED" ? "bg-emerald-500" : "bg-red-500")} style={{ width: `${(req.unitsFulfilled / req.unitsRequired) * 100}%` }} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status banner */}
      {req.status === "DONOR_FOUND" && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">Donor found!</p>
            <p className="text-xs text-emerald-700">A donor accepted the request. Verify compatibility testing with the blood bank, then mark fulfilled when units are delivered.</p>
          </div>
        </div>
      )}
      {req.status === "FULFILLED" && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">Request fulfilled</p>
            <p className="text-xs text-emerald-700">{req.unitsRequired} unit(s) of {req.bloodGroup} coordinated successfully.</p>
          </div>
        </div>
      )}

      {/* Main grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left: matching results */}
        <div className="lg:col-span-2 space-y-4">
          <SectionCard
            title="AI donor matching"
            description="Compatible donors ranked by transparent scoring"
            action={<Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-700"><Zap className="mr-1 h-3 w-3" /> AI-assisted</Badge>}
          >
            <MatchingResults requestId={requestId} results={req.matchingResults.map((r) => ({
              id: r.id, rank: r.rank, matchScore: r.matchScore, distanceKm: r.distanceKm,
              distanceScore: r.distanceScore, availabilityScore: r.availabilityScore, urgencyScore: r.urgencyScore,
              responseScore: r.responseScore, recommendationReason: r.recommendationReason,
              donor: { id: r.donor.id, name: r.donor.user?.name ?? r.donor.name, bloodGroup: r.donor.bloodGroup, region: r.donor.region, available: r.donor.available, responseRate: r.donor.responseRate, donationCount: r.donor.donationCount, verificationStatus: r.donor.verificationStatus, lat: r.donor.lat, lng: r.donor.lng },
            }))} onResponded={refresh} />
          </SectionCard>

          {/* Map */}
          <SectionCard title="Donor locations" description="Approximate donor positions around the hospital">
            <DonorMapLazy center={[req.lat, req.lng]} markers={mapMarkers} radiusKm={15} className="h-72 w-full rounded-lg overflow-hidden border" zoom={12} />
            <p className="mt-2 text-[11px] text-slate-400">Donor locations are approximate (privacy-preserving). Red dashed circle = 15 km search radius.</p>
          </SectionCard>
        </div>

        {/* Right: donor chain */}
        <div className="space-y-4">
          <DonorChain events={req.notificationEvents.map((e) => ({
            id: e.id, chainOrder: e.chainOrder, status: e.status, sentAt: e.sentAt, viewedAt: e.viewedAt, respondedAt: e.respondedAt, note: e.note,
            donor: { id: e.donor.id, name: e.donor.name, bloodGroup: e.donor.bloodGroup, responseRate: e.donor.responseRate },
          }))} matchedDonorId={req.matchedDonorId} />

          <Card>
            <CardContent className="p-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Timeline</h4>
              <ul className="space-y-2 text-xs">
                <li className="flex items-center gap-2 text-slate-600"><Droplet className="h-3 w-3 text-red-500" /> Request created {formatRelativeTime(req.createdAt)}</li>
                {req.matchingResults.length > 0 && <li className="flex items-center gap-2 text-slate-600"><Brain className="h-3 w-3 text-violet-500" /> Matching run · {req.matchingResults.length} donors ranked</li>}
                {req.notificationEvents.length > 0 && <li className="flex items-center gap-2 text-slate-600"><Zap className="h-3 w-3 text-amber-500" /> {req.notificationEvents.length} donor(s) notified</li>}
                {req.matchedDonorId && <li className="flex items-center gap-2 text-emerald-600"><CheckCircle2 className="h-3 w-3" /> Donor accepted</li>}
                {req.status === "FULFILLED" && <li className="flex items-center gap-2 text-emerald-600"><CheckCircle2 className="h-3 w-3" /> Fulfilled</li>}
              </ul>
            </CardContent>
          </Card>

          <MedicalDisclaimer variant="banner" />
        </div>
      </div>
    </div>
  );
}
