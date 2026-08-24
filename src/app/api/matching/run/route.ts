import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { runMatching, toDonorCandidate } from "@/lib/matching/donor-matching";
import { bloodCompatibilityService } from "@/lib/blood/compatibility";
import { haversineKm } from "@/lib/matching/distance";
import { notifyDonorOfRequest } from "@/lib/notifications/notifications";
import { DEFAULT_MATCHING_CONFIG } from "@/lib/matching/donor-matching";
import type { BloodGroup, Urgency } from "@/lib/types";

// POST /api/matching/run
// Body: { requestId, notifyTopN?: number }
// Runs the AI-assisted matching engine, persists MatchingResult rows, and
// notifies the top N compatible donors (creates NotificationEvent SENT).
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!["HOSPITAL", "ADMIN"].includes(user.role)) {
    return Response.json({ error: "You are not authorized to run matching." }, { status: 403 });
  }

  const body = await req.json();
  const { requestId, notifyTopN = 5 } = body ?? {};
  if (!requestId) return Response.json({ error: "requestId is required." }, { status: 400 });

  const bloodRequest = await db.bloodRequest.findUnique({
    where: { id: requestId },
    include: { hospital: true },
  });
  if (!bloodRequest) return Response.json({ error: "Request not found." }, { status: 404 });

  // Gather candidate donors (verified, any blood group — filtering happens in matching)
  const donors = await db.donor.findMany({
    where: { verificationStatus: "VERIFIED", region: bloodRequest.region },
    include: { user: { select: { name: true } } },
  });
  // If the region has too few, widen to all regions (but still within range filtering)
  let candidates = donors.map(toDonorCandidate);
  if (candidates.length < 5) {
    const more = await db.donor.findMany({
      where: { verificationStatus: "VERIFIED", region: { not: bloodRequest.region } },
      include: { user: { select: { name: true } } },
    });
    candidates = candidates.concat(more.map(toDonorCandidate));
  }

  const { ranked, excluded } = runMatching(
    bloodRequest.bloodGroup as BloodGroup,
    bloodRequest.urgency as Urgency,
    bloodRequest.lat,
    bloodRequest.lng,
    candidates,
    DEFAULT_MATCHING_CONFIG
  );

  // Clear previous matching results for this request
  await db.matchingResult.deleteMany({ where: { requestId } });
  // Clear previous SENT notification events (re-run scenario)
  await db.notificationEvent.deleteMany({ where: { requestId, status: "SENT" } });

  // Persist top matching results (cap at 20 for performance)
  const topToStore = ranked.slice(0, 20);
  if (topToStore.length > 0) {
    await db.matchingResult.createMany({
      data: topToStore.map((r) => ({
        requestId,
        donorId: r.donor.id,
        bloodGroup: r.donor.bloodGroup,
        matchScore: r.matchScore,
        distanceKm: r.distanceKm,
        distanceScore: r.distanceScore,
        availabilityScore: r.availabilityScore,
        urgencyScore: r.urgencyScore,
        responseScore: r.responseScore,
        recommendationReason: r.recommendationReason,
        rank: r.rank,
        compatible: true,
      })),
    });
  }

  // Notify the top N compatible donors — this kicks off the donor chain.
  let notifiedCount = 0;
  const topForNotification = ranked.slice(0, Math.max(1, notifyTopN));
  for (let i = 0; i < topForNotification.length; i++) {
    const r = topForNotification[i];
    await notifyDonorOfRequest(
      r.donor.userId,
      r.donor.id,
      requestId,
      {
        requestId,
        requestIdFriendly: bloodRequest.requestId,
        bloodGroup: bloodRequest.bloodGroup as BloodGroup,
        unitsRequired: bloodRequest.unitsRequired,
        distanceKm: r.distanceKm,
        urgency: bloodRequest.urgency as Urgency,
        hospitalName: bloodRequest.hospital.name,
        requiredBy: bloodRequest.requiredBy.toISOString(),
      },
      i // chainOrder
    );
    notifiedCount++;
  }

  // Update request status to MATCHING
  await db.bloodRequest.update({ where: { id: requestId }, data: { status: "MATCHING" } });

  await audit(user.id, "RUN_MATCHING", "BloodRequest", requestId, `ranked=${ranked.length} excluded=${excluded.length} notified=${notifiedCount}`);

  const stored = await db.matchingResult.findMany({
    where: { requestId },
    orderBy: { rank: "asc" },
    include: { donor: { include: { user: { select: { name: true } } } } },
  });

  return Response.json({
    requestId,
    ranked: stored.map((r) => ({
      id: r.id,
      rank: r.rank,
      matchScore: r.matchScore,
      distanceKm: r.distanceKm,
      distanceScore: r.distanceScore,
      availabilityScore: r.availabilityScore,
      urgencyScore: r.urgencyScore,
      responseScore: r.responseScore,
      recommendationReason: r.recommendationReason,
      donor: {
        id: r.donor.id,
        name: r.donor.user.name,
        bloodGroup: r.donor.bloodGroup,
        region: r.donor.region,
        available: r.donor.available,
        responseRate: r.donor.responseRate,
        donationCount: r.donor.donationCount,
        verificationStatus: r.donor.verificationStatus,
      },
    })),
    excluded: excluded.slice(0, 10).map((r) => ({
      donor: { id: r.donor.id, name: r.donor.name, bloodGroup: r.donor.bloodGroup },
      distanceKm: r.distanceKm,
      reason: r.recommendationReason,
    })),
    notifiedDonors: topForNotification.map((r) => ({
      donorId: r.donor.id,
      name: r.donor.name,
      bloodGroup: r.donor.bloodGroup,
      chainOrder: topForNotification.indexOf(r),
      matchScore: r.matchScore,
      distanceKm: r.distanceKm,
    })),
    matchingConfig: DEFAULT_MATCHING_CONFIG,
    note: "AI-assisted donor matching score — decision support only.",
  });
}
