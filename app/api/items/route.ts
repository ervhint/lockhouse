import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { PAGE, checkPaper, houseIdOf, papersOf } from "@/lib/house";
import { titleProblem } from "@/lib/items";
import { SESSION, unseal } from "@/lib/session";

const refuse = (error: string, status = 400) => Response.json({ error }, { status });
const FIELDS = ["envelope", "id", "readers", "signature", "title"]; // plus an optional stamp (U11)
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// The Papers page: my house's papers newest first, PAGE at a time from `?from=`, and how many there are. Members only.
export async function GET(req: NextRequest) {
  const me = unseal(SESSION, req.cookies.get(SESSION)?.value);
  if (!me) return refuse("Sign in first.", 401);
  const house = await houseIdOf(me);
  if (!house) return refuse("You are not in a house.", 403);
  const from = Number(req.nextUrl.searchParams.get("from") ?? 0);
  if (!Number.isInteger(from) || from < 0) return refuse("Ask for papers from 0 or more.");
  const q = req.nextUrl.searchParams.get("q")?.trim().slice(0, 80) || undefined;
  if (q && q.length < 3) return refuse("Type at least 3 characters to search.");
  const by = req.nextUrl.searchParams.get("by") || undefined;
  return Response.json(await papersOf(house, from, PAGE, { q, by }));
}

// Put In (S-07): store a locked copy only if every check holds; otherwise 400 and nothing stored (AC-5.2, AC-5.3).
export async function POST(req: NextRequest) {
  const me = unseal(SESSION, req.cookies.get(SESSION)?.value);
  if (!me) return refuse("Sign in first.", 401);
  const house = await houseIdOf(me);
  if (!house) return refuse("You are not in a house.", 403);

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Object.keys(body).filter((k) => k !== "stamp").sort().join() !== FIELDS.join())
    return refuse("Send only the item id, title, locked copy, signature, readers and stamp.");
  const { id, title, envelope, signature, readers, stamp = null } = body;
  if (typeof id !== "string" || !UUID.test(id)) return refuse("The item id is not valid.");
  if (typeof title !== "string" || titleProblem(title) || title !== title.trim()) return refuse(titleProblem(String(title)) ?? "Give it a title with no spaces at the start or end.");
  const ok = await checkPaper(me, house, { id, title, envelope, signature, readers, stamp });
  if ("error" in ok) return refuse(ok.error, ok.status);
  const { size, recovery } = ok;

  const { error: failed } = await db().from("items").insert({ id, house_id: house, sender: me, title, envelope, signature, readers, size, recovery, stamp });
  if (failed) return failed.code === "23505" ? refuse("This paper is already saved.") : Promise.reject(failed);
  return Response.json({ id, readers: readers.length });
}
