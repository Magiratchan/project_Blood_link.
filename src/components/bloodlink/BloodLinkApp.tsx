"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp, defaultViewForRole } from "@/stores/app-store";
import { Landing } from "@/components/bloodlink/Landing";
import { AuthModal } from "@/components/bloodlink/AuthModal";
import { DashboardShell } from "@/components/bloodlink/DashboardShell";
import { DonorDashboard } from "@/components/bloodlink/donor/DonorDashboard";
import { HospitalDashboard } from "@/components/bloodlink/hospital/HospitalDashboard";
import { BloodBankDashboard } from "@/components/bloodlink/bloodbank/BloodBankDashboard";
import { AdminDashboard } from "@/components/bloodlink/admin/AdminDashboard";
import { AnalyticsPanel } from "@/components/bloodlink/analytics/AnalyticsPanel";
import { PredictionsPanel } from "@/components/bloodlink/analytics/PredictionsPanel";
import { NotificationsPanel } from "@/components/bloodlink/NotificationsPanel";
import { DonorsBrowser } from "@/components/bloodlink/hospital/DonorsBrowser";
import { MedicalDisclaimer } from "@/components/bloodlink/ui/disclaimer";
import { Droplet } from "lucide-react";

export function BloodLinkApp() {
  const { user, loading, view, setUser, setLoading, setView } = useApp();

  // Initial auth check
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (active) {
          setUser(data.user ?? null);
          if (data.user) setView(defaultViewForRole(data.user.role));
        }
      } catch {
        /* ignore */
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <motion.div
          className="flex flex-col items-center gap-3"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
        >
          <motion.div
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-600 text-white shadow-lg"
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          >
            <Droplet className="h-6 w-6" />
          </motion.div>
          <motion.p
            className="text-sm font-medium text-slate-500"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          >
            Loading BloodLink…
          </motion.p>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Landing />
        <AuthModal />
      </>
    );
  }

  return (
    <>
      <DashboardShell>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${user.role}-${view}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {renderView(view, user.role)}
          </motion.div>
        </AnimatePresence>
      </DashboardShell>
      <AuthModal />
    </>
  );
}

function renderView(view: string, role: string) {
  // Guard: restrict views by role
  if (view === "analytics") return <AnalyticsPanel />;
  if (view === "notifications") return <NotificationsPanel />;
  if (view === "predictions" && (role === "BLOOD_BANK" || role === "ADMIN")) return <PredictionsPanel />;

  if (role === "DONOR") return <DonorDashboard />;
  if (role === "HOSPITAL") {
    if (view === "donors") return <DonorsBrowser />;
    if (view === "requests") return <HospitalDashboard />;
    return <HospitalDashboard />;
  }
  if (role === "BLOOD_BANK") {
    if (view === "inventory") return <BloodBankDashboard />;
    if (view === "predictions") return <PredictionsPanel />;
    return <BloodBankDashboard />;
  }
  if (role === "ADMIN") {
    if (view === "admin") return <AdminDashboard />;
    return <AdminDashboard />;
  }
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <MedicalDisclaimer variant="banner" />
      <p className="text-sm text-slate-500">Welcome to BloodLink.</p>
    </div>
  );
}
