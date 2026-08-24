"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Boxes, AlertTriangle, Siren, TrendingUp, Droplet, ShieldCheck, Plus,
} from "lucide-react";
import { useApp } from "@/stores/app-store";
import { useApi, apiCall } from "@/lib/api/hooks";
import {
  StatCard, SectionCard, EmptyState,
} from "@/components/bloodlink/ui/cards";
import {
  BloodGroupBadge, UrgencyBadge, VerificationBadge,
} from "@/components/bloodlink/ui/badges";
import { MedicalDisclaimer } from "@/components/bloodlink/ui/disclaimer";
import { formatRelativeTime, riskColor } from "@/components/bloodlink/ui/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { BLOOD_GROUPS } from "@/lib/types";

interface BloodInventory {
  id: string;
  bloodGroup: string;
  units: number;
  lowThreshold: number;
  region: string;
  lastUpdated: string;
  bloodBank: { name: string };
}

interface ShortagePrediction {
  id: string;
  region: string;
  bloodGroup: string;
  predictedDate: string;
  shortageRisk: number;
  expectedDemand: string;
  expectedUnits: number;
  availableUnits: number;
  recommendation: string;
  confidence: number;
}

interface EmergencyRequest {
  id: string;
  requestId: string;
  bloodGroup: string;
  unitsRequired: number;
  urgency: string;
  status: string;
  hospital: { name: string };
}

interface BloodBankDashboardData {
  role: "BLOOD_BANK";
  bloodBank: {
    id: string;
    name: string;
    region: string;
    lat: number;
    lng: number;
    verificationStatus: string;
    address?: string;
  };
  inventory: BloodInventory[];
  regionalInventory: BloodInventory[];
  predictions: ShortagePrediction[];
  emergencyRequests: EmergencyRequest[];
}

const BLOOD_GROUP_COLORS: Record<string, string> = {
  "O+": "#ef4444", "O-": "#b91c1c", "A+": "#f97316", "A-": "#c2410c",
  "B+": "#0d9488", "B-": "#0f766e", "AB+": "#8b5cf6", "AB-": "#6d28d9",
};

