import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as nonceRoute } from "../app/api/auth/nonce/route";
import { POST as verifyRoute } from "../app/api/auth/verify/route";
import { POST as signOutRoute } from "../app/api/auth/sign-out/route";
import { GET as houseRoute } from "../app/api/house/route";
import { db } from "../lib/db";
import { keysFrom, makeWords } from "../lib/keys";
import { signInBody } from "../lib/signin";

const ORIGIN = "http://localhost:3000";
const ayu = process.env.TEST_MNEMONIC_1; // registered on testnet in U2

async function getNonce() {
  const res = await nonceRoute();
  return { nonce: (await res.json()).nonce as string, cookie: res.cookies.get("lockhouse_nonce")!.value };
}
const verify = (body: unknown, nonceCookie: string, origin = ORIGIN) =>
  verifyRoute(new NextRequest(`${origin}/api/auth/verify`, { method: "POST", body: JSON.stringify(body), headers: { cookie: `lockhouse_nonce=${nonceCookie}` } }));
async function person(address: string) {
  const { data, error } = await db().from("people").select("name, card").eq("address", address).maybeSingle();
  if (error) throw error;
  return data;
}

describe("member routes", () => {
  // T-3.5 (API part) no session, or a made-up one: 401
  it("answer 401 without a session", async () => {
    expect((await houseRoute(new NextRequest(`${ORIGIN}/api/house`))).status).toBe(401);
    const forged = new NextRequest(`${ORIGIN}/api/house`, { headers: { cookie: "lockhouse_session=qor1w0c3th6k7gu3ptylnz6ngv2lskw6vaa29s60ha.9999999999999.abc" } });
    expect((await houseRoute(forged)).status).toBe(401);
  });
});

describe.runIf(ayu)("Sign In With QoreChain (testnet + Staging)", () => {
  // T-3.1 a registered account signs in: session cookie httpOnly, SameSite=Lax, 7 days
  // T-3.2 name and checked card saved; a house with this person in it
  // T-3.4 the same nonce sent again is refused
  // T-3.5 the session opens the member routes; T-3.6 Sign Out ends it
  it("signs in once per nonce, saves the person and their house", async () => {
    const keys = keysFrom(ayu!);
    const { nonce, cookie } = await getNonce();
    const body = signInBody(keys, "Ayu", nonce, ORIGIN);
    const res = await verify(body, cookie);
    expect(res.status).toBe(200);
    const session = res.cookies.get("lockhouse_session")!;
    expect(session).toMatchObject({ httpOnly: true, sameSite: "lax", maxAge: 7 * 24 * 3600, path: "/" });
    expect(session.secure).toBeFalsy(); // http on localhost; Secure when deployed (https)

    expect(await person(keys.address)).toEqual({ name: "Ayu", card: body.card });
    const { data: member } = await db().from("house_members").select("house_id").eq("address", keys.address).single();
    expect(member?.house_id).toBeTruthy();

    expect((await verify(body, cookie)).status).toBe(401);

    const withSession = new NextRequest(`${ORIGIN}/api/house`, { headers: { cookie: `lockhouse_session=${session.value}` } });
    expect((await houseRoute(withSession)).status).toBe(200);
    expect((await signOutRoute()).cookies.get("lockhouse_session")).toMatchObject({ value: "", maxAge: 0, path: "/" });
  }, 60_000);

  // T-3.1 Secure when deployed: a sign-in over https gets a Secure cookie
  it("sets a Secure session cookie over https", async () => {
    const https = "https://lockhouse.example";
    const { nonce, cookie } = await getNonce();
    const res = await verify(signInBody(keysFrom(ayu!), "Ayu", nonce, https), cookie, https);
    expect(res.status).toBe(200);
    expect(res.cookies.get("lockhouse_session")?.secure).toBe(true);
  }, 60_000);

  // T-3.3 wrong nonce, another domain, 11 minutes old, no signing key on chain: refused, nothing saved
  it("refuses a wrong nonce, another domain, an old message and an account with no signing key", async () => {
    const keys = keysFrom(ayu!);
    const marker = `Refused ${Date.now()}`; // if any of these were saved, Ayu's name would become this
    const elevenMinutesAgo = new Date(Date.now() - 11 * 60_000);
    const fresh = keysFrom(makeWords());
    for (const make of [
      (n: string) => signInBody(keys, marker, n + "0", ORIGIN),
      (n: string) => signInBody(keys, marker, n, "https://evil.example"),
      (n: string) => signInBody(keys, marker, n, ORIGIN, elevenMinutesAgo),
      (n: string) => signInBody(fresh, marker, n, ORIGIN),
    ]) {
      const { nonce, cookie } = await getNonce();
      const res = await verify(make(nonce), cookie);
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: "Sign-in failed. Try again." });
      expect(res.cookies.get("lockhouse_session")).toBeUndefined();
    }
    expect((await person(keys.address))?.name).not.toBe(marker);
    expect(await person(fresh.address)).toBeNull();
  }, 60_000);
});
