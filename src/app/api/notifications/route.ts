import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/notifications — current user's notifications
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = req.nextUrl;
  const unreadOnly = url.searchParams.get("unread") === "true";
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 200);

  const notifications = await db.notification.findMany({
    where: {
      userId: user.id,
      ...(unreadOnly ? { read: false } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const unreadCount = await db.notification.count({ where: { userId: user.id, read: false } });
  return Response.json({ notifications, unreadCount });
}

// PATCH /api/notifications — mark read
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { id, all } = body ?? {};
  if (all) {
    await db.notification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } });
    return Response.json({ ok: true });
  }
  if (id) {
    await db.notification.updateMany({ where: { id, userId: user.id }, data: { read: true } });
    return Response.json({ ok: true });
  }
  return Response.json({ error: "Provide id or all=true." }, { status: 400 });
}
