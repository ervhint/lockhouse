import { house } from "@/lib/mock";

// BFF route for the House screen (S-05). Mock for now; P6 reads Supabase here.
export async function GET() {
  return Response.json(house);
}
