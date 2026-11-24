import { afterAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { envelopeToText, generateSealKeys, recipientOf, seal, toBase64Url } from "@qorechain/qoreseal";
import { oldLock, oldOpen, pretendQDay } from "../lib/drill";
import { CHAIN_ID, ITEM_PURPOSE } from "../lib/settings";
import { keysFrom } from "../lib/keys";
import { db } from "../lib/db";
import { SESSION, seal as sealCookie } from "../lib/session";
import { GET as drillRoute, POST as giveRoute } from "../app/api/drill/route";

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
