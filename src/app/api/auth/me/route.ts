import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) return Response.json({ user: null });

  const user = await db.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      verificationStatus: true,
      isActive: true,
      avatarColor: true,
    },
  });
  if (!user) return Response.json({ user: null });

  // Attach the role-specific profile id so the UI can navigate.
  let profile: Record<string, unknown> = {};
  if (user.role === "DONOR") {
    const donor = await db.donor.findUnique({
      where: { userId: user.id },
      select: { id: true, bloodGroup: true, available: true, region: true, lat: true, lng: true, responseRate: true, donationCount: true, verificationStatus: true, lastDonationDate: true },
    });
    profile = { donor };
  } else if (user.role === "HOSPITAL") {
    const hospital = await db.hospital.findUnique({
      where: { userId: user.id },
      select: { id: true, name: true, region: true, lat: true, lng: true, verificationStatus: true, address: true },
    });
    profile = { hospital };
  } else if (user.role === "BLOOD_BANK") {
    const bloodBank = await db.bloodBank.findUnique({
      where: { userId: user.id },
      select: { id: true, name: true, region: true, lat: true, lng: true, verificationStatus: true, address: true },
    });
    profile = { bloodBank };
  }

  return Response.json({ user: { ...user, ...profile } });
}