export function BloodBankDashboard() {
  const { user } = useApp();
  const { data, loading, error, refetch } = useApi<BloodBankDashboardData>(
    user ? "/api/dashboard" : null
  );

  const [newGroup, setNewGroup] = useState<string>("O+");
  const [newUnits, setNewUnits] = useState<string>("");
  const [updating, setUpdating] = useState(false);

  const bank = data?.bloodBank ?? user?.bloodBank ?? null;
  const isVerified = (bank?.verificationStatus ?? "PENDING") === "VERIFIED";

  // Build a per-group aggregate using regional inventory (most useful view)
  const grouped = useMemo(() => {
    const source = data?.regionalInventory?.length ? data.regionalInventory : (data?.inventory ?? []);
    const map = new Map<string, { units: number; lowThreshold: number; lastUpdated: string | null; banks: number }>();
    for (const bg of BLOOD_GROUPS) {
      map.set(bg, { units: 0, lowThreshold: 10, lastUpdated: null, banks: 0 });
    }
    for (const inv of source) {
      const cur = map.get(inv.bloodGroup) ?? { units: 0, lowThreshold: 10, lastUpdated: null, banks: 0 };
      cur.units += inv.units;
      cur.lowThreshold = Math.min(cur.lowThreshold, inv.lowThreshold);
      cur.banks += 1;
      if (!cur.lastUpdated || new Date(inv.lastUpdated) > new Date(cur.lastUpdated)) {
        cur.lastUpdated = inv.lastUpdated;
      }
      map.set(inv.bloodGroup, cur);
    }
    return BLOOD_GROUPS.map((bg) => ({ bloodGroup: bg, ...(map.get(bg) as { units: number; lowThreshold: number; lastUpdated: string | null; banks: number }) }));
  }, [data]);

  const totalUnits = grouped.reduce((a, b) => a + b.units, 0);
  const lowStockCount = grouped.filter((g) => g.units <= g.lowThreshold).length;
  const highRiskPredictions = (data?.predictions ?? []).filter((p) => p.shortageRisk >= 50).length;
  const sortedPredictions = useMemo(
    () => [...(data?.predictions ?? [])].sort((a, b) => b.shortageRisk - a.shortageRisk).slice(0, 5),
    [data]
  );

  async function handleUpdateUnits() {
    if (!bank) return;
    const units = parseInt(newUnits, 10);
    if (Number.isNaN(units) || units < 0 || units > 999) {
      toast.error("Enter a valid units count (0-999)");
      return;
    }
    setUpdating(true);
    try {
      await apiCall("/api/inventory", {
        method: "POST",
        body: { bloodGroup: newGroup, units, region: bank.region },
      });
      toast.success(`${newGroup} updated to ${units} units`, {
        description: `${bank.name} • ${bank.region}`,
      });
      setNewUnits("");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update inventory");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-600 text-white">
              <Boxes className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{bank?.name ?? "Blood Bank"}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-slate-200 text-slate-600">{bank?.region ?? "—"}</Badge>
                {bank && <VerificationBadge status={bank.verificationStatus} />}
              </div>
            </div>
          </div>
          <MedicalDisclaimer variant="compact" className="max-w-md" />
        </CardContent>
      </Card>

      {!isVerified && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="font-medium">Verification pending</p>
            <p className="mt-0.5 text-xs text-amber-700">
              Inventory updates are restricted until a BloodLink admin verifies your blood bank.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-lg bg-slate-100" />)}
        </div>
      ) : error ? (
        <EmptyState title="Couldn't load your dashboard" description={error} icon={AlertTriangle} />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Total Units" value={totalUnits} sublabel="across all groups" icon={Droplet} accent="red" />
          <StatCard
            label="Low Stock"
            value={lowStockCount}
            sublabel={`of ${BLOOD_GROUPS.length} groups`}
            icon={AlertTriangle}
            accent={lowStockCount > 0 ? "amber" : "emerald"}
          />
          <StatCard label="Emergency Requests" value={data?.emergencyRequests.length ?? 0} sublabel="in your region" icon={Siren} accent="red" />
          <StatCard label="High-Risk Predictions" value={highRiskPredictions} sublabel="shortage risk ≥ 50%" icon={TrendingUp} accent="violet" />
        </div>
      )}

      {/* Two-column */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left: inventory */}
        <div className="space-y-5 lg:col-span-2">
          <SectionCard
            title="Blood Inventory"
            description={`Regional stock for ${bank?.region ?? "your region"}`}
            action={
              <Badge variant="outline" className="border-slate-200 text-slate-600">
                {grouped.filter((g) => g.lastUpdated).length > 0
                  ? `Updated ${formatRelativeTime(grouped.find((g) => g.lastUpdated)?.lastUpdated ?? null)}`
                  : "No updates"}
              </Badge>
            }
          >
            {loading ? (
              <div className="space-y-2">
                {[...Array(8)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />)}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-slate-500">
                      <th className="py-2 pr-3 font-medium">Blood Group</th>
                      <th className="px-3 py-2 text-right font-medium">Units</th>
                      <th className="px-3 py-2 text-right font-medium">Threshold</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 text-right font-medium">Last Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grouped.map((g) => {
                      const low = g.units <= g.lowThreshold;
                      return (
                        <tr key={g.bloodGroup} className="border-b last:border-0">
                          <td className="py-2.5 pr-3">
                            <div className="flex items-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-full" style={{ background: BLOOD_GROUP_COLORS[g.bloodGroup] }} />
                              <span className="font-semibold text-slate-900">{g.bloodGroup}</span>
                            </div>
                          </td>
                          <td className={`px-3 py-2.5 text-right font-bold tabular-nums ${low ? "text-red-600" : "text-slate-900"}`}>
                            {g.units}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">{g.lowThreshold}</td>
                          <td className="px-3 py-2.5">
                            {low ? (
                              <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Low stock</Badge>
                            ) : g.units <= g.lowThreshold * 2 ? (
                              <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">Moderate</Badge>
                            ) : (
                              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">Healthy</Badge>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right text-xs text-slate-500">
                            {formatRelativeTime(g.lastUpdated)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          {/* Update inventory */}
          <SectionCard title="Update Inventory" description="Set current stock for a blood group at your bank">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Blood group</label>
                <Select value={newGroup} onValueChange={setNewGroup}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BLOOD_GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Units (absolute)</label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={999}
                  value={newUnits}
                  onChange={(e) => setNewUnits(e.target.value)}
                  placeholder="e.g. 45"
                  className="max-w-[180px]"
                />
              </div>
              <Button
                onClick={handleUpdateUnits}
                disabled={updating || !isVerified || !newUnits}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                <Plus className="mr-1 h-4 w-4" />
                {updating ? "Updating…" : "Update"}
              </Button>
            </div>
            {!isVerified && (
              <p className="mt-2 text-[11px] text-amber-700">
                Inventory updates are disabled while your blood bank is unverified.
              </p>
            )}
          </SectionCard>
        </div>

        {/* Right: predictions + emergencies */}
        <div className="space-y-5">
          <SectionCard title="Shortage Predictions" description="Top 5 by risk in your region">
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-lg bg-slate-100" />)}
              </div>
            ) : sortedPredictions.length === 0 ? (
              <EmptyState title="No predictions" icon={TrendingUp} className="py-6" />
            ) : (
              <ul className="space-y-3">
                {sortedPredictions.map((p) => (
                  <li key={p.id} className="rounded-lg border border-slate-100 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <BloodGroupBadge group={p.bloodGroup} />
                      <span className={`text-lg font-bold tabular-nums ${riskColor(p.shortageRisk)}`}>
                        {Math.round(p.shortageRisk)}%
                      </span>
                    </div>
                    <Progress value={p.shortageRisk} className="mt-2 h-1.5" />
                    <p className="mt-2 text-[11px] text-slate-600">
                      <span className="font-medium">Demand:</span> {p.expectedDemand} ({p.expectedUnits} units expected)
                    </p>
                    <p className="mt-1 line-clamp-2 text-[11px] text-slate-500">{p.recommendation}</p>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Emergency Requests" description="Active in your region">
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />)}
              </div>
            ) : !data || data.emergencyRequests.length === 0 ? (
              <EmptyState title="No active emergencies" icon={Siren} className="py-6" />
            ) : (
              <ul className="max-h-80 space-y-2 overflow-y-auto">
                {data.emergencyRequests.map((r) => (
                  <li key={r.id} className="rounded-lg border border-slate-100 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <BloodGroupBadge group={r.bloodGroup} />
                      <UrgencyBadge urgency={r.urgency} />
                    </div>
                    <p className="mt-1.5 truncate text-xs font-medium text-slate-900">{r.hospital.name}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {r.unitsRequired} unit{r.unitsRequired === 1 ? "" : "s"} • {r.requestId}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
