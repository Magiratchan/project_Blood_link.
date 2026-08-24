import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { haversineKm } from "@/lib/matching/distance";

// GET /api/donors/nearby?lat=&lng=&radiusKm=&bloodGroup=&available=
// Returns donors sorted by distance from the given point.
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "DONOR") {
    return Response.json({ error: "Donors cannot browse other donors." }, { status: 403 });
  }

  const url = req.nextUrl;
  const lat = parseFloat(url.searchParams.get("lat") ?? "");
  const lng = parseFloat(url.searchParams.get("lng") ?? "");
  const radiusKm = Math.min(parseFloat(url.searchParams.get("radiusKm") ?? "30"), 100);
  const bloodGroup = url.searchParams.get("bloodGroup") ?? undefined;
  const availableOnly = url.searchParams.get("available") !== "false";

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return Response.json({ error: "Location unavailable. Please provide valid lat/lng." }, { status: 400 });
  }

  const donors = await db.donor.findMany({
    where: {
      ...(bloodGroup ? { bloodGroup } : {}),
      ...(availableOnly ? { available: true } : {}),
      verificationStatus: "VERIFIED",
    },
    include: { user: { select: { name: true } } },
  });

  const withDistance = donors
    .map((d) => ({
      id: d.id,
      name: d.user.name,
      bloodGroup: d.bloodGroup,
      lat: Math.round(d.lat * 1000) / 1000,
      lng: Math.round(d.lng * 1000) / 1000,
      region: d.region,
      available: d.available,
      donationCount: d.donationCount,
      responseRate: d.responseRate,
      verificationStatus: d.verificationStatus,
      lastDonationDate: d.lastDonationDate,
      distanceKm: haversineKm(lat, lng, d.lat, d.lng),
    }))
    .filter((d) => d.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return Response.json({ donors: withDistance, center: { lat, lng }, radiusKm });
}
