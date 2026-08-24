import { NextRequest } from "next/server";
import { clearSessionCookie, getCurrentUser, destroySession } from "@/lib/auth";
import { cookies } from "next/headers";
import { audit } from "@/lib/audit";

export async function POST(_req: NextRequest) {
  const user = await getCurrentUser();
  const store = await cookies();
  const token = store.get("bloodlink_session")?.value;
  if (token) await destroySession(token);
  await clearSessionCookie();
  if (user) await audit(user.id, "LOGOUT", "User", user.id);
  return Response.json({ ok: true });
}
