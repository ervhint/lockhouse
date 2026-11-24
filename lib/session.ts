// Signed cookies (D-06): `value.expiresMs.hmac`, HMAC-SHA256 with SESSION_SECRET. Server only.
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const SESSION = "lockhouse_session";
export const NONCE = "lockhouse_nonce";
export const SESSION_SECONDS = 7 * 24 * 3600;

// The cookie name is part of what is signed, so a nonce cookie can't pass as a session.
const mac = (name: string, body: string) => createHmac("sha256", process.env.SESSION_SECRET!).update(`${name}|${body}`).digest("base64url");

export function seal(name: string, value: string, seconds: number) {
  const body = `${value}.${Date.now() + seconds * 1000}`;
  return `${body}.${mac(name, body)}`;
}

/** The value inside a cookie made by `seal`, or null if it is missing, changed or out of date. */
export function unseal(name: string, token: string | undefined) {
  if (!token) return null;
  const body = token.slice(0, token.lastIndexOf("."));
  const [got, want] = [Buffer.from(token.slice(body.length + 1)), Buffer.from(mac(name, body))];
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  const value = body.slice(0, body.lastIndexOf("."));
  return Number(body.slice(value.length + 1)) > Date.now() ? value : null;
}

/** For member-only pages: the signed-in qor1 address, else off to Sign In (AC-3.5). */
export async function signedIn() {
  const me = unseal(SESSION, (await cookies()).get(SESSION)?.value);
  if (!me) redirect("/sign-in");
  return me;
}
