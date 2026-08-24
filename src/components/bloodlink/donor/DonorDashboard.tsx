"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Droplet, TrendingUp, HeartHandshake, BellRing, AlertTriangle,
  Clock, MapPin, Check, X, History, Inbox, ShieldCheck, Navigation, ChevronDown,
  Pencil, UserCircle, Heart,
} from "lucide-react";
import { useApp } from "@/stores/app-store";
import { useApi, apiCall } from "@/lib/api/hooks";
import type { NotificationItem } from "@/lib/client-types";
import {
  StatCard, SectionCard, EmptyState,
} from "@/components/bloodlink/ui/cards";
import {
  BloodGroupBadge, UrgencyBadge, VerificationBadge, ResponseBadge,
} from "@/components/bloodlink/ui/badges";
import { MedicalDisclaimer } from "@/components/bloodlink/ui/disclaimer";
import {
  formatDistance, formatRelativeTime, formatTimeRemaining, formatDateTime,
} from "@/components/bloodlink/ui/format";
import {
  StaggerGroup, StaggerItem, fadeUp, springSoft, CountUp,
} from "@/components/bloodlink/ui/motion";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import DonorNavMapLazy from "./DonorNavMapLazy";
import { DonorProfileEditor, type DonorProfileData } from "./DonorProfileEditor";
import { cn } from "@/lib/utils";

interface DonorRequestItem {
  id: string;
  requestId: string;
  bloodGroup: string;
  unitsRequired: number;
  urgency: string;
  requiredBy: string;
  status: string;
  hospitalName: string;
  distanceKm: number;
  createdAt: string;
  lat: number;
  lng: number;
  address: string;
  region: string;
}

interface DonorProfile {
  id: string;
  bloodGroup: string;
  available: boolean;
  region: string;
  donationCount: number;
  responseRate: number;
  totalRequests: number;
  acceptedCount: number;
  declinedCount: number;
  lastDonationDate: string | null;
  verificationStatus: string;
  lat: number;
  lng: number;
  address?: string | null;
  dateOfBirth?: string | Date | null;
  gender?: string | null;
  healthNotes?: string | null;
}

interface DonationItem {
  id: string;
  bloodGroup: string;
  units: number;
  status: string;
  donatedAt: string | null;
  bloodRequest: { requestId: string; hospital: { name: string } };
}

interface ResponseHistoryItem {
  id: string;
  chainOrder: number;
  status: string;
  sentAt: string;
  respondedAt: string | null;
  bloodRequest: { requestId: string; bloodGroup: string; hospital: { name: string } };
}

interface DonorDashboardData {
  role: "DONOR";
  profileComplete?: boolean;
  donor: DonorProfile | null;
  requests: DonorRequestItem[];
  notifications: NotificationItem[];
  donations: DonationItem[];
  responseHistory: ResponseHistoryItem[];
}

