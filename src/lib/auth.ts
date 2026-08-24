import { cookies } from "next/headers";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import type { SessionUser, Role } from "@/lib/types";
import { ROLES, VERIFICATION } from "@/lib/types";

const SESSION_COOKIE = "bloodlink_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function randomToken(): string {
  return (
    Math.random().toString(36).slice(2) +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2)
  );
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string): Promise<string> {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.session.create({
    data: { token, userId, expiresAt },
  });
  return token;
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export function getSessionToken(): string | undefined {
  // next/headers cookies() is async in Next 15+. We handle both shapes.
  const store = cookies();
  // store is a Thenable in Next 15; support sync access when possible
  const resolved = typeof (store as unknown as Promise<unknown>).then === "function" ? null : store;
  if (resolved) {
    return (resolved as { get: (n: string) => { value: string } | undefined }).get(SESSION_COOKIE)?.value;
  }
  return undefined;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = await (async () => {
    const store = await cookies();
    return store.get(SESSION_COOKIE)?.value;
  })();
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  if (!session.user.isActive) return null;

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role as Role,
    verificationStatus: session.user.verificationStatus,
    isActive: session.user.isActive,
  };
}

export async function destroySession(token: string) {
  await db.session.deleteMany({ where: { token } }).catch(() => {});
}

// Role-based route guard helper for API routes
export async function requireRole(...roles: Role[]): Promise<{ user: SessionUser } | { error: Response }> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      error: Response.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  if (!roles.includes(user.role)) {
    return {
      error: Response.json({ error: "You are not authorized to perform this action." }, { status: 403 }),
    };
  }
  return { user };
}

export const AVATAR_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#10b981",
  "#06b6d4", "#8b5cf6", "#ec4899", "#14b8a6", "#f43f5e",
];
