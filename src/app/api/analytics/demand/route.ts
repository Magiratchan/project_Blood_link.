import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { BLOOD_GROUPS, REGIONS } from "@/lib/types";

// GET /api/analytics/demand?region=&bloodGroup=&days=
// Returns historical demand series for charts.
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = req.nextUrl;
  const region = url.searchParams.get("region") ?? undefined;
  const bloodGroup = url.searchParams.get("bloodGroup") ?? undefined;
  const days = Math.min(parseInt(url.searchParams.get("days") ?? "90", 10) || 90, 365);

  const since = new Date(Date.now() - days * 86400000);
  const records = await db.demandHistory.findMany({
    where: {
      date: { gte: since },
      ...(region ? { region } : {}),
      ...(bloodGroup ? { bloodGroup } : {}),
    },
    orderBy: { date: "asc" },
  });

  // Aggregate per day (across selected region/bloodGroup)
  const byDay = new Map<string, { requested: number; fulfilled: number }>();
  for (const r of records) {
    const key = new Date(r.date).toISOString().slice(0, 10);
    const entry = byDay.get(key) ?? { requested: 0, fulfilled: 0 };
    entry.requested += r.unitsRequested;
    entry.fulfilled += r.unitsFulfilled;
    byDay.set(key, entry);
  }
  const series = Array.from(byDay.entries()).map(([date, v]) => ({ date, ...v }));

  // By blood group totals
  const byGroup: Record<string, number> = {};
  for (const bg of BLOOD_GROUPS) byGroup[bg] = 0;
  for (const r of records) byGroup[r.bloodGroup] = (byGroup[r.bloodGroup] ?? 0) + r.unitsRequested;

  // By region totals
  const byRegion: Record<string, number> = {};
  for (const reg of REGIONS) byRegion[reg] = 0;
  for (const r of records) byRegion[r.region] = (byRegion[r.region] ?? 0) + r.unitsRequested;

  return Response.json({
    series,
    byGroup: Object.entries(byGroup).map(([group, units]) => ({ group, units })),
    byRegion: Object.entries(byRegion).map(([region, units]) => ({ region, units })),
    isSynthetic: true,
  });
}
