import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { envelopeFromText, envelopeToText, open, parseEnvelope, seal } from "@qorechain/qoreseal";
import { NextRequest } from "next/server";
import { keysFrom, makeWords } from "../lib/keys";
import { signCard } from "../lib/padlock";
import { MAX_FILE, fileProblem, lockItem, pack, signItem, titleProblem, unpack } from "../lib/items";
import { CHAIN_ID, ITEM_PURPOSE, REST } from "../lib/settings";
import { db } from "../lib/db";
import { houseIdOf } from "../lib/house";
import { SESSION, seal as sealCookie } from "../lib/session";
import { POST as putInRoute } from "../app/api/items/route";
import { GET as houseRoute } from "../app/api/house/route";

const ayu = process.env.TEST_MNEMONIC_1; // padlock on testnet, Ayu's house holds Ayu and Tari on Staging
const tari = process.env.TEST_MNEMONIC_2;

describe("fileProblem and titleProblem", () => {
  // T-5.4 a 3 MB file is refused with its size and the limit; T-5.5 empty and 81-character titles
  it("name a file over 2 MB and a bad title", () => {
    expect(fileProblem(MAX_FILE)).toBeNull();
    expect(fileProblem(3 * 1024 * 1024)).toBe("This file is 3.0 MB. The limit is 2 MB. Pick a smaller file or a smaller photo.");
    expect(titleProblem("Family Card")).toBeNull();
    expect(titleProblem("   ")).toBe("Give it a title.");
    expect(titleProblem("x".repeat(81))).toBe("Keep the title to 80 characters or fewer.");
  });
});

describe.runIf(ayu && tari)("lockItem (testnet)", () => {
  // T-5.1 (lock half): cards checked on chain, one hybrid envelope, an entry per reader, the item id as AAD
  it("locks one copy that each reader opens, only with its own item id", async () => {
    const [a, t] = [keysFrom(ayu!), keysFrom(tari!)];
    const file = { name: "card.png", type: "image/png", bytes: new Uint8Array([1, 2, 3]) };
    const item = await lockItem({ keys: a, houseId: randomUUID(), title: "Card", file, cards: [signCard(a), signCard(t)], rest: REST });
    const env = envelopeFromText(item.envelope);
    expect(parseEnvelope(env)).toMatchObject({ mode: "hybrid", entries: [{}, {}] });
    const aad = new TextEncoder().encode(item.id);
    expect(unpack(open({ chainId: CHAIN_ID, purpose: ITEM_PURPOSE, envelope: env, keys: t.seal, aad }))).toEqual(file);
    expect(() => open({ chainId: CHAIN_ID, purpose: ITEM_PURPOSE, envelope: env, keys: t.seal, aad: new TextEncoder().encode(randomUUID()) })).toThrow();
  });
});

const ratna = process.env.TEST_MNEMONIC_3; // padlock on testnet and in Ayu's house since U5

describe.runIf(ayu && tari && ratna)("three readers (testnet)", () => {
  // T-5.1 one copy for three readers, each opens it; T-5.8 sealing 500 KB for 3 readers takes under 2 s (NF-5, chain checks not counted)
  it("locks 500 KB once for three readers, fast", async () => {
    const people = [ayu!, tari!, ratna!].map(keysFrom);
    const file = { name: "paper.png", type: "image/png", bytes: new Uint8Array(500 * 1024).fill(7) };
    const recipients = people.map((p) => ({ mlkemPublicKey: p.seal.mlkemPublicKey, x25519PublicKey: p.seal.x25519PublicKey }));
    const t0 = performance.now();
    seal({ chainId: CHAIN_ID, purpose: ITEM_PURPOSE, recipients, plaintext: pack(file), aad: new TextEncoder().encode(randomUUID()) });
    const ms = performance.now() - t0;
    console.log(`Sealed 500 KB for 3 readers in ${Math.round(ms)} ms`);
    expect(ms).toBeLessThan(2000);

    const item = await lockItem({ keys: people[0], houseId: randomUUID(), title: "Three", file, cards: people.map(signCard), rest: REST });
    const env = envelopeFromText(item.envelope);
    expect(parseEnvelope(env).entries).toHaveLength(3);
    for (const p of people) expect(unpack(open({ chainId: CHAIN_ID, purpose: ITEM_PURPOSE, envelope: env, keys: p.seal, aad: new TextEncoder().encode(item.id) }))).toEqual(file);
  });
});

