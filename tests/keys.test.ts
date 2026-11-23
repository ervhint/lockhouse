import { describe, expect, it } from "vitest";
import { checkWords, keysFrom, makeWords } from "../lib/keys";

// 24 valid words (the BIP-39 test vector for all-zero entropy).
const good = "abandon ".repeat(23) + "art";

describe("checkWords", () => {
  // T-1.5 wrong count or a typo that fails the checksum
  it("refuses 23 words and a changed word", () => {
    expect(checkWords(good.split(" ").slice(1).join(" "))).toBeNull();
    expect(checkWords(good.replace(/art$/, "zoo"))).toBeNull();
  });

  it("accepts 24 good words, tidying case and spaces", () => {
    expect(checkWords(`  ${good.toUpperCase().replace(/ /g, "\n  ")} `)).toBe(good);
  });
});

describe("keysFrom", () => {
  // T-1.4 restoring test words 1 gives test account 1 (the address funded at the faucet, PROGRESS U0)
  it.runIf(process.env.TEST_MNEMONIC_1)("gives back the test account's qor1 address", () => {
    expect(keysFrom(process.env.TEST_MNEMONIC_1!).address).toBe("qor1w0c3th6k7gu3ptylnz6ngv2lskw6vaa29s60ha");
  });

  // T-1.1 same words, same address, signing key and QoreSeal keys
  it("makes the same keys from the same words", () => {
    const [x, y] = [keysFrom(good), keysFrom(good)];
    expect(x.address).toMatch(/^qor1/);
    expect(y.address).toBe(x.address);
    expect(y.pq.publicKey).toEqual(x.pq.publicKey);
    expect(y.seal.mlkemPublicKey).toEqual(x.seal.mlkemPublicKey);
    expect(y.seal.x25519PublicKey).toEqual(x.seal.x25519PublicKey);
    expect(keysFrom(makeWords()).address).not.toBe(x.address);
  });
});
