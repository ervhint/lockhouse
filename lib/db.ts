// Supabase with the service role key. Server only: never import this from a "use client" file.
import { createClient } from "@supabase/supabase-js";

export const db = () => createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
