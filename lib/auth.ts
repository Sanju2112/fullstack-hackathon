import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "development-only-change-me");
export type Session = { userId: string; email: string; name: string };

export async function createToken(session: Session) {
  return new SignJWT(session).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(secret);
}
export async function getSession(request: NextRequest): Promise<Session | null> {
  const token = request.cookies.get("wellnest_token")?.value;
  if (!token) return null;
  try { return (await jwtVerify(token, secret)).payload as unknown as Session; } catch { return null; }
}
