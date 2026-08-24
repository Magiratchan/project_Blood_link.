"use client";

import dynamic from "next/dynamic";

const LocationPicker = dynamic(() => import("@/components/bloodlink/maps/LocationPicker"), {
  ssr: false,
  loading: () => <div className="h-56 w-full animate-pulse rounded-lg bg-slate-100" />,
});

export default LocationPicker;
