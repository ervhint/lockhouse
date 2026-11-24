// The house's recovery key (U10): its own 24 secret words, kept on paper. Once a member makes it, it is one more
// reader of every paper put in, and the words alone open those papers on a new device (AC-10.1).
import { deriveSealKeys, fromHex, toHex, type SealKeyPair } from "@qorechain/qoreseal";
import { signMessage, type MessageSignature } from "@qorechain/qoresign";
import { verifyMessageWithChain } from "@qorechain/qoresign/network";
import type { keysFrom } from "./keys";
import { CHAIN_ID } from "./settings";

type Keys = ReturnType<typeof keysFrom>;
/** What the house keeps: the public half of the recovery key, and who made it, signed by them. */
export type Recovery = { mlkem: string; x25519: string; by: string; signature: MessageSignature };

export const recoveryText = (houseId: string, mlkem: string, x25519: string) => `lockhouse-recovery-v1|${houseId}|${mlkem}|${x25519}`;

/** A secret only the words give (not the public key, which members see): it finds the papers on a new device. */
export async function lookupOf(seal: SealKeyPair) {
  const data = new TextEncoder().encode(`lockhouse-recovery-lookup-v1|${toHex(seal.seed)}`);
  return toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", data)));
}

/** What a member sends to give the house a recovery key: its public half, signed by them, and the lookup. */
export async function makeRecovery(keys: Keys, houseId: string, words: string) {
  const seal = deriveSealKeys({ mnemonic: words });
  const [mlkem, x25519] = [toHex(seal.mlkemPublicKey), toHex(seal.x25519PublicKey)];
  const signature = await signMessage({ chainId: CHAIN_ID, signer: keys.address, data: recoveryText(houseId, mlkem, x25519), classicalKey: keys.classical, pqKey: keys.pq });
  return { mlkem, x25519, signature, lookup: await lookupOf(seal) };
}

/** The recovery key as a reader, or throws unless a member of this house signed it (checked on chain),
 *  so a hacked server can't slip in a key of its own. */
export async function checkRecovery(r: Recovery, houseId: string, members: string[], rest: string) {
  if (!members.includes(r.by)) throw new Error("The recovery key was not made by a member of this house.");
  await verifyMessageWithChain({ rest, chainId: CHAIN_ID, signer: r.by, data: recoveryText(houseId, r.mlkem, r.x25519), signature: r.signature });
  return { mlkemPublicKey: fromHex(r.mlkem), x25519PublicKey: fromHex(r.x25519) };
}
