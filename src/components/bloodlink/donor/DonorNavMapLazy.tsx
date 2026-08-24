"use client";

import dynamic from "next/dynamic";

// Dynamic import to avoid SSR issues with Leaflet.
const DonorNavigationMap = dynamic(
  () => import("@/components/bloodlink/maps/DonorNavigationMap"),
  {
    ssr: false,
    loading: () => <div className="h-64 w-full animate-pulse rounded-lg bg-slate-100" />,
  }
);

export default DonorNavigationMap;
