"use client";

import { useMemo, useState } from "react";
import {
  Activity, Users, Droplet, Building2, Hospital, FlaskConical,
  HeartHandshake, Timer, MapPin, AlertTriangle,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { useApp } from "@/stores/app-store";
import { useApi } from "@/lib/api/hooks";
import { REGIONS, BLOOD_GROUPS } from "@/lib/types";
import { StatCard, SectionCard, EmptyState } from "@/components/bloodlink/ui/cards";
import { MedicalDisclaimer } from "@/components/bloodlink/ui/disclaimer";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const BLOOD_GROUP_COLORS: Record<string, string> = {
  "O+": "#ef4444",
  "O-": "#b91c1c",
  "A+": "#f97316",
  "A-": "#c2410c",
  "B+": "#0d9488",
  "B-": "#0f766e",
  "AB+": "#8b5cf6",
  "AB-": "#6d28d9",
};

const RISK_COLORS = ["#10b981", "#f59e0b", "#f97316", "#dc2626"];

interface Overview {
  totalDonors: number;
  activeDonors: number;
  activeRequests: number;
  fulfilledRequests: number;
  unitsRequested: number;
  unitsAvailable: number;
  hospitals: number;
  bloodBanks: number;
  completedDonations: number;
  avgMatchingTimeMin: number;
  avgDonorDistance: number;
  highRiskShortage: { region: string; bloodGroup: string; shortageRisk: number; expectedDemand: string; recommendation: string }[];
}

interface DemandResponse {
  series: { date: string; requested: number; fulfilled: number }[];
  byGroup: { group: string; units: number }[];
  byRegion: { region: string; units: number }[];
  isSynthetic: boolean;
}

interface InventoryResponse {
  totals: { group: string; units: number }[];
  totalUnits: number;
  lowStock: { bloodGroup: string; units: number; region: string }[];
}

function ChartCard({ title, subtitle, children, synthetic }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  synthetic?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-foreground">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {synthetic && (
            <Badge variant="outline" className="shrink-0 border-amber-200 bg-amber-50 text-[10px] text-amber-700">
              Synthetic demo data
            </Badge>
          )}
        </div>
        <div className="h-[300px] w-full">{children}</div>
      </CardContent>
    </Card>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-lg bg-slate-100" />
      ))}
    </div>
  );
}

