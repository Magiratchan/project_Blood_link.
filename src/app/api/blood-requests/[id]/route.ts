import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";

// GET /api/blood-requests/[id] — full request detail with chain + matching
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const bloodRequest = await db.bloodRequest.findUnique({
    where: { id },
    include: {
      hospital: { select: { id: true, name: true, address: true, lat: true, lng: true, phone: true } },
      matchingResults: {
        orderBy: { rank: "asc" },
        include: { donor: { include: { user: { select: { name: true } } } } },
      },
      notificationEvents: {
        orderBy: { chainOrder: "asc" },
        include: { donor: { include: { user: { select: { name: true } } } } },
      },
      donations: { include: { donor: { include: { user: { select: { name: true } } } } } },
    },
  });
  if (!bloodRequest) return Response.json({ error: "Request not found." }, { status: 404 });
  return Response.json({ request: bloodRequest });
}

// PATCH /api/blood-requests/[id] — update status / fulfill / cancel
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const { status, unitsFulfilled, matchedDonorId, action } = body ?? {};

  const bloodRequest = await db.bloodRequest.findUnique({ where: { id }, include: { hospital: true } });
  if (!bloodRequest) return Response.json({ error: "Request not found." }, { status: 404 });

  // Authorization: hospital owner, blood bank, or admin
  const isOwner = user.role === "HOSPITAL" && bloodRequest.hospital.userId === user.id;
  const canManage = isOwner || user.role === "ADMIN" || user.role === "BLOOD_BANK";
  if (!canManage) {
    return Response.json({ error: "You are not authorized to update this request." }, { status: 403 });
  }

  const data: Record<string, unknown> = {};
  if (status) data.status = status;
  if (typeof unitsFulfilled === "number") data.unitsFulfilled = unitsFulfilled;
  if (matchedDonorId) data.matchedDonorId = matchedDonorId;

  // Convenience: action-based transitions
  if (action === "fulfill") {
    data.status = "FULFILLED";
    data.unitsFulfilled = bloodRequest.unitsRequired;
    // mark donations completed
    await db.donation.updateMany({ where: { requestId: id, status: "PENDING" }, data: { status: "COMPLETED", donatedAt: new Date() } });
  } else if (action === "cancel") {
    data.status = "CANCELLED";
  }

  const updated = await db.bloodRequest.update({ where: { id }, data });
  await audit(user.id, "UPDATE_REQUEST", "BloodRequest", id, JSON.stringify(data));

  return Response.json({ request: updated });
}
