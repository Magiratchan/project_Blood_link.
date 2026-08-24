import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { REGIONS } from "@/lib/types";

// POST /api/blood-banks/profile
// Create OR update the current blood bank's own profile (upsert by userId).
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "BLOOD_BANK") {
    return Response.json({ error: "Only blood bank accounts can manage a blood bank profile." }, { status: 403 });
  }

  const body = await req.json();
  const { name, lat, lng, region, address, phone, licenseNumber } = body ?? {};

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return Response.json({ error: "Please provide a valid blood bank name." }, { status: 400 });
  }
  if (typeof lat !== "number" || typeof lng !== "number" || Number.isNaN(lat) || Number.isNaN(lng)) {
    return Response.json({ error: "Location unavailable. Please set the blood bank location on the map." }, { status: 400 });
  }
  if (!region || !REGIONS.includes(region)) {
    return Response.json({ error: "Please select a valid region." }, { status: 400 });
  }

  const roundedLat = Math.round(lat * 1000) / 1000;
  const roundedLng = Math.round(lng * 1000) / 1000;

  const existing = await db.bloodBank.findUnique({ where: { userId: user.id } });

  const data = {
    name: String(name).trim(),
    lat: roundedLat,
    lng: roundedLng,
    region,
    address: address ? String(address) : `${region}, Tamil Nadu`,
    phone: phone ? String(phone) : null,
    licenseNumber: licenseNumber ? String(licenseNumber) : null,
  };

  let bloodBank;
  if (existing) {
    bloodBank = await db.bloodBank.update({ where: { id: existing.id }, data });
    await audit(user.id, "UPDATE_BLOODBANK_PROFILE", "BloodBank", bloodBank.id, JSON.stringify({ name, region }));
  } else {
    bloodBank = await db.bloodBank.create({
      data: { userId: user.id, ...data, verificationStatus: "PENDING" },
    });
    await audit(user.id, "CREATE_BLOODBANK_PROFILE", "BloodBank", bloodBank.id, JSON.stringify({ name, region }));
  }

  return Response.json({
    bloodBank: {
      id: bloodBank.id,
      name: bloodBank.name,
      region: bloodBank.region,
      lat: bloodBank.lat,
      lng: bloodBank.lng,
      address: bloodBank.address,
      phone: bloodBank.phone,
      verificationStatus: bloodBank.verificationStatus,
    },
  });
}
