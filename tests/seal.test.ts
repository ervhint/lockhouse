import { describe, expect, it } from "vitest";
import { generateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { deriveSealKeys, recipientOf, seal, open } from "@qorechain/qoreseal";
import { CHAIN_ID, ITEM_PURPOSE } from "../lib/settings";

const words = (n: number) => process.env[`TEST_MNEMONIC_${n}`] ?? generateMnemonic(wordlist, 256);
const [a, b, c] = [1, 2, 3].map((n) => deriveSealKeys({ mnemonic: words(n) }));
const base = { chainId: CHAIN_ID, purpose: ITEM_PURPOSE };
const codeOf = (f: () => unknown) => {
  try { f(); } catch (e) { return (e as { code?: string }).code; }
};
const note = new TextEncoder().encode("a made-up note");
const envelope = seal({ ...base, recipients: [recipientOf(a), recipientOf(b)], plaintext: note });

describe("QoreSeal", () => {
  // T-0.2 one lock, many readers
  it("opens for both readers and refuses a third", () => {
    expect(open({ ...base, envelope, keys: a })).toEqual(note);
    expect(open({ ...base, envelope, keys: b })).toEqual(note);
    expect(codeOf(() => open({ ...base, envelope, keys: c }))).toBe("NOT_A_RECIPIENT");
  });

  // T-0.3 the drill: the old key (X25519) alone does not open a hybrid envelope
  it("stays shut with the right X25519 key but the wrong ML-KEM-1024 key", () => {
    const halfStolen = { ...c, x25519SecretKey: a.x25519SecretKey, x25519PublicKey: a.x25519PublicKey, mlkemPublicKey: a.mlkemPublicKey };
    const code = codeOf(() => open({ ...base, envelope, keys: halfStolen }));
    expect(code).toBeDefined();
    expect(code).not.toBe("NOT_A_RECIPIENT"); // the entry was found; the lock itself held
  });
});
