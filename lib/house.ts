// The house: who is in it, and adding someone (U4). Server only (uses the service role key).
import type { RecipientCard } from "@qorechain/qoreseal";
import { db } from "./db";
import { checkCard } from "./padlock";
import type { Recovery } from "./recovery";
import { REST } from "./settings";

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

/** What the House and Put In screens need (S-05, S-07): members in the order they joined, with the cards
 *  that lock papers to them (cards are public); papers newest first, with no locked copy; the recovery key's
 *  public half, if the house has one (U10; never its lookup). Null if in no house. */
export async function houseOf(address: string) {
  const id = await houseIdOf(address);
  if (!id) return null;
  const [m, i, h] = await Promise.all([
    db().from("house_members").select("address, people!house_members_address_fkey(name, card)").eq("house_id", id).order("added_at"),
    db().from("items").select("id, title, readers, created_at, people(name)").eq("house_id", id).order("created_at", { ascending: false }),
    db().from("houses").select("recovery").eq("id", id).single(),
  ]);
  if (m.error) throw m.error;
  if (i.error) throw i.error;
  if (h.error) throw h.error;
  const members = (m.data as unknown as { address: string; people: { name: string; card: RecipientCard } }[])
    .map((r) => ({ name: r.people.name, address: r.address, card: r.people.card }));
  const items = (i.data as unknown as { id: string; title: string; readers: string[]; created_at: string; people: { name: string } }[])
    .map((r) => ({ id: r.id, title: r.title, sender: r.people.name, date: r.created_at, readers: r.readers.length }));
  return { id, members, items, recovery: h.data.recovery as Recovery | null };
}
