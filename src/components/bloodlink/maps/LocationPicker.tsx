"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Location picker — donor clicks on the map to set their approximate location.
// Privacy: coordinates are rounded to ~100m in the API layer.

const PICKER_ICON = L.divIcon({
  html: `<div class="bl-loc-picker">
    <div class="bl-loc-pulse"></div>
    <div class="bl-loc-core"></div>
  </div>`,
  className: "bl-loc-picker-wrap",
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const REGION_CENTERS: Record<string, [number, number]> = {
  Thanjavur: [10.787, 79.1378],
  Tiruchirappalli: [10.7905, 78.7047],
  Chennai: [13.0827, 80.2707],
  Madurai: [9.9252, 78.1198],
  Coimbatore: [11.0168, 76.9558],
};

export interface LocationPickerProps {
  initialLat?: number;
  initialLng?: number;
  region?: string;
  onChange: (lat: number, lng: number) => void;
  className?: string;
}

export default function LocationPicker({
  initialLat,
  initialLng,
  region = "Thanjavur",
  onChange,
  className,
}: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const [hasMarker, setHasMarker] = useState(!!initialLat && !!initialLng);

  // Keep onChangeRef in sync inside an effect (not during render)
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Inject styles once
  useEffect(() => {
    if (document.getElementById("bl-loc-picker-styles")) return;
    const style = document.createElement("style");
    style.id = "bl-loc-picker-styles";
    style.textContent = `
      .bl-loc-picker-wrap { position: relative; }
      .bl-loc-picker { position: relative; width: 24px; height: 24px; }
      .bl-loc-pulse {
        position: absolute; inset: 0; border-radius: 50%;
        background: rgba(220,38,38,0.3);
        animation: bl-loc-pulse 2s ease-out infinite;
      }
      .bl-loc-core {
        position: absolute; top: 6px; left: 6px; width: 12px; height: 12px;
        border-radius: 50%; background: #dc2626;
        border: 3px solid #fff;
        box-shadow: 0 0 0 2px #dc2626, 0 2px 6px rgba(0,0,0,.3);
      }
      @keyframes bl-loc-pulse {
        0% { transform: scale(0.5); opacity: 0.9; }
        70% { transform: scale(2.4); opacity: 0; }
        100% { transform: scale(2.4); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }, []);

  // Initialize map + marker (runs once)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const center: [number, number] =
      initialLat && initialLng ? [initialLat, initialLng] : REGION_CENTERS[region] ?? [10.787, 79.1378];

    const map = L.map(containerRef.current, {
      center,
      zoom: 12,
      scrollWheelZoom: true,
      zoomControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;

    // Place/move the marker at a given coordinate
    const placeMarker = (lat: number, lng: number) => {
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        const m = L.marker([lat, lng], { icon: PICKER_ICON, draggable: true }).addTo(map);
        m.on("dragend", (e: L.LeafletMouseEvent) => {
          const ll = e.target.getLatLng();
          onChangeRef.current(ll.lat, ll.lng);
        });
        markerRef.current = m;
      }
      setHasMarker(true);
    };

    // Click to set location
    map.on("click", (e: L.LeafletMouseEvent) => {
      placeMarker(e.latlng.lat, e.latlng.lng);
      onChangeRef.current(e.latlng.lat, e.latlng.lng);
    });

    // Initial marker if provided
    if (initialLat && initialLng) {
      placeMarker(initialLat, initialLng);
    }

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [initialLat, initialLng, region]);

  // Update center when region changes (only if no marker yet)
  useEffect(() => {
    if (mapRef.current && !markerRef.current && REGION_CENTERS[region]) {
      mapRef.current.setView(REGION_CENTERS[region], 12);
    }
  }, [region]);

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className={className ?? "h-56 w-full overflow-hidden rounded-lg border"}
        role="application"
        aria-label="Location picker — click to set your approximate location"
      />
      <p className="flex items-center gap-1 text-[11px] text-slate-400">
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
        {hasMarker
          ? "Location set. Drag the marker to adjust. Coordinates are rounded to ~100m for privacy."
          : "Click on the map to set your approximate location."}
      </p>
    </div>
  );
}
