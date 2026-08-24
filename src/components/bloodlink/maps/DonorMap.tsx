"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons (Leaflet's bundler paths)
const DefaultIcon = L.divIcon({
  html: `<div style="width:14px;height:14px;border-radius:50%;background:#ef4444;border:3px solid #fff;box-shadow:0 0 0 2px #ef4444,0 2px 6px rgba(0,0,0,.3)"></div>`,
  className: "bl-marker",
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const HospitalIcon = L.divIcon({
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#0d9488;border:3px solid #fff;box-shadow:0 0 0 2px #0d9488,0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:700">H</div>`,
  className: "bl-hospital-marker",
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const BloodBankIcon = L.divIcon({
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#7c3aed;border:3px solid #fff;box-shadow:0 0 0 2px #7c3aed,0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:700">B</div>`,
  className: "bl-bb-marker",
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

export interface MapMarker {
  lat: number;
  lng: number;
  label?: string;
  type?: "donor" | "hospital" | "bloodbank" | "request";
  popup?: string;
  score?: number; // for ranked donors
  highlighted?: boolean;
}

export interface DonorMapProps {
  center: [number, number];
  markers: MapMarker[];
  radiusKm?: number;
  className?: string;
  zoom?: number;
}

export default function DonorMap({ center, markers, radiusKm, className, zoom = 12 }: DonorMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center,
      zoom,
      scrollWheelZoom: false,
      zoomControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers / radius when props change
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    // Search radius circle
    if (radiusKm && radiusKm > 0) {
      L.circle(center, {
        radius: radiusKm * 1000,
        color: "#ef4444",
        weight: 1.5,
        fillColor: "#ef4444",
        fillOpacity: 0.05,
        dashArray: "6 6",
      }).addTo(layer);
    }

    for (const m of markers) {
      let icon = DefaultIcon;
      if (m.type === "hospital") icon = HospitalIcon;
      else if (m.type === "bloodbank") icon = BloodBankIcon;
      else if (m.type === "request") {
        icon = L.divIcon({
          html: `<div style="width:20px;height:20px;border-radius:50%;background:#dc2626;border:3px solid #fff;box-shadow:0 0 0 3px rgba(220,38,38,.4),0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:800">!</div>`,
          className: "bl-req-marker",
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });
      } else if (m.type === "donor" && m.highlighted) {
        const color = m.score && m.score >= 85 ? "#10b981" : m.score && m.score >= 70 ? "#14b8a6" : "#f59e0b";
        icon = L.divIcon({
          html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 0 0 2px ${color},0 2px 6px rgba(0,0,0,.3)"></div>`,
          className: "bl-donor-marker",
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });
      }
      const marker = L.marker([m.lat, m.lng], { icon }).addTo(layer);
      if (m.popup) marker.bindPopup(m.popup);
    }
  }, [center, markers, radiusKm]);

  // Keep center in sync
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView(center, mapRef.current.getZoom());
    }
  }, [center]);

  return (
    <div
      ref={containerRef}
      className={className ?? "h-72 w-full rounded-lg overflow-hidden border"}
      role="application"
      aria-label="Donor and hospital map"
    />
  );
}
