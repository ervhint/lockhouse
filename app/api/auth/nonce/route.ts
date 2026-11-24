import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { NONCE, seal } from "@/lib/session";

// A fresh nonce for one sign-in, also kept in a signed cookie for 10 minutes (D-06).
export function GET() {
  const nonce = randomBytes(16).toString("hex");
  const res = NextResponse.json({ nonce });
  res.cookies.set(NONCE, seal(NONCE, nonce, 600), { httpOnly: true, sameSite: "lax", path: "/api/auth", maxAge: 600 });
  return res;
}
