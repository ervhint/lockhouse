// The Q-Day Drill (U7, D-11). QoreSeal has no old-lock-only mode, so the old lock is ours:
// X25519 + HKDF-SHA-256 (QoreSeal's own helpers) + AES-256-GCM (WebCrypto). Runs in the browser and in tests.
import { deriveKey, envelopeFromText, fromBase64Url, generateSealKeys, open, toBase64Url, x25519Agree, x25519PublicKey } from "@qorechain/qoreseal";
import { CHAIN_ID, ITEM_PURPOSE } from "./settings";

export const OLD_PREFIX = "oldlock:";
const PURPOSE = "lockhouse-drill-old-lock";

const aesKey = (shared: Uint8Array, salt: Uint8Array) =>
  crypto.subtle.importKey("raw", deriveKey({ shared, chainId: CHAIN_ID, purpose: PURPOSE, salt }) as BufferSource, "AES-GCM", false, ["encrypt", "decrypt"]);

/** Lock with the old lock only: one-time X25519 key, shared secret, AES-256-GCM. Text: `oldlock:` + base64url(onePub | iv | box). */
export async function oldLock(plain: Uint8Array, toX25519Public: Uint8Array) {
  const once = crypto.getRandomValues(new Uint8Array(32));
  const onePub = x25519PublicKey(once);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const box = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aesKey(x25519Agree(once, toX25519Public), onePub), plain as BufferSource));
  const out = new Uint8Array(32 + 12 + box.length);
  out.set(onePub);
  out.set(iv, 32);
  out.set(box, 44);
  return OLD_PREFIX + toBase64Url(out);
}

/** Open an old-lock copy with an X25519 secret key. Throws if it is the wrong key. */
export async function oldOpen(copy: string, x25519Secret: Uint8Array) {
  const raw = fromBase64Url(copy.slice(OLD_PREFIX.length));
  const onePub = raw.subarray(0, 32);
  const key = await aesKey(x25519Agree(x25519Secret, onePub), onePub);
  return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: raw.subarray(32, 44) as BufferSource }, key, raw.subarray(44) as BufferSource));
}

export type Given = { address: string; x25519Secret: string; oldCopy: string; mlkemPublicKey: Uint8Array };

/** Pretend Q-Day, in the Thief's browser (AC-7.3): every given old key is tried on every stored copy.
 *  The Thief also holds each member's public ML-KEM-1024 key (it is in the phone book), but only a guess for the secret one. */
export async function pretendQDay(copies: { id: string; envelope: string }[], given: Given[]) {
  const old: { address: string; plain: Uint8Array }[] = [];
  for (const g of given) {
    for (const k of given) {
      const plain = await oldOpen(g.oldCopy, fromBase64Url(k.x25519Secret)).catch(() => null);
      if (plain) { old.push({ address: g.address, plain }); break; }
    }
  }
  const shut = copies.filter((c) => !given.some((k) => {
    const sk = fromBase64Url(k.x25519Secret);
    const keys = { ...generateSealKeys(), x25519SecretKey: sk, x25519PublicKey: x25519PublicKey(sk), mlkemPublicKey: k.mlkemPublicKey };
    try { open({ chainId: CHAIN_ID, purpose: ITEM_PURPOSE, envelope: envelopeFromText(c.envelope), keys, aad: new TextEncoder().encode(c.id) }); return true; } catch { return false; }
  })).map((c) => c.id);
  return { old, shut };
}