export function AnalyticsPanel() {
  const { user } = useApp();
  const [region, setRegion] = useState<string>("ALL");
  const [bloodGroup, setBloodGroup] = useState<string>("ALL");
  const [days] = useState(90);

  const overview = useApi<Overview>(user ? "/api/analytics/overview" : null);
  const demandUrl = user
    ? `/api/analytics/demand?days=${days}${region !== "ALL" ? `&region=${region}` : ""}${bloodGroup !== "ALL" ? `&bloodGroup=${bloodGroup}` : ""}`
    : null;
  const demand = useApi<DemandResponse>(demandUrl, [region, bloodGroup, days]);
  const inventory = useApi<InventoryResponse>(user ? "/api/analytics/inventory" : null);

  const overviewData = overview.data;
  const demandData = demand.data;
  const inventoryData = inventory.data;

  const highRiskChart = useMemo(() => {
    if (!overviewData?.highRiskShortage) return [];
    return overviewData.highRiskShortage.map((p) => ({
      label: `${p.region.split(",")[0]} ${p.bloodGroup}`,
      shortageRisk: Math.round(p.shortageRisk),
      region: p.region,
      bloodGroup: p.bloodGroup,
    }));
  }, [overviewData]);

  return (
    <div className="space-y-5">
      <SectionCard
        title="Analytics"
        description="Platform-wide KPIs, demand trends and inventory breakdown"
        action={
          <Badge variant="outline" className="hidden border-amber-200 bg-amber-50 text-amber-700 sm:inline-flex">
            Synthetic demo data
          </Badge>
        }
      >
        <MedicalDisclaimer variant="compact" />
      </SectionCard>

      {/* KPIs */}
      {overview.loading ? (
        <SkeletonGrid />
      ) : overview.error ? (
        <EmptyState title="Couldn't load KPIs" description={overview.error} icon={AlertTriangle} />
      ) : overviewData ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Donors" value={overviewData.totalDonors} sublabel={`${overviewData.activeDonors} active`} icon={Users} accent="red" />
          <StatCard label="Active Requests" value={overviewData.activeRequests} sublabel={`${overviewData.fulfilledRequests} fulfilled`} icon={Activity} accent="amber" />
          <StatCard label="Units Available" value={overviewData.unitsAvailable} sublabel={`${overviewData.unitsRequested} requested`} icon={Droplet} accent="emerald" />
          <StatCard label="Completed Donations" value={overviewData.completedDonations} icon={HeartHandshake} accent="teal" />
          <StatCard label="Hospitals" value={overviewData.hospitals} icon={Hospital} accent="violet" />
          <StatCard label="Blood Banks" value={overviewData.bloodBanks} icon={FlaskConical} accent="violet" />
          <StatCard label="Avg Match Time" value={`${overviewData.avgMatchingTimeMin}m`} sublabel="donor acceptance" icon={Timer} accent="default" />
          <StatCard label="Avg Donor Distance" value={`${overviewData.avgDonorDistance} km`} sublabel="from request site" icon={MapPin} accent="default" />
        </div>
      ) : null}

      {/* Filters */}
      <SectionCard title="Filters" description="Refine the demand chart by region and blood group">
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
        </div>
      </SectionCard>

      {/* Charts */}
      <ChartCard
        title="Blood Demand Over Time"
        subtitle={`Requested vs fulfilled units (last ${days} days)`}
        synthetic={demandData?.isSynthetic}
      >
        {demand.loading ? (
          <div className="h-full w-full animate-pulse rounded-lg bg-slate-100" />
        ) : demand.error ? (
          <EmptyState title="No demand data" description={demand.error} icon={AlertTriangle} />
        ) : demandData && demandData.series.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={demandData.series} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickFormatter={(d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                minTickGap={20}
              />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                labelFormatter={(d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="requested" stroke="#dc2626" strokeWidth={2} dot={false} name="Requested" />
              <Line type="monotone" dataKey="fulfilled" stroke="#10b981" strokeWidth={2} dot={false} name="Fulfilled" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState title="No demand data" description="Demand history is empty for the selected filters." icon={Activity} />
        )}
      </ChartCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Demand by Blood Group" subtitle="Total units requested per group" synthetic={demandData?.isSynthetic}>
          {demand.loading ? (
            <div className="h-full w-full animate-pulse rounded-lg bg-slate-100" />
          ) : demandData && demandData.byGroup.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={demandData.byGroup} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="group" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Bar dataKey="units" radius={[4, 4, 0, 0]}>
                  {demandData.byGroup.map((entry) => (
                    <Cell key={entry.group} fill={BLOOD_GROUP_COLORS[entry.group] ?? "#94a3b8"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No data" icon={Activity} />
          )}
        </ChartCard>

        <ChartCard title="Regional Demand" subtitle="Total units requested per region" synthetic={demandData?.isSynthetic}>
          {demand.loading ? (
            <div className="h-full w-full animate-pulse rounded-lg bg-slate-100" />
          ) : demandData && demandData.byRegion.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={demandData.byRegion} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="region" tick={{ fontSize: 10, fill: "#64748b" }} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Bar dataKey="units" fill="#0d9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No data" icon={Building2} />
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Inventory by Blood Group" subtitle="Total units available across all blood banks">
          {inventory.loading ? (
            <div className="h-full w-full animate-pulse rounded-lg bg-slate-100" />
          ) : inventory.error ? (
            <EmptyState title="No inventory data" description={inventory.error} icon={AlertTriangle} />
          ) : inventoryData && inventoryData.totals.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={inventoryData.totals}
                  dataKey="units"
                  nameKey="group"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={45}
                  paddingAngle={2}
                  label={(entry) => `${entry.group}: ${entry.units}`}
                  labelLine={false}
                >
                  {inventoryData.totals.map((entry) => (
                    <Cell key={entry.group} fill={BLOOD_GROUP_COLORS[entry.group] ?? "#94a3b8"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No inventory" icon={Droplet} />
          )}
        </ChartCard>

        <ChartCard title="Shortage Risk" subtitle="Top high-risk region × blood group predictions">
          {highRiskChart.length === 0 ? (
            <EmptyState title="No high-risk predictions" description="Shortage risk is currently low across the platform." icon={AlertTriangle} />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={highRiskChart} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} width={110} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                  formatter={(value: number) => [`${value}%`, "Shortage risk"]}
                />
                <Bar dataKey="shortageRisk" radius={[0, 4, 4, 0]}>
                  {highRiskChart.map((entry, i) => {
                    const v = entry.shortageRisk;
                    const color = v >= 75 ? RISK_COLORS[3] : v >= 50 ? RISK_COLORS[2] : v >= 30 ? RISK_COLORS[1] : RISK_COLORS[0];
                    return <Cell key={i} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
