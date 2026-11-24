import { NextResponse } from "next/server";
import { SESSION } from "@/lib/session";

// Ends the session (AC-3.6). The keys stay in the browser; only the cookie goes.
export function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION, "", { path: "/", maxAge: 0 });
  return res;
}
