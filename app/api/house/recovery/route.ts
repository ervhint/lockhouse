import type { NextRequest } from "next/server";
import { fromHex, validateMlkemPublicKey, validateX25519PublicKey } from "@qorechain/qoreseal";
import { verifyMessageWithChain } from "@qorechain/qoresign/network";
import { db } from "@/lib/db";
import { houseIdOf } from "@/lib/house";
import { recoveryText } from "@/lib/recovery";
import { SESSION, unseal } from "@/lib/session";
import { CHAIN_ID, REST } from "@/lib/settings";

const refuse = (error: string, status = 400) => Response.json({ error }, { status });
const FIELDS = ["lookup", "mlkem", "signature", "x25519"];
const HEX64 = /^[0-9a-f]{64}$/;

// Give the house its recovery key (U10): the public half only, signed by the member who made it. Once per house.
export async function POST(req: NextRequest) {
  const me = unseal(SESSION, req.cookies.get(SESSION)?.value);
  if (!me) return refuse("Sign in first.", 401);
  const house = await houseIdOf(me);
  if (!house) return refuse("You are not in a house.", 403);

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Object.keys(body).sort().join() !== FIELDS.join()) return refuse("Send only the recovery key, its lookup and your signature.");
  const { mlkem, x25519, lookup, signature } = body;
  try {
    if (typeof mlkem !== "string" || typeof x25519 !== "string" || typeof lookup !== "string" || !HEX64.test(lookup) || !HEX64.test(x25519)) throw 0;
    validateMlkemPublicKey(fromHex(mlkem));
    validateX25519PublicKey(fromHex(x25519));
  } catch {
    return refuse("The recovery key is not valid.");
  }
  try {
    await verifyMessageWithChain({ rest: REST, chainId: CHAIN_ID, signer: me, data: recoveryText(house, mlkem, x25519), signature });
  } catch (e) {
    if ((e as { code?: string }).code === "NETWORK_UNAVAILABLE") return refuse("Can't reach QoreChain to check your signature. Nothing was saved. Try again.", 503);
    return refuse("Your signature doesn't match this recovery key. Nothing was saved.");
  }

  const { data, error } = await db().from("houses").update({ recovery: { mlkem, x25519, by: me, signature }, recovery_lookup: lookup })
    .eq("id", house).is("recovery", null).select("id");
  if (error?.code === "23505") return refuse("These recovery words are already used. Nothing was saved. Go back and make new ones.", 409);
  if (error) throw error;
  if (!data.length) return refuse("This house already has a recovery key. Nothing was changed.", 409);
  return Response.json({ ok: true });
}
