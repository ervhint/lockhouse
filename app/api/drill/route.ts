import type { NextRequest } from "next/server";
import { fromBase64Url, toHex, x25519PublicKey } from "@qorechain/qoreseal";
import { db } from "@/lib/db";
import { OLD_PREFIX, oldOpen } from "@/lib/drill";
import { SESSION, unseal } from "@/lib/session";

const refuse = (error: string, status = 400) => Response.json({ error }, { status });
const MAX_OLD_COPY = 64 * 1024; // the drill sample is a few KB

// The public store for the Drill (AC-7.1, D-12): every locked copy with no title, names or readers,
// plus the old keys members gave on purpose. ponytail: sends every copy whole; page it if the store grows.
export async function GET() {
  const [copies, given] = await Promise.all([
    db().from("items").select("id, envelope").order("created_at"),
    db().from("drill_keys").select("address, x25519Secret:x25519_secret, oldCopy:old_copy").order("created_at"),
  ]);
  if (copies.error) throw copies.error;
  if (given.error) throw given.error;
  return Response.json({ copies: copies.data, given: given.data }, { headers: { "cache-control": "no-store" } });
}

// Give My Old Keys (AC-7.2): exactly two fields, the key must be my own (it matches my card) and open my old-lock copy.
export async function POST(req: NextRequest) {
  const me = unseal(SESSION, req.cookies.get(SESSION)?.value);
  if (!me) return refuse("Sign in first.", 401);
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Object.keys(body).sort().join() !== "oldCopy,x25519Secret") return refuse("Send only the old-lock copy and your old key.");
  const { oldCopy, x25519Secret } = body;
  if (typeof oldCopy !== "string" || !oldCopy.startsWith(OLD_PREFIX) || oldCopy.length > MAX_OLD_COPY || typeof x25519Secret !== "string") return refuse("The old-lock copy can't be read.");

  const { data: person, error } = await db().from("people").select("card").eq("address", me).maybeSingle();
  if (error) throw error;
  try {
    const sk = fromBase64Url(x25519Secret);
    if (sk.length !== 32 || toHex(x25519PublicKey(sk)) !== person?.card?.x25519PublicKey) throw 0;
    await oldOpen(oldCopy, sk);
  } catch {
    return refuse("That old key doesn't match your account, so nothing was given. Sign out, sign in again, then try again.");
  }

  const { error: failed } = await db().from("drill_keys").upsert({ address: me, x25519_secret: x25519Secret, old_copy: oldCopy, created_at: new Date().toISOString() });
  if (failed) throw failed;
  return Response.json({ given: true });
}
