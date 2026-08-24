import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";

// GET /api/users — admin lists all users (with role profiles)
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") {
    return Response.json({ error: "You are not authorized to view users." }, { status: 403 });
  }

  const url = req.nextUrl;
  const role = url.searchParams.get("role") ?? undefined;
  const verificationStatus = url.searchParams.get("verificationStatus") ?? undefined;
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "100", 10) || 100, 500);

  const users = await db.user.findMany({
    where: {
      ...(role ? { role } : {}),
      ...(verificationStatus ? { verificationStatus } : {}),
    },
    include: {
      donor: { select: { id: true, bloodGroup: true, region: true, available: true } },
      hospital: { select: { id: true, name: true, region: true } },
      bloodBank: { select: { id: true, name: true, region: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return Response.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      phone: u.phone,
      verificationStatus: u.verificationStatus,
      isActive: u.isActive,
      createdAt: u.createdAt,
      donor: u.donor,
      hospital: u.hospital,
      bloodBank: u.bloodBank,
    })),
  });
}

// PATCH /api/users — admin verifies / suspends / rejects a user
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") {
    return Response.json({ error: "You are not authorized to manage users." }, { status: 403 });
  }

  const body = await req.json();
  const { id, action } = body ?? {};
  if (!id || !["verify", "reject", "suspend", "activate"].includes(action)) {
    return Response.json({ error: "Invalid action." }, { status: 400 });
  }

  const statusMap = { verify: "VERIFIED", reject: "REJECTED", suspend: "SUSPENDED", activate: "VERIFIED" } as const;
  const updated = await db.user.update({
    where: { id },
    data: {
      verificationStatus: statusMap[action as keyof typeof statusMap],
      isActive: action !== "suspend",
    },
  });
  await audit(user.id, action.toUpperCase(), "User", id, `set verificationStatus=${updated.verificationStatus}, isActive=${updated.isActive}`);
  return Response.json({ user: { id: updated.id, verificationStatus: updated.verificationStatus, isActive: updated.isActive } });
}
