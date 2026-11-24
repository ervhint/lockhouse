import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { deriveSealKeys, envelopeFromText, parseEnvelope } from "@qorechain/qoreseal";
import { keysFrom, makeWords } from "../lib/keys";
import { signCard } from "../lib/padlock";
import { lockItem, openItem } from "../lib/items";
import { checkRecovery, makeRecovery } from "../lib/recovery";
import { REST } from "../lib/settings";
import { NextRequest } from "next/server";
import { db } from "../lib/db";
import { houseIdOf } from "../lib/house";
import { SESSION, seal as sealCookie } from "../lib/session";
import { POST as setRoute } from "../app/api/house/recovery/route";
import { GET as houseRoute } from "../app/api/house/route";
import { POST as putInRoute } from "../app/api/items/route";
import { POST as recoverRoute } from "../app/api/recover/route";

const ayu = process.env.TEST_MNEMONIC_1; // padlock on testnet, in Ayu's house on Staging
const tari = process.env.TEST_MNEMONIC_2;
const file = { name: "note.txt", type: "text/plain", bytes: new TextEncoder().encode("for the family") };

describe.runIf(ayu && tari)("the recovery key (testnet)", () => {
  const [a, t] = ayu && tari ? [keysFrom(ayu), keysFrom(tari)] : [];

  // T-10.1 (lock half): the recovery key is one more reader, and its words alone open the paper
  it("is one more reader, and the recovery words open the paper", async () => {
    const houseId = randomUUID();
    const words = makeWords();
    const r = { ...(await makeRecovery(a!, houseId, words)), by: a!.address };
    const extra = await checkRecovery(r, houseId, [a!.address, t!.address], REST);
    const item = await lockItem({ keys: a!, houseId, title: "Kept Safe", file, cards: [signCard(a!)], extra: [extra], rest: REST });
    expect(parseEnvelope(envelopeFromText(item.envelope)).entries).toHaveLength(2);
    const opened = await openItem({ seal: deriveSealKeys({ mnemonic: words }) }, { ...item, houseId, sender: a!.address }, REST);
    expect(opened).toEqual({ proven: true, paper: file });
  }, 60_000);

  // A hacked server can't slip in its own recovery key: it must be signed by a member, for this house
  it("refuses a recovery key not signed by a member of this house", async () => {
    const houseId = randomUUID();
    const r = { ...(await makeRecovery(a!, houseId, makeWords())), by: a!.address };
    const other = await makeRecovery(a!, houseId, makeWords());
    await expect(checkRecovery(r, houseId, [t!.address], REST)).rejects.toThrow();
    await expect(checkRecovery(r, randomUUID(), [a!.address], REST)).rejects.toThrow();
    await expect(checkRecovery({ ...r, mlkem: other.mlkem }, houseId, [a!.address], REST)).rejects.toThrow();
  }, 60_000);
});

const ORIGIN = "http://localhost:3000";
const as = (by: string | null, path: string, method = "GET", body?: unknown) => new NextRequest(`${ORIGIN}${path}`, {
  method, headers: by ? { cookie: `${SESSION}=${sealCookie(SESSION, by, 600)}` } : {}, body: body === undefined ? undefined : JSON.stringify(body),
});

describe.runIf(ayu && tari)("recovery routes (testnet + Staging)", () => {
  const [a, t] = ayu && tari ? [keysFrom(ayu), keysFrom(tari)] : [];
  let houseId = "";
  let before: { recovery: unknown; recovery_lookup: string | null } | null = null;
  const made: string[] = [];
  // Ayu's house may already hold a recovery key for the demo: keep it aside and put it back after.
  beforeAll(async () => {
    houseId = (await houseIdOf(a!.address))!;
    before = (await db().from("houses").select("recovery, recovery_lookup").eq("id", houseId).single()).data;
    await db().from("houses").update({ recovery: null, recovery_lookup: null }).eq("id", houseId);
  });
  afterAll(async () => {
    if (made.length) await db().from("items").delete().in("id", made);
    if (before) await db().from("houses").update(before).eq("id", houseId);
  });

  // T-10.1: a member sets it once; members see who made it, never the lookup; every put-in must lock to it;
  // the words alone (no sign-in) find the paper and open it, signature checked
  it("is set once, joins every put-in, and its words find and open the paper", async () => {
    const words = makeWords();
    const r = await makeRecovery(a!, houseId, words);
    expect((await setRoute(as(null, "/api/house/recovery", "POST", r))).status).toBe(401);
    expect((await setRoute(as(a!.address, "/api/house/recovery", "POST", { ...r, extra: 1 }))).status).toBe(400);
    expect((await setRoute(as(a!.address, "/api/house/recovery", "POST", { ...r, mlkem: (await makeRecovery(a!, houseId, makeWords())).mlkem }))).status).toBe(400);
    expect((await setRoute(as(a!.address, "/api/house/recovery", "POST", r))).status).toBe(200);
    expect((await setRoute(as(a!.address, "/api/house/recovery", "POST", await makeRecovery(a!, houseId, makeWords())))).status).toBe(409);

    const house = await (await houseRoute(as(t!.address, "/api/house"))).json();
    expect(house.recovery).toEqual({ mlkem: r.mlkem, x25519: r.x25519, by: a!.address, signature: r.signature });

    const without = await lockItem({ keys: a!, houseId, title: "Kept Safe", file, cards: [signCard(a!)], rest: REST });
    expect((await putInRoute(as(a!.address, "/api/items", "POST", without))).status).toBe(400);
    const extra = await checkRecovery(house.recovery, houseId, [a!.address], REST);
    const item = await lockItem({ keys: a!, houseId, title: "Kept Safe", file, cards: [signCard(a!)], extra: [extra], rest: REST });
    made.push(item.id);
    expect((await putInRoute(as(a!.address, "/api/items", "POST", item))).status).toBe(200);

    expect((await recoverRoute(as(null, "/api/recover", "POST", { lookup: "0".repeat(64) }))).status).toBe(404);
    expect((await recoverRoute(as(null, "/api/recover", "POST", { lookup: r.lookup, more: 1 }))).status).toBe(400);
    const found = await (await recoverRoute(as(null, "/api/recover", "POST", { lookup: r.lookup }))).json();
    expect(found.items).toHaveLength(1);
    const row = found.items[0];
    expect(row).toMatchObject({ id: item.id, title: "Kept Safe", senderName: "Ayu" });
    const opened = await openItem({ seal: deriveSealKeys({ mnemonic: words }) }, { ...row, houseId: row.house_id }, REST);
    expect(opened).toEqual({ proven: true, paper: file });
  }, 90_000);
});
