import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { houseIdOf } from "@/lib/house";
import { SESSION, unseal } from "@/lib/session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// One paper for a reader (S-08). Members of the house only. A member who is not a reader gets the
// title and sender but never the locked copy (AC-6.3, AC-6.7).
export async function GET(req: NextRequest, ctx: RouteContext<"/api/items/[id]">) {
  const me = unseal(SESSION, req.cookies.get(SESSION)?.value);
  if (!me) return Response.json({ error: "Sign in first." }, { status: 401 });
  const house = await houseIdOf(me);
  if (!house) return Response.json({ error: "You are not in a house." }, { status: 403 });

  const { id } = await ctx.params;
  if (!UUID.test(id)) return Response.json({ error: "No such paper." }, { status: 404 });
  const { data, error } = await db().from("items").select("id, house_id, sender, title, envelope, signature, readers, created_at, people(name)").eq("id", id).eq("house_id", house).maybeSingle();
  if (error) throw error;
  if (!data) return Response.json({ error: "No such paper." }, { status: 404 });

  const { envelope, signature, readers, people, ...rest } = data as typeof data & { people: { name: string } };
  const reader = readers.includes(me);
  return Response.json({ ...rest, senderName: people.name, readerCount: readers.length, reader, ...(reader && { envelope, signature }) });
}
