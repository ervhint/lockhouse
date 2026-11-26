// A paper's stamp on QoreChain (U11, D-17): a tiny hybrid-signed transaction from the sender to themselves, with the
// paper's fingerprint in its memo. The block time proves when the paper was put in; no one can change or back-date it.
import { MsgSend } from "cosmjs-types/cosmos/bank/v1beta1/tx";
import { toHex } from "@qorechain/qoresign";
import { inspectTransaction } from "@qorechain/qoresign/network";
import type { keysFrom } from "./keys";
import { sendTx, waitForTx } from "./padlock";
import { CHAIN_ID } from "./settings";

type Keys = ReturnType<typeof keysFrom>;

/** The memo: a fingerprint of the text the sender signs (INV-2), not of the copy alone, so the public store can't be matched to senders. */
export const stampMemo = async (text: string) =>
  `lockhouse-stamp-v1|${toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))))}`;

/** Send the stamp (1 uqor to myself, plus gas) and wait until it is committed (NF-6). Returns its tx hash. */
export async function stamp(keys: Keys, text: string, rest: string) {
  const toMyself = MsgSend.fromPartial({ fromAddress: keys.address, toAddress: keys.address, amount: [{ denom: "uqor", amount: "1" }] });
  const hash = await sendTx(keys, rest, { typeUrl: "/cosmos.bank.v1beta1.MsgSend", value: MsgSend.encode(toMyself).finish() }, true, await stampMemo(text));
  await waitForTx(hash, rest);
  return hash;
}

/** When the paper was stamped, or null if this stamp doesn't prove it (INV-6): committed, signed by the sender with an
 *  ML-DSA-87 layer that checks out against their key in the phone book, and this paper's memo. Throws if QoreChain isn't reached. */
export async function checkStamp(txhash: string, sender: string, text: string, rest: string) {
  const tx = await inspectTransaction({ rest, txhash, chainId: CHAIN_ID }); // the kit's own check, as the explorer does it
  if (!tx || tx.code !== 0 || tx.signer?.address !== sender || !tx.pqLayer.verified || tx.memo !== await stampMemo(text)) return null;
  const res = await fetch(`${rest}/cosmos/tx/v1beta1/txs/${txhash}`); // the block time: inspectTransaction doesn't give it
  if (!res.ok) throw Object.assign(new Error("Can't read when it was stamped."), { code: "NETWORK_UNAVAILABLE" });
  return new Date((await res.json()).tx_response.timestamp);
}
