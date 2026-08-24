import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { BLOOD_GROUPS } from "@/lib/types";

// GET /api/inventory?region=&bloodGroup=
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = req.nextUrl;
  const region = url.searchParams.get("region") ?? undefined;
  const bloodGroup = url.searchParams.get("bloodGroup") ?? undefined;

  const items = await db.bloodInventory.findMany({
    where: {
      ...(region ? { region } : {}),
      ...(bloodGroup ? { bloodGroup } : {}),
    },
    include: { bloodBank: { select: { name: true } } },
    orderBy: [{ region: "asc" }, { bloodGroup: "asc" }],
  });

  // Aggregate totals per blood group across all banks (for the dashboard)
  const totals: Record<string, number> = {};
  for (const bg of BLOOD_GROUPS) totals[bg] = 0;
  for (const item of items) totals[item.bloodGroup] = (totals[item.bloodGroup] ?? 0) + item.units;

  return Response.json({ inventory: items, totals });
}

// POST /api/inventory — blood bank updates units for a blood group
// Body: { bloodGroup, units, region?, bloodBankId? }
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "BLOOD_BANK" && user.role !== "ADMIN") {
    return Response.json({ error: "You are not authorized to update inventory." }, { status: 403 });
  }

  const body = await req.json();
  const { bloodGroup, units, region } = body ?? {};
  if (!bloodGroup || !BLOOD_GROUPS.includes(bloodGroup)) {
    return Response.json({ error: "Please provide a valid blood group." }, { status: 400 });
  }
  if (typeof units !== "number" || units < 0) {
    return Response.json({ error: "Please provide a valid units count." }, { status: 400 });
  }

  let bloodBank = await db.bloodBank.findUnique({ where: { userId: user.id } });
  if (!bloodBank && user.role === "ADMIN") {
    // admin can target a specific bank
    const bbId = body.bloodBankId;
    if (bbId) bloodBank = await db.bloodBank.findUnique({ where: { id: bbId } });
    if (!bloodBank) bloodBank = await db.bloodBank.findFirst();
  }
  if (!bloodBank) return Response.json({ error: "Blood bank profile not found." }, { status: 404 });

  const updated = await db.bloodInventory.upsert({
    where: { bloodBankId_bloodGroup: { bloodBankId: bloodBank.id, bloodGroup } },
    create: {
      bloodBankId: bloodBank.id,
      bloodGroup,
      units,
      lowThreshold: 10,
      region: region || bloodBank.region,
    },
    update: { units, lastUpdated: new Date(), region: region || bloodBank.region },
  });

  await audit(user.id, "UPDATE_INVENTORY", "BloodInventory", updated.id, `${bloodGroup} = ${units} units`);
  return Response.json({ inventory: updated });
}
