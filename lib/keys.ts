// Keys from the 24 secret words. Everything here runs in the browser; the words never leave it (INV-1).
import { generateMnemonic, validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { deriveClassicalKey, addressFromPublicKey, deriveCanonicalPqKey } from "@qorechain/qoresign";
import { deriveSealKeys } from "@qorechain/qoreseal";

/** Everything the words give: the qor1 address, the classical and ML-DSA-87 signing keys, the QoreSeal keys. */
export function keysFrom(words: string) {
  const classical = deriveClassicalKey({ mnemonic: words });
  const address = addressFromPublicKey(classical.publicKey, classical.type).bech32;
  return { address, classical, pq: deriveCanonicalPqKey({ mnemonic: words, address }), seal: deriveSealKeys({ mnemonic: words }) };
}

// This browser's keys: the name and the words, in localStorage only. `signedInBefore`: the server once
// accepted a sign-in from them, so the padlock is done and Welcome can point to Sign In.
const SLOT = "lockhouse";
export type Saved = { name: string; words: string; signedInBefore?: true };
export const loadKeys = (): Saved | null => JSON.parse(localStorage.getItem(SLOT) ?? "null");
export const saveKeys = (s: Saved) => localStorage.setItem(SLOT, JSON.stringify(s));
export const forgetKeys = () => localStorage.removeItem(SLOT);

/** New words handed from S-02 to S-03 in memory only, so the backup screen shows them once (AC-1.2). */
export const shown: { words: string | null } = { words: null };

/** 24 new secret words (256 bits). */
export const makeWords = () => generateMnemonic(wordlist, 256);

/** Tidied words if they are 24 words with a good checksum, else null. */
export function checkWords(text: string) {
  const words = text.trim().toLowerCase().split(/\s+/).join(" ");
  return words.split(" ").length === 24 && validateMnemonic(words, wordlist) ? words : null;
}
