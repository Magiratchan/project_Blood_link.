// Audit logging + simple in-memory rate limiter.

import { db } from "@/lib/db";
import { headers } from "next/headers";

export async function audit(
  userId: string | null,
  action: string,
  resource: string,
  resourceId?: string,
  details?: string,
  severity: "INFO" | "WARNING" | "CRITICAL" = "INFO"
) {
  try {
    const h = await headers();
    const ipAddress = h.get("x-forwarded-for") || h.get("x-real-ip") || undefined;
    await db.auditLog.create({
      data: { userId, action, resource, resourceId, details, ipAddress, severity },
    });
  } catch {
    // audit failures should never break the request
  }
}

// ---- Simple in-memory rate limiter (per-IP) ----
// NOTE: Resets on server restart. Sufficient for hackathon/demo rate limiting.
const windowMs = 60_000;
const maxRequests = 60;
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit = maxRequests, window = windowMs): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + window });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}
