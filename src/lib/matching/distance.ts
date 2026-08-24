// Haversine distance — great-circle distance between two lat/lng points.

const EARTH_RADIUS_KM = 6371;
const { sin, cos, atan2, sqrt, PI } = Math;

function toRad(deg: number): number {
  return (deg * PI) / 180;
}

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    sin(dLat / 2) ** 2 +
    cos(toRad(lat1)) * cos(toRad(lat2)) * sin(dLng / 2) ** 2;
  const c = 2 * atan2(sqrt(a), sqrt(1 - a));
  const dist = EARTH_RADIUS_KM * c;
  return Math.round(dist * 10) / 10; // 1 decimal place
}

/**
 * Convert a distance (km) into a 0..1 score using a configurable max radius.
 * Closer donors score higher. Beyond the max radius, score approaches 0.
 */
export function distanceScore(distanceKm: number, maxRadiusKm = 30): number {
  if (distanceKm <= 0) return 1;
  if (distanceKm >= maxRadiusKm) return 0.05;
  // Smooth falloff (ease-out)
  const t = distanceKm / maxRadiusKm;
  return Math.max(0.05, 1 - t * t);
}

/** Format a distance nicely for display. */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}
