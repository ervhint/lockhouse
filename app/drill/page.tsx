import { LockOpen, Lock } from "lucide-react";
import AppShell from "@/components/AppShell";
import Heading from "@/components/Heading";
import Panel from "@/components/Panel";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import Toast from "@/components/Toast";
import StatePicker from "@/components/StatePicker";
import { items } from "@/lib/mock";

// S-09 Drill (Simulation)
export default async function Drill(props: PageProps<"/drill">) {
  const { state = "" } = (await props.searchParams) as { state?: string };
  const done = state === "result";
  return (
    <AppShell>
      <Heading title="The Q-Day Drill">A simulation. A thief with a quantum computer breaks the old locks. See what that opens, and what stays shut.</Heading>
      <div className="flex flex-col gap-6">
        <Panel className="flex flex-col gap-3">
          <h2 className="text-xl font-medium">Every Stored Copy</h2>
          <ul className="flex flex-col gap-2">
            {items.map((it) => (
              <li key={it.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-white/6 px-4 py-3">
                <span className="font-medium">{it.title}</span>
                <span className="ml-auto"><Badge tone="ok">Locked With ML-KEM-1024</Badge></span>
              </li>
            ))}
            <li className="flex flex-wrap items-center gap-3 rounded-xl bg-white/6 px-4 py-3">
              <span className="font-medium">{"{drillPaperTitle}"} (Drill Sample)</span>
              <span className="ml-auto"><Badge tone="warn">Locked With the Old Lock</Badge></span>
            </li>
          </ul>
          {!done && <Button href="/drill?state=result" full loading={state === "running"}>{state === "running" ? "Pretending Q-Day" : "Pretend Q-Day"}</Button>}
          {!done && <Button variant="secondary" href="/drill?state=gave">Give My Old Keys to the Drill (Simulation)</Button>}
        </Panel>

        {done ? (
          <Panel className="flex flex-col gap-4">
            <h2 className="text-xl font-medium">Thief (Simulation)</h2>
            <p className="flex items-center gap-3"><LockOpen className="size-5 text-amber" aria-hidden />The Old-Lock Copy <Badge tone="warn">Opened</Badge></p>
            <p className="flex items-center gap-3"><Lock className="size-5 text-lime" aria-hidden />Lockhouse Copies <Badge tone="ok">Stayed Shut</Badge></p>
            <p className="text-muted">Your own papers still open for you, with your own keys.</p>
            <Button href="/house" full>Open My Papers</Button>
          </Panel>
        ) : null}
      </div>
      {state === "gave" && <Toast>Your old keys were given to the drill. This is a simulation.</Toast>}
      <StatePicker base="/drill" current={state} states={[["", "Stored Copies"], ["gave", "Gave Old Keys"], ["running", "Pretend Q-Day Running"], ["result", "Result"]]} />
    </AppShell>
  );
}
