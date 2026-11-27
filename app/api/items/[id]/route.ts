import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { checkPaper, houseIdOf } from "@/lib/house";
import { SESSION, unseal } from "@/lib/session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const refuse = (error: string, status = 400) => Response.json({ error }, { status });
const FIELDS = ["envelope", "readers", "signature"]; // plus an optional stamp

// One paper for a reader (S-08). Members of the house only. A member who is not a reader gets the
// title and sender but never the locked copy (AC-6.3, AC-6.7).
export async function GET(req: NextRequest, ctx: RouteContext<"/api/items/[id]">) {
  const me = unseal(SESSION, req.cookies.get(SESSION)?.value);
  if (!me) return refuse("Sign in first.", 401);
  const house = await houseIdOf(me);
  if (!house) return refuse("You are not in a house.", 403);

  const { id } = await ctx.params;
  if (!UUID.test(id)) return refuse("No such paper.", 404);
  const { data, error } = await db().from("items").select("id, house_id, sender, title, envelope, signature, readers, stamp, recovery, created_at, changed_at, people(name)").eq("id", id).eq("house_id", house).maybeSingle();
  if (error) throw error;
  if (!data) return refuse("No such paper.", 404);

  const { envelope, signature, readers, stamp, recovery, people, ...rest } = data as typeof data & { people: { name: string } };
  const reader = readers.includes(me);
  let readerNames: string[] = []; // a reader sees who else can open it, in the readers' order (also people who left the house)
  if (reader) {
    const { data: named, error: e } = await db().from("people").select("address, name").in("address", readers);
    if (e) throw e;
    readerNames = readers.map((a: string) => named.find((p) => p.address === a)?.name ?? a);
  }
  // fromMe: a sender is always a reader (D-14), so "from me but not for me" can only be a fake (AC-8.1)
  return Response.json({ ...rest, senderName: people.name, readerCount: readers.length, reader, fromMe: data.sender === me,
    ...(reader && { envelope, signature, stamp, readers, readerNames, recoveryReader: !!recovery }) });
}

// Change Readers (S-13, AC-12.5, D-22): only the paper's sender replaces its locked copy, after Put In's own checks.
// Same id, title and sender; a refusal leaves the old copy exactly as it was.
export async function PUT(req: NextRequest, ctx: RouteContext<"/api/items/[id]">) {
  const me = unseal(SESSION, req.cookies.get(SESSION)?.value);
  if (!me) return refuse("Sign in first.", 401);
  const house = await houseIdOf(me);
  if (!house) return refuse("You are not in a house.", 403);

  const { id } = await ctx.params;
  if (!UUID.test(id)) return refuse("No such paper.", 404);
  const { data: row, error } = await db().from("items").select("sender, title").eq("id", id).eq("house_id", house).maybeSingle();
  if (error) throw error;
  if (!row) return refuse("No such paper.", 404);
  if (row.sender !== me) return refuse("Only the person who put this paper in can change who can open it.", 403);

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Object.keys(body).filter((k) => k !== "stamp").sort().join() !== FIELDS.join())
    return refuse("Send only the locked copy, signature, readers and stamp.");
  const { envelope, signature, readers, stamp = null } = body;
  const ok = await checkPaper(me, house, { id, title: row.title, envelope, signature, readers, stamp });
  if ("error" in ok) return refuse(ok.error, ok.status);

  const { error: failed } = await db().from("items")
    .update({ envelope, signature, readers, size: ok.size, recovery: ok.recovery, stamp, changed_at: new Date().toISOString() })
    .eq("id", id).eq("sender", me);
  if (failed) throw failed;
  return Response.json({ id, readers: readers.length });
}
