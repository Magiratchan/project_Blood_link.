import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, createSession, setSessionCookie, AVATAR_COLORS } from "@/lib/auth";
import { ROLES, VERIFICATION } from "@/lib/types";
import { audit, rateLimit } from "@/lib/audit";

const VALID_ROLES = [ROLES.DONOR, ROLES.HOSPITAL, ROLES.BLOOD_BANK];

export async function POST(req: NextRequest) {
  if (!rateLimit("register", 10, 60_000)) {
    return Response.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }
  try {
    const body = await req.json();
    const { email, password, name, role, phone } = body ?? {};

    if (!email || !password || !name || !role) {
      return Response.json({ error: "Please provide a valid email, password, name, and role." }, { status: 400 });
    }
    if (password.length < 6) {
      return Response.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }
    if (!VALID_ROLES.includes(role)) {
      return Response.json({ error: "Invalid role selected." }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { email: String(email).toLowerCase() } });
    if (existing) {
      return Response.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const passwordHash = await hashPassword(String(password));
    // Hospitals and blood banks require admin verification; donors auto-verified for demo.
    const verificationStatus = role === ROLES.DONOR ? VERIFICATION.VERIFIED : VERIFICATION.PENDING;

    const user = await db.user.create({
      data: {
        email: String(email).toLowerCase(),
        passwordHash,
        name: String(name),
        role,
        phone: phone ? String(phone) : null,
        verificationStatus,
        avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      },
    });

    await audit(user.id, "REGISTER", "User", user.id, `Role: ${role}`);

    const token = await createSession(user.id);
    await setSessionCookie(token);

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
    console.error("register error", e);
    return Response.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}
