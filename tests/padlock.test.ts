import { describe, expect, it } from "vitest";
import { QoreSignError } from "@qorechain/qoresign";
import { fetchPqKeyStatus } from "@qorechain/qoresign/network";
import { fetchKemKey } from "@qorechain/qoreseal/network";
import { chainStatus, checkCard, reason, send, signCard, waitForTx } from "../lib/padlock";
import { keysFrom, makeWords } from "../lib/keys";
import { REST } from "../lib/settings";

describe("reason", () => {
  // T-2.6 the chain's refusal codes 250–254 (codespace pqc) in plain words
  it("explains the padlock refusals in plain words", () => {
    const say = (code: number) => reason({ code, codespace: "pqc", log: "raw" });
    expect(say(250)).toBe("QoreChain can't take padlocks yet. Try again later.");
    expect(say(251)).toBe("QoreChain says this padlock is not valid. Try again.");
    expect(say(252)).toBe("QoreChain has no padlock for this account yet.");
    expect(say(253)).toBe("This padlock is already in the Phone Book.");
    expect(say(254)).toBe("Your signing key must be in the Phone Book first. Finish Signature 1 of 2, then try again.");
  });

  it("explains a refusal found while simulating, and running out of test QOR", () => {
    expect(reason(new QoreSignError("SIMULATION_FAILED", "simulation refused", { code: 254, codespace: "pqc", log: "x" }))).toMatch(/^Your signing key must be/);
    expect(reason({ code: 5, codespace: "sdk", log: "spendable balance 0uqor is smaller than 4000uqor: insufficient funds" })).toBe("Not enough test QOR for the network fee. Get some from the faucet, then try again.");
  });

  it("falls back to the chain's own text, then to the error message", () => {
    expect(reason({ code: 7, codespace: "sdk", log: "invalid address" })).toBe("QoreChain said: invalid address");
    expect(reason(new QoreSignError("NETWORK_UNAVAILABLE", "broadcast request failed"))).toBe("Can't reach QoreChain right now. Check your connection and try again.");
    expect(reason(new Error("not confirmed within 60 seconds"))).toBe("not confirmed within 60 seconds");
  });
});

// Integration on the qorechain-diana testnet, test account 1 (funded at the faucet, PROGRESS U0).
// Re-runs skip steps already on chain, so the account only pays once.
describe("on testnet", () => {
  it("an account the chain doesn't know has no test QOR and nothing registered", async () => {
    expect(await chainStatus(keysFrom(makeWords()), REST)).toEqual({ uqor: 0n, signingKey: false, padlock: false });
  });

  // T-2.4 both registrations confirm; the chain shows the signing key (proof: yes) and the ML-KEM-1024 padlock
  // T-2.7 the card signed in the browser checks out against the chain
  it.runIf(process.env.TEST_MNEMONIC_1)("registers the signing key and padlock, then the card checks out", async () => {
    const keys = keysFrom(process.env.TEST_MNEMONIC_1!);
    const before = await chainStatus(keys, REST);
    if (!before.signingKey) await waitForTx(await send(1, keys, REST), REST);
    if (!before.padlock) await waitForTx(await send(2, keys, REST), REST);

    const pq = await fetchPqKeyStatus({ rest: REST, address: keys.address });
    expect(pq.registered && pq.possessionProven).toBe(true);
    const kem = await fetchKemKey({ rest: REST, address: keys.address });
    expect(kem.algorithmId).toBe(2); // ML-KEM-1024
    expect(kem.publicKey).toEqual(keys.seal.mlkemPublicKey);
    expect(await chainStatus(keys, REST)).toMatchObject({ signingKey: true, padlock: true });
    await expect(checkCard(signCard(keys), REST)).resolves.toBeUndefined();
    // Another account's card doesn't check out as this one's.
    await expect(checkCard({ ...signCard(keys), x25519PublicKey: "00".repeat(32) }, REST)).rejects.toThrow();
  }, 180_000);
});
