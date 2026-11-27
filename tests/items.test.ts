import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { envelopeFromText, envelopeToText, open, parseEnvelope, seal } from "@qorechain/qoreseal";
import { NextRequest } from "next/server";
import { keysFrom, makeWords } from "../lib/keys";
import { signCard } from "../lib/padlock";
import { MAX_FILE, fileProblem, itemText, lockItem, openItem, pack, signItem, titleProblem, unpack } from "../lib/items";
import { stamp } from "../lib/stamp";
import { CHAIN_ID, ITEM_PURPOSE, REST } from "../lib/settings";
import { db } from "../lib/db";
import { houseIdOf, houseOf } from "../lib/house";
import { checkRecovery } from "../lib/recovery";
import { SESSION, seal as sealCookie } from "../lib/session";
import { GET as listRoute, POST as putInRoute } from "../app/api/items/route";
import { GET as houseRoute } from "../app/api/house/route";
import { GET as getItemRoute } from "../app/api/items/[id]/route";

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
// Ayu's house may have a recovery key (U10): then, like Put In, every paper also locks to it.
const recoveryOf = async (address: string) => {
  const h = (await houseOf(address))!;
  return h.recovery ? [await checkRecovery(h.recovery, h.id, h.members.map((m) => m.address), REST)] : [];
};
const stored = async (id: string) => !!(await db().from("items").select("id").eq("id", id).maybeSingle()).data;
const madeItems: string[] = [];
afterAll(async () => { if (madeItems.length) await db().from("items").delete().in("id", madeItems); });

