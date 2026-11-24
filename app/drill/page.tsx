import { cookies } from "next/headers";
import AppShell from "@/components/AppShell";
import Heading from "@/components/Heading";
import Button from "@/components/Button";
import Sheet from "@/components/Sheet";
import Toast from "@/components/Toast";
import { SESSION, unseal } from "@/lib/session";
import DrillView from "./DrillView";
import GiveKeys from "./GiveKeys";

// S-09 Drill (Simulation). Open to anyone, like the Thief's window (AC-7.1). Members also get Give My Old Keys (`?give`).
export default async function Drill(props: PageProps<"/drill">) {
  const me = unseal(SESSION, (await cookies()).get(SESSION)?.value);
  const q = await props.searchParams;
  return (
    <AppShell signedIn={!!me}>
      <Heading title="The Q-Day Drill">A simulation. A thief with a quantum computer breaks the old locks. See what that opens, and what stays shut.</Heading>
      <DrillView key={"gave" in q ? "gave" : ""} member={!!me} />
      {me && "give" in q && (
        <Sheet title="Give My Old Keys to the Drill?" closeHref="/drill">
          <p className="mb-3 text-muted">This is a simulation. Your browser locks the drill&apos;s made-up sample paper with the old lock, then gives the drill that copy and your old key (X25519).</p>
          <p className="mb-5 text-muted">Not your secret words, and not your ML-KEM-1024 or ML-DSA-87 keys. Your papers stay locked: the old key is only half of their lock.</p>
          <div className="flex flex-col gap-2 sm:flex-row-reverse sm:flex-wrap">
            <GiveKeys />
            <Button variant="ghost" href="/drill">Not Now</Button>
          </div>
        </Sheet>
      )}
      {"gave" in q && <Toast>Your old keys were given to the drill. This is a simulation.</Toast>}
    </AppShell>
  );
}
