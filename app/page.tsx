import { cookies } from "next/headers";
import Hero from "@/components/Hero";
import { SESSION, unseal } from "@/lib/session";

// S-01 Welcome. Hero picks first visit or returning from the keys in this browser; signed in opens the House.
export default async function Welcome() {
  const signedIn = !!unseal(SESSION, (await cookies()).get(SESSION)?.value);
  return <Hero signedIn={signedIn} />;
}
