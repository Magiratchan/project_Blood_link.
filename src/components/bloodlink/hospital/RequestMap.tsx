"use client";

import dynamic from "next/dynamic";

// Dynamic import to avoid SSR issues with Leaflet.
const RequestMap = dynamic(() => import("@/components/bloodlink/maps/DonorMap"), {
  ssr: false,
  loading: () => <div className="h-72 w-full animate-pulse rounded-lg bg-slate-100" />,
});

export default RequestMap;
