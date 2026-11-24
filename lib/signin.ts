// Sign In With QoreChain, the browser half (U3). The server half is app/api/auth/verify.
import { createSiwqMessage, signSiwq } from "@qorechain/qoresign";
import type { keysFrom } from "./keys";
import { signCard } from "./padlock";
import { CHAIN_ID } from "./settings";

const STATEMENT = "Sign in to Lockhouse as ";
/** The name a person signed into the statement (D-05), or null if the statement isn't ours. */
export const nameFrom = (statement = "") => statement.startsWith(STATEMENT) ? statement.slice(STATEMENT.length) : null;

/** What the browser sends to /api/auth/verify: the signed message and the recipient card. */
export function signInBody(keys: ReturnType<typeof keysFrom>, name: string, nonce: string, origin: string, issuedAt = new Date()) {
  const url = new URL(origin);
  const message = createSiwqMessage({
    domain: url.host, scheme: url.protocol.slice(0, -1), uri: url.origin, version: "1",
    address: keys.address, statement: STATEMENT + name, chainId: CHAIN_ID, nonce, issuedAt: issuedAt.toISOString(),
  });
  return { message, signature: signSiwq({ message, classicalKey: keys.classical, pqKey: keys.pq }), card: signCard(keys) };
}
