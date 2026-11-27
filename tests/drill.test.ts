import { afterAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { keysFrom, makeWords } from "../lib/keys";
import { db } from "../lib/db";
import { SESSION, seal as sealCookie } from "../lib/session";
import { GET as drillRoute } from "../app/api/drill/route";
import { POST as fakeRoute } from "../app/api/drill/fake/route";
import { GET as itemRoute } from "../app/api/items/[id]/route";
import { openItem } from "../lib/items";
import { REST } from "../lib/settings";

describe("/api/drill", () => {
  // T-7.1 (route): every stored copy, with no title, names or readers
  it("lists every stored copy with only its id, locked copy and date", async () => {
    const { copies } = await (await drillRoute()).json();
    const { count } = await db().from("items").select("id", { count: "exact", head: true });
    expect(copies.length).toBe(count);
    for (const c of copies) expect(Object.keys(c).sort()).toEqual(["date", "envelope", "id"]);
  });
});

const tari = process.env.TEST_MNEMONIC_2; // in people on Staging, with her card
const ORIGIN = "http://localhost:3000";

const as = (by: string) => ({ cookie: `${SESSION}=${sealCookie(SESSION, by, 600)}` });

describe.runIf(tari)("/api/drill/fake (Staging)", () => {
  let made: string | undefined;
  afterAll(async () => { if (made) await db().from("items").delete().eq("id", made); });

  // T-8.1 (route + open half): a copy that claims another member, signed with the wrong key, shows Signature Not Proven
  it("stores a paper claiming another member, and it opens as not proven", async () => {
    const t = keysFrom(tari!);
    expect((await fakeRoute(new NextRequest(`${ORIGIN}/api/drill/fake`, { method: "POST" }))).status).toBe(401);
    const res = await fakeRoute(new NextRequest(`${ORIGIN}/api/drill/fake`, { method: "POST", headers: as(t.address) }));
    expect(res.status).toBe(200);
    made = (await res.json()).id;

    const row = await (await itemRoute(new NextRequest(`${ORIGIN}/api/items/${made}`, { headers: as(t.address) }), { params: Promise.resolve({ id: made! }) })).json();
    expect(row.sender).not.toBe(t.address);
    expect(row.reader).toBe(true);
    const { proven, paper } = await openItem(t, { id: row.id, houseId: row.house_id, sender: row.sender, title: row.title, envelope: row.envelope, signature: row.signature }, REST);
    expect(proven).toBe(false);
    expect(paper).not.toBeNull();

    // The member it claims: not a reader (D-14 says a sender always is), so the server marks it as not from them
    const theirs = await (await itemRoute(new NextRequest(`${ORIGIN}/api/items/${made}`, { headers: as(row.sender) }), { params: Promise.resolve({ id: made! }) })).json();
    expect(theirs).toMatchObject({ reader: false, fromMe: true });
    expect(theirs.envelope).toBeUndefined();
  });
});

describe("/api/drill/fake when alone (Staging)", () => {
  const alone = keysFrom(makeWords()).address; // made-up person, no keys on chain; removed afterwards
  afterAll(async () => {
    await db().from("house_members").delete().eq("address", alone);
    await db().from("houses").delete().eq("owner", alone);
    await db().from("people").delete().eq("address", alone);
  });

  // T-8.1 (failed state): no one else in the house, so nothing to fake; says how to fix it, nothing stored
  it("refuses with a next step when no one else is in the house", async () => {
    const { error } = await db().rpc("sign_in", { p_nonce: `test-${crypto.randomUUID()}`, p_address: alone, p_name: "Alone", p_card: {} });
    if (error) throw error;
    const res = await fakeRoute(new NextRequest(`${ORIGIN}/api/drill/fake`, { method: "POST", headers: as(alone) }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/^Add someone to your house first/);
    expect((await db().from("items").select("id").eq("sender", alone)).data).toEqual([]);
  });
});
