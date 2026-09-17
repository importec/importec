import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { UserRole } from "@/generated/prisma/enums";

const SESSION_COOKIE = "session";
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 horas de jornada laboral

const secretKey = process.env.SESSION_SECRET;
if (!secretKey) {
  throw new Error("Falta la variable de entorno SESSION_SECRET");
}
const encodedKey = new TextEncoder().encode(secretKey);

export type SessionPayload = {
  userId: string;
  role: UserRole;
  name: string;
  expiresAt: number;
};

async function encrypt(payload: SessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(new Date(payload.expiresAt))
    .sign(encodedKey);
}

async function decrypt(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSession(user: {
  id: string;
  role: UserRole;
  name: string;
}) {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const token = await encrypt({
    userId: user.id,
    role: user.role,
    name: user.name,
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(expiresAt),
    path: "/",
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/**
 * Lee y valida la sesion actual. Memoizada por render (React cache) para no
 * repetir la verificacion del JWT en cada Server Component de la misma request.
 */
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = await decrypt(token);
  if (!session || session.expiresAt < Date.now()) return null;
  return session;
});

/** Exige sesion valida o redirige a /login. Usar en paginas y layouts protegidos. */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}
