// Registering the padlock (U2): the signing key, then the ML-KEM-1024 padlock, then the signed card.
// Runs in the browser; the words and secret keys never leave it (INV-1). `rest` is /api/chain there (D-03).
// Transactions are built like the kits' testnet examples (D-04): QoreSign register-and-send, QoreSeal register-and-encrypt.
import { encodeSecp256k1Pubkey } from "@cosmjs/amino";
import { encodePubkey, makeAuthInfoBytes } from "@cosmjs/proto-signing";
import { TxBody } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { buildRegisterPqKeyMessage, signHybrid, toHex, type AnyMessage, type SignBytesVersion } from "@qorechain/qoresign";
import { broadcastTx, fetchPqKeyStatus, simulateTx, submitWithSignBytesFallback } from "@qorechain/qoresign/network";
import { buildRegisterKemKeyMessage, signRecipientCard, verifyRecipientCard, type RecipientCard } from "@qorechain/qoreseal";
import { fetchKemKey, fetchMlkemPublicKey } from "@qorechain/qoreseal/network";
import type { keysFrom } from "./keys";
import { CHAIN_ID } from "./settings";

type Keys = ReturnType<typeof keysFrom>;
type Refusal = { code: number; codespace: string; log: string };
const refused = (r: Refusal) => Object.assign(new Error(r.log), r);

/** What the chain knows about this account: test QOR (in uqor), the signing key, our padlock. */
export async function chainStatus(keys: Keys, rest: string) {
  const res = await fetch(`${rest}/cosmos/bank/v1beta1/balances/${keys.address}`);
  if (!res.ok) throw new Error("Can't read your test QOR right now. Try again.");
  const { balances } = (await res.json()) as { balances: { denom: string; amount: string }[] };
  const [pq, kem] = await Promise.all([fetchPqKeyStatus({ rest, address: keys.address }), fetchKemKey({ rest, address: keys.address })]);
  return {
    uqor: BigInt(balances.find((b) => b.denom === "uqor")?.amount ?? "0"),
    // ponytail: any registered signing key counts; this app only ever makes the canonical one.
    signingKey: pq.registered,
    padlock: kem.registered && toHex(kem.publicKey!) === toHex(keys.seal.mlkemPublicKey),
  };
}

/** Sign and send step 1 (signing key, classical-only signature) or step 2 (padlock, hybrid). Returns the tx hash. */
export const send = (step: 1 | 2, keys: Keys, rest: string) => sendTx(keys, rest, step === 1
  ? buildRegisterPqKeyMessage({ chainId: CHAIN_ID, account: keys.address, pqKey: keys.pq, classicalPublicKey: keys.classical.publicKey })
  : buildRegisterKemKeyMessage({ sender: keys.address, mlkemPublicKey: keys.seal.mlkemPublicKey }), step === 2);

/** Sign and send one message, hybrid or classical-only (D-04), with an optional memo (U11). Returns the tx hash. */
export async function sendTx(keys: Keys, rest: string, msg: AnyMessage, hybrid: boolean, memo = "") {
  const res = await fetch(`${rest}/cosmos/auth/v1beta1/account_info/${keys.address}`);
  if (!res.ok) throw new Error("QoreChain doesn't know your account yet. Get test QOR from the faucet first.");
  const { info } = await res.json();
  const [accountNumber, sequence] = [BigInt(info.account_number), BigInt(info.sequence ?? "0")];
  const bodyBytes = TxBody.encode(TxBody.fromPartial({ messages: [msg], memo })).finish();
  const sign = (gas: bigint, signBytesVersion?: SignBytesVersion) => signHybrid({
    chainId: CHAIN_ID, accountNumber, bodyBytes, classicalKey: keys.classical, pqKey: keys.pq, signBytesVersion,
    mode: hybrid ? "hybrid" : "classicalOnly",
    authInfoBytes: makeAuthInfoBytes(
      [{ pubkey: encodePubkey(encodeSecp256k1Pubkey(keys.classical.publicKey)), sequence }],
      [{ denom: "uqor", amount: ((gas + 9n) / 10n).toString() }], // 0.1 uqor per gas
      Number(gas), undefined, undefined, 1, // SIGN_MODE_DIRECT
    ),
  }).txBytes;
  const gas = (await simulateTx({ rest, txBytes: sign(600_000n) })).suggestedGasLimit;
  const sent = hybrid
    ? await submitWithSignBytesFallback({ rest, chainId: CHAIN_ID, sign: (v) => sign(gas, v) })
    : await broadcastTx({ rest, txBytes: sign(gas) });
  if (sent.code !== 0) throw refused(sent);
  return sent.txhash;
}

/** Wait up to 60 s for the transaction to be committed (NF-6); throws if it failed or never came. */
export async function waitForTx(txhash: string, rest: string) {
  for (let i = 0; i < 40; i++) {
    const res = await fetch(`${rest}/cosmos/tx/v1beta1/txs/${txhash}`).catch(() => null);
    if (res?.ok) {
      const tr = (await res.json()).tx_response;
      if (Number(tr.code) !== 0) throw refused({ code: Number(tr.code), codespace: tr.codespace, log: tr.raw_log });
      return;
    }
    await new Promise((ok) => setTimeout(ok, 1500));
  }
  throw new Error("QoreChain didn't confirm it within 60 seconds. Try again.");
}

/** The recipient card: the X25519 key family members need for the hybrid lock, signed with both keys. */
export const signCard = (keys: Keys) =>
  signRecipientCard({ chainId: CHAIN_ID, address: keys.address, keys: keys.seal, classicalKey: keys.classical, pqKey: keys.pq });

/** The hybrid recipient, or throws unless the card matches both keys the account has on chain (AC-2.7; U3, U4 and U5 check it again). */
export async function checkCard(card: RecipientCard, rest: string) {
  const [pq, mlkemPublicKey] = await Promise.all([fetchPqKeyStatus({ rest, address: card.address }), fetchMlkemPublicKey({ rest, address: card.address })]);
  if (!pq.publicKey) throw Object.assign(new Error("This account has no signing key in the Phone Book yet."), { code: "PQ_KEY_NOT_REGISTERED" });
  return verifyRecipientCard({ card, chainId: CHAIN_ID, pqPublicKey: pq.publicKey, mlkemPublicKey });
}

const PADLOCK_REFUSALS: Record<number, string> = {
  250: "QoreChain can't take padlocks yet. Try again later.",
  251: "QoreChain says this padlock is not valid. Try again.",
  252: "QoreChain has no padlock for this account yet.",
  253: "This padlock is already in the Phone Book.",
  254: "Your signing key must be in the Phone Book first. Finish Signature 1 of 2, then try again.",
};

/** Any failure in plain words (AC-2.6, AC-11.2): our own text for known refusals, else the chain's or the kit's. */
export function reason(err: unknown, what = "the registration"): string {
  const e = err as Partial<Refusal> & { message?: string; details?: Partial<Refusal> };
  if ((e?.code as unknown) === "NETWORK_UNAVAILABLE") return "Can't reach QoreChain right now. Check your connection and try again.";
  const r = e?.details?.log !== undefined ? e.details : typeof e?.code === "number" ? e : undefined;
  if (r) {
    if (r.codespace === "pqc" && PADLOCK_REFUSALS[r.code!]) return PADLOCK_REFUSALS[r.code!];
    if (/insufficient funds|insufficient fee/i.test(r.log ?? "")) return "Not enough test QOR for the network fee. Get some from the faucet, then try again.";
    return `QoreChain said: ${r.log}`;
  }
  return e?.message || `Something stopped ${what}. Try again.`;
}
