import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { BLOOD_GROUPS, URGENCY } from "@/lib/types";

// GET /api/blood-requests?status=&urgency=&hospitalId=&region=&limit=
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = req.nextUrl;
  const status = url.searchParams.get("status") ?? undefined;
  const urgency = url.searchParams.get("urgency") ?? undefined;
  const hospitalId = url.searchParams.get("hospitalId") ?? undefined;
  const region = url.searchParams.get("region") ?? undefined;
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 200);

  // Donors only see requests relevant to their blood compatibility + region.
  let where: Record<string, unknown> = {};
  if (user.role === "DONOR") {
    const donor = await db.donor.findUnique({ where: { userId: user.id } });
    if (!donor) return Response.json({ requests: [] });
    where = {
      status: { in: ["PENDING", "MATCHING", "DONOR_FOUND", "PARTIALLY_FULFILLED"] },
      region: donor.region,
    };
  } else if (user.role === "HOSPITAL") {
    const hospital = await db.hospital.findUnique({ where: { userId: user.id } });
    where = hospital ? { hospitalId: hospital.id } : {};
  }
  if (status) where.status = status;
  if (urgency) where.urgency = urgency;
  if (hospitalId) where.hospitalId = hospitalId;
  if (region) where.region = region;

  const requests = await db.bloodRequest.findMany({
    where,
    include: {
      hospital: { select: { id: true, name: true, address: true } },
      matchingResults: {
        orderBy: { rank: "asc" },
        take: 5,
        include: { donor: { include: { user: { select: { name: true } } } } },
      },
      notificationEvents: { orderBy: { chainOrder: "asc" }, include: { donor: { include: { user: { select: { name: true } } } } } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return Response.json({ requests });
}

// POST /api/blood-requests — hospital creates an emergency request
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "HOSPITAL") {
    return Response.json({ error: "You are not authorized to create emergency blood requests." }, { status: 403 });
  }

  const body = await req.json();
  const { bloodGroup, unitsRequired, urgency, requiredBy, notes, lat, lng, address, region, patientCondition } = body ?? {};

  if (!bloodGroup || !BLOOD_GROUPS.includes(bloodGroup)) {
    return Response.json({ error: "Please provide a valid blood group." }, { status: 400 });
  }
  const units = parseInt(unitsRequired, 10);
  if (!units || units < 1 || units > 20) {
    return Response.json({ error: "Please provide a valid number of units (1-20)." }, { status: 400 });
  }
  if (!urgency || !Object.values(URGENCY).includes(urgency)) {
    return Response.json({ error: "Please provide a valid emergency level." }, { status: 400 });
  }

  const hospital = await db.hospital.findUnique({ where: { userId: user.id } });
  if (!hospital) return Response.json({ error: "Hospital profile not found." }, { status: 404 });
  if (hospital.verificationStatus !== "VERIFIED") {
    return Response.json({ error: "Your hospital is not yet verified by BloodLink admin." }, { status: 403 });
  }

  const requestLat = typeof lat === "number" ? lat : hospital.lat;
  const requestLng = typeof lng === "number" ? lng : hospital.lng;
  const requestRegion = region || hospital.region;
  const requestAddress = address || hospital.address;

  const deadline = requiredBy ? new Date(requiredBy) : new Date(Date.now() + 2 * 3600000);

  // Generate a friendly request id
  const count = await db.bloodRequest.count();
  const requestId = `BL-REQ-${String(1001 + count).padStart(4, "0")}`;

  const bloodRequest = await db.bloodRequest.create({
    data: {
      requestId,
      hospitalId: hospital.id,
      bloodGroup,
      unitsRequired: units,
      unitsFulfilled: 0,
      urgency,
      requiredBy: deadline,
      notes: notes ?? null,
      lat: requestLat,
      lng: requestLng,
      address: requestAddress,
      region: requestRegion,
      patientCondition: patientCondition ?? null,
      status: "PENDING",
    },
    include: { hospital: { select: { name: true, address: true } } },
  });

  await audit(user.id, "CREATE_REQUEST", "BloodRequest", bloodRequest.id, `${requestId} ${bloodGroup} x${units} ${urgency}`);

  return Response.json({ request: bloodRequest }, { status: 201 });
}
