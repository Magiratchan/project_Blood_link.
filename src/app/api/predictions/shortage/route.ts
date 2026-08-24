import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { predictShortage } from "@/lib/ai/prediction";
import { BLOOD_GROUPS, REGIONS } from "@/lib/types";
import type { BloodGroup } from "@/lib/types";

// GET /api/predictions/shortage?region=&bloodGroup=
// Returns stored shortage predictions (or computes fresh ones).
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = req.nextUrl;
  const region = url.searchParams.get("region") ?? undefined;
  const bloodGroup = url.searchParams.get("bloodGroup") as BloodGroup | null;

  let where: Record<string, unknown> = {};
  if (region) where.region = region;
  if (bloodGroup && BLOOD_GROUPS.includes(bloodGroup)) where.bloodGroup = bloodGroup;

  const stored = await db.shortagePrediction.findMany({
    where,
    orderBy: [{ region: "asc" }, { bloodGroup: "asc" }],
  });

  // Attach current inventory for convenience
  const inventory = await db.bloodInventory.findMany();
  const invMap = new Map<string, number>();
  for (const i of inventory) {
    const key = `${i.region}-${i.bloodGroup}`;
    invMap.set(key, (invMap.get(key) ?? 0) + i.units);
  }

  const predictions = stored.map((p) => ({
    id: p.id,
    region: p.region,
    bloodGroup: p.bloodGroup,
    predictedDate: p.predictedDate,
    shortageRisk: p.shortageRisk,
    expectedDemand: p.expectedDemand,
    expectedUnits: p.expectedUnits,
    availableUnits: invMap.get(`${p.region}-${p.bloodGroup}`) ?? 0,
    recommendation: p.recommendation,
    confidence: p.confidence,
    method: p.method,
    isSynthetic: p.isSynthetic,
  }));

  return Response.json({
    predictions,
    isSynthetic: true,
    disclaimer: "Statistical forecast — not medically validated. Decision support only.",
  });
}