describe.runIf(ayu && tari)("POST /api/items (testnet + Staging)", () => {
  const [a, t] = ayu && tari ? [keysFrom(ayu), keysFrom(tari)] : [];
  const good = async (title = "Test Paper") => {
    const houseId = (await houseIdOf(a!.address))!;
    const item = await lockItem({ keys: a!, houseId, title, file: { name: "n.txt", type: "text/plain", bytes: new TextEncoder().encode("hi") }, cards: [signCard(a!), signCard(t!)], extra: await recoveryOf(a!.address), rest: REST });
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

    // the House shows the 5 newest and how many there are; the Papers page loads the rest 10 at a time, newest first
    expect(house.items.length).toBeLessThanOrEqual(5);
    const page = async (from: string, by = t!.address) => listRoute(new NextRequest(`${ORIGIN}/api/items?from=${from}`, { headers: { cookie: `${SESSION}=${sealCookie(SESSION, by, 600)}` } }));
    const first = await (await page("0")).json();
    expect(first.total).toBe(house.paperCount);
    expect(first.items[0].id).toBe(item.id);
    expect(first.items.length).toBe(Math.min(10, first.total));
    expect((await (await page(String(first.total))).json()).items).toEqual([]);
    expect((await page("-1")).status).toBe(400);
    expect((await page("0", keysFrom(makeWords()).address)).status).toBe(403);

    // filters: words in the title (any case, typed text never a pattern) and the sender
    const word = item.title.slice(1, 6).toUpperCase();
    const found = await (await page(`0&q=${encodeURIComponent(word)}`)).json();
    expect(found.items.map((i: { id: string }) => i.id)).toContain(item.id);
    expect(found.items.every((i: { title: string }) => i.title.toUpperCase().includes(word))).toBe(true);
    expect((await (await page("0&q=%25%25%25")).json()).total).toBe(0);
    expect((await page("0&q=ab")).status).toBe(400); // at least 3 characters
    const mine = await (await page(`0&by=${a!.address}`)).json();
    expect(mine.items.map((i: { id: string }) => i.id)).toContain(item.id);
    expect((await (await page("0&by=nobody")).json()).total).toBe(0);
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

  // T-11.2 a put-in may carry its stamp: stored only if the stamp proves this paper (INV-6), and readers get it back
  it("stores a stamp that proves the paper, refuses one that doesn't", async () => {
    const [{ houseId, item }, other] = [await good("Stamped Paper"), await good("Other Paper")];
    const hash = await stamp(a!, await itemText(houseId, item.id, item.title, item.envelope), REST);
    for (const body of [{ ...item, stamp: "not a hash" }, { ...other.item, stamp: hash }]) {
      const res = await putIn(a!.address, body);
      expect(res.status, JSON.stringify(await res.json())).toBe(400);
    }
    expect(await stored(other.item.id)).toBe(false);
    expect((await putIn(a!.address, { ...item, stamp: hash })).status).toBe(200);
    const row = { ...await (await getItem(t!.address, item.id)).json(), houseId };
    expect(row.stamp).toBe(hash);

    // T-11.4 (reader half) the reader's own check proves it; T-11.5 a changed title doesn't match, no stamp is Not Stamped
    expect((await openItem(t!, row, REST)).stamp).toEqual({ hash, at: expect.any(Date) });
    expect((await openItem(t!, { ...row, title: "Changed Title" }, REST)).stamp).toEqual({ hash, at: null });
    expect((await openItem(t!, { ...row, stamp: null }, REST)).stamp).toBeNull();
  }, 120_000);
});

const getItem = (by: string, id: string) =>
  getItemRoute(new NextRequest(`${ORIGIN}/api/items/${id}`, { headers: { cookie: `${SESSION}=${sealCookie(SESSION, by, 600)}` } }), { params: Promise.resolve({ id }) } as never);

describe.runIf(ayu && tari && ratna)("GET /api/items/[id] and openItem (testnet + Staging)", () => {
  const [a, t, r] = ayu && tari && ratna ? [keysFrom(ayu), keysFrom(tari), keysFrom(ratna)] : [];
  const file = { name: "note.txt", type: "text/plain", bytes: new TextEncoder().encode("hello family") };
  const putFor = async (readers: ReturnType<typeof keysFrom>[]) => {
    const houseId = (await houseIdOf(a!.address))!;
    const item = await lockItem({ keys: a!, houseId, title: "Open Me", file, cards: readers.map(signCard), extra: await recoveryOf(a!.address), rest: REST });
    madeItems.push(item.id);
    expect((await putIn(a!.address, item)).status).toBe(200);
    return item;
  };
  const rowFor = async (by: string, id: string) => { const row = await (await getItem(by, id)).json(); return { ...row, houseId: row.house_id }; };

  // T-6.1 and T-6.2: two readers open the same copy, signature checked on chain; T-6.3: a member who is not a reader gets no copy
  // T-6.7: someone in no house gets 403
  it("opens for each reader from one row, and gives a non-reader no copy", async () => {
    const item = await putFor([a!, t!]);
    for (const k of [t!, a!]) {
      const res = await openItem(k, await rowFor(k.address, item.id), REST);
      expect(res.proven).toBe(true);
      expect(res.paper).toEqual(file);
    }
    expect((await db().from("items").select("id").eq("id", item.id)).data).toHaveLength(1);
    const notYou = await rowFor(r!.address, item.id);
    expect(notYou).toMatchObject({ reader: false, senderName: "Ayu", title: "Open Me" });
    expect(notYou.envelope).toBeUndefined();
    expect(notYou.signature).toBeUndefined();
    expect((await getItem(keysFrom(makeWords()).address, item.id)).status).toBe(403);
    expect((await getItem(a!.address, randomUUID())).status).toBe(404);
  }, 60_000);

  // T-6.4: a changed title or a changed copy in the database is "not proven"
  it("does not prove a paper whose title or copy was changed", async () => {
    const item = await putFor([a!, t!]);
    const row = await rowFor(t!.address, item.id);
    expect((await openItem(t!, { ...row, title: "Changed Title" }, REST)).proven).toBe(false);
    const other = envelopeToText(seal({ chainId: CHAIN_ID, purpose: ITEM_PURPOSE, recipients: [t!, a!].map((k) => ({ mlkemPublicKey: k.seal.mlkemPublicKey, x25519PublicKey: k.seal.x25519PublicKey })), plaintext: pack({ ...file, bytes: new Uint8Array([9]) }), aad: new TextEncoder().encode(item.id) }));
    const swapped = await openItem(t!, { ...row, envelope: other }, REST);
    expect(swapped.proven).toBe(false);
    expect(swapped.paper?.bytes).toEqual(new Uint8Array([9])); // opens, but must show "Signature Not Proven" and no Download
  }, 60_000);
});
