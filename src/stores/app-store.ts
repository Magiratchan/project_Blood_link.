"use client";

import { create } from "zustand";
import type { AppUser } from "@/lib/client-types";

export type ViewKey =
  | "dashboard"
  | "analytics"
  | "donors"
  | "requests"
  | "notifications"
  | "admin"
  | "inventory"
  | "predictions";

interface AppState {
  user: AppUser | null;
  loading: boolean;
  view: ViewKey;
  selectedRequestId: string | null;
  authMode: "login" | "register";
  authOpen: boolean;
  setUser: (u: AppUser | null) => void;
  setLoading: (b: boolean) => void;
  setView: (v: ViewKey) => void;
  setSelectedRequestId: (id: string | null) => void;
  openAuth: (mode: "login" | "register") => void;
  closeAuth: () => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const useApp = create<AppState>((set) => ({
  user: null,
  loading: true,
  view: "dashboard",
  selectedRequestId: null,
  authMode: "login",
  authOpen: false,
  setUser: (u) => set({ user: u }),
  setLoading: (b) => set({ loading: b }),
  setView: (v) => set({ view: v }),
  setSelectedRequestId: (id) => set({ selectedRequestId: id }),
  openAuth: (mode) => set({ authOpen: true, authMode: mode }),
  closeAuth: () => set({ authOpen: false }),
  logout: async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    set({ user: null, view: "dashboard", selectedRequestId: null });
  },
  refreshUser: async () => {
    const res = await fetch("/api/auth/me");
    const data = await res.json();
    set({ user: data.user ?? null });
  },
}));

export function defaultViewForRole(role: string): ViewKey {
  if (role === "DONOR") return "dashboard";
  if (role === "HOSPITAL") return "requests";
  if (role === "BLOOD_BANK") return "inventory";
  if (role === "ADMIN") return "admin";
  return "dashboard";
}
