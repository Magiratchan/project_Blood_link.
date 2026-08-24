"use client";

import { useState } from "react";
import { useApp } from "@/stores/app-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BloodGroupBadge, UrgencyBadge, StatusBadge } from "@/components/bloodlink/ui/badges";
import { SectionCard, EmptyState, StatCard } from "@/components/bloodlink/ui/cards";
import { useApi } from "@/lib/api/hooks";
import { formatDistance, formatTimeRemaining, formatRelativeTime, formatDateTime, scoreColor } from "@/components/bloodlink/ui/format";
import { CreateRequestDialog } from "./CreateRequestDialog";
import { RequestDetailPanel } from "./RequestDetailPanel";
import {
  Plus, Droplet, Activity, CheckCircle2, MapPin, Clock, ChevronRight,
  Building2, Zap, Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HospitalRequest {
  id: string;
  requestId: string;
  bloodGroup: string;
  unitsRequired: number;
  unitsFulfilled: number;
  urgency: string;
  requiredBy: string;
  status: string;
  matchedDonorId: string | null;
  lat: number;
  lng: number;
  address: string;
  region: string;
  notes: string | null;
  createdAt: string;
  matchingResults: Array<{ rank: number; matchScore: number; distanceKm: number; donor: { name: string; bloodGroup: string; user?: { name: string } } }>;
  notificationEvents: Array<{ status: string; donor: { name: string; bloodGroup: string } }>;
}

interface DashboardData {
  role: string;
  hospital: { id: string; name: string; region: string; lat: number; lng: number; address: string; verificationStatus: string };
  requests: HospitalRequest[];
}

export function HospitalDashboard() {
  const { user, selectedRequestId, setSelectedRequestId } = useApp();
  const [createOpen, setCreateOpen] = useState(false);
  const [tick, setTick] = useState(0);
  const { data, loading, refetch } = useApi<DashboardData>("/api/dashboard", [tick]);

  if (!user) return null;

  // Detail view
  if (selectedRequestId) {
    return <RequestDetailPanel requestId={selectedRequestId} onBack={() => setSelectedRequestId(null)} />;
  }

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-lg bg-slate-100" />)}
        </div>
        <div className="h-64 animate-pulse rounded-lg bg-slate-100" />
      </div>
    );
  }

  // Newly registered hospital with no verified profile yet
  if (!data.hospital) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Hospital Dashboard</h1>
          <p className="mt-0.5 text-sm text-slate-500">{user.name}</p>
        </div>
        <div className="flex flex-col items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-6 py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
            <Building2 className="h-7 w-7 text-amber-600" />
          </div>
          <div>
            <p className="text-base font-semibold text-amber-900">Verification in progress</p>
            <p className="mt-1 max-w-md text-sm text-amber-700">
              Your hospital account is registered. A BloodLink admin must verify your facility before you can create emergency blood requests. Demo accounts are already verified — log out and try a demo account to explore the full dashboard.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const hospital = data.hospital;
  const requests = data.requests;
  const activeRequests = requests.filter((r) => ["PENDING", "MATCHING", "DONOR_FOUND", "PARTIALLY_FULFILLED"].includes(r.status));
  const fulfilled = requests.filter((r) => r.status === "FULFILLED");
  const unitsRequested = requests.reduce((a, r) => a + r.unitsRequired, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Hospital Dashboard</h1>
            <Badge variant="outline" className="border-teal-200 bg-teal-50 text-teal-700">{hospital.region}</Badge>
          </div>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-500"><Building2 className="h-3.5 w-3.5" /> {hospital.name}</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-red-600 hover:bg-red-700">
          <Plus className="mr-1.5 h-4 w-4" /> Create Emergency Request
        </Button>
      </div>

      {hospital.verificationStatus !== "VERIFIED" && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          <Clock className="h-4 w-4" />
          Your hospital is pending verification. You can create requests once an admin verifies your facility.
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatCard label="Active requests" value={activeRequests.length} icon={Activity} accent="red" />
        <StatCard label="Fulfilled" value={fulfilled.length} icon={CheckCircle2} accent="emerald" />
        <StatCard label="Units requested" value={unitsRequested} icon={Droplet} accent="amber" />
        <StatCard label="Critical pending" value={activeRequests.filter((r) => r.urgency === "CRITICAL").length} icon={Zap} accent="violet" />
      </div>

      {/* Active requests */}
      <SectionCard
        title="Active emergency requests"
        description={`${activeRequests.length} request(s) needing coordination`}
        action={<Button variant="ghost" size="sm" onClick={() => setTick((t) => t + 1)}>Refresh</Button>}
      >
        {activeRequests.length === 0 ? (
          <EmptyState
            icon={Plus}
            title="No active requests"
            description="Create your first emergency blood request to start AI donor matching."
            action={<Button onClick={() => setCreateOpen(true)} className="bg-red-600 hover:bg-red-700"><Plus className="mr-1.5 h-4 w-4" /> New request</Button>}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {activeRequests.map((r) => {
              const topMatch = r.matchingResults[0];
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedRequestId(r.id)}
                  className="group flex flex-col rounded-lg border border-slate-200 bg-white p-4 text-left transition hover:border-red-300 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <BloodGroupBadge group={r.bloodGroup} />
                      <span className="font-mono text-xs font-semibold text-slate-500">{r.requestId}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <UrgencyBadge urgency={r.urgency} className="scale-90" />
                      <StatusBadge status={r.status} className="scale-90" />
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-[10px] uppercase text-slate-400">Units</p>
                      <p className="font-semibold text-slate-900">{r.unitsFulfilled}/{r.unitsRequired}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-slate-400">Donors ranked</p>
                      <p className="font-semibold text-slate-900">{r.matchingResults.length}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-slate-400">Time left</p>
                      <p className={cn("font-semibold", r.status === "FULFILLED" ? "text-emerald-600" : "text-rose-600")}>{formatTimeRemaining(r.requiredBy)}</p>
                    </div>
                  </div>
                  {topMatch && (
                    <div className="mt-3 flex items-center gap-2 rounded-md bg-violet-50 px-2.5 py-1.5">
                      <Brain className="h-3.5 w-3.5 text-violet-600" />
                      <span className="text-xs text-slate-600">Top match:</span>
                      <span className="text-xs font-semibold text-slate-900">{topMatch.donor.user?.name ?? topMatch.donor.name}</span>
                      <span className={cn("ml-auto text-sm font-bold", scoreColor(topMatch.matchScore))}>{Math.round(topMatch.matchScore)}%</span>
                    </div>
                  )}
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {formatRelativeTime(r.createdAt)}</span>
                    <span className="inline-flex items-center gap-0.5 font-medium text-red-600 opacity-0 transition group-hover:opacity-100">View <ChevronRight className="h-3 w-3" /></span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* History */}
      {fulfilled.length > 0 && (
        <SectionCard title="Fulfilled requests" description="Recently completed coordinations">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-slate-500">
                  <th className="pb-2 pr-4 font-medium">Request</th>
                  <th className="pb-2 pr-4 font-medium">Blood</th>
                  <th className="pb-2 pr-4 font-medium">Units</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 font-medium">Fulfilled at</th>
                </tr>
              </thead>
              <tbody>
                {fulfilled.slice(0, 8).map((r) => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="py-2 pr-4 font-mono text-xs text-slate-600">{r.requestId}</td>
                    <td className="py-2 pr-4"><BloodGroupBadge group={r.bloodGroup} className="scale-90" /></td>
                    <td className="py-2 pr-4">{r.unitsRequired}</td>
                    <td className="py-2 pr-4"><StatusBadge status={r.status} className="scale-90" /></td>
                    <td className="py-2 text-xs text-slate-500">{formatDateTime(r.requiredBy)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      <CreateRequestDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={(id) => { setCreateOpen(false); setTick((t) => t + 1); setSelectedRequestId(id); }} />
    </div>
  );
}
