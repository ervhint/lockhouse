import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { keysFrom, makeWords } from "../lib/keys";
import { reason } from "../lib/padlock";
import { checkStamp, stamp } from "../lib/stamp";
import { REST } from "../lib/settings";

const ayu = process.env.TEST_MNEMONIC_1; // funded, padlock on testnet since U2
const tari = process.env.TEST_MNEMONIC_2;

describe.runIf(ayu && tari)("stamp and checkStamp (testnet)", () => {
  // T-11.1 a stamp proves the paper it was made for, from its own sender, and nothing else
  it("proves its own paper only", async () => {
    const [a, t] = [keysFrom(ayu!), keysFrom(tari!)];
    const text = `lockhouse-item-v1|${randomUUID()}|${randomUUID()}|Stamp Test|00`;
    const t0 = Date.now();
    const hash = await stamp(a, text, REST);
    console.log(`Stamp committed in ${Date.now() - t0} ms`);
    const at = await checkStamp(hash, a.address, text, REST);
    expect(Math.abs(at!.getTime() - Date.now())).toBeLessThan(120_000);
    expect(await checkStamp(hash, a.address, `${text}x`, REST)).toBeNull(); // the title or copy changed
    expect(await checkStamp(hash, t.address, text, REST)).toBeNull(); // claims another sender
    expect(await checkStamp("0".repeat(64), a.address, text, REST)).toBeNull(); // no such transaction
  }, 120_000);
});

describe("stamp (testnet)", () => {
  // T-11.3 an account with no test QOR can't stamp, and is told what to do
  it("tells an account with no test QOR to get some", async () => {
    const failed = await stamp(keysFrom(makeWords()), "lockhouse-item-v1|test", REST).then(() => null, (e) => e);
    expect(reason(failed, "the stamp")).toBe("QoreChain doesn't know your account yet. Get test QOR from the faucet first.");
  });
});
