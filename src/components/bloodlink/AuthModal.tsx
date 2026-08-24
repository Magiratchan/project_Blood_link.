"use client";

import { useState } from "react";
import { useApp } from "@/stores/app-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEMO_ACCOUNTS } from "@/lib/client-types";
import { defaultViewForRole } from "@/stores/app-store";
import { toast } from "sonner";
import { Droplet, LogIn, UserPlus, ShieldCheck, Stethoscope, Building2, Boxes, Zap } from "lucide-react";

const ROLES = [
  { key: "DONOR", label: "Donor", icon: Droplet, desc: "Save lives", color: "text-rose-600" },
  { key: "HOSPITAL", label: "Hospital", icon: Stethoscope, desc: "Request blood", color: "text-teal-600" },
  { key: "BLOOD_BANK", label: "Blood Bank", icon: Boxes, desc: "Manage inventory", color: "text-violet-600" },
];

export function AuthModal() {
  const { authOpen, authMode, closeAuth, setUser, setView, openAuth } = useApp();
  const [mode, setMode] = useState<"login" | "register">(authMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("DONOR");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  // sync mode when opened
  const open = authOpen;
  const effectiveMode = mode;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = effectiveMode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body =
        effectiveMode === "login"
          ? { email, password }
          : { email, password, name, role, phone };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Authentication failed.");
        return;
      }
      // fetch full profile
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();
      setUser(meData.user);
      setView(defaultViewForRole(meData.user.role));
      toast.success(effectiveMode === "login" ? `Welcome back, ${meData.user.name.split(" ")[0]}!` : "Account created!");
      closeAuth();
      reset();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function demoLogin(acc: (typeof DEMO_ACCOUNTS)[number]) {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: acc.email, password: acc.password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Demo login failed.");
        return;
      }
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();
      setUser(meData.user);
      setView(defaultViewForRole(meData.user.role));
      toast.success(`Logged in as ${acc.label}`);
      closeAuth();
    } catch {
      toast.error("Network error.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setEmail("");
    setPassword("");
    setName("");
    setPhone("");
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) closeAuth(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600 text-white">
              <Droplet className="h-5 w-5" />
            </div>
            <DialogTitle className="text-xl">BloodLink</DialogTitle>
          </div>
          <DialogDescription>
            {effectiveMode === "login" ? "Sign in to your dashboard." : "Create an account to join the coordination network."}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={effectiveMode} onValueChange={(v) => setMode(v as "login" | "register")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login"><LogIn className="mr-1.5 h-3.5 w-3.5" /> Login</TabsTrigger>
            <TabsTrigger value="register"><UserPlus className="mr-1.5 h-3.5 w-3.5" /> Register</TabsTrigger>
          </TabsList>

          {/* Demo accounts */}
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-amber-800">
              <Zap className="h-3.5 w-3.5" /> One-click demo accounts
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.email}
                  type="button"
                  disabled={loading}
                  onClick={() => demoLogin(a)}
                  className="rounded-md border border-amber-300 bg-white px-2 py-1.5 text-left text-[11px] transition hover:border-amber-500 hover:shadow-sm disabled:opacity-50"
                >
                  <p className="font-semibold text-slate-800">{a.role.replace(/_/g, " ")}</p>
                  <p className="truncate text-slate-500">{a.label}</p>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={submit} className="mt-4 space-y-3">
            {effectiveMode === "register" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full name / Organization name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Apollo Hospital" />
                </div>
                <div className="space-y-1.5">
                  <Label>I am a...</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {ROLES.map((r) => (
                      <button
                        key={r.key}
                        type="button"
                        onClick={() => setRole(r.key)}
                        className={`flex flex-col items-center rounded-lg border p-2.5 text-center transition ${
                          role === r.key
                            ? "border-red-500 bg-red-50 ring-1 ring-red-500"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <r.icon className={`h-5 w-5 ${r.color}`} />
                        <span className="mt-1 text-xs font-medium">{r.label}</span>
                        <span className="text-[10px] text-slate-400">{r.desc}</span>
                      </button>
                    ))}
                  </div>
                  {role === "HOSPITAL" && (
                    <p className="flex items-center gap-1 text-[11px] text-amber-600">
                      <ShieldCheck className="h-3 w-3" /> Hospitals require admin verification before creating requests.
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 ..." />
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
              {effectiveMode === "register" && <p className="text-[11px] text-slate-400">Min 6 characters.</p>}
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-red-600 hover:bg-red-700">
              {loading ? "Please wait..." : effectiveMode === "login" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <div className="pt-1 text-center text-xs text-slate-500">
            {effectiveMode === "login" ? (
              <>
                Don&apos;t have an account?{" "}
                <button onClick={() => setMode("register")} className="font-medium text-red-600 hover:underline">Register</button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button onClick={() => setMode("login")} className="font-medium text-red-600 hover:underline">Sign in</button>
              </>
            )}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
