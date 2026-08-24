import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { REGIONS } from "@/lib/types";

// POST /api/hospitals/profile
// Create OR update the current hospital's own profile (upsert by userId).
// Used by newly-registered hospitals to complete their facility details.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "HOSPITAL") {
    return Response.json({ error: "Only hospital accounts can manage a hospital profile." }, { status: 403 });
  }

  const body = await req.json();
  const { name, lat, lng, region, address, phone, licenseNumber } = body ?? {};

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return Response.json({ error: "Please provide a valid hospital name." }, { status: 400 });
  }
  if (typeof lat !== "number" || typeof lng !== "number" || Number.isNaN(lat) || Number.isNaN(lng)) {
    return Response.json({ error: "Location unavailable. Please set the hospital location on the map." }, { status: 400 });
  }
  if (!region || !REGIONS.includes(region)) {
    return Response.json({ error: "Please select a valid region." }, { status: 400 });
  }

  const roundedLat = Math.round(lat * 1000) / 1000;
  const roundedLng = Math.round(lng * 1000) / 1000;

  const existing = await db.hospital.findUnique({ where: { userId: user.id } });

  const data = {
    name: String(name).trim(),
    lat: roundedLat,
    lng: roundedLng,
    region,
    address: address ? String(address) : `${region}, Tamil Nadu`,
    phone: phone ? String(phone) : null,
    licenseNumber: licenseNumber ? String(licenseNumber) : null,
  };

  let hospital;
  if (existing) {
    hospital = await db.hospital.update({ where: { id: existing.id }, data });
    await audit(user.id, "UPDATE_HOSPITAL_PROFILE", "Hospital", hospital.id, JSON.stringify({ name, region }));
  } else {
    hospital = await db.hospital.create({
      data: { userId: user.id, ...data, verificationStatus: "PENDING" },
    });
    await audit(user.id, "CREATE_HOSPITAL_PROFILE", "Hospital", hospital.id, JSON.stringify({ name, region }));
  }

  return Response.json({
    hospital: {
      id: hospital.id,
      name: hospital.name,
      region: hospital.region,
      lat: hospital.lat,
      lng: hospital.lng,
      address: hospital.address,
      phone: hospital.phone,
      verificationStatus: hospital.verificationStatus,
    },
  });
}
