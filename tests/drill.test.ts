import { afterAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { envelopeToText, generateSealKeys, recipientOf, seal, toBase64Url } from "@qorechain/qoreseal";
import { oldLock, oldOpen, pretendQDay } from "../lib/drill";
import { CHAIN_ID, ITEM_PURPOSE } from "../lib/settings";
import { keysFrom, makeWords } from "../lib/keys";
import { db } from "../lib/db";
import { SESSION, seal as sealCookie } from "../lib/session";
import { GET as drillRoute, POST as giveRoute } from "../app/api/drill/route";
import { POST as fakeRoute } from "../app/api/drill/fake/route";
import { GET as itemRoute } from "../app/api/items/[id]/route";
import { openItem } from "../lib/items";
import { REST } from "../lib/settings";

describe("the old lock", () => {
  // T-7.6 opens with the right X25519 key; fails with any other
  it("opens only with its own X25519 secret key", async () => {
    const [me, other] = [generateSealKeys(), generateSealKeys()];
    const plain = new TextEncoder().encode("a made-up drill paper");
    const copy = await oldLock(plain, me.x25519PublicKey);
    expect(copy.startsWith("oldlock:")).toBe(true);
    expect(await oldOpen(copy, me.x25519SecretKey)).toEqual(plain);
    await expect(oldOpen(copy, other.x25519SecretKey)).rejects.toThrow();
  });
});

describe("pretendQDay", () => {
  // T-7.3 (logic): each old key on every copy: old-lock copies open, Lockhouse copies stay shut
  it("opens the old-lock copy and leaves the hybrid copy shut, even with the public ML-KEM-1024 key", async () => {
    const [a, b] = [generateSealKeys(), generateSealKeys()];
    const id = crypto.randomUUID();
    const envelope = envelopeToText(seal({ chainId: CHAIN_ID, purpose: ITEM_PURPOSE, recipients: [recipientOf(a), recipientOf(b)], plaintext: new Uint8Array([1, 2, 3]), aad: new TextEncoder().encode(id) }));
    const sample = new TextEncoder().encode("drill sample");
    const given = [{ address: "a", x25519Secret: toBase64Url(a.x25519SecretKey), oldCopy: await oldLock(sample, a.x25519PublicKey), mlkemPublicKey: a.mlkemPublicKey }];
    const result = await pretendQDay([{ id, envelope }], given);
    expect(result.old).toEqual([{ address: "a", plain: sample }]);
    expect(result.shut).toEqual([id]);
  });
});

const tari = process.env.TEST_MNEMONIC_2; // in people on Staging, with her card
const ORIGIN = "http://localhost:3000";
const give = (by: string | null, body: unknown) =>
  giveRoute(new NextRequest(`${ORIGIN}/api/drill`, { method: "POST", headers: by ? { cookie: `${SESSION}=${sealCookie(SESSION, by, 600)}` } : {}, body: JSON.stringify(body) }));

describe.runIf(tari)("/api/drill (Staging)", () => {
  afterAll(async () => { await db().from("drill_keys").delete().eq("address", keysFrom(tari!).address); });

  // T-7.2 (route half): only the old-lock copy and the X25519 secret key, and only my own
  it("takes my old key and my old-lock copy, nothing else, and shows them to anyone", async () => {
    const t = keysFrom(tari!);
    const good = { oldCopy: await oldLock(new Uint8Array([9]), t.seal.x25519PublicKey), x25519Secret: toBase64Url(t.seal.x25519SecretKey) };
    expect((await give(null, good)).status).toBe(401);
    expect((await give(t.address, { ...good, words: tari })).status).toBe(400);
    const stranger = generateSealKeys();
    expect((await give(t.address, { oldCopy: await oldLock(new Uint8Array([9]), stranger.x25519PublicKey), x25519Secret: toBase64Url(stranger.x25519SecretKey) })).status).toBe(400);
    expect((await give(t.address, good)).status).toBe(200);

    // T-7.1 (route half): anyone, no session; copies carry no title, names or readers
    const res = await (await drillRoute()).json();
    expect(res.given).toContainEqual({ address: t.address, ...good });
    for (const c of res.copies) expect(Object.keys(c).sort()).toEqual(["envelope", "id"]);
  });
});

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