const ORIGIN = "http://localhost:3000";
const putIn = (by: string, body: unknown) =>
  putInRoute(new NextRequest(`${ORIGIN}/api/items`, { method: "POST", headers: { cookie: `${SESSION}=${sealCookie(SESSION, by, 600)}` }, body: JSON.stringify(body) }));
const stored = async (id: string) => !!(await db().from("items").select("id").eq("id", id).maybeSingle()).data;
const madeItems: string[] = [];
afterAll(async () => { if (madeItems.length) await db().from("items").delete().in("id", madeItems); });

describe.runIf(ayu && tari)("POST /api/items (testnet + Staging)", () => {
  const [a, t] = ayu && tari ? [keysFrom(ayu), keysFrom(tari)] : [];
  const good = async (title = "Test Paper") => {
    const houseId = (await houseIdOf(a!.address))!;
    const item = await lockItem({ keys: a!, houseId, title, file: { name: "n.txt", type: "text/plain", bytes: new TextEncoder().encode("hi") }, cards: [signCard(a!), signCard(t!)], rest: REST });
    madeItems.push(item.id);
    return { houseId, item };
  };

  // T-5.2 only id, title, envelope, signature and readers; an extra field is refused
  // T-5.7 (server half) the house lists it newest first with sender, date and reader count
  it("stores a good put-in, refuses an extra field, and lists it", async () => {
    const { item } = await good();
    const extra = await putIn(a!.address, { ...item, file: "the file" });
    expect(extra.status).toBe(400);
    expect(await stored(item.id)).toBe(false);
    const ok = await putIn(a!.address, item);
    expect(ok.status).toBe(200);
    expect(await stored(item.id)).toBe(true);
    const house = await (await houseRoute(new NextRequest(`${ORIGIN}/api/house`, { headers: { cookie: `${SESSION}=${sealCookie(SESSION, t!.address, 600)}` } }))).json();
    expect(house.items[0]).toMatchObject({ id: item.id, title: "Test Paper", sender: "Ayu", readers: 2 });
  }, 60_000);

  // T-5.3 a non-member reader, a broken envelope, a wrong entry count, a bad signature: 400, nothing stored.
  // Someone in no house at all gets 403 (as with the house routes, AC-4.8).
  it("refuses each broken put-in and stores nothing", async () => {
    const { houseId, item } = await good();
    const stranger = keysFrom(makeWords()).address;
    const oneEntry = envelopeToText(seal({ chainId: CHAIN_ID, purpose: ITEM_PURPOSE, recipients: [{ mlkemPublicKey: a!.seal.mlkemPublicKey, x25519PublicKey: a!.seal.x25519PublicKey }], plaintext: new Uint8Array([1]), aad: new TextEncoder().encode(item.id) }));
    const cases = [
      { ...item, readers: [a!.address, stranger] },
      { ...item, envelope: "qoreseal:broken" },
      { ...item, envelope: oneEntry, signature: await signItem(a!, houseId, item.id, item.title, oneEntry) },
      { ...item, title: "Changed Title" },
    ];
    for (const body of cases) {
      const res = await putIn(a!.address, body);
      expect(res.status, JSON.stringify((await res.json()))).toBe(400);
    }
    expect((await putIn(stranger, item)).status).toBe(403);
    expect(await stored(item.id)).toBe(false);
  }, 60_000);
});
