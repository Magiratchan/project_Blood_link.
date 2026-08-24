"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ShieldAlert, Users, Clock, Droplet, Activity, Building2, FlaskConical,
  ClipboardCheck, Check, X, Ban, AlertTriangle, Search, ShieldCheck,
} from "lucide-react";
import { useApp } from "@/stores/app-store";
import { useApi, apiCall } from "@/lib/api/hooks";
import {
  StatCard, SectionCard, EmptyState,
} from "@/components/bloodlink/ui/cards";
import {
  RoleBadge, VerificationBadge, StatusBadge, BloodGroupBadge, UrgencyBadge,
} from "@/components/bloodlink/ui/badges";
import { MedicalDisclaimer } from "@/components/bloodlink/ui/disclaimer";
import { formatRelativeTime, formatDateTime } from "@/components/bloodlink/ui/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface PendingUser {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  verificationStatus: string;
  isActive: boolean;
  createdAt: string;
  donor?: { bloodGroup: string; region: string } | null;
  hospital?: { name: string; region: string } | null;
  bloodBank?: { name: string; region: string } | null;
}

interface AdminRequest {
  id: string;
  requestId: string;
  bloodGroup: string;
  unitsRequired: number;
  urgency: string;
  status: string;
  createdAt: string;
  hospital: { name: string };
}

interface AuditLog {
  id: string;
  action: string;
  resource: string;
  resourceId?: string | null;
  details?: string | null;
  severity: string;
  createdAt: string;
  user: { name: string; email: string } | null;
}

interface AdminStats {
  totalDonors: number;
  activeDonors: number;
  totalHospitals: number;
  verifiedHospitals: number;
  totalBloodBanks: number;
  activeRequests: number;
  fulfilledRequests: number;
  totalUsers: number;
  pendingVerifications: number;
}

interface AdminDashboardData {
  role: "ADMIN";
  users: AdminUser[];
  pendingUsers: PendingUser[];
  requests: AdminRequest[];
  auditLogs: AuditLog[];
  stats: AdminStats;
}

function severityBadge(sev: string) {
  const map: Record<string, string> = {
    INFO: "border-slate-200 bg-slate-50 text-slate-600",
    WARNING: "border-amber-200 bg-amber-50 text-amber-700",
    CRITICAL: "border-red-200 bg-red-50 text-red-700",
  };
  return map[sev] ?? map.INFO;
}

