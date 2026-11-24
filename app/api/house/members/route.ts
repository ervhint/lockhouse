import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { cardProblem, houseIdOf, NO_PADLOCK } from "@/lib/house";
import { isAddress, NOT_ADDRESS } from "@/lib/keys";
import { SESSION, unseal } from "@/lib/session";

const refuse = (error: string, status = 400) => Response.json({ error }, { status });
const SAID = {
  here: "They are already in your house.",
  taken: "They are already in another house. Nothing was changed.",
  unknown: NO_PADLOCK,
} as Record<string, string>;

// Add Member (S-06): their saved card is checked against the chain first, then they move into my house (AC-4.3–4.8).
export async function POST(req: NextRequest) {
  const me = unseal(SESSION, req.cookies.get(SESSION)?.value);
  if (!me) return refuse("Sign in first.", 401);
  const house = await houseIdOf(me);
  if (!house) return refuse("You are not in a house.", 403);

  const { address } = await req.json().catch(() => ({}));
  if (typeof address !== "string" || !isAddress(address)) return refuse(NOT_ADDRESS);
  const { data: them, error } = await db().from("people").select("name, card").eq("address", address).maybeSingle();
  if (error) throw error;
  if (!them) return refuse(NO_PADLOCK); // never signed in, so no card to check

  const problem = await cardProblem(them.card).catch(() => "Can't reach QoreChain to check their card. Nothing was added. Try again.");
  if (problem) return refuse(problem);
  const { data: result, error: failed } = await db().rpc("add_member", { p_house: house, p_address: address, p_by: me });
  if (failed) throw failed;
  if (result !== "added") return refuse(SAID[result]);
  return Response.json({ member: { name: them.name, address } });
}
