// The house: who is in it, adding someone (U4), and the checks on a paper before it is stored (U5, U12). Server only (uses the service role key).
import { envelopeFromText, parseEnvelope, type RecipientCard } from "@qorechain/qoreseal";
import type { MessageSignature } from "@qorechain/qoresign";
import { verifyMessageWithChain } from "@qorechain/qoresign/network";
import { db } from "./db";
import { MAX_FILE, itemText } from "./items";
import { checkCard } from "./padlock";
import type { Recovery } from "./recovery";
import { CHAIN_ID, REST } from "./settings";
import { checkStamp } from "./stamp";

export const NO_PADLOCK = "This address has no padlock in the Phone Book yet. Ask them to register their padlock and sign in once, then try again.";
export const BAD_CARD = "Their signed card does not match this address. Nothing was added. Ask them to sign in to Lockhouse again to renew their card, then try again.";

/** Null if the card matches both keys the account has on chain; else what's wrong, in plain words (AC-4.4, AC-4.5). */
export async function cardProblem(card: RecipientCard) {
  try {
    await checkCard(card, REST);
    return null;
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "NETWORK_UNAVAILABLE") throw e; // not their fault: the route says so
    return code === "KEM_KEY_NOT_REGISTERED" || code === "PQ_KEY_NOT_REGISTERED" ? NO_PADLOCK : BAD_CARD;
  }
}

/** The id of the house this person is in, or null. */
export async function houseIdOf(address: string): Promise<string | null> {
  const { data, error } = await db().from("house_members").select("house_id").eq("address", address).maybeSingle();
  if (error) throw error;
  return data?.house_id ?? null;
}

export const PAGE = 10; // the Papers page loads this many at a time

/** A house's papers newest first, `size` of them from `from`, with no locked copy, and how many it has.
 *  Optional filters: `q`, words in the title (any case); `by`, the sender's address. */
export async function papersOf(houseId: string, from: number, size: number, { q, by }: { q?: string; by?: string } = {}) {
  let query = db().from("items").select("id, title, readers, stamp, created_at, people(name)", { count: "exact" }).eq("house_id", houseId);
  if (q) query = query.ilike("title", `%${q.replace(/[\\%_]/g, "\\$&")}%`); // the typed text is matched as text, never as a pattern
  if (by) query = query.eq("sender", by);
  const { data, error, count } = await query.order("created_at", { ascending: false }).order("id").range(from, from + size - 1);
  if (error) throw error;
  // `stamped`: it has a stamp (U11); the paper's own page checks it on chain
  const items = (data as unknown as { id: string; title: string; readers: string[]; stamp: string | null; created_at: string; people: { name: string } }[])
    .map((r) => ({ id: r.id, title: r.title, sender: r.people.name, date: r.created_at, readers: r.readers.length, stamped: !!r.stamp }));
  return { items, total: count ?? 0 };
}

/** What the House and Put In screens need (S-05, S-07): me first, then the others A–Z by name, with the cards
 *  that lock papers to them (cards are public); the 5 newest papers and how many there are; the recovery key's
 *  public half, if the house has one (U10; never its lookup). Null if in no house. */
export async function houseOf(address: string) {
  const id = await houseIdOf(address);
  if (!id) return null;
  const [m, papers, h] = await Promise.all([
    db().from("house_members").select("address, people!house_members_address_fkey(name, card)").eq("house_id", id),
    papersOf(id, 0, 5),
    db().from("houses").select("recovery").eq("id", id).single(),
  ]);
  if (m.error) throw m.error;
  if (h.error) throw h.error;
  const members = (m.data as unknown as { address: string; people: { name: string; card: RecipientCard } }[])
    .map((r) => ({ name: r.people.name, address: r.address, card: r.people.card }))
    .sort((a, b) => Number(b.address === address) - Number(a.address === address) || a.name.localeCompare(b.name)); // me first, then A–Z
  return { id, members, items: papers.items, paperCount: papers.total, recovery: h.data.recovery as Recovery | null };
}

const offline = (e: unknown) => (e as { code?: string }).code === "NETWORK_UNAVAILABLE";
const NAME_ROOM = 1024; // the name and type line inside the envelope, on top of the file

/** The checks Put In and Change Readers share (AC-5.3, AC-11.3, AC-12.5): every reader a member, me one of them, none
 *  twice; one hybrid entry per reader (+1 for the house's recovery key); within the size limit; my signature over this
 *  house, id, title and copy; a stamp, if sent, proves that text from me (INV-6). What to store, or why not (status 400 or 503). */
export async function checkPaper(me: string, house: string, p: { id: string; title: string; envelope: unknown; signature: unknown; readers: unknown; stamp: unknown }):
  Promise<{ error: string; status?: number } | { size: number; recovery: string | null }> {
  const { readers, envelope, stamp } = p;
  if (stamp !== null && (typeof stamp !== "string" || !/^[0-9A-F]{64}$/.test(stamp))) return { error: "The stamp must be a QoreChain transaction hash." };
  if (!Array.isArray(readers) || !readers.includes(me) || new Set(readers).size !== readers.length || readers.some((r) => typeof r !== "string"))
    return { error: "Pick each reader once, and keep yourself as a reader." };

  const [{ data: members, error }, h] = await Promise.all([
    db().from("house_members").select("address").eq("house_id", house),
    db().from("houses").select("recovery_lookup").eq("id", house).single(),
  ]);
  if (error) throw error;
  if (h.error) throw h.error;
  const recovery: string | null = h.data.recovery_lookup; // the house's recovery key is one more reader of every paper (U10)
  const inHouse = new Set(members.map((m) => m.address));
  if (!readers.every((r: string) => inHouse.has(r))) return { error: "Every reader must be in your house." };

  let size: number;
  try {
    const env = typeof envelope === "string" ? envelopeFromText(envelope) : null;
    const parsed = env && parseEnvelope(env);
    if (!parsed || parsed.mode !== "hybrid") return { error: "The locked copy must be a hybrid lock with one entry per reader." };
    if (parsed.entries.length !== readers.length + (recovery ? 1 : 0))
      return { error: recovery ? "This house has a recovery key, so it must be one more reader. Reload the page, then try again."
        : parsed.entries.length === readers.length + 1 ? "This house's recovery key changed. Reload the page, then try again."
        : "The locked copy must be a hybrid lock with one entry per reader." };
    if (parsed.ciphertext.length - 16 > MAX_FILE + NAME_ROOM) return { error: `The file is over the ${MAX_FILE / 1024 / 1024} MB limit.` };
    size = env.length;
  } catch {
    return { error: "The locked copy can't be read." };
  }

  const text = await itemText(house, p.id, p.title, envelope as string);
  try {
    await verifyMessageWithChain({ rest: REST, chainId: CHAIN_ID, signer: me, data: text, signature: p.signature as MessageSignature });
  } catch (e) {
    if (offline(e)) return { error: "Can't reach QoreChain to check your signature. Nothing was saved. Try again.", status: 503 };
    return { error: "Your signature doesn't match this paper. Nothing was saved." };
  }
  try {
    if (stamp && !await checkStamp(stamp as string, me, text, REST)) return { error: "This stamp on QoreChain is not for this paper. Nothing was saved. Try again." };
  } catch (e) {
    if (offline(e)) return { error: "Can't reach QoreChain to check the stamp. Nothing was saved. Try again.", status: 503 };
    throw e;
  }
  return { size, recovery };
}
