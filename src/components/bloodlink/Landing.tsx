"use client";

import { useApp } from "@/stores/app-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MedicalDisclaimer } from "@/components/bloodlink/ui/disclaimer";
import { DEMO_ACCOUNTS } from "@/lib/client-types";
import {
  HeartPulse, Activity, MapPin, Brain, Bell, Droplet, ShieldCheck,
  TrendingUp, Users, Zap, ArrowRight, Stethoscope, Building2, Boxes,
  AlertTriangle, CheckCircle2,
} from "lucide-react";

export function Landing() {
  const { openAuth } = useApp();

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600 text-white shadow-sm">
              <Droplet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-bold leading-none tracking-tight text-slate-900">BloodLink</p>
              <p className="text-[10px] font-medium uppercase tracking-wider text-red-600">Emergency Coordination</p>
            </div>
          </div>
          <nav className="hidden items-center gap-6 md:flex">
            <a href="#how" className="text-sm font-medium text-slate-600 hover:text-slate-900">How it works</a>
            <a href="#ai" className="text-sm font-medium text-slate-600 hover:text-slate-900">AI Matching</a>
            <a href="#chain" className="text-sm font-medium text-slate-600 hover:text-slate-900">Coordination</a>
            <a href="#prediction" className="text-sm font-medium text-slate-600 hover:text-slate-900">Prediction</a>
            <a href="#analytics" className="text-sm font-medium text-slate-600 hover:text-slate-900">Analytics</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => openAuth("login")} className="hidden sm:inline-flex">
              Log in
            </Button>
            <Button size="sm" onClick={() => openAuth("register")} className="bg-red-600 hover:bg-red-700">
              Get started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-red-50 via-white to-white">
        <div className="absolute inset-0 -z-10 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #ef4444 1px, transparent 0)", backgroundSize: "32px 32px" }} />
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600" />
              </span>
              Live emergency coordination — decision support only
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Find the Right Blood.{" "}
              <span className="bg-gradient-to-r from-red-600 to-rose-500 bg-clip-text text-transparent">
                When Every Minute Matters.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
              AI-powered emergency blood coordination connecting hospitals with suitable donors faster.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" onClick={() => openAuth("register")} className="w-full bg-red-600 hover:bg-red-700 sm:w-auto">
                <HeartPulse className="mr-2 h-5 w-5" /> Request Blood
              </Button>
              <Button size="lg" variant="outline" onClick={() => openAuth("register")} className="w-full sm:w-auto">
                <Droplet className="mr-2 h-5 w-5 text-red-600" /> Become a Donor
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> ABO/Rh compatible matching</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Real-time donor chain</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Shortage prediction</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> 110+ verified donors</span>
            </div>
          </div>

          {/* Demo accounts strip */}
          <div className="mx-auto mt-12 max-w-4xl">
            <Card className="border-red-100 bg-white/80 shadow-sm">
              <CardContent className="p-4 sm:p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <p className="text-sm font-semibold text-slate-900">Try the demo instantly</p>
                  <span className="ml-auto text-xs text-slate-400">password: <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-600">demo1234</code></span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {DEMO_ACCOUNTS.map((a) => (
                    <button
                      key={a.email}
                      onClick={() => openAuth("login")}
                      className="group rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-red-300 hover:shadow-sm"
                    >
                      <p className="text-xs font-semibold text-slate-900">{a.role.replace(/_/g, " ")}</p>
                      <p className="mt-0.5 truncate text-[11px] text-slate-500">{a.label}</p>
                      <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-red-600 opacity-0 transition group-hover:opacity-100">
                        Login <ArrowRight className="h-2.5 w-2.5" />
                      </p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-t bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">How BloodLink Works</h2>
            <p className="mt-3 text-slate-600">A coordinated emergency blood workflow from request to fulfilled donation.</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Building2, title: "Hospital creates request", desc: "Verified hospital files an emergency request: blood group, units, urgency, deadline." },
              { icon: Brain, title: "AI ranks donors", desc: "Engine filters incompatible donors, scores compatible ones on distance, availability, urgency, reliability." },
              { icon: Bell, title: "Donor chain notifies", desc: "Top donors are notified in rank order. If one declines, the next is automatically engaged." },
              { icon: HeartPulse, title: "Donation fulfilled", desc: "First accepted donor completes the chain; request becomes DONOR_FOUND then FULFILLED." },
            ].map((s, i) => (
              <Card key={i} className="relative border-slate-200">
                <CardContent className="p-5">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-red-100 text-red-600">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-wide text-red-600">Step {i + 1}</p>
                  <h3 className="mt-1 font-semibold text-slate-900">{s.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{s.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* AI Matching */}
      <section id="ai" className="py-16 sm:py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700">
              <Brain className="h-3.5 w-3.5" /> AI-assisted matching
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">Explainable donor scoring, not a black box</h2>
            <p className="mt-4 text-slate-600">
              BloodLink&apos;s matching engine filters incompatible blood groups first, then scores each compatible donor
              across four transparent dimensions. Every recommendation ships with a plain-language reason.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                { label: "Distance Score", max: 30, desc: "Closer donors rank higher (Haversine).", color: "bg-red-500" },
                { label: "Availability Score", max: 25, desc: "Available now + donation readiness.", color: "bg-orange-500" },
                { label: "Urgency Score", max: 20, desc: "Readiness for the request urgency.", color: "bg-amber-500" },
                { label: "Response Reliability", max: 25, desc: "Historical response behaviour.", color: "bg-emerald-500" },
              ].map((r) => (
                <li key={r.label} className="flex items-center gap-4">
                  <div className="w-40 shrink-0">
                    <p className="text-sm font-medium text-slate-900">{r.label}</p>
                    <p className="text-xs text-slate-500">0–{r.max}</p>
                  </div>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${r.color}`} style={{ width: `${(r.max / 100) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-xs text-slate-400">Total = 0–100. Labelled throughout the UI as &quot;AI-assisted donor matching score&quot;.</p>
          </div>
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">Matched donor — example</p>
                <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">94% match</span>
              </div>
              <div className="mt-4 rounded-lg border border-slate-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 font-bold text-white">AK</div>
                  <div>
                    <p className="font-semibold text-slate-900">Donor A</p>
                    <p className="text-xs text-slate-500">O− · 1.8 km away · Available</p>
                  </div>
                  <span className="ml-auto rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Response 92%</span>
                </div>
                <div className="mt-4 space-y-2">
                  {[
                    { label: "Distance", val: 28, color: "bg-red-500" },
                    { label: "Availability", val: 24, color: "bg-orange-500" },
                    { label: "Urgency", val: 18, color: "bg-amber-500" },
                    { label: "Response", val: 23, color: "bg-emerald-500" },
                  ].map((r) => (
                    <div key={r.label} className="flex items-center gap-3 text-xs">
                      <span className="w-20 text-slate-500">{r.label}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full rounded-full ${r.color}`} style={{ width: `${(r.val / r.max) * 100}%` }} />
                      </div>
                      <span className="w-8 text-right font-medium text-slate-700">{r.val}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  Highly suitable — exact blood-group match, located very close to the hospital, strong historical response rate.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Emergency coordination + donor chain */}
      <section id="chain" className="border-t bg-slate-900 py-16 text-white sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-red-600/20 px-3 py-1 text-xs font-medium text-red-300">
              <Activity className="h-3.5 w-3.5" /> Donor chain
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight">Automatic fallback keeps the clock running</h2>
            <p className="mt-3 text-slate-300">If a donor declines or doesn&apos;t respond, BloodLink advances to the next ranked donor — automatically.</p>
          </div>
          <div className="mt-12 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
            {[
              { name: "Donor A", status: "Declined", icon: "✕", tone: "text-rose-400 border-rose-500/30 bg-rose-500/10" },
              { name: "Donor B", status: "No response", icon: "•", tone: "text-amber-400 border-amber-500/30 bg-amber-500/10" },
              { name: "Donor C", status: "Accepted", icon: "✓", tone: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" },
            ].map((d, i, arr) => (
              <div key={d.name} className="flex items-center gap-3">
                <div className={`flex w-44 flex-col items-center rounded-xl border px-4 py-4 ${d.tone}`}>
                  <span className="text-2xl">{d.icon}</span>
                  <p className="mt-1 text-sm font-semibold">{d.name}</p>
                  <p className="text-xs opacity-80">{d.status}</p>
                </div>
                {i < arr.length - 1 && <ArrowRight className="hidden h-5 w-5 text-slate-600 sm:block" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Shortage prediction */}
      <section id="prediction" className="py-16 sm:py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
          <Card className="order-2 border-amber-200 lg:order-1">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Region · Thanjavur</p>
                  <p className="text-lg font-bold text-slate-900">O− shortage forecast</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                  <AlertTriangle className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-xs text-red-700">Shortage risk</p>
                  <p className="text-2xl font-bold text-red-600">82%</p>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs text-amber-700">Expected demand</p>
                  <p className="text-2xl font-bold text-amber-600">High</p>
                </div>
              </div>
              <div className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
                Recommendation: increase donor outreach for O− in Thanjavur ahead of the predicted spike.
              </div>
            </CardContent>
          </Card>
          <div className="order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
              <TrendingUp className="h-3.5 w-3.5" /> Shortage prediction
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">Anticipate shortages before they happen</h2>
            <p className="mt-4 text-slate-600">
              BloodLink forecasts near-term demand for each blood group and region using historical demand trends and live
              inventory, then emits a transparent shortage risk score and an actionable recommendation.
            </p>
            <p className="mt-4 text-xs text-slate-400">Statistical-v1 model. Decision support only — not medically validated.</p>
          </div>
        </div>
      </section>

      {/* Analytics */}
      <section id="analytics" className="border-t bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-teal-100 px-3 py-1 text-xs font-medium text-teal-700">
              <Activity className="h-3.5 w-3.5" /> Analytics
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">Operational intelligence at a glance</h2>
            <p className="mt-3 text-slate-600">Track demand trends, inventory, donor activity, fulfillment, and shortage risk in one dashboard.</p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Users, label: "Total donors", value: "110+" },
              { icon: Activity, label: "Active requests", value: "Real-time" },
              { icon: Boxes, label: "Units available", value: "Live" },
              { icon: MapPin, label: "Avg donor distance", value: "km-aware" },
            ].map((c) => (
              <Card key={c.label} className="border-slate-200">
                <CardContent className="p-5">
                  <c.icon className="h-6 w-6 text-red-500" />
                  <p className="mt-3 text-2xl font-bold text-slate-900">{c.value}</p>
                  <p className="text-sm text-slate-500">{c.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="rounded-2xl bg-gradient-to-r from-red-600 to-rose-500 px-6 py-12 text-center text-white sm:px-12">
            <ShieldCheck className="mx-auto h-10 w-10" />
            <h2 className="mt-4 text-3xl font-bold">Ready to coordinate emergency blood?</h2>
            <p className="mx-auto mt-3 max-w-xl text-red-100">Join BloodLink as a hospital, donor, or blood bank. Demo accounts ready in one click.</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" variant="secondary" onClick={() => openAuth("register")} className="w-full sm:w-auto">
                <Stethoscope className="mr-2 h-5 w-5" /> Request Blood
              </Button>
              <Button size="lg" onClick={() => openAuth("register")} className="w-full border-2 border-white/40 bg-transparent text-white hover:bg-white/10 sm:w-auto">
                <Droplet className="mr-2 h-5 w-5" /> Become a Donor
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t bg-slate-950 py-10 text-slate-400">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row">
            <div className="max-w-md">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 text-white">
                  <Droplet className="h-4 w-4" />
                </div>
                <span className="text-lg font-bold text-white">BloodLink</span>
              </div>
              <p className="mt-3 text-xs">AI-powered emergency blood coordination. Built for hackathon demonstration — synthetic demo data only.</p>
              <div className="mt-4">
                <MedicalDisclaimer variant="banner" className="border-amber-900/40 bg-amber-950/30 text-amber-300" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-8 text-xs">
              <div>
                <p className="font-semibold text-white">Platform</p>
                <ul className="mt-2 space-y-1.5">
                  <li>Hospitals</li>
                  <li>Donors</li>
                  <li>Blood banks</li>
                  <li>Admin</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-white">Tech</p>
                <ul className="mt-2 space-y-1.5">
                  <li>Next.js · TypeScript</li>
                  <li>Prisma · PostgreSQL</li>
                  <li>Leaflet · OSM</li>
                  <li>Vercel-ready</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-8 border-t border-slate-800 pt-6 text-center text-xs">
            © {new Date().getFullYear()} BloodLink. Decision-support only — not a medical device.
          </div>
        </div>
      </footer>
    </div>
  );
}
