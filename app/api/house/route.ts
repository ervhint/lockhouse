import type { NextRequest } from "next/server";
import { houseOf } from "@/lib/house";
import { SESSION, unseal } from "@/lib/session";

// The House screen's data (S-05): the house you are in. Members only (AC-3.5, AC-4.8).
export async function GET(req: NextRequest) {
  const me = unseal(SESSION, req.cookies.get(SESSION)?.value);
  if (!me) return Response.json({ error: "Sign in first." }, { status: 401 });
  const house = await houseOf(me);
  if (!house) return Response.json({ error: "You are not in a house." }, { status: 403 });
  return Response.json({ ...house, me });
}