export function DonorDashboard() {
  const { user, refreshUser } = useApp();
  const { data, loading, error, refetch } = useApi<DonorDashboardData>(
    user ? "/api/dashboard" : null
  );
  const [togglingAvail, setTogglingAvail] = useState(false);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);

  if (!user) return null;
  const firstName = user.name.split(" ")[0];
  const profileComplete = data?.profileComplete ?? false;
  const donor: DonorProfile | undefined = data?.donor ?? (user.donor
    ? {
        id: user.donor.id,
        bloodGroup: user.donor.bloodGroup,
        available: user.donor.available,
        region: user.donor.region,
        donationCount: user.donor.donationCount,
        responseRate: user.donor.responseRate,
        totalRequests: 0,
        acceptedCount: 0,
        declinedCount: 0,
        lastDonationDate: user.donor.lastDonationDate,
        verificationStatus: user.donor.verificationStatus,
        lat: user.donor.lat,
        lng: user.donor.lng,
      }
    : undefined);
  const isVerified = (donor?.verificationStatus ?? "PENDING") === "VERIFIED";

  async function toggleAvailability(next: boolean) {
    if (!donor) return;
    setTogglingAvail(true);
    try {
      await apiCall(`/api/donors/${donor.id}`, { method: "PATCH", body: { available: next } });
      toast.success(next ? "You are now available for donation" : "You are now unavailable");
      await refreshUser();
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update availability");
    } finally {
      setTogglingAvail(false);
    }
  }

  async function respondToRequest(requestId: string, requestIdLabel: string, response: "ACCEPT" | "DECLINE") {
    if (!donor) return;
    setRespondingTo(requestId);
    try {
      const result = await apiCall<{ ok: boolean; response: string }>(
        `/api/donors/${donor.id}/respond`,
        { method: "POST", body: { requestId, response } }
      );
      toast.success(
        response === "ACCEPT"
          ? `Accepted ${requestIdLabel} — the hospital has been notified`
          : `Declined ${requestIdLabel} — the next donor will be contacted`,
        { description: result.response }
      );
      await refreshUser();
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit response");
    } finally {
      setRespondingTo(null);
    }
  }

  // ---- Profile setup / edit handler ----
  async function onProfileSaved(_donor: DonorProfileData) {
    setEditingProfile(false);
    await refreshUser();
    await refetch();
  }

  // ---- Profile not complete → show setup form ----
  if (!loading && !profileComplete && !editingProfile) {
    return (
      <motion.div
        className="space-y-5"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <DonorProfileEditor
          isSetup
          userName={user.name}
          userEmail={user.email}
          userPhone={user.phone}
          onSaved={onProfileSaved}
        />
      </motion.div>
    );
  }

  // ---- Edit profile mode ----
  if (editingProfile) {
    return (
      <motion.div
        className="space-y-5"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <DonorProfileEditor
          initial={donor ? {
            id: donor.id,
            bloodGroup: donor.bloodGroup,
            available: donor.available,
            region: donor.region,
            lat: donor.lat,
            lng: donor.lng,
            address: donor.address,
            dateOfBirth: donor.dateOfBirth,
            gender: donor.gender,
            healthNotes: donor.healthNotes,
            lastDonationDate: donor.lastDonationDate,
            verificationStatus: donor.verificationStatus,
          } : null}
          userName={user.name}
          userEmail={user.email}
          userPhone={user.phone}
          onSaved={onProfileSaved}
          onCancel={() => setEditingProfile(false)}
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      className="space-y-5"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Header */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white"
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 18, delay: 0.1 }}
            >
              <Droplet className="h-6 w-6" />
            </motion.div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Hello, {firstName}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {donor?.bloodGroup && <BloodGroupBadge group={donor.bloodGroup} />}
                <span className="text-xs text-slate-500">{donor?.region ?? "—"}</span>
                {donor && <VerificationBadge status={donor.verificationStatus} />}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingProfile(true)}
              className="border-slate-300"
            >
              <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit Profile
            </Button>
            <motion.div
              className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5"
              animate={{
                borderColor: donor?.available ? "rgb(16 185 129 / 0.4)" : "rgb(226 232 240)",
                backgroundColor: donor?.available ? "rgb(236 253 245)" : "rgb(248 250 252)",
              }}
              transition={springSoft}
            >
              <div>
                <p className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
                  {donor?.available && (
                    <motion.span
                      className="h-2 w-2 rounded-full bg-emerald-500"
                      animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
                      transition={{ duration: 1.8, repeat: Infinity }}
                    />
                  )}
                  {donor?.available ? "Available" : "Unavailable"}
                </p>
                <p className="text-[11px] text-slate-500">Toggle donation availability</p>
              </div>
              <Switch
                checked={!!donor?.available}
                onCheckedChange={toggleAvailability}
                disabled={togglingAvail || !isVerified}
                aria-label="Toggle availability"
              />
            </motion.div>
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {!isVerified && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div>
                <p className="font-medium">Verification pending</p>
                <p className="mt-0.5 text-xs text-amber-700">
                  Your donor profile is awaiting verification by a BloodLink admin.
                  You can review incoming requests but cannot accept them yet.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-lg bg-slate-100" />)}
        </div>
      ) : error ? (
        <EmptyState title="Couldn't load your dashboard" description={error} icon={AlertTriangle} />
      ) : donor ? (
        <StaggerGroup className="grid grid-cols-2 gap-3 lg:grid-cols-4" stagger={0.08}>
          <StaggerItem>
            <motion.div whileHover={{ y: -3 }} transition={springSoft} className="h-full">
              <StatCard label="Blood Group" value={donor.bloodGroup} sublabel={donor.region} icon={Droplet} accent="red" />
            </motion.div>
          </StaggerItem>
          <StaggerItem>
            <motion.div whileHover={{ y: -3 }} transition={springSoft} className="h-full">
              <StatCard
                label="Response Rate"
                value={<CountUp value={Math.round(donor.responseRate)} suffix="%" />}
                sublabel={`${donor.acceptedCount}/${donor.totalRequests} accepted`}
                icon={TrendingUp}
                accent="emerald"
              />
            </motion.div>
          </StaggerItem>
          <StaggerItem>
            <motion.div whileHover={{ y: -3 }} transition={springSoft} className="h-full">
              <StatCard label="Donations" value={<CountUp value={donor.donationCount} />} sublabel="completed" icon={HeartHandshake} accent="teal" />
            </motion.div>
          </StaggerItem>
          <StaggerItem>
            <motion.div whileHover={{ y: -3 }} transition={springSoft} className="h-full">
              <StatCard label="Requests Received" value={<CountUp value={donor.totalRequests} />} sublabel={`${data?.requests.length ?? 0} active`} icon={BellRing} accent="amber" />
            </motion.div>
          </StaggerItem>
        </StaggerGroup>
      ) : null}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left: emergency requests */}
        <div className="lg:col-span-2">
          <SectionCard
            title="Nearby Emergency Requests"
            description={isVerified ? "Compatible requests in your region" : "View-only (verification pending)"}
          >
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-32 animate-pulse rounded-lg bg-slate-100" />
                ))}
              </div>
            ) : !data || data.requests.length === 0 ? (
              <EmptyState
                title="No emergency requests right now"
                description="You'll see compatible blood requests from hospitals in your region here."
                icon={BellRing}
              />
            ) : (
              <StaggerGroup className="space-y-3">
                {data.requests.map((r) => {
                  const expired = new Date(r.requiredBy).getTime() < Date.now();
                  const isCritical = r.urgency === "CRITICAL";
                  const isNavOpen = navigatingTo === r.id;
                  return (
                    <StaggerItem key={r.id}>
                      <motion.div
                        className={cn(
                          "overflow-hidden rounded-lg border bg-white",
                          isCritical ? "border-red-300 shadow-sm" : "border-slate-200"
                        )}
                        whileHover={{ y: -2 }}
                        transition={springSoft}
                      >
                          {/* Critical accent bar */}
                          {isCritical && (
                            <div className="h-1 w-full bg-gradient-to-r from-red-600 via-rose-500 to-red-600">
                              <motion.div
                                className="h-full bg-white/30"
                                animate={{ x: ["-100%", "100%"] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                              />
                            </div>
                          )}
                          <div className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <BloodGroupBadge group={r.bloodGroup} />
                                <UrgencyBadge urgency={r.urgency} />
                                <span className="text-xs text-slate-500">{r.requestId}</span>
                              </div>
                              <span className={cn("flex items-center gap-1 text-xs font-medium", expired ? "text-rose-600" : "text-slate-600")}>
                                <Clock className="h-3 w-3" />
                                {formatTimeRemaining(r.requiredBy)}
                              </span>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 sm:grid-cols-3">
                              <div>
                                <p className="text-[10px] uppercase tracking-wide text-slate-400">Units</p>
                                <p className="mt-0.5 font-semibold text-slate-900">{r.unitsRequired} unit{r.unitsRequired === 1 ? "" : "s"}</p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-wide text-slate-400">Hospital</p>
                                <p className="mt-0.5 truncate font-medium text-slate-900">{r.hospitalName}</p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-wide text-slate-400">Distance</p>
                                <p className="mt-0.5 flex items-center gap-1 font-medium text-slate-900">
                                  <MapPin className="h-3 w-3 text-red-500" />
                                  {formatDistance(r.distanceKm)}
                                </p>
                              </div>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                              <span className="text-[11px] text-slate-400">Posted {formatRelativeTime(r.createdAt)}</span>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-slate-300 text-slate-700 hover:bg-slate-50"
                                  onClick={() => setNavigatingTo(isNavOpen ? null : r.id)}
                                >
                                  <motion.span animate={{ rotate: isNavOpen ? 180 : 0 }} transition={springSoft} className="mr-1 inline-flex">
                                    <ChevronDown className="h-3.5 w-3.5" />
                                  </motion.span>
                                  <Navigation className="mr-1 h-3.5 w-3.5 text-teal-600" />
                                  {isNavOpen ? "Hide map" : "Navigate"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-rose-300 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                  onClick={() => respondToRequest(r.id, r.requestId, "DECLINE")}
                                  disabled={respondingTo === r.id || !isVerified || expired}
                                >
                                  <X className="mr-1 h-3.5 w-3.5" /> Decline
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-red-600 text-white hover:bg-red-700"
                                  onClick={() => respondToRequest(r.id, r.requestId, "ACCEPT")}
                                  disabled={respondingTo === r.id || !isVerified || expired}
                                >
                                  <Check className="mr-1 h-3.5 w-3.5" />
                                  {respondingTo === r.id ? "Submitting…" : "Accept"}
                                </Button>
                              </div>
                            </div>
                          </div>

                          {/* Expandable navigation map */}
                          <AnimatePresence initial={false}>
                            {isNavOpen && (
                              <motion.div
                                key="nav"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                                className="overflow-hidden border-t border-slate-100"
                              >
                                <div className="bg-slate-50 p-4">
                                  <div className="mb-3 flex items-center gap-1.5">
                                    <Navigation className="h-4 w-4 text-teal-600" />
                                    <p className="text-sm font-semibold text-slate-900">Route to {r.hospitalName}</p>
                                    <span className="ml-auto rounded bg-teal-100 px-2 py-0.5 text-[10px] font-medium text-teal-700">
                                      {formatDistance(r.distanceKm)} away
                                    </span>
                                  </div>
                                  {donor && (
                                    <DonorNavMapLazy
                                      donorLat={donor.lat}
                                      donorLng={donor.lng}
                                      donorName={user.name}
                                      donorBloodGroup={donor.bloodGroup}
                                      hospitalLat={r.lat}
                                      hospitalLng={r.lng}
                                      hospitalName={r.hospitalName}
                                      distanceKm={r.distanceKm}
                                    />
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                      </motion.div>
                    </StaggerItem>
                  );
                })}
              </StaggerGroup>
            )}
          </SectionCard>
        </div>

        {/* Right column: notifications + history */}
        <div className="space-y-5">
          {/* Medical profile summary */}
          {donor && (
            <SectionCard
              title="Medical Profile"
              description="Your donor details"
              action={
                <Button variant="ghost" size="sm" onClick={() => setEditingProfile(true)} className="h-7 px-2 text-xs">
                  <Pencil className="mr-1 h-3 w-3" /> Edit
                </Button>
              }
            >
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <BloodGroupBadge group={donor.bloodGroup} />
                  <span className="text-xs text-slate-500">{donor.region}</span>
                  {donor.verificationStatus === "VERIFIED" && (
                    <span className="ml-auto inline-flex items-center gap-0.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                      <ShieldCheck className="h-2.5 w-2.5" /> Verified
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Date of birth</p>
                    <p className="mt-0.5 font-medium text-slate-700">
                      {donor.dateOfBirth ? new Date(donor.dateOfBirth).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Gender</p>
                    <p className="mt-0.5 font-medium capitalize text-slate-700">{donor.gender ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Last donation</p>
                    <p className="mt-0.5 font-medium text-slate-700">
                      {donor.lastDonationDate ? new Date(donor.lastDonationDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "Never"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Donations</p>
                    <p className="mt-0.5 font-medium text-slate-700">{donor.donationCount}</p>
                  </div>
                </div>
                {donor.healthNotes && (
                  <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                    <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                      <Heart className="h-3 w-3" /> Health notes
                    </p>
                    <p className="mt-1 line-clamp-3 text-xs text-slate-600">{donor.healthNotes}</p>
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          <SectionCard title="Notifications" description="Recent alerts">
            {!data || data.notifications.length === 0 ? (
              <EmptyState title="No notifications" icon={Inbox} className="py-6" />
            ) : (
              <StaggerGroup className="space-y-2">
                {data.notifications.slice(0, 5).map((n) => (
                  <StaggerItem key={n.id}>
                    <motion.div
                      className={cn(
                        "rounded-lg border px-3 py-2",
                        !n.read ? "border-red-100 bg-red-50" : "border-slate-100 bg-slate-50"
                      )}
                      whileHover={{ x: 2 }}
                      transition={springSoft}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-slate-900">{n.title}</p>
                        {!n.read && (
                          <motion.span
                            className="h-1.5 w-1.5 rounded-full bg-red-600"
                            animate={{ scale: [1, 1.3, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          />
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-600">{n.message}</p>
                      <p className="mt-1 text-[10px] text-slate-400">{formatRelativeTime(n.createdAt)}</p>
                    </motion.div>
                  </StaggerItem>
                ))}
              </StaggerGroup>
            )}
          </SectionCard>

          <SectionCard title="Donation History" description="Your past donations">
            {!data || data.donations.length === 0 ? (
              <EmptyState title="No donations yet" icon={HeartHandshake} className="py-6" />
            ) : (
              <ul className="space-y-2">
                {data.donations.slice(0, 5).map((d) => (
                  <li key={d.id} className="rounded-lg border border-slate-100 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-slate-900">{d.bloodRequest.requestId}</span>
                      <ResponseBadge status={d.status} />
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-slate-600">{d.bloodRequest.hospital.name}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      {d.donatedAt ? formatDateTime(d.donatedAt) : "Pending"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Response History" description="Recent requests you were contacted for">
            {!data || data.responseHistory.length === 0 ? (
              <EmptyState title="No response history yet" icon={History} className="py-6" />
            ) : (
              <ul className="max-h-64 space-y-2 overflow-y-auto">
                {data.responseHistory.slice(0, 8).map((h) => (
                  <li key={h.id} className="rounded-lg border border-slate-100 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <BloodGroupBadge group={h.bloodRequest.bloodGroup} />
                        <span className="text-xs font-medium text-slate-900">{h.bloodRequest.requestId}</span>
                      </div>
                      <ResponseBadge status={h.status} />
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-slate-600">{h.bloodRequest.hospital.name}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      Notified #{h.chainOrder + 1} • {formatRelativeTime(h.sentAt)}
                      {h.respondedAt && ` • responded ${formatRelativeTime(h.respondedAt)}`}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>

      <MedicalDisclaimer variant="compact" />
    </motion.div>
  );
}
