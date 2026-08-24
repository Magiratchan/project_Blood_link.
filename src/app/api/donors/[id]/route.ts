import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { BLOOD_GROUPS } from "@/lib/types";

// GET /api/donors/[id] — fetch a donor profile (self / hospital / admin only)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const donor = await db.donor.findUnique({
    where: { id },
    include: { user: { select: { name: true, email: true, phone: true, avatarColor: true } } },
  });
  if (!donor) return Response.json({ error: "Donor not found." }, { status: 404 });

  // Privacy: only the donor themself, hospitals, blood banks, or admins may view full info.
  const isSelf = donor.userId === user.id;
  const canSee = isSelf || ["HOSPITAL", "BLOOD_BANK", "ADMIN"].includes(user.role);

  return Response.json({
    donor: {
      id: donor.id,
      name: donor.user.name,
      email: isSelf ? donor.user.email : undefined,
      phone: canSee ? donor.user.phone : undefined,
      avatarColor: donor.user.avatarColor,
      bloodGroup: donor.bloodGroup,
      lat: Math.round(donor.lat * 1000) / 1000,
      lng: Math.round(donor.lng * 1000) / 1000,
      region: donor.region,
      address: donor.address,
      available: donor.available,
      dateOfBirth: donor.dateOfBirth,
      gender: donor.gender,
      donationCount: donor.donationCount,
      totalRequests: donor.totalRequests,
      acceptedCount: donor.acceptedCount,
      declinedCount: donor.declinedCount,
      noResponseCount: donor.noResponseCount,
      responseRate: donor.responseRate,
      lastDonationDate: donor.lastDonationDate,
      verificationStatus: donor.verificationStatus,
      createdAt: donor.createdAt,
    },
  });
}

// PATCH /api/donors/[id] — update donor's own availability / profile
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const donor = await db.donor.findUnique({ where: { id } });
  if (!donor) return Response.json({ error: "Donor not found." }, { status: 404 });
  if (donor.userId !== user.id) {
    return Response.json({ error: "You are not authorized to update this profile." }, { status: 403 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (typeof body.available === "boolean") data.available = body.available;
  if (typeof body.bloodGroup === "string" && BLOOD_GROUPS.includes(body.bloodGroup)) data.bloodGroup = body.bloodGroup;
  if (typeof body.region === "string") data.region = body.region;
  if (typeof body.lat === "number" && typeof body.lng === "number") {
    data.lat = body.lat;
    data.lng = body.lng;
  }
  if (typeof body.address === "string") data.address = body.address;

  const updated = await db.donor.update({ where: { id }, data });
  await audit(user.id, "UPDATE_DONOR", "Donor", id, JSON.stringify(data));

  return Response.json({ donor: { id: updated.id, available: updated.available, bloodGroup: updated.bloodGroup } });
}
