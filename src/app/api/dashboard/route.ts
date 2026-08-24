import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { bloodCompatibilityService } from "@/lib/blood/compatibility";
import { haversineKm } from "@/lib/matching/distance";
import type { BloodGroup } from "@/lib/types";

// GET /api/dashboard — returns role-specific aggregated dashboard data
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = req.nextUrl;
  const donor = user.role === "DONOR" ? await db.donor.findUnique({ where: { userId: user.id } }) : null;

  if (user.role === "DONOR") {
    if (!donor) return Response.json({ error: "Donor profile not found." }, { status: 404 });

    // Active emergency requests in the donor's region, compatible with their blood group
    const activeRequests = await db.bloodRequest.findMany({
      where: {
        status: { in: ["PENDING", "MATCHING", "DONOR_FOUND", "PARTIALLY_FULFILLED"] },
        region: donor.region,
      },
      include: { hospital: { select: { name: true, address: true } } },
      orderBy: [{ urgency: "desc" }, { createdAt: "desc" }],
      take: 30,
    });

    // A donor should see requests whose required blood group they can DONATE to.
    const donationTargets = bloodCompatibilityService.donationTargets(donor.bloodGroup as BloodGroup);
    const requestsForDonor = activeRequests
      .filter((r) => donationTargets.includes(r.bloodGroup as BloodGroup))
      .map((r) => ({
        id: r.id,
        requestId: r.requestId,
        bloodGroup: r.bloodGroup,
        unitsRequired: r.unitsRequired,
        urgency: r.urgency,
        requiredBy: r.requiredBy,
        status: r.status,
        hospitalName: r.hospital.name,
        distanceKm: haversineKm(donor.lat, donor.lng, r.lat, r.lng),
        createdAt: r.createdAt,
      }));

    const notifications = await db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const donations = await db.donation.findMany({
      where: { donorId: donor.id },
      include: { bloodRequest: { include: { hospital: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // notification events where this donor was contacted (response history)
    const responseHistory = await db.notificationEvent.findMany({
      where: { donorId: donor.id },
      include: { bloodRequest: { select: { requestId: true, bloodGroup: true, hospital: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 15,
    });

    return Response.json({
      role: "DONOR",
      donor: {
        id: donor.id,
        bloodGroup: donor.bloodGroup,
        available: donor.available,
        region: donor.region,
        donationCount: donor.donationCount,
        responseRate: donor.responseRate,
        totalRequests: donor.totalRequests,
        acceptedCount: donor.acceptedCount,
        declinedCount: donor.declinedCount,
        lastDonationDate: donor.lastDonationDate,
        verificationStatus: donor.verificationStatus,
        lat: donor.lat,
        lng: donor.lng,
      },
      requests: requestsForDonor,
      notifications,
      donations,
      responseHistory,
    });
  }

  if (user.role === "HOSPITAL") {
    const hospital = await db.hospital.findUnique({ where: { userId: user.id } });
    if (!hospital) return Response.json({ error: "Hospital profile not found." }, { status: 404 });

    const requests = await db.bloodRequest.findMany({
      where: { hospitalId: hospital.id },
      include: {
        matchingResults: { orderBy: { rank: "asc" }, take: 3, include: { donor: { include: { user: { select: { name: true } } } } } },
        notificationEvents: { orderBy: { chainOrder: "asc" }, include: { donor: { include: { user: { select: { name: true } } } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    return Response.json({
      role: "HOSPITAL",
      hospital: {
        id: hospital.id,
        name: hospital.name,
        region: hospital.region,
        lat: hospital.lat,
        lng: hospital.lng,
        address: hospital.address,
        verificationStatus: hospital.verificationStatus,
      },
      requests,
    });
  }

  if (user.role === "BLOOD_BANK") {
    const bloodBank = await db.bloodBank.findUnique({ where: { userId: user.id } });
    if (!bloodBank) return Response.json({ error: "Blood bank profile not found." }, { status: 404 });

    const inventory = await db.bloodInventory.findMany({ where: { bloodBankId: bloodBank.id }, orderBy: { bloodGroup: "asc" } });
    const allInventory = await db.bloodInventory.findMany({ where: { region: bloodBank.region }, orderBy: { bloodGroup: "asc" } });
    const predictions = await db.shortagePrediction.findMany({ where: { region: bloodBank.region }, orderBy: { shortageRisk: "desc" } });
    const emergencyRequests = await db.bloodRequest.findMany({
      where: { region: bloodBank.region, status: { in: ["PENDING", "MATCHING", "DONOR_FOUND"] } },
      include: { hospital: { select: { name: true } } },
      orderBy: [{ urgency: "desc" }, { createdAt: "desc" }],
      take: 15,
    });

    return Response.json({
      role: "BLOOD_BANK",
      bloodBank: {
        id: bloodBank.id,
        name: bloodBank.name,
        region: bloodBank.region,
        lat: bloodBank.lat,
        lng: bloodBank.lng,
        verificationStatus: bloodBank.verificationStatus,
      },
      inventory,
      regionalInventory: allInventory,
      predictions,
      emergencyRequests,
    });
  }

  // ADMIN
  const [users, pendingUsers, requests, auditLogs, stats] = await Promise.all([
    db.user.findMany({
      include: { donor: { select: { bloodGroup: true } }, hospital: { select: { name: true } }, bloodBank: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.user.findMany({ where: { verificationStatus: "PENDING" }, orderBy: { createdAt: "desc" }, take: 50 }),
    db.bloodRequest.findMany({ include: { hospital: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 30 }),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { user: { select: { name: true, email: true } } } }),
    {
      totalDonors: await db.donor.count(),
      activeDonors: await db.donor.count({ where: { available: true } }),
      totalHospitals: await db.hospital.count(),
      verifiedHospitals: await db.hospital.count({ where: { verificationStatus: "VERIFIED" } }),
      totalBloodBanks: await db.bloodBank.count(),
      activeRequests: await db.bloodRequest.count({ where: { status: { in: ["PENDING", "MATCHING", "DONOR_FOUND"] } } }),
      fulfilledRequests: await db.bloodRequest.count({ where: { status: "FULFILLED" } }),
      totalUsers: await db.user.count(),
      pendingVerifications: await db.user.count({ where: { verificationStatus: "PENDING" } }),
    },
  ]);

  return Response.json({
    role: "ADMIN",
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      verificationStatus: u.verificationStatus,
      isActive: u.isActive,
      createdAt: u.createdAt,
      donor: u.donor,
      hospital: u.hospital,
      bloodBank: u.bloodBank,
    })),
    pendingUsers: pendingUsers.map((u) => ({ id: u.id, email: u.email, name: u.name, role: u.role, createdAt: u.createdAt })),
    requests,
    auditLogs: auditLogs.map((a) => ({ id: a.id, action: a.action, resource: a.resource, resourceId: a.resourceId, details: a.details, severity: a.severity, createdAt: a.createdAt, user: a.user ? { name: a.user.name, email: a.user.email } : null })),
    stats,
  });
}
