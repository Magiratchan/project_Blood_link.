import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { notifyUser } from "@/lib/notifications/notifications";

// POST /api/donors/[id]/respond
// Body: { requestId, response: "ACCEPT" | "DECLINE", notificationEventId?, note?, simulate?: boolean }
//
// When simulate=true, the call is made by a hospital/admin on behalf of a donor
// (clearly labelled demo control) to advance the donor chain. This keeps the
// hackathon demo self-contained without requiring multiple browser sessions.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: donorId } = await params;
  const body = await req.json();
  const { requestId, response, notificationEventId, note, simulate } = body ?? {};

  if (!requestId || !["ACCEPT", "DECLINE"].includes(response)) {
    return Response.json({ error: "Invalid response payload." }, { status: 400 });
  }

  // Authorization: donor responds for themselves, OR hospital/admin simulates.
  const donor = await db.donor.findUnique({ where: { id: donorId }, include: { user: true } });
  if (!donor) return Response.json({ error: "Donor not found." }, { status: 404 });

  const isOwner = donor.userId === user.id;
  const canSimulate = simulate && ["HOSPITAL", "ADMIN"].includes(user.role);
  if (!isOwner && !canSimulate) {
    return Response.json({ error: "You are not authorized to respond on behalf of this donor." }, { status: 403 });
  }

  const bloodRequest = await db.bloodRequest.findUnique({ where: { id: requestId }, include: { hospital: { include: { user: true } } } });
  if (!bloodRequest) return Response.json({ error: "Request not found." }, { status: 404 });

  // Update notification event
  let event = null;
  if (notificationEventId) {
    event = await db.notificationEvent.update({
      where: { id: notificationEventId },
      data: { status: response === "ACCEPT" ? "ACCEPTED" : "DECLINED", respondedAt: new Date(), note: note ?? null },
    });
  } else {
    // find the SENT event for this donor+request
    const existing = await db.notificationEvent.findFirst({
      where: { requestId, donorId, status: "SENT" },
      orderBy: { chainOrder: "asc" },
    });
    if (existing) {
      event = await db.notificationEvent.update({
        where: { id: existing.id },
        data: { status: response === "ACCEPT" ? "ACCEPTED" : "DECLINED", respondedAt: new Date(), note: note ?? null },
      });
    } else {
      event = await db.notificationEvent.create({
        data: {
          requestId,
          donorId,
          status: response === "ACCEPT" ? "ACCEPTED" : "DECLINED",
          respondedAt: new Date(),
          note: note ?? null,
          chainOrder: 0,
        },
      });
    }
  }

  // Update donor stats
  await db.donor.update({
    where: { id: donorId },
    data: {
      totalRequests: { increment: 1 },
      acceptedCount: { increment: response === "ACCEPT" ? 1 : 0 },
      declinedCount: { increment: response === "DECLINE" ? 1 : 0 },
      noResponseCount: { increment: 0 },
      // recompute response rate
    },
  });
  const refreshed = await db.donor.findUnique({ where: { id: donorId } });
  if (refreshed) {
    const rate = refreshed.totalRequests > 0
      ? Math.min(100, Math.round((refreshed.acceptedCount / refreshed.totalRequests) * 100))
      : 0;
    await db.donor.update({ where: { id: donorId }, data: { responseRate: rate } });
  }

  await audit(user.id, response === "ACCEPT" ? "DONOR_ACCEPT" : "DONOR_DECLINE", "BloodRequest", requestId, `donor=${donorId} simulate=${!!simulate}`);

  // Notify hospital of the response
  await notifyUser(
    bloodRequest.hospital.userId,
    "REQUEST_RESPONSE",
    response === "ACCEPT" ? "Donor accepted the request" : "Donor declined the request",
    `${donor.user.name} (${donor.bloodGroup}) ${response === "ACCEPT" ? "accepted" : "declined"} request ${bloodRequest.requestId}.`,
    requestId
  );

  if (response === "ACCEPT") {
    // Mark request as DONOR_FOUND, record the matched donor.
    await db.bloodRequest.update({
      where: { id: requestId },
      data: { status: "DONOR_FOUND", matchedDonorId: donorId },
    });

    // Create a Donation record
    await db.donation.create({
      data: {
        requestId,
        donorId,
        bloodGroup: donor.bloodGroup,
        units: Math.min(bloodRequest.unitsRequired - bloodRequest.unitsFulfilled, bloodRequest.unitsRequired),
        status: "PENDING",
      },
    });

    // Mark donor as temporarily unavailable (recent donation pending) + lastDonationDate
    await db.donor.update({
      where: { id: donorId },
      data: { available: false, lastDonationDate: new Date(), donationCount: { increment: 1 } },
    });

    // Expire any other SENT events for this request
    await db.notificationEvent.updateMany({
      where: { requestId, status: "SENT", id: { not: event.id } },
      data: { status: "EXPIRED", respondedAt: new Date(), note: "Another donor accepted." },
    });

    return Response.json({
      ok: true,
      response: "ACCEPTED",
      requestStatus: "DONOR_FOUND",
      matchedDonor: { id: donorId, name: donor.user.name, bloodGroup: donor.bloodGroup },
      event,
    });
  }

  // DECLINE: do not change request status; hospital can advance the chain.
  return Response.json({
    ok: true,
    response: "DECLINED",
    requestStatus: bloodRequest.status,
    event,
  });
}
