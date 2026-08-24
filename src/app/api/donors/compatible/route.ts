import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { bloodCompatibilityService } from "@/lib/blood/compatibility";
import { haversineKm } from "@/lib/matching/distance";
import type { BloodGroup } from "@/lib/types";
import { BLOOD_GROUPS } from "@/lib/types";

// GET /api/donors/compatible?recipientGroup=&lat=&lng=&available=&limit=
// Returns donors whose blood is compatible with the recipient group,
// using the centralized bloodCompatibilityService.
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "DONOR") {
    return Response.json({ error: "Donors cannot browse other donors." }, { status: 403 });
  }

  const url = req.nextUrl;
  const recipientGroup = url.searchParams.get("recipientGroup") as BloodGroup | null;
  if (!recipientGroup || !BLOOD_GROUPS.includes(recipientGroup)) {
    return Response.json({ error: "Please provide a valid blood group." }, { status: 400 });
  }
  const lat = parseFloat(url.searchParams.get("lat") ?? "0");
  const lng = parseFloat(url.searchParams.get("lng") ?? "0");
  const availableOnly = url.searchParams.get("available") !== "false";
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "200", 10) || 200, 500);

  const compatibleGroups = bloodCompatibilityService.compatibleDonorGroups(recipientGroup);

  const donors = await db.donor.findMany({
    where: {
      bloodGroup: { in: compatibleGroups },
      ...(availableOnly ? { available: true } : {}),
      verificationStatus: "VERIFIED",
    },
    include: { user: { select: { name: true } } },
    take: limit,
  });

  const hasLocation = !Number.isNaN(lat) && !Number.isNaN(lng);
  const result = donors
    .map((d) => ({
      id: d.id,
      name: d.user.name,
      bloodGroup: d.bloodGroup,
      exactMatch: d.bloodGroup === recipientGroup,
      isUniversalDonor: d.bloodGroup === "O-",
      lat: Math.round(d.lat * 1000) / 1000,
      lng: Math.round(d.lng * 1000) / 1000,
      region: d.region,
      available: d.available,
      donationCount: d.donationCount,
      responseRate: d.responseRate,
      verificationStatus: d.verificationStatus,
      lastDonationDate: d.lastDonationDate,
      distanceKm: hasLocation ? haversineKm(lat, lng, d.lat, d.lng) : null,
    }))
    .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));

  return Response.json({
    recipientGroup,
    compatibleDonorGroups: compatibleGroups,
    donors: result,
    total: result.length,
  });
}