export function AdminDashboard() {
  const { user } = useApp();
  const { data, loading, error, refetch } = useApi<AdminDashboardData>(
    user ? "/api/dashboard" : null
  );

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [actingOn, setActingOn] = useState<string | null>(null);

  const stats = data?.stats;

  const filteredUsers = useMemo(() => {
    if (!data?.users) return [];
    const q = search.trim().toLowerCase();
    return data.users.filter((u) => {
      if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.donor?.region ?? "").toLowerCase().includes(q) ||
        (u.hospital?.name ?? "").toLowerCase().includes(q) ||
        (u.bloodBank?.name ?? "").toLowerCase().includes(q)
      );
    });
  }, [data, search, roleFilter]);

  async function actOnUser(id: string, name: string, action: "verify" | "reject" | "suspend" | "activate") {
    setActingOn(`${id}-${action}`);
    try {
      await apiCall("/api/users", { method: "PATCH", body: { id, action } });
      const verb = action === "verify" ? "verified" : action === "reject" ? "rejected" : action === "suspend" ? "suspended" : "reactivated";
      toast.success(`${name} ${verb}`, { description: `Action: ${action}` });
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to ${action} user`);
    } finally {
      setActingOn(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Admin Console</h1>
              <p className="mt-1 text-xs text-slate-500">
                Verify users, monitor activity, and oversee all blood coordination operations
              </p>
            </div>
          </div>
          <MedicalDisclaimer variant="compact" className="max-w-md" />
        </CardContent>
      </Card>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-lg bg-slate-100" />)}
        </div>
      ) : error ? (
        <EmptyState title="Couldn't load admin data" description={error} icon={AlertTriangle} />
      ) : stats ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Total Users" value={stats.totalUsers} sublabel={`${stats.pendingVerifications} pending`} icon={Users} accent="default" />
          <StatCard label="Pending Verifications" value={stats.pendingVerifications} icon={Clock} accent="amber" />
          <StatCard label="Total Donors" value={stats.totalDonors} sublabel={`${stats.activeDonors} active`} icon={Droplet} accent="red" />
          <StatCard label="Active Requests" value={stats.activeRequests} sublabel={`${stats.fulfilledRequests} fulfilled`} icon={Activity} accent="red" />
          <StatCard label="Hospitals" value={stats.totalHospitals} sublabel={`${stats.verifiedHospitals} verified`} icon={Building2} accent="teal" />
          <StatCard label="Blood Banks" value={stats.totalBloodBanks} icon={FlaskConical} accent="violet" />
          <StatCard label="Fulfilled" value={stats.fulfilledRequests} sublabel="requests" icon={Check} accent="emerald" />
          <StatCard label="Pending Verifications" value={data?.pendingUsers.length ?? 0} sublabel="awaiting review" icon={ClipboardCheck} accent="amber" />
        </div>
      ) : null}

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="pending">Pending Verification</TabsTrigger>
          <TabsTrigger value="users">All Users</TabsTrigger>
          <TabsTrigger value="requests">Recent Requests</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        {/* Pending verifications */}
        <TabsContent value="pending" className="space-y-3">
          <SectionCard title="Pending Verification" description="Newly registered users awaiting admin review">
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />)}
              </div>
            ) : !data || data.pendingUsers.length === 0 ? (
              <EmptyState
                title="No pending verifications"
                description="All users have been reviewed."
                icon={ShieldCheck}
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Registered</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.pendingUsers.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium text-slate-900">{u.name}</TableCell>
                        <TableCell className="text-sm text-slate-600">{u.email}</TableCell>
                        <TableCell><RoleBadge role={u.role} /></TableCell>
                        <TableCell className="text-xs text-slate-500">{formatRelativeTime(u.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() => actOnUser(u.id, u.name, "reject")}
                              disabled={actingOn === `${u.id}-reject`}
                            >
                              <X className="mr-1 h-3.5 w-3.5" /> Reject
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => actOnUser(u.id, u.name, "suspend")}
                              disabled={actingOn === `${u.id}-suspend`}
                            >
                              <Ban className="mr-1 h-3.5 w-3.5" /> Suspend
                            </Button>
                            <Button
                              size="sm"
                              className="bg-emerald-600 text-white hover:bg-emerald-700"
                              onClick={() => actOnUser(u.id, u.name, "verify")}
                              disabled={actingOn === `${u.id}-verify`}
                            >
                              <Check className="mr-1 h-3.5 w-3.5" /> Verify
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </SectionCard>
        </TabsContent>

        {/* All users */}
        <TabsContent value="users" className="space-y-3">
          <SectionCard title="All Users" description="Search and filter registered users">
            <div className="mb-3 flex flex-wrap items-end gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email, region, hospital…"
                  className="pl-8"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All roles</SelectItem>
                    <SelectItem value="DONOR">Donor</SelectItem>
                    <SelectItem value="HOSPITAL">Hospital</SelectItem>
                    <SelectItem value="BLOOD_BANK">Blood Bank</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />)}
              </div>
            ) : filteredUsers.length === 0 ? (
              <EmptyState title="No users match" description="Try adjusting the search or filter." icon={Search} />
            ) : (
              <div className="max-h-[60vh] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-white">
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Profile</TableHead>
                      <TableHead>Verification</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium text-slate-900">{u.name}</TableCell>
                        <TableCell className="text-xs text-slate-600">{u.email}</TableCell>
                        <TableCell><RoleBadge role={u.role} /></TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {u.donor && <span>{u.donor.bloodGroup} • {u.donor.region}</span>}
                          {u.hospital && <span>{u.hospital.name}</span>}
                          {u.bloodBank && <span>{u.bloodBank.name}</span>}
                          {!u.donor && !u.hospital && !u.bloodBank && <span className="text-slate-400">—</span>}
                        </TableCell>
                        <TableCell><VerificationBadge status={u.verificationStatus} /></TableCell>
                        <TableCell>
                          {u.isActive ? (
                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Active</Badge>
                          ) : (
                            <Badge variant="outline" className="border-slate-300 text-slate-500">Suspended</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">{formatRelativeTime(u.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </SectionCard>
        </TabsContent>

        {/* Recent requests */}
        <TabsContent value="requests" className="space-y-3">
          <SectionCard title="Recent Requests" description="Latest blood requests across the platform">
            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />)}
              </div>
            ) : !data || data.requests.length === 0 ? (
              <EmptyState title="No requests yet" icon={Activity} />
            ) : (
              <div className="max-h-[60vh] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-white">
                    <TableRow>
                      <TableHead>Request ID</TableHead>
                      <TableHead>Blood</TableHead>
                      <TableHead className="text-right">Units</TableHead>
                      <TableHead>Urgency</TableHead>
                      <TableHead>Hospital</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.requests.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium text-slate-900">{r.requestId}</TableCell>
                        <TableCell><BloodGroupBadge group={r.bloodGroup} /></TableCell>
                        <TableCell className="text-right tabular-nums">{r.unitsRequired}</TableCell>
                        <TableCell><UrgencyBadge urgency={r.urgency} /></TableCell>
                        <TableCell className="truncate text-sm text-slate-600">{r.hospital.name}</TableCell>
                        <TableCell><StatusBadge status={r.status} /></TableCell>
                        <TableCell className="text-xs text-slate-500">{formatRelativeTime(r.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </SectionCard>
        </TabsContent>

        {/* Audit log */}
        <TabsContent value="audit" className="space-y-3">
          <SectionCard title="Audit Log" description="System & admin actions, severity-tagged">
            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />)}
              </div>
            ) : !data || data.auditLogs.length === 0 ? (
              <EmptyState title="No audit entries yet" icon={ClipboardCheck} />
            ) : (
              <div className="max-h-[60vh] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-white">
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>When</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.auditLogs.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>
                          <span className="font-mono text-xs font-medium text-slate-900">{a.action}</span>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">{a.resource}{a.resourceId ? ` (${a.resourceId.slice(-6)})` : ""}</TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {a.user ? (
                            <div className="flex flex-col">
                              <span>{a.user.name}</span>
                              <span className="text-[10px] text-slate-400">{a.user.email}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400">system</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`capitalize ${severityBadge(a.severity)}`}>{a.severity.toLowerCase()}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-xs text-slate-500" title={a.details ?? ""}>
                          {a.details ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">{formatDateTime(a.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
