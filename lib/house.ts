// The house: who is in it, and adding someone (U4). Server only (uses the service role key).
import type { RecipientCard } from "@qorechain/qoreseal";
import { db } from "./db";
import { checkCard } from "./padlock";
import { REST } from "./settings";

export const NO_PADLOCK = "This address has no padlock in the Phone Book yet. Ask them to register their padlock and sign in once, then try again.";
export const BAD_CARD = "Their signed card does not match this address. Nothing was added.";

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

/** What the House screen needs (S-05): members in the order they joined; papers come in U5. Null if in no house. */
export async function houseOf(address: string) {
  const id = await houseIdOf(address);
  if (!id) return null;
  const { data, error } = await db().from("house_members").select("address, people!house_members_address_fkey(name)").eq("house_id", id).order("added_at");
  if (error) throw error;
  const members = (data as unknown as { address: string; people: { name: string } }[]).map((m) => ({ name: m.people.name, address: m.address }));
  return { members, items: [] as { id: string; title: string; sender: string; date: string }[] };
}
