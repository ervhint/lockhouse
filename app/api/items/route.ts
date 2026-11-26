import type { NextRequest } from "next/server";
import { envelopeFromText, parseEnvelope } from "@qorechain/qoreseal";
import { verifyMessageWithChain } from "@qorechain/qoresign/network";
import { db } from "@/lib/db";
import { PAGE, houseIdOf, papersOf } from "@/lib/house";
import { MAX_FILE, itemText, titleProblem } from "@/lib/items";
import { SESSION, unseal } from "@/lib/session";
import { CHAIN_ID, REST } from "@/lib/settings";
import { checkStamp } from "@/lib/stamp";

const refuse = (error: string, status = 400) => Response.json({ error }, { status });
const FIELDS = ["envelope", "id", "readers", "signature", "title"]; // plus an optional stamp (U11)
const offline = (e: unknown) => (e as { code?: string }).code === "NETWORK_UNAVAILABLE";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const NAME_ROOM = 1024; // the name and type line inside the envelope, on top of the file

// The Papers page: my house's papers newest first, PAGE at a time from `?from=`, and how many there are. Members only.
export async function GET(req: NextRequest) {
  const me = unseal(SESSION, req.cookies.get(SESSION)?.value);
  if (!me) return refuse("Sign in first.", 401);
  const house = await houseIdOf(me);
  if (!house) return refuse("You are not in a house.", 403);
  const from = Number(req.nextUrl.searchParams.get("from") ?? 0);
  if (!Number.isInteger(from) || from < 0) return refuse("Ask for papers from 0 or more.");
  return Response.json(await papersOf(house, from, PAGE));
}

// Put In (S-07): store a locked copy only if every check holds; otherwise 400 and nothing stored (AC-5.2, AC-5.3).
export async function POST(req: NextRequest) {
  const me = unseal(SESSION, req.cookies.get(SESSION)?.value);
  if (!me) return refuse("Sign in first.", 401);
  const house = await houseIdOf(me);
  if (!house) return refuse("You are not in a house.", 403);

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Object.keys(body).filter((k) => k !== "stamp").sort().join() !== FIELDS.join())
    return refuse("Send only the item id, title, locked copy, signature, readers and stamp.");
  const { id, title, envelope, signature, readers, stamp = null } = body;
  if (typeof id !== "string" || !UUID.test(id)) return refuse("The item id is not valid.");
  if (stamp !== null && (typeof stamp !== "string" || !/^[0-9A-F]{64}$/.test(stamp))) return refuse("The stamp must be a QoreChain transaction hash.");
  if (typeof title !== "string" || titleProblem(title) || title !== title.trim()) return refuse(titleProblem(String(title)) ?? "Give it a title with no spaces at the start or end.");
  if (!Array.isArray(readers) || !readers.includes(me) || new Set(readers).size !== readers.length || readers.some((r) => typeof r !== "string"))
    return refuse("Pick each reader once, and keep yourself as a reader.");

  const [{ data: members, error }, h] = await Promise.all([
    db().from("house_members").select("address").eq("house_id", house),
    db().from("houses").select("recovery_lookup").eq("id", house).single(),
  ]);
  if (error) throw error;
  if (h.error) throw h.error;
  const recovery = h.data.recovery_lookup; // the house's recovery key is one more reader of every paper (U10)
  const inHouse = new Set(members.map((m) => m.address));
  if (!readers.every((r: string) => inHouse.has(r))) return refuse("Every reader must be in your house.");

  let size: number;
  try {
    const env = typeof envelope === "string" ? envelopeFromText(envelope) : null;
    const parsed = env && parseEnvelope(env);
    if (!parsed || parsed.mode !== "hybrid") return refuse("The locked copy must be a hybrid lock with one entry per reader.");
    if (parsed.entries.length !== readers.length + (recovery ? 1 : 0))
      return refuse(recovery ? "This house has a recovery key, so it must be one more reader. Reload the page, then put it in again."
        : parsed.entries.length === readers.length + 1 ? "This house's recovery key changed. Reload the page, then put it in again."
        : "The locked copy must be a hybrid lock with one entry per reader.");
    if (parsed.ciphertext.length - 16 > MAX_FILE + NAME_ROOM) return refuse(`The file is over the ${MAX_FILE / 1024 / 1024} MB limit.`);
    size = env.length;
  } catch {
    return refuse("The locked copy can't be read.");
  }

  const text = await itemText(house, id, title, envelope);
  try {
    await verifyMessageWithChain({ rest: REST, chainId: CHAIN_ID, signer: me, data: text, signature });
  } catch (e) {
    if (offline(e)) return refuse("Can't reach QoreChain to check your signature. Nothing was saved. Try again.", 503);
    return refuse("Your signature doesn't match this paper. Nothing was saved.");
  }
  try { // a stamp is stored only if it proves this paper, from me (AC-11.3, INV-6)
    if (stamp && !await checkStamp(stamp, me, text, REST)) return refuse("This stamp on QoreChain is not for this paper. Nothing was saved. Put it in again.");
  } catch (e) {
    if (offline(e)) return refuse("Can't reach QoreChain to check the stamp. Nothing was saved. Try again.", 503);
    throw e;
  }

  const { error: failed } = await db().from("items").insert({ id, house_id: house, sender: me, title, envelope, signature, readers, size, recovery, stamp });
  if (failed) return failed.code === "23505" ? refuse("This paper is already saved.") : Promise.reject(failed);
  return Response.json({ id, readers: readers.length });
}
