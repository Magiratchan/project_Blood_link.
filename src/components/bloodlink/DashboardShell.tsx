"use client";

import { useEffect } from "react";
import { useApp, defaultViewForRole, type ViewKey } from "@/stores/app-store";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { initials } from "@/components/bloodlink/ui/format";
import { RoleBadge } from "@/components/bloodlink/ui/badges";
import {
  Droplet, LayoutDashboard, Bell, LogOut, Activity, Boxes,
  ShieldAlert, MapPinned, Users, Stethoscope, TrendingUp, Menu, X, ClipboardList,
} from "lucide-react";
import { useState } from "react";

interface NavItem {
  key: ViewKey;
  label: string;
  icon: typeof LayoutDashboard;
}

function navForRole(role: string): NavItem[] {
  const base: NavItem[] = [];
  if (role === "DONOR") {
    base.push({ key: "dashboard", label: "Dashboard", icon: LayoutDashboard });
    base.push({ key: "notifications", label: "Notifications", icon: Bell });
    base.push({ key: "analytics", label: "Analytics", icon: Activity });
  } else if (role === "HOSPITAL") {
    base.push({ key: "requests", label: "Blood Requests", icon: ClipboardList });
    base.push({ key: "donors", label: "Find Donors", icon: MapPinned });
    base.push({ key: "analytics", label: "Analytics", icon: Activity });
    base.push({ key: "notifications", label: "Notifications", icon: Bell });
  } else if (role === "BLOOD_BANK") {
    base.push({ key: "inventory", label: "Inventory", icon: Boxes });
    base.push({ key: "predictions", label: "Shortage Prediction", icon: TrendingUp });
    base.push({ key: "analytics", label: "Analytics", icon: Activity });
    base.push({ key: "notifications", label: "Notifications", icon: Bell });
  } else if (role === "ADMIN") {
    base.push({ key: "admin", label: "Admin Console", icon: ShieldAlert });
    base.push({ key: "analytics", label: "Analytics", icon: Activity });
    base.push({ key: "notifications", label: "Notifications", icon: Bell });
  }
  return base;
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, view, setView, logout, openAuth } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    if (view === "dashboard" && user.role !== "DONOR") {
      setView(defaultViewForRole(user.role));
    }
  }, [user, view, setView]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch("/api/notifications?unread=true");
        if (!res.ok) return;
        const data = await res.json();
        if (active) setNotifCount(data.unreadCount ?? 0);
      } catch { /* ignore */ }
    }
    load();
    const t = setInterval(load, 20000);
    return () => { active = false; clearInterval(t); };
  }, [view, user]);

  if (!user) return null;
  const nav = navForRole(user.role);

  const roleLabel =
    user.role === "HOSPITAL" ? user.hospital?.name :
    user.role === "BLOOD_BANK" ? user.bloodBank?.name :
    user.role === "ADMIN" ? "System Administrator" :
    "Donor";

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Topbar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b bg-white px-3 sm:px-5">
        <div className="flex items-center gap-2">
          <button
            className="rounded-md p-1.5 hover:bg-slate-100 md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 text-white">
              <Droplet className="h-4 w-4" />
            </div>
            <span className="text-base font-bold text-slate-900">BloodLink</span>
          </div>
          <RoleBadge role={user.role} className="ml-1 hidden sm:inline-flex" />
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => setView("notifications")}
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {notifCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                {notifCount > 9 ? "9+" : notifCount}
              </span>
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full p-1 pr-2 hover:bg-slate-100">
                <Avatar className="h-8 w-8" style={user.avatarColor ? { backgroundColor: user.avatarColor } : undefined}>
                  <AvatarFallback className="text-xs font-semibold text-white" style={user.avatarColor ? { backgroundColor: user.avatarColor } : undefined}>
                    {initials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-medium text-slate-700 sm:inline">{user.name.split(" ")[0]}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col gap-0.5">
                  <span className="truncate text-sm font-semibold">{user.name}</span>
                  <span className="truncate text-xs font-normal text-slate-500">{user.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5">
                <RoleBadge role={user.role} />
                <p className="mt-1 truncate text-xs text-slate-500">{roleLabel}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logout()}>
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar (desktop) */}
        <aside className="hidden w-60 shrink-0 border-r bg-white md:block">
          <nav className="flex flex-col gap-0.5 p-3">
            {nav.map((item) => (
              <NavButton key={item.key} item={item} active={view === item.key} onClick={() => setView(item.key)} />
            ))}
          </nav>
          <div className="mt-auto px-3 pb-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800">
              <p className="font-semibold">Decision-support only</p>
              <p className="mt-1 text-amber-700">BloodLink does not replace professional compatibility testing.</p>
            </div>
          </div>
        </aside>

        {/* Sidebar (mobile drawer) */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
            <aside className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl">
              <div className="flex h-14 items-center justify-between border-b px-4">
                <span className="font-bold">Menu</span>
                <button onClick={() => setMobileOpen(false)}><X className="h-5 w-5" /></button>
              </div>
              <nav className="flex flex-col gap-0.5 p-3">
                {nav.map((item) => (
                  <NavButton
                    key={item.key}
                    item={item}
                    active={view === item.key}
                    onClick={() => { setView(item.key); setMobileOpen(false); }}
                  />
                ))}
                <button
                  onClick={() => { logout(); setMobileOpen(false); }}
                  className="mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </nav>
            </aside>
          </div>
        )}

        {/* Main */}
        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-7xl px-3 py-5 sm:px-5 sm:py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function NavButton({ item, active, onClick }: { item: NavItem; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition",
        active ? "bg-red-50 text-red-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      )}
    >
      <item.icon className={cn("h-4 w-4", active ? "text-red-600" : "text-slate-400")} />
      {item.label}
    </button>
  );
}
