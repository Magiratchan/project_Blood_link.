import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/matching/[requestId] — return stored matching results + donor chain
export async function GET(_req: NextRequest, { params }: { params: Promise<{ requestId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { requestId } = await params;
  const request = await db.bloodRequest.findUnique({
    where: { id: requestId },
    include: {
      hospital: { select: { name: true, address: true } },
    },
  });
  if (!request) return Response.json({ error: "Request not found." }, { status: 404 });

  const ranked = await db.matchingResult.findMany({
    where: { requestId },
    orderBy: { rank: "asc" },
    include: { donor: { include: { user: { select: { name: true } } } } },
  });

  const chain = await db.notificationEvent.findMany({
    where: { requestId },
    orderBy: { chainOrder: "asc" },
    include: { donor: { include: { user: { select: { name: true } } } } },
  });

  return Response.json({
    request: {
      id: request.id,
      requestId: request.requestId,
      bloodGroup: request.bloodGroup,
      unitsRequired: request.unitsRequired,
      urgency: request.urgency,
      status: request.status,
      matchedDonorId: request.matchedDonorId,
      hospitalName: request.hospital.name,
      lat: request.lat,
      lng: request.lng,
    },
    ranked: ranked.map((r) => ({
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
        lat: r.donor.lat,
        lng: r.donor.lng,
      },
    })),
    chain: chain.map((c) => ({
      id: c.id,
      chainOrder: c.chainOrder,
      status: c.status,
      sentAt: c.sentAt,
      viewedAt: c.viewedAt,
      respondedAt: c.respondedAt,
      note: c.note,
      donor: {
        id: c.donor.id,
        name: c.donor.user.name,
        bloodGroup: c.donor.bloodGroup,
        responseRate: c.donor.responseRate,
      },
    })),
  });
}
