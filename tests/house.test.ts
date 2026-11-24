import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { signRecipientCard } from "@qorechain/qoreseal";
import { isAddress, keysFrom, makeWords } from "../lib/keys";
import { signCard } from "../lib/padlock";
import { BAD_CARD, NO_PADLOCK, cardProblem } from "../lib/house";
import { CHAIN_ID } from "../lib/settings";
import { db } from "../lib/db";
import { NextRequest } from "next/server";
import { GET as houseRoute } from "../app/api/house/route";
import { POST as addRoute } from "../app/api/house/members/route";
import { SESSION, seal } from "../lib/session";
import { NOT_ADDRESS } from "../lib/keys";

const ayu = process.env.TEST_MNEMONIC_1; // padlock on testnet since U2
const tari = process.env.TEST_MNEMONIC_2; // padlock on testnet and signed in once (U2, U3)

const ORIGIN = "http://localhost:3000";
const as = (address: string) => ({ cookie: `${SESSION}=${seal(SESSION, address, 600)}` });
const getHouse = (address: string) => houseRoute(new NextRequest(`${ORIGIN}/api/house`, { headers: as(address) }));
const add = (by: string, address: string) =>
  addRoute(new NextRequest(`${ORIGIN}/api/house/members`, { method: "POST", headers: as(by), body: JSON.stringify({ address }) }));

describe("isAddress", () => {
  // T-4.7 text that isn't a qor1 address is caught before any request
  it("takes only qor1 addresses with a good checksum", () => {
    expect(isAddress("qor1w0c3th6k7gu3ptylnz6ngv2lskw6vaa29s60ha")).toBe(true);
    expect(isAddress("hello")).toBe(false);
    expect(isAddress("0x52908400098527886E0F7030069857D2E4169EE7")).toBe(false);
    expect(isAddress("qor1w0c3th6k7gu3ptylnz6ngv2lskw6vaa29s60hb")).toBe(false); // one letter off
  });
});

describe.runIf(ayu)("cardProblem (testnet)", () => {
  // T-4.5 a card whose keys don't match the chain; T-4.4 an account with no padlock
  it("passes a good card, names a bad one and a missing padlock", async () => {
    const keys = keysFrom(ayu!);
    expect(await cardProblem(signCard(keys))).toBeNull();
    const otherPadlock = signRecipientCard({ chainId: CHAIN_ID, address: keys.address, keys: keysFrom(makeWords()).seal, classicalKey: keys.classical, pqKey: keys.pq });
    expect(await cardProblem(otherPadlock)).toBe(BAD_CARD);
    expect(await cardProblem(signCard(keysFrom(makeWords())))).toBe(NO_PADLOCK);
  });
});

// Made-up people on Staging (no keys on chain): enough for the database rules. Removed afterwards.
const made: string[] = [];
async function fakePerson(name: string) {
  const address = keysFrom(makeWords()).address;
  made.push(address);
  const { data: house, error } = await db().rpc("sign_in", { p_nonce: `test-${randomUUID()}`, p_address: address, p_name: name, p_card: {} });
  if (error) throw error;
  return { address, house: house as string };
}
const houseOfRow = async (address: string) => (await db().from("house_members").select("house_id").eq("address", address).maybeSingle()).data?.house_id;
const houseExists = async (id: string) => !!(await db().from("houses").select("id").eq("id", id).maybeSingle()).data;
const addMember = async (house: string, address: string, by: string) => {
  const { data, error } = await db().rpc("add_member", { p_house: house, p_address: address, p_by: by });
  if (error) throw error;
  return data;
};
afterAll(async () => {
  if (!made.length) return;
  await db().from("house_members").delete().in("address", made);
  await db().from("houses").delete().in("owner", made);
  await db().from("people").delete().in("address", made);
});

describe("add_member (Staging)", () => {
  // T-4.6 someone alone in an empty house moves in and their old house is removed;
  // someone whose house has other members is refused and nothing changes (papers: U5)
  it("moves someone who is alone, refuses someone whose house has others", async () => {
    const [owner, alone, busy, busyMate] = [await fakePerson("Owner"), await fakePerson("Alone"), await fakePerson("Busy"), await fakePerson("Mate")];
    expect(await addMember(owner.house, alone.address, owner.address)).toBe("added");
    expect(await houseOfRow(alone.address)).toBe(owner.house);
    expect(await houseExists(alone.house)).toBe(false);
    expect(await addMember(owner.house, alone.address, owner.address)).toBe("here");

    expect(await addMember(busy.house, busyMate.address, busy.address)).toBe("added");
    expect(await addMember(owner.house, busy.address, owner.address)).toBe("taken");
    expect(await houseOfRow(busy.address)).toBe(busy.house);

    expect(await addMember(owner.house, keysFrom(makeWords()).address, owner.address)).toBe("unknown");
  }, 60_000);
});

describe("house routes (Staging)", () => {
  // T-4.8 someone outside any house gets 403 for the house and for adding
  it("answer 403 to someone in no house", async () => {
    const stranger = keysFrom(makeWords()).address;
    expect((await getHouse(stranger)).status).toBe(403);
    expect((await add(stranger, stranger)).status).toBe(403);
  });

  // T-4.7 (server half) not a qor1 address; T-4.4 no padlock and never signed in: refused, nothing added
  it("refuse bad text and an address with no padlock", async () => {
    const owner = await fakePerson("Owner");
    const bad = await add(owner.address, "hello");
    expect(bad.status).toBe(400);
    expect(await bad.json()).toEqual({ error: NOT_ADDRESS });
    const nobody = keysFrom(makeWords()).address;
    const none = await add(owner.address, nobody);
    expect(none.status).toBe(400);
    expect(await none.json()).toEqual({ error: NO_PADLOCK });
    expect(await houseOfRow(nobody)).toBeUndefined();
  }, 60_000);
});

describe.runIf(tari)("Add Member with a real card (testnet + Staging)", () => {
  // T-4.3 the server checks their card against the chain, adds them, and they see the new house.
  // Tari is put alone in a spare house first and put back exactly where she was afterwards.
  it("adds someone whose card checks out", async () => {
    const them = keysFrom(tari!).address;
    const { data: before } = await db().from("house_members").select("house_id, added_by, added_at").eq("address", them).single();
    const { data: spare } = await db().from("houses").insert({ owner: them }).select("id").single();
    await db().from("house_members").update({ house_id: spare!.id }).eq("address", them);
    try {
      const owner = await fakePerson("Owner");
      const t0 = Date.now();
      const res = await add(owner.address, them);
      console.log(`Add Member took ${Date.now() - t0} ms`);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ member: { name: "Tari", address: them } });
      expect(await houseOfRow(them)).toBe(owner.house);
      expect(await houseExists(spare!.id)).toBe(false);
      const theirView = await (await getHouse(them)).json();
      expect(theirView.members).toEqual([{ name: "Owner", address: owner.address }, { name: "Tari", address: them }]);
    } finally {
      await db().from("house_members").update(before!).eq("address", them);
      await db().from("houses").delete().eq("id", spare!.id);
    }
  }, 60_000);
});
