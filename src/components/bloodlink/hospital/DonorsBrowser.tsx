"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  MapPin, SlidersHorizontal, Users, AlertTriangle, Search,
} from "lucide-react";
import { useApp } from "@/stores/app-store";
import { useApi } from "@/lib/api/hooks";
import { BLOOD_GROUPS, REGIONS } from "@/lib/types";
import { SectionCard, EmptyState } from "@/components/bloodlink/ui/cards";
import { MedicalDisclaimer } from "@/components/bloodlink/ui/disclaimer";
import { BloodGroupBadge, VerificationBadge } from "@/components/bloodlink/ui/badges";
import { formatDistance, scoreColor } from "@/components/bloodlink/ui/format";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const DonorMap = dynamic(() => import("@/components/bloodlink/maps/DonorMap"), { ssr: false });

interface DonorItem {
  id: string;
  name: string;
  bloodGroup: string;
  lat: number;
  lng: number;
  region: string;
  available: boolean;
  donationCount: number;
  responseRate: number;
  verificationStatus: string;
  lastDonationDate?: string | null;
  distanceKm?: number | null;
  exactMatch?: boolean;
  isUniversalDonor?: boolean;
}

interface NearbyResponse {
  donors: DonorItem[];
  center: { lat: number; lng: number };
  radiusKm: number;
}

interface DonorsResponse {
  donors: DonorItem[];
  total: number;
}

interface CompatibleResponse {
  recipientGroup: string;
  compatibleDonorGroups: string[];
  donors: DonorItem[];
  total: number;
}

