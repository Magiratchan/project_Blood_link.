import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { BLOOD_GROUPS } from "@/lib/types";

// GET /api/analytics/inventory?region=
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = req.nextUrl;
  const region = url.searchParams.get("region") ?? undefined;

  const items = await db.bloodInventory.findMany({
    where: region ? { region } : {},
    include: { bloodBank: { select: { name: true } } },
  });

  const totals: Record<string, number> = {};
  for (const bg of BLOOD_GROUPS) totals[bg] = 0;
  for (const item of items) totals[item.bloodGroup] = (totals[item.bloodGroup] ?? 0) + item.units;

  const lowStock = items.filter((i) => i.units <= i.lowThreshold);

  return Response.json({
    items,
    totals: Object.entries(totals).map(([group, units]) => ({ group, units })),
    totalUnits: Object.values(totals).reduce((a, b) => a + b, 0),
    lowStock,
  });
}
