import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { BLOOD_GROUPS, REGIONS } from "@/lib/types";

// POST /api/donors/profile
// Create OR update the current donor's own profile (upsert by userId).
// Used by newly-registered donors to complete their profile, and by existing
// donors to edit their details.
//
// Body:
//   bloodGroup      (required) — one of A+ A- B+ B- AB+ AB- O+ O-
//   lat, lng        (required) — approximate location (privacy-preserving)
//   region          (required) — one of the supported regions
//   address         (optional) — city/region-level only, never exact street
//   dateOfBirth     (optional) — ISO date string
//   gender          (optional) — "male" | "female" | "other"
//   healthNotes     (optional) — medical details, conditions, medications
//   lastDonationDate (optional) — ISO date string
//   available       (optional) — boolean
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "DONOR") {
    return Response.json({ error: "Only donor accounts can manage a donor profile." }, { status: 403 });
  }

  const body = await req.json();
  const { bloodGroup, lat, lng, region, address, dateOfBirth, gender, healthNotes, lastDonationDate, available } = body ?? {};

  // ---- Validation ----
  if (!bloodGroup || !BLOOD_GROUPS.includes(bloodGroup)) {
    return Response.json({ error: "Please select a valid blood group." }, { status: 400 });
  }
  if (typeof lat !== "number" || typeof lng !== "number" || Number.isNaN(lat) || Number.isNaN(lng)) {
    return Response.json({ error: "Location unavailable. Please set your approximate location on the map." }, { status: 400 });
  }
  if (!region || !REGIONS.includes(region)) {
    return Response.json({ error: "Please select a valid region." }, { status: 400 });
  }
  // Validate optional fields
  let dob: Date | null = null;
  if (dateOfBirth) {
    dob = new Date(dateOfBirth);
    if (Number.isNaN(dob.getTime())) {
      return Response.json({ error: "Invalid date of birth." }, { status: 400 });
    }
    // sanity: not in the future, not more than 100 years ago
    if (dob > new Date() || dob < new Date(Date.now() - 100 * 365 * 86400000)) {
      return Response.json({ error: "Please provide a valid date of birth." }, { status: 400 });
    }
  }
  let lastDonation: Date | null = null;
  if (lastDonationDate) {
    lastDonation = new Date(lastDonationDate);
    if (Number.isNaN(lastDonation.getTime()) || lastDonation > new Date()) {
      return Response.json({ error: "Invalid last donation date." }, { status: 400 });
    }
  }
  if (gender && !["male", "female", "other"].includes(gender)) {
    return Response.json({ error: "Invalid gender value." }, { status: 400 });
  }

  // ---- Upsert ----
  // Round coordinates to ~100m precision for privacy
  const roundedLat = Math.round(lat * 1000) / 1000;
  const roundedLng = Math.round(lng * 1000) / 1000;

  const existing = await db.donor.findUnique({ where: { userId: user.id } });

  const data = {
    bloodGroup,
    lat: roundedLat,
    lng: roundedLng,
    region,
    address: address ? String(address) : `${region}, Tamil Nadu`,
    dateOfBirth: dob,
    gender: gender ?? null,
    healthNotes: healthNotes ? String(healthNotes) : null,
    lastDonationDate: lastDonation,
    available: typeof available === "boolean" ? available : existing?.available ?? true,
  };

  let donor;
  if (existing) {
    donor = await db.donor.update({ where: { id: existing.id }, data });
    await audit(user.id, "UPDATE_DONOR_PROFILE", "Donor", donor.id, JSON.stringify({ bloodGroup, region, lat: roundedLat, lng: roundedLng }));
  } else {
    donor = await db.donor.create({
      data: {
        userId: user.id,
        ...data,
        // New self-registered donors start as VERIFIED (demo-friendly).
        // In production, this would be PENDING until a blood-bank confirms.
        verificationStatus: "VERIFIED",
      },
    });
    await audit(user.id, "CREATE_DONOR_PROFILE", "Donor", donor.id, JSON.stringify({ bloodGroup, region, lat: roundedLat, lng: roundedLng }));
  }

  return Response.json({
    donor: {
      id: donor.id,
      bloodGroup: donor.bloodGroup,
      available: donor.available,
      region: donor.region,
      lat: donor.lat,
      lng: donor.lng,
      address: donor.address,
      dateOfBirth: donor.dateOfBirth,
      gender: donor.gender,
      healthNotes: donor.healthNotes,
      lastDonationDate: donor.lastDonationDate,
      donationCount: donor.donationCount,
      responseRate: donor.responseRate,
      totalRequests: donor.totalRequests,
      acceptedCount: donor.acceptedCount,
      declinedCount: donor.declinedCount,
      verificationStatus: donor.verificationStatus,
    },
  });
}
