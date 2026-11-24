// Putting in a paper (U5). The browser half: check the readers' cards, lock, sign. The checks the server shares.
// The file or note never leaves the browser unlocked (INV-1); its name and type travel inside the envelope (AC-5.2).
import { envelopeFromText, envelopeToText, open, seal, toHex, type RecipientCard, type SealKeyPair, type SealRecipient } from "@qorechain/qoreseal";
import { signMessage, type MessageSignature } from "@qorechain/qoresign";
import { verifyMessageWithChain } from "@qorechain/qoresign/network";
import type { keysFrom } from "./keys";
import { checkCard } from "./padlock";
import { CHAIN_ID, ITEM_PURPOSE } from "./settings";

type Keys = ReturnType<typeof keysFrom>;
export type Paper = { name: string; type: string; bytes: Uint8Array };
export type Item = { id: string; title: string; envelope: string; signature: MessageSignature; readers: string[] };

export const MAX_FILE = 2 * 1024 * 1024; // NF-4
export const MAX_TITLE = 80;
export const NOTE = { name: "Note", type: "text/plain" };

/** Null if the file fits, else its size and the limit (AC-5.4). */
export const fileProblem = (size: number) =>
  size <= MAX_FILE ? null : `This file is ${(size / 1024 / 1024).toFixed(1)} MB. The limit is ${MAX_FILE / 1024 / 1024} MB. Pick a smaller file or a smaller photo.`;

/** Null if the title is fine, else what to fix (AC-5.5). */
export function titleProblem(title: string) {
  const t = title.trim();
  if (!t) return "Give it a title.";
  return t.length > MAX_TITLE ? `Keep the title to ${MAX_TITLE} characters or fewer.` : null;
}

// What is locked: one JSON line with the name and type, then the bytes. JSON never holds a raw newline.
const enc = new TextEncoder();
export function pack(p: Paper) {
  const head = enc.encode(JSON.stringify({ name: p.name, type: p.type }) + "\n");
  const out = new Uint8Array(head.length + p.bytes.length);
  out.set(head);
  out.set(p.bytes, head.length);
  return out;
}
export function unpack(plain: Uint8Array): Paper {
  const cut = plain.indexOf(10);
  return { ...JSON.parse(new TextDecoder().decode(plain.subarray(0, cut))), bytes: plain.slice(cut + 1) };
}

/** The text a sender signs (INV-2, D-09): house, item, title and the SHA-256 of the envelope's bytes. */
export async function itemText(houseId: string, id: string, title: string, envelope: string) {
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", envelopeFromText(envelope) as BufferSource));
  return `lockhouse-item-v1|${houseId}|${id}|${title}|${toHex(hash)}`;
}

export const signItem = async (keys: Keys, houseId: string, id: string, title: string, envelope: string) =>
  signMessage({ chainId: CHAIN_ID, signer: keys.address, data: await itemText(houseId, id, title, envelope), classicalKey: keys.classical, pqKey: keys.pq });

/** Check each reader's card on chain, then seal one hybrid envelope with the item id as AAD (AC-5.1, INV-4).
 *  `extra`: readers with no card, already checked (the house's recovery key, U10). */
export async function lockCopy(paper: Paper, cards: RecipientCard[], rest: string, extra: SealRecipient[] = []) {
  const recipients = [...await Promise.all(cards.map((c) => checkCard(c, rest))), ...extra];
  const id = crypto.randomUUID();
  const envelope = envelopeToText(seal({ chainId: CHAIN_ID, purpose: ITEM_PURPOSE, recipients, plaintext: pack(paper), aad: enc.encode(id) }));
  return { id, envelope, readers: cards.map((c) => c.address) };
}

/** Open a paper (U6): check the sender's signature on chain, then open the envelope with my keys.
 *  `paper` is null if it can't be opened; `proven` is false if the signature doesn't check out (AC-6.1, AC-6.4). */
export async function openItem(keys: { seal: SealKeyPair }, it: { id: string; houseId: string; sender: string; title: string; envelope: string; signature: MessageSignature }, rest: string) {
  const proven = await verifyMessageWithChain({ rest, chainId: CHAIN_ID, signer: it.sender, data: await itemText(it.houseId, it.id, it.title, it.envelope), signature: it.signature })
    .then(() => true, (e) => { if ((e as { code?: string }).code === "NETWORK_UNAVAILABLE") throw e; return false; });
  let paper: Paper | null = null;
  try {
    paper = unpack(open({ chainId: CHAIN_ID, purpose: ITEM_PURPOSE, envelope: envelopeFromText(it.envelope), keys: keys.seal, aad: enc.encode(it.id) }));
  } catch { /* changed or not for me: no preview */ }
  return { proven, paper };
}

/** Lock and sign in one go (what the tests use; the Put In screen shows each step). */
export async function lockItem(a: { keys: Keys; houseId: string; title: string; file: Paper; cards: RecipientCard[]; extra?: SealRecipient[]; rest: string }): Promise<Item> {
  const copy = await lockCopy(a.file, a.cards, a.rest, a.extra);
  return { ...copy, title: a.title, signature: await signItem(a.keys, a.houseId, copy.id, a.title, copy.envelope) };
}
