import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { haversineKm } from "@/lib/matching/distance";

// GET /api/analytics/overview — top-level KPI cards for analytics dashboard
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const [totalDonors, activeDonors, activeRequests, fulfilledRequests, inventory, requests, hospitals, bloodBanks, donations, predictions] = await Promise.all([
    db.donor.count(),
    db.donor.count({ where: { available: true } }),
    db.bloodRequest.count({ where: { status: { in: ["PENDING", "MATCHING", "DONOR_FOUND", "PARTIALLY_FULFILLED"] } } }),
    db.bloodRequest.count({ where: { status: "FULFILLED" } }),
    db.bloodInventory.findMany(),
    db.bloodRequest.findMany({ include: { matchingResults: true, hospital: true } }),
    db.hospital.count(),
    db.bloodBank.count(),
    db.donation.count({ where: { status: "COMPLETED" } }),
    db.shortagePrediction.findMany(),
  ]);

  const unitsAvailable = inventory.reduce((a, b) => a + b.units, 0);
  const unitsRequested = requests.reduce((a, b) => a + b.unitsRequired, 0);

  // Average matching time (createdAt of request → first ACCEPTED event)
  const events = await db.notificationEvent.findMany({
    where: { status: "ACCEPTED" },
    include: { bloodRequest: true },
  });
  let avgMatchingMs = 0;
  if (events.length > 0) {
    const total = events.reduce((a, e) => a + (e.respondedAt!.getTime() - e.bloodRequest.createdAt.getTime()), 0);
    avgMatchingMs = total / events.length;
  }

  // Average donor distance (from matching results)
  const allMatches = await db.matchingResult.findMany();
  const avgDistance = allMatches.length > 0
    ? allMatches.reduce((a, b) => a + b.distanceKm, 0) / allMatches.length
    : 0;

  // Shortage risk summary — highest risk predictions
  const highRisk = predictions
    .filter((p) => p.shortageRisk >= 50)
    .sort((a, b) => b.shortageRisk - a.shortageRisk)
    .slice(0, 5);

  return Response.json({
    totalDonors,
    activeDonors,
    activeRequests,
    fulfilledRequests,
    unitsRequested,
    unitsAvailable,
    hospitals,
    bloodBanks,
    completedDonations: donations,
    avgMatchingTimeMs: avgMatchingMs,
    avgMatchingTimeMin: Math.round(avgMatchingMs / 60000),
    avgDonorDistance: Math.round(avgDistance * 10) / 10,
    highRiskShortage: highRisk.map((p) => ({
      region: p.region,
      bloodGroup: p.bloodGroup,
      shortageRisk: p.shortageRisk,
      expectedDemand: p.expectedDemand,
      recommendation: p.recommendation,
    })),
  });
}