export function DonorsBrowser() {
  const { user } = useApp();
  const hospital = user?.hospital ?? null;
  const isAdmin = user?.role === "ADMIN";

  const [bloodGroup, setBloodGroup] = useState<string>("ALL");
  const [availableOnly, setAvailableOnly] = useState(true);
  const [region, setRegion] = useState<string>("ALL");
  const [radiusKm, setRadiusKm] = useState(30);
  const [compatibleOnly, setCompatibleOnly] = useState(false);
  const [search, setSearch] = useState("");

  const canUseNearby = !!hospital || isAdmin;
  // For admin without hospital coords, fall back to /api/donors (no radius filter)
  const lat = hospital?.lat ?? 10.787;
  const lng = hospital?.lng ?? 79.1378;

  const url = useMemo(() => {
    if (!user) return null;
    const params = new URLSearchParams();
    if (bloodGroup !== "ALL") params.set("bloodGroup", bloodGroup);
    if (availableOnly) params.set("available", "true");

    if (compatibleOnly && bloodGroup !== "ALL") {
      params.set("recipientGroup", bloodGroup);
      params.set("lat", String(lat));
      params.set("lng", String(lng));
      if (!availableOnly) params.set("available", "false");
      return `/api/donors/compatible?${params.toString()}`;
    }

    if (canUseNearby) {
      params.set("lat", String(lat));
      params.set("lng", String(lng));
      params.set("radiusKm", String(radiusKm));
      return `/api/donors/nearby?${params.toString()}`;
    }

    if (region !== "ALL") params.set("region", region);
    params.set("limit", "200");
    return `/api/donors?${params.toString()}`;
  }, [user, bloodGroup, availableOnly, region, radiusKm, compatibleOnly, canUseNearby, lat, lng]);

  // The hook needs a stable type — we use a union and cast based on which URL was hit
  const { data, loading, error } = useApi<NearbyResponse | DonorsResponse | CompatibleResponse>(url, [url]);

  const donors: DonorItem[] = useMemo(() => {
    if (!data) return [];
    if ("donors" in data) return data.donors as DonorItem[];
    return [];
  }, [data]);

  const filtered = useMemo(() => {
    if (!search.trim()) return donors;
    const q = search.toLowerCase();
    return donors.filter(
      (d) => d.name.toLowerCase().includes(q) || d.region.toLowerCase().includes(q)
    );
  }, [donors, search]);

  const markers = useMemo(() => {
    type Marker = {
      lat: number;
      lng: number;
      type: "donor" | "hospital" | "bloodbank" | "request";
      popup?: string;
      score?: number;
      highlighted?: boolean;
    };
    const list: Marker[] = filtered.map((d) => ({
      lat: d.lat,
      lng: d.lng,
      type: "donor" as const,
      popup: `<strong>${escapeHtml(d.name)}</strong><br/>${d.bloodGroup} • ${d.available ? "Available" : "Unavailable"}${d.distanceKm != null ? `<br/>${formatDistance(d.distanceKm)} away` : ""}`,
      score: d.responseRate,
      highlighted: true,
    }));
    if (hospital) {
      list.unshift({
        lat: hospital.lat,
        lng: hospital.lng,
        type: "hospital",
        popup: `<strong>${escapeHtml(hospital.name)}</strong><br/>Your hospital`,
      });
    }
    return list;
  }, [filtered, hospital]);

  const mapCenter: [number, number] = hospital
    ? [hospital.lat, hospital.lng]
    : [filtered[0]?.lat ?? lat, filtered[0]?.lng ?? lng];

  return (
    <div className="space-y-5">
      <SectionCard
        title="Find Donors"
        description="Browse verified donors, filter by blood group, and locate them on the map"
        action={
          <Badge variant="outline" className="hidden border-slate-200 text-slate-600 sm:inline-flex">
            <Users className="mr-1 h-3 w-3" /> {filtered.length} found
          </Badge>
        }
      >
        <MedicalDisclaimer variant="compact" />
      </SectionCard>

      {/* Filters */}
      <SectionCard title="Filters">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Blood group</label>
            <Select value={bloodGroup} onValueChange={setBloodGroup}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All groups</SelectItem>
                {BLOOD_GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Region</label>
            <Select value={region} onValueChange={setRegion} disabled={canUseNearby}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All regions</SelectItem>
                {REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            {canUseNearby && (
              <p className="text-[10px] text-muted-foreground">Region filter disabled — using radius search instead</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Search</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name or region…"
                className="pl-8"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Radius {canUseNearby ? `(${radiusKm} km)` : "(no radius)"}
            </label>
            <Slider
              min={5}
              max={100}
              step={5}
              value={[radiusKm]}
              onValueChange={(v) => setRadiusKm(v[0])}
              disabled={!canUseNearby}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-5 border-t pt-4">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <Switch checked={availableOnly} onCheckedChange={setAvailableOnly} />
            Available only
          </label>
          <label className={`flex items-center gap-2 text-sm font-medium ${bloodGroup !== "ALL" ? "text-slate-700" : "text-slate-400"}`}>
            <Switch
              checked={compatibleOnly}
              onCheckedChange={setCompatibleOnly}
              disabled={bloodGroup === "ALL"}
            />
            Compatible only
            {bloodGroup === "ALL" && <span className="text-[10px] text-slate-400">(select a group)</span>}
          </label>
        </div>
      </SectionCard>

      {/* Map */}
      {canUseNearby && (
        <SectionCard title="Donor Map" description="Red markers = donors, H = your hospital. Dashed circle = search radius.">
          {filtered.length > 0 ? (
            <DonorMap
              center={mapCenter}
              markers={markers}
              radiusKm={radiusKm}
              className="h-80 w-full rounded-lg overflow-hidden border"
              zoom={11}
            />
          ) : (
            <EmptyState title="No donors to display on the map" icon={MapPin} />
          )}
        </SectionCard>
      )}

      {/* Results table */}
      <SectionCard title="Donor List" description={`${filtered.length} donor${filtered.length === 1 ? "" : "s"} matching filters`}>
        {loading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : error ? (
          <EmptyState title="Couldn't load donors" description={error} icon={AlertTriangle} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No donors found"
            description="Try widening the radius, switching blood group, or turning off filters."
            icon={SlidersHorizontal}
          />
        ) : (
          <div className="max-h-[60vh] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-white">
                <TableRow>
                  <TableHead>Donor</TableHead>
                  <TableHead>Blood</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead className="text-right">Distance</TableHead>
                  <TableHead className="text-right">Response</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Verification</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900">{d.name}</span>
                        <span className="text-[11px] text-slate-400">{d.donationCount} donations</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <BloodGroupBadge group={d.bloodGroup} />
                      {d.isUniversalDonor && (
                        <span className="ml-1 inline-block rounded bg-emerald-100 px-1 text-[10px] font-medium text-emerald-700">UNIV</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{d.region}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums text-slate-700">
                      {d.distanceKm != null ? formatDistance(d.distanceKm) : "—"}
                    </TableCell>
                    <TableCell className={`text-right text-sm font-medium tabular-nums ${scoreColor(d.responseRate)}`}>
                      {Math.round(d.responseRate)}%
                    </TableCell>
                    <TableCell>
                      {d.available ? (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Available</Badge>
                      ) : (
                        <Badge variant="outline" className="border-slate-300 text-slate-500">Busy</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <VerificationBadge status={d.verificationStatus} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c] as string));
}
