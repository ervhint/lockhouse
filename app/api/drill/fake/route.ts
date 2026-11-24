import type { NextRequest } from "next/server";
import { envelopeFromText } from "@qorechain/qoreseal";
import { db } from "@/lib/db";
import { houseOf } from "@/lib/house";
import { NOTE, lockCopy, signItem } from "@/lib/items";
import { keysFrom, makeWords } from "@/lib/keys";
import { SESSION, unseal } from "@/lib/session";
import { REST } from "@/lib/settings";

const refuse = (error: string, status = 400) => Response.json({ error }, { status });

// Try a Fake Drop-In (AC-8.1, Simulation): this route plays our server after a hack. It has no member's keys,
// so it signs with a throwaway key, then stores the paper as if another member of my house sent it, for me to open.
export async function POST(req: NextRequest) {
  const me = unseal(SESSION, req.cookies.get(SESSION)?.value);
  if (!me) return refuse("Sign in first.", 401);
  const house = await houseOf(me);
  if (!house) return refuse("You are not in a house.", 403);
  const mine = house.members.find((m) => m.address === me);
  const claimed = house.members.find((m) => m.address !== me);
  if (!mine || !claimed) return refuse("Add someone to your house first: the fake paper says it is from them.");

  const title = "Fake Drop-In (Simulation)";
  const bytes = new TextEncoder().encode(`This paper says it is from ${claimed.name}. It was made by the Q-Day Drill, pretending our server was hacked, and signed with a key that is not ${claimed.name}'s.`);
  const copy = await lockCopy({ ...NOTE, bytes }, [mine.card], REST);
  const signature = await signItem(keysFrom(makeWords()), house.id, copy.id, title, copy.envelope);

  const { error } = await db().from("items").insert({ id: copy.id, house_id: house.id, sender: claimed.address, title, envelope: copy.envelope, signature, readers: copy.readers, size: envelopeFromText(copy.envelope).length });
  if (error) throw error;
  return Response.json({ id: copy.id });
}
