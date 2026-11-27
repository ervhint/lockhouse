import { db } from "@/lib/db";

// The Thief's loot for the Drill (AC-7.1, D-19): every stored locked copy, whole, with when it was stored.
// No title, names or readers: this page is public. ponytail: sends every copy whole; page it if the store grows.
export async function GET() {
  const { data, error } = await db().from("items").select("id, envelope, date:created_at").order("created_at");
  if (error) throw error;
  return Response.json({ copies: data }, { headers: { "cache-control": "no-store" } });
}
