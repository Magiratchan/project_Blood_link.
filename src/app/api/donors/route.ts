import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { BLOOD_GROUPS, REGIONS } from "@/lib/types";

// List donors with optional filters. Privacy: only authenticated hospital /
// blood-bank / admin users may browse donors. Coordinates are rounded to
// approximate (~100m) precision and contact info is omitted.
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role === "DONOR") {
    return Response.json({ error: "Donors cannot browse other donors." }, { status: 403 });
  }

  const url = req.nextUrl;
  const bloodGroup = url.searchParams.get("bloodGroup") ?? undefined;
  const available = url.searchParams.get("available");
  const region = url.searchParams.get("region") ?? undefined;
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "200", 10) || 200, 500);
  const verifiedOnly = url.searchParams.get("verified") !== "false";

  if (bloodGroup && !BLOOD_GROUPS.includes(bloodGroup as never)) {
    return Response.json({ error: "Invalid blood group." }, { status: 400 });
  }
  if (region && !REGIONS.includes(region as never)) {
    return Response.json({ error: "Invalid region." }, { status: 400 });
  }

  const donors = await db.donor.findMany({
    where: {
      ...(bloodGroup ? { bloodGroup } : {}),
      ...(available === "true" ? { available: true } : available === "false" ? { available: false } : {}),
      ...(region ? { region } : {}),
      ...(verifiedOnly ? { verificationStatus: "VERIFIED" } : {}),
    },
    include: { user: { select: { name: true } } },
    orderBy: { available: "desc" },
    take: limit,
  });

  const result = donors.map((d) => ({
    id: d.id,
    name: d.user.name,
    bloodGroup: d.bloodGroup,
    // approximate location (privacy: rounded to ~100m)
    lat: Math.round(d.lat * 1000) / 1000,
    lng: Math.round(d.lng * 1000) / 1000,
    region: d.region,
    available: d.available,
    donationCount: d.donationCount,
    responseRate: d.responseRate,
    totalRequests: d.totalRequests,
    acceptedCount: d.acceptedCount,
    declinedCount: d.declinedCount,
    noResponseCount: d.noResponseCount,
    verificationStatus: d.verificationStatus,
    lastDonationDate: d.lastDonationDate,
  }));

  return Response.json({ donors: result, total: result.length });
}
