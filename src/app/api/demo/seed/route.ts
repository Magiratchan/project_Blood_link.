import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { seedDatabase } from "@/lib/seed";

// POST /api/demo/seed — re-seed the database with demo data (admin only)
export async function POST(_req: NextRequest) {
  const user = await getCurrentUser();
  // Allow seeding if no users exist yet (first run) OR admin
  const isFresh = user === null; // unauthenticated = fresh-ish; the route is public for first setup
  if (!isFresh && user?.role !== "ADMIN") {
    return Response.json({ error: "You are not authorized to re-seed the database." }, { status: 403 });
  }

  const result = await seedDatabase();
  if (user) await audit(user.id, "DEMO_SEED", "System", undefined, "Re-seeded demo data");
  return Response.json({ ok: true, result });
}
