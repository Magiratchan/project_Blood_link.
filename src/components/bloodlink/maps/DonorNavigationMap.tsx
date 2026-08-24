"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { formatDistance } from "@/components/bloodlink/ui/format";
import { Navigation, MapPin, Clock, ExternalLink, Building2, Droplet } from "lucide-react";

export interface DonorNavigationMapProps {
  donorLat: number;
  donorLng: number;
  donorName?: string;
  donorBloodGroup?: string;
  hospitalLat: number;
  hospitalLng: number;
  hospitalName: string;
  distanceKm: number;
  className?: string;
  zoom?: number;
}

// Donor marker — pulsing red dot
const DonorNavIcon = L.divIcon({
  html: `<div class="bl-nav-donor">
    <div class="bl-nav-pulse"></div>
    <div class="bl-nav-core"></div>
  </div>`,
  className: "bl-nav-donor-wrap",
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

// Hospital marker — destination pin
const HospitalDestIcon = L.divIcon({
  html: `<div class="bl-nav-hospital">
    <div class="bl-nav-hospital-inner">H</div>
    <div class="bl-nav-hospital-beam"></div>
  </div>`,
  className: "bl-nav-hospital-wrap",
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

/** Rough ETA estimate (city-driving heuristic). */
function estimateEta(distanceKm: number, urgency: string): { minutes: number; mode: string } {
  // faster routing for critical emergencies (assumed ambulance-aware)
  const baseSpeed = urgency === "CRITICAL" ? 38 : urgency === "HIGH" ? 32 : 26; // km/h city
  const minutes = Math.max(3, Math.round((distanceKm / baseSpeed) * 60));
  return { minutes, mode: urgency === "CRITICAL" || urgency === "HIGH" ? "express" : "city" };
}

export default function DonorNavigationMap({
  donorLat,
  donorLng,
  donorName,
  donorBloodGroup,
  hospitalLat,
  hospitalLng,
  hospitalName,
  distanceKm,
  className,
}: DonorNavigationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [(donorLat + hospitalLat) / 2, (donorLng + hospitalLng) / 2],
      zoom: 13,
      scrollWheelZoom: false,
      zoomControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // Inject animation styles once
    if (!document.getElementById("bl-nav-map-styles")) {
      const style = document.createElement("style");
      style.id = "bl-nav-map-styles";
      style.textContent = `
        .bl-nav-donor-wrap { position: relative; }
        .bl-nav-donor { position: relative; width: 22px; height: 22px; }
        .bl-nav-pulse {
          position: absolute; inset: 0; border-radius: 50%;
          background: rgba(220,38,38,0.35);
          animation: bl-nav-pulse 2s ease-out infinite;
        }
        .bl-nav-core {
          position: absolute; top: 5px; left: 5px; width: 12px; height: 12px;
          border-radius: 50%; background: #dc2626;
          border: 2.5px solid #fff;
          box-shadow: 0 0 0 2px #dc2626, 0 2px 6px rgba(0,0,0,.3);
        }
        @keyframes bl-nav-pulse {
          0% { transform: scale(0.5); opacity: 0.9; }
          70% { transform: scale(2.4); opacity: 0; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        .bl-nav-hospital-wrap { position: relative; }
        .bl-nav-hospital { position: relative; width: 24px; height: 24px; }
        .bl-nav-hospital-inner {
          position: absolute; inset: 0; border-radius: 50%;
          background: #0d9488; color: #fff; font-size: 11px; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
          border: 2.5px solid #fff;
          box-shadow: 0 0 0 2px #0d9488, 0 2px 8px rgba(0,0,0,.35);
        }
        .bl-nav-hospital-beam {
          position: absolute; top: -6px; left: 50%; transform: translateX(-50%);
          width: 6px; height: 6px; border-radius: 50%; background: #5eead4;
          animation: bl-nav-beam 1.6s ease-in-out infinite;
        }
        @keyframes bl-nav-beam {
          0%, 100% { opacity: 0.3; transform: translateX(-50%) translateY(0); }
          50% { opacity: 1; transform: translateX(-50%) translateY(-4px); }
        }
        .bl-nav-route {
          stroke-dasharray: 8 8;
          animation: bl-nav-dash 1s linear infinite;
        }
        @keyframes bl-nav-dash {
          to { stroke-dashoffset: -16; }
        }
        .bl-nav-start, .bl-nav-end {
          font-size: 10px; font-weight: 600;
        }
      `;
      document.head.appendChild(style);
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Redraw route + markers when inputs change
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    // Donor marker (origin)
    const donorMarker = L.marker([donorLat, donorLng], { icon: DonorNavIcon }).addTo(layer);
    donorMarker.bindPopup(
      `<div style="font-size:12px"><b>Your location</b><br/>${donorName ? donorName + " — " : ""}${donorBloodGroup ?? ""}</div>`
    );

    // Hospital marker (destination)
    const hospitalMarker = L.marker([hospitalLat, hospitalLng], { icon: HospitalDestIcon }).addTo(layer);
    hospitalMarker.bindPopup(
      `<div style="font-size:12px"><b>${hospitalName}</b><br/>Destination hospital</div>`
    );

    // Animated dashed route line (straight great-circle approximation)
    const route = L.polyline(
      [
        [donorLat, donorLng],
        [hospitalLat, hospitalLng],
      ],
      {
        color: "#dc2626",
        weight: 3,
        opacity: 0.85,
        dashArray: "8 8",
        lineCap: "round",
      }
    ).addTo(layer);
    // add the animated-dash class via SVG path
    // (Leaflet renders polylines as SVG paths — find and tag it)
    setTimeout(() => {
      const paths = containerRef.current?.querySelectorAll("svg.leaflet-zoom-animated path");
      if (paths && paths.length) {
        const last = paths[paths.length - 1] as SVGPathElement;
        last.classList.add("bl-nav-route");
      }
    }, 50);

    // Origin / end labels
    L.tooltip({
      permanent: false,
      direction: "top",
      className: "bl-nav-start",
      offset: [0, -10],
    })
      .setLatLng([donorLat, donorLng])
      .setContent("You")
      .addTo(layer);
    L.tooltip({
      permanent: false,
      direction: "top",
      className: "bl-nav-end",
      offset: [0, -10],
    })
      .setLatLng([hospitalLat, hospitalLng])
      .setContent("Hospital")
      .addTo(layer);

    // Fit bounds to show both points with padding
    map.fitBounds(
      [
        [donorLat, donorLng],
        [hospitalLat, hospitalLng],
      ],
      { padding: [50, 50] }
    );
  }, [donorLat, donorLng, hospitalLat, hospitalLng, hospitalName, donorName, donorBloodGroup]);

  // Open external turn-by-turn directions (OSM)
  function openDirections() {
    const url = `https://www.openstreetmap.org/directions?from=${donorLat}%2C${donorLng}&to=${hospitalLat}%2C${hospitalLng}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  // Open in Google Maps as alternative
  function openGoogleMaps() {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${donorLat},${donorLng}&destination=${hospitalLat},${hospitalLng}&travelmode=driving`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  // ETA estimate — pass urgency via prop-less heuristic from distance
  const { minutes, mode } = estimateEta(distanceKm, "HIGH");

  return (
    <div className="space-y-3">
      {/* Map */}
      <div
        ref={containerRef}
        className={className ?? "h-64 w-full overflow-hidden rounded-lg border"}
        role="application"
        aria-label={`Navigation map from your location to ${hospitalName}`}
      />

      {/* Route summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-red-600">
            <MapPin className="h-3 w-3" /> Distance
          </p>
          <p className="mt-0.5 text-base font-bold text-red-700">{formatDistance(distanceKm)}</p>
        </div>
        <div className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2">
          <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-teal-600">
            <Clock className="h-3 w-3" /> Est. ETA
          </p>
          <p className="mt-0.5 text-base font-bold text-teal-700">~{minutes} min</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-slate-500">
            <Navigation className="h-3 w-3" /> Route
          </p>
          <p className="mt-0.5 text-base font-bold text-slate-700">{mode === "express" ? "Express" : "City"}</p>
        </div>
      </div>

      {/* Origin → destination */}
      <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
        <div className="flex flex-col items-center">
          <span className="flex h-3 w-3 items-center justify-center rounded-full bg-red-600 ring-2 ring-red-200" />
          <span className="my-0.5 h-5 w-0.5 border-l border-dashed border-slate-300" />
          <span className="flex h-3 w-3 items-center justify-center rounded-full bg-teal-600 ring-2 ring-teal-200" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-xs font-medium text-slate-900">
            <Droplet className="h-3 w-3 text-red-500" /> Your location
            <span className="text-[10px] font-normal text-slate-400">{donorBloodGroup ? `· ${donorBloodGroup}` : ""}</span>
          </p>
          <p className="mt-2 flex items-center gap-1 truncate text-xs font-medium text-slate-900">
            <Building2 className="h-3 w-3 text-teal-600" /> {hospitalName}
          </p>
        </div>
      </div>

      {/* Directions buttons */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={openDirections} className="flex-1 bg-red-600 hover:bg-red-700">
          <Navigation className="mr-1.5 h-3.5 w-3.5" /> Get Directions
          <ExternalLink className="ml-1 h-3 w-3 opacity-70" />
        </Button>
        <Button size="sm" variant="outline" onClick={openGoogleMaps} className="flex-1 border-slate-300">
          Google Maps <ExternalLink className="ml-1.5 h-3 w-3 opacity-60" />
        </Button>
      </div>

      <p className="text-[11px] text-slate-400">
        Distance is a straight-line estimate (great-circle). Turn-by-turn routing opens in OpenStreetMap / Google Maps in a new tab. Always confirm the route with the hospital coordination team.
      </p>
    </div>
  );
}
