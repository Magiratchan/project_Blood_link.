import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, createSession, setSessionCookie } from "@/lib/auth";
import { audit, rateLimit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  if (!rateLimit("login", 15, 60_000)) {
    return Response.json({ error: "Too many login attempts. Please try again later." }, { status: 429 });
  }
  try {
    const body = await req.json();
    const { email, password } = body ?? {};
    if (!email || !password) {
      return Response.json({ error: "Please provide email and password." }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email: String(email).toLowerCase() } });
    if (!user || !user.isActive) {
      return Response.json({ error: "Invalid email or password." }, { status: 401 });
    }
    const ok = await verifyPassword(String(password), user.passwordHash);
    if (!ok) {
      await audit(user.id, "LOGIN_FAILED", "User", user.id);
      return Response.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const token = await createSession(user.id);
    await setSessionCookie(token);
    await audit(user.id, "LOGIN", "User", user.id);

    return Response.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        verificationStatus: user.verificationStatus,
      },
    });
  } catch (e) {
    console.error("login error", e);
    return Response.json({ error: "Login failed. Please try again." }, { status: 500 });
  }
}
