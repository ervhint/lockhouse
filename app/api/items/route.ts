import type { NextRequest } from "next/server";
import { envelopeFromText, parseEnvelope } from "@qorechain/qoreseal";
import { verifyMessageWithChain } from "@qorechain/qoresign/network";
import { db } from "@/lib/db";
import { houseIdOf } from "@/lib/house";
import { MAX_FILE, itemText, titleProblem } from "@/lib/items";
import { SESSION, unseal } from "@/lib/session";
import { CHAIN_ID, REST } from "@/lib/settings";

const refuse = (error: string, status = 400) => Response.json({ error }, { status });
const FIELDS = ["envelope", "id", "readers", "signature", "title"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const NAME_ROOM = 1024; // the name and type line inside the envelope, on top of the file

// Put In (S-07): store a locked copy only if every check holds; otherwise 400 and nothing stored (AC-5.2, AC-5.3).
export async function POST(req: NextRequest) {
  const me = unseal(SESSION, req.cookies.get(SESSION)?.value);
  if (!me) return refuse("Sign in first.", 401);
  const house = await houseIdOf(me);
  if (!house) return refuse("You are not in a house.", 403);

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Object.keys(body).sort().join() !== FIELDS.join()) return refuse("Send only the item id, title, locked copy, signature and readers.");
  const { id, title, envelope, signature, readers } = body;
  if (typeof id !== "string" || !UUID.test(id)) return refuse("The item id is not valid.");
  if (typeof title !== "string" || titleProblem(title)) return refuse(titleProblem(String(title)) ?? "Give it a title.");
  if (!Array.isArray(readers) || !readers.includes(me) || new Set(readers).size !== readers.length || readers.some((r) => typeof r !== "string"))
    return refuse("Pick each reader once, and keep yourself as a reader.");

  const { data: members, error } = await db().from("house_members").select("address").eq("house_id", house);
  if (error) throw error;
  const inHouse = new Set(members.map((m) => m.address));
  if (!readers.every((r: string) => inHouse.has(r))) return refuse("Every reader must be in your house.");

  let size: number;
  try {
    const env = typeof envelope === "string" ? envelopeFromText(envelope) : null;
    const parsed = env && parseEnvelope(env);
    if (!parsed || parsed.mode !== "hybrid" || parsed.entries.length !== readers.length) return refuse("The locked copy must be a hybrid lock with one entry per reader.");
    if (parsed.ciphertext.length - 16 > MAX_FILE + NAME_ROOM) return refuse(`The file is over the ${MAX_FILE / 1024 / 1024} MB limit.`);
    size = env.length;
  } catch {
    return refuse("The locked copy can't be read.");
  }

  try {
    await verifyMessageWithChain({ rest: REST, chainId: CHAIN_ID, signer: me, data: await itemText(house, id, title, envelope), signature });
  } catch (e) {
    if ((e as { code?: string }).code === "NETWORK_UNAVAILABLE") return refuse("Can't reach QoreChain to check your signature. Nothing was saved. Try again.", 503);
    return refuse("Your signature doesn't match this paper. Nothing was saved.");
  }

  const { error: failed } = await db().from("items").insert({ id, house_id: house, sender: me, title, envelope, signature, readers, size });
  if (failed) return failed.code === "23505" ? refuse("This paper is already saved.") : Promise.reject(failed);
  return Response.json({ id, readers: readers.length });
}
