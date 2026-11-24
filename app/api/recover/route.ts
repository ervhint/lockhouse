import type { NextRequest } from "next/server";
import { db } from "@/lib/db";

// Open With Recovery Words (U10): no sign-in. The lookup comes only from the recovery words (lib/recovery.ts),
// so it finds the papers locked to that key: locked copies, titles and senders, nothing else.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Object.keys(body).join() !== "lookup" || !/^[0-9a-f]{64}$/.test(body.lookup))
    return Response.json({ error: "Send only the lookup made from the recovery words." }, { status: 400 });
  const { data, error } = await db().from("items").select("id, house_id, sender, title, envelope, signature, created_at, people(name)")
    .eq("recovery", body.lookup).order("created_at", { ascending: false });
  if (error) throw error;
  if (!data.length) return Response.json({ error: "No papers are locked to these recovery words." }, { status: 404 });
  const items = (data as unknown as (typeof data[number] & { people: { name: string } })[]).map(({ people, ...r }) => ({ ...r, senderName: people.name }));
  return Response.json({ items });
}
