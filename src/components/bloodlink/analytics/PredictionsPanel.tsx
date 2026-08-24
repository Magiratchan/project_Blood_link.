"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, TrendingUp, Gauge, Sparkles } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { useApp } from "@/stores/app-store";
import { useApi } from "@/lib/api/hooks";
import { REGIONS, BLOOD_GROUPS } from "@/lib/types";
import { SectionCard, EmptyState } from "@/components/bloodlink/ui/cards";
import { MedicalDisclaimer } from "@/components/bloodlink/ui/disclaimer";
import { BloodGroupBadge } from "@/components/bloodlink/ui/badges";
import { riskColor } from "@/components/bloodlink/ui/format";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";

interface Prediction {
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
  isSynthetic: boolean;
}

interface PredictionResponse {
  predictions: Prediction[];
  isSynthetic: boolean;
  disclaimer: string;
}

function riskBg(risk: number) {
  if (risk >= 75) return "bg-red-500";
  if (risk >= 50) return "bg-orange-500";
  if (risk >= 30) return "bg-amber-500";
  return "bg-emerald-500";
}

function riskBadgeColor(risk: number) {
  if (risk >= 75) return "border-red-200 bg-red-50 text-red-700";
  if (risk >= 50) return "border-orange-200 bg-orange-50 text-orange-700";
  if (risk >= 30) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function demandBadge(d: string) {
  const map: Record<string, string> = {
    LOW: "bg-emerald-100 text-emerald-700",
    MODERATE: "bg-amber-100 text-amber-700",
    HIGH: "bg-orange-100 text-orange-700",
    CRITICAL: "bg-red-100 text-red-700",
  };
  return map[d] ?? "bg-slate-100 text-slate-700";
}

export function PredictionsPanel() {
  const { user } = useApp();
  const [region, setRegion] = useState<string>("ALL");
  const [bloodGroup, setBloodGroup] = useState<string>("ALL");

  const url = user
    ? `/api/predictions/shortage?${region !== "ALL" ? `region=${encodeURIComponent(region)}&` : ""}${bloodGroup !== "ALL" ? `bloodGroup=${encodeURIComponent(bloodGroup)}` : ""}`
    : null;

  const { data, loading, error } = useApi<PredictionResponse>(url, [region, bloodGroup]);

  const sorted = useMemo(() => {
    if (!data?.predictions) return [];
    return [...data.predictions].sort((a, b) => b.shortageRisk - a.shortageRisk);
  }, [data]);

  const chartData = useMemo(
    () => sorted.map((p) => ({
      label: `${p.region.slice(0, 3)}-${p.bloodGroup.replace("+", "p").replace("-", "n")}`,
      region: p.region,
      bloodGroup: p.bloodGroup,
      shortageRisk: Math.round(p.shortageRisk),
    })),
    [sorted]
  );

  return (
    <div className="space-y-5">
      <SectionCard
        title="Shortage Prediction"
        description="Statistical-v1 — decision support only"
        action={
          <Badge variant="outline" className="hidden border-amber-200 bg-amber-50 text-amber-700 sm:inline-flex">
            <Sparkles className="mr-1 h-3 w-3" />
            Synthetic
          </Badge>
        }
      >
        <MedicalDisclaimer variant="compact" />
      </SectionCard>

      {/* Filters */}
      <SectionCard title="Filters">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Region</label>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All regions</SelectItem>
                {REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Blood Group</label>
            <Select value={bloodGroup} onValueChange={setBloodGroup}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All groups</SelectItem>
                {BLOOD_GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {data?.predictions && (
            <Badge variant="outline" className="ml-auto border-slate-200 text-slate-600">
              {data.predictions.length} predictions
            </Badge>
          )}
        </div>
      </SectionCard>

      {/* Overview chart */}
      {sorted.length > 0 && (
        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Shortage Risk Overview</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">All filtered predictions, sorted by risk</p>
              </div>
            </div>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 9, fill: "#64748b" }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                  />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748b" }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                    formatter={(value: number, _name, props) => [
                      `${value}%`,
                      `${props.payload.region} ${props.payload.bloodGroup}`,
                    ]}
                  />
                  <Bar dataKey="shortageRisk" radius={[3, 3, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={riskBg(entry.shortageRisk)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prediction cards */}
      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : error ? (
        <EmptyState title="Couldn't load predictions" description={error} icon={AlertTriangle} />
      ) : sorted.length === 0 ? (
        <EmptyState
          title="No predictions available"
          description="Try a different region or blood group filter."
          icon={TrendingUp}
        />
      ) : (
        <div className="max-h-[600px] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((p) => (
              <Card key={p.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <BloodGroupBadge group={p.bloodGroup} />
                      <div>
                        <p className="text-sm font-semibold text-foreground">{p.region}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(p.predictedDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`shrink-0 ${riskBadgeColor(p.shortageRisk)}`}>
                      {p.shortageRisk >= 75 ? "Critical" : p.shortageRisk >= 50 ? "High" : p.shortageRisk >= 30 ? "Moderate" : "Low"}
                    </Badge>
                  </div>

                  <div className="mt-3 flex items-end gap-2">
                    <span className={`text-3xl font-bold tabular-nums ${riskColor(p.shortageRisk)}`}>
                      {Math.round(p.shortageRisk)}%
                    </span>
                    <span className="mb-1 text-[11px] text-muted-foreground">shortage risk</span>
                  </div>
                  <Progress value={p.shortageRisk} className={`mt-2 h-1.5 [&>div]:${riskBg(p.shortageRisk)}`} />

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-md bg-slate-50 px-2 py-1.5">
                      <p className="text-muted-foreground">Expected demand</p>
                      <p className="mt-0.5">
                        <Badge className={`px-1.5 py-0 text-[10px] ${demandBadge(p.expectedDemand)}`}>{p.expectedDemand}</Badge>
                      </p>
                    </div>
                    <div className="rounded-md bg-slate-50 px-2 py-1.5">
                      <p className="text-muted-foreground">Confidence</p>
                      <p className="mt-0.5 flex items-center gap-1 font-medium">
                        <Gauge className="h-3 w-3" /> {Math.round(p.confidence)}%
                      </p>
                    </div>
                    <div className="rounded-md bg-slate-50 px-2 py-1.5">
                      <p className="text-muted-foreground">Expected units</p>
                      <p className="mt-0.5 font-medium tabular-nums">{p.expectedUnits}</p>
                    </div>
                    <div className="rounded-md bg-slate-50 px-2 py-1.5">
                      <p className="text-muted-foreground">Available</p>
                      <p className={`mt-0.5 font-medium tabular-nums ${p.availableUnits <= p.expectedUnits ? "text-red-600" : "text-emerald-600"}`}>
                        {p.availableUnits}
                      </p>
                    </div>
                  </div>

                  <p className="mt-3 line-clamp-3 text-xs text-slate-600">{p.recommendation}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
