// Putting in a paper (U5). The browser half: check the readers' cards, lock, sign. The checks the server shares.
// The file or note never leaves the browser unlocked (INV-1); its name and type travel inside the envelope (AC-5.2).
import { envelopeFromText, envelopeToText, open, seal, toHex, type RecipientCard, type SealKeyPair, type SealRecipient } from "@qorechain/qoreseal";
import { signMessage, type MessageSignature } from "@qorechain/qoresign";
import { verifyMessageWithChain } from "@qorechain/qoresign/network";
import type { keysFrom } from "./keys";
import { checkCard, reason } from "./padlock";
import { checkRecovery, type Recovery } from "./recovery";
import { CHAIN_ID, ITEM_PURPOSE } from "./settings";
import { checkStamp, stamp } from "./stamp";

type Keys = ReturnType<typeof keysFrom>;
export type Paper = { name: string; type: string; bytes: Uint8Array };
export type Item = { id: string; title: string; envelope: string; signature: MessageSignature; readers: string[]; stamp?: string };

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

/** A picture as a data: URL. A blob: URL would carry this site's origin, so an SVG opened in its own tab could run
 *  script here and read the keys in localStorage; a data: URL has no origin of ours. */
export const pictureUrl = (p: Paper) => new Promise<string>((ok, no) => {
  const r = new FileReader();
  r.onload = () => ok(r.result as string);
  r.onerror = no;
  r.readAsDataURL(new Blob([p.bytes as BlobPart], { type: p.type }));
});

/** Check each reader's card on chain, then seal one hybrid envelope with the item id as AAD (AC-5.1, INV-4).
 *  `extra`: readers with no card, already checked (the house's recovery key, U10). `id`: keep a paper's id (Change Readers, U12). */
export async function lockCopy(paper: Paper, cards: RecipientCard[], rest: string, extra: SealRecipient[] = [], id: string = crypto.randomUUID()) {
  const recipients = [...await Promise.all(cards.map((c) => checkCard(c, rest))), ...extra];
  const envelope = envelopeToText(seal({ chainId: CHAIN_ID, purpose: ITEM_PURPOSE, recipients, plaintext: pack(paper), aad: enc.encode(id) }));
  return { id, envelope, readers: cards.map((c) => c.address) };
}

/** Open a paper (U6): check the sender's signature and the paper's stamp on chain, then open the envelope with my keys.
 *  `paper` is null if it can't be opened; `proven` is false if the signature doesn't check out (AC-6.1, AC-6.4);
 *  `stamp` is null if it has none, and its `at` is null if the stamp doesn't prove this paper (AC-11.4, AC-11.5). */
export async function openItem(keys: { seal: SealKeyPair }, it: { id: string; houseId: string; sender: string; title: string; envelope: string; signature: MessageSignature; stamp?: string | null }, rest: string) {
  const text = await itemText(it.houseId, it.id, it.title, it.envelope);
  const [proven, at] = await Promise.all([
    verifyMessageWithChain({ rest, chainId: CHAIN_ID, signer: it.sender, data: text, signature: it.signature })
      .then(() => true, (e) => { if ((e as { code?: string }).code === "NETWORK_UNAVAILABLE") throw e; return false; }),
    it.stamp ? checkStamp(it.stamp, it.sender, text, rest) : null,
  ]);
  let paper: Paper | null = null;
  try {
    paper = unpack(open({ chainId: CHAIN_ID, purpose: ITEM_PURPOSE, envelope: envelopeFromText(it.envelope), keys: keys.seal, aad: enc.encode(it.id) }));
  } catch { /* changed or not for me: no preview */ }
  return { proven, paper, stamp: it.stamp ? { hash: it.stamp, at } : null };
}

/** Lock and sign in one go (what the tests use; the Put In screen shows each step). */
export async function lockItem(a: { keys: Keys; houseId: string; title: string; file: Paper; cards: RecipientCard[]; extra?: SealRecipient[]; rest: string; id?: string }): Promise<Item> {
  const copy = await lockCopy(a.file, a.cards, a.rest, a.extra, a.id);
  return { ...copy, title: a.title, signature: await signItem(a.keys, a.houseId, copy.id, a.title, copy.envelope) };
}

/** Put In and Change Readers (S-07, S-13): check the house's recovery key and each reader's card on chain, lock on this
 *  device, sign, then stamp on QoreChain. `onStep` shows each next step as it starts. Nothing is sent to our server here;
 *  if a step fails it throws an Error that says, in plain words, why nothing was saved (AC-5.1, AC-11.2, AC-12.4). */
export async function lockSignStamp(a: { keys: Keys; house: { id: string; members: { address: string }[]; recovery: Recovery | null }; title: string; paper: Paper;
  cards: RecipientCard[]; rest: string; id?: string; onStep: (s: "signing" | "stamping") => Promise<unknown> | void }): Promise<Item> {
  let extra: SealRecipient[];
  try { // the house's recovery key, if any, is one more reader; a member must have signed it (U10)
    extra = a.house.recovery ? [await checkRecovery(a.house.recovery, a.house.id, a.house.members.map((m) => m.address), a.rest)] : [];
  } catch {
    throw new Error("The house's recovery key didn't check out on QoreChain, so nothing was locked or sent. Try again in a moment.");
  }
  let item: Item;
  try {
    performance.mark("lock-start");
    const copy = await lockCopy(a.paper, a.cards, a.rest, extra, a.id);
    console.info(`Locked for ${a.cards.length} readers in ${Math.round(performance.measure("lock", "lock-start").duration)} ms (card checks included)`);
    await a.onStep("signing");
    item = { ...copy, title: a.title, signature: await signItem(a.keys, a.house.id, copy.id, a.title, copy.envelope) };
  } catch {
    throw new Error("A reader's signed card didn't check out on QoreChain, so nothing was locked or sent. Try again; if it keeps failing, ask them to sign in again to renew their card.");
  }
  await a.onStep("stamping");
  try { // the stamp goes on chain before saving: if it fails, nothing is saved (AC-11.2, D-17)
    item.stamp = await stamp(a.keys, await itemText(a.house.id, item.id, item.title, item.envelope), a.rest);
  } catch (e) {
    throw new Error(`Couldn't stamp it on QoreChain, so nothing was saved. ${reason(e, "the stamp")}`);
  }
  return item;
}
