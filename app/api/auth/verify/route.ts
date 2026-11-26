import { NextResponse, type NextRequest } from "next/server";
import { parseSiwqMessage } from "@qorechain/qoresign";
import { verifySiwqWithChain } from "@qorechain/qoresign/network";
import { db } from "@/lib/db";
import { checkCard } from "@/lib/padlock";
import { NONCE, SESSION, SESSION_SECONDS, seal, unseal } from "@/lib/session";
import { nameFrom } from "@/lib/signin";
import { CHAIN_ID, REST } from "@/lib/settings";

// Sign In With QoreChain, the server half (AC-3.1–3.4). Any failure: 401 and nothing saved.
export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  try {
    const nonce = unseal(NONCE, req.cookies.get(NONCE)?.value);
    if (!nonce) throw new Error("no nonce, or it is out of date");
    const { message, signature, card } = await req.json();
    // Checks the domain, nonce and chain id, both signatures, and the ML-DSA-87 key the account has on chain.
    const f = await verifySiwqWithChain({ rest: REST, message, signature, domain: url.host, nonce, chainId: CHAIN_ID, address: parseSiwqMessage(message).address });
    const age = Date.now() - Date.parse(f.issuedAt);
    if (!(age > -60_000 && age < 600_000)) throw new Error("older than 10 minutes, or not a date"); // even with an expirationTime
    const name = nameFrom(f.statement)?.trim();
    if (!name || name.length > 80) throw new Error("no name in the statement");
    if (card?.address !== f.address) throw new Error("the card is for another account");
    await checkCard(card, REST);
    const { error } = await db().rpc("sign_in", { p_nonce: nonce, p_address: f.address, p_name: name, p_card: card });
    if (error) throw new Error(error.message); // a used nonce lands here (AC-3.4)

    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION, seal(SESSION, f.address, SESSION_SECONDS), {
      httpOnly: true, sameSite: "lax", secure: url.protocol === "https:", path: "/", maxAge: SESSION_SECONDS,
    });
    res.cookies.set(NONCE, "", { path: "/api/auth", maxAge: 0 });
    return res;
  } catch (e) {
    console.warn("sign-in refused:", (e as Error).message);
    return NextResponse.json({ error: "Sign-in failed. Try again." }, { status: 401 });
  }
}
