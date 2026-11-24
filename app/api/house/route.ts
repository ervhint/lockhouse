import type { NextRequest } from "next/server";
import { house } from "@/lib/mock";
import { SESSION, unseal } from "@/lib/session";

// BFF route for the House screen (S-05). Members only (AC-3.5). Mock data until U4 reads Supabase here.
export async function GET(req: NextRequest) {
  if (!unseal(SESSION, req.cookies.get(SESSION)?.value)) return new Response("Sign in first", { status: 401 });
  return Response.json(house);
}
