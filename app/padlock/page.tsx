import { CircleCheck, CircleX, Droplets } from "lucide-react";
import AppShell from "@/components/AppShell";
import Heading from "@/components/Heading";
import Panel from "@/components/Panel";
import Button from "@/components/Button";
import TxPill from "@/components/TxPill";
import Badge from "@/components/Badge";
import AddressChip from "@/components/AddressChip";
import StatePicker from "@/components/StatePicker";

// S-04 Register Padlock
const next: Record<string, string> = { sign1: "sign2", sign2: "pending", pending: "confirmed" };

export default async function Padlock(props: PageProps<"/padlock">) {
  const { state = "" } = (await props.searchParams) as { state?: string };
  const step1 = state === "sign1" ? "waiting" : state === "" || state === "funds" ? null : "done";
  const step2 = state === "sign2" ? "waiting" : state === "failed" ? "failed" : ["pending", "confirmed"].includes(state) ? "done" : null;
  return (
    <AppShell signedIn={false}>
      <Heading title="Register Your Padlock">Your padlock lets your family lock papers for you. It goes in QoreChain&apos;s Phone Book so they can find it. A small network fee in test QOR pays for it, like a delivery fee.</Heading>
      <Panel className="flex flex-col gap-5">
        {state === "funds" && (
          <div className="flex flex-col gap-3 rounded-xl border border-amber/50 bg-amber/10 p-4">
            <Badge tone="warn">Not Enough Test QOR</Badge>
            <p>Your address <AddressChip /> has no test QOR for the network fee. Get some from the faucet, then try again.</p>
            <Button variant="secondary" href="#"><Droplets className="size-4" aria-hidden />Open the Faucet</Button>
          </div>
        )}
        <ul className="flex flex-col gap-3">
          {[
            ["Signature 1 of 2", "Proves the padlock is yours.", step1],
            ["Signature 2 of 2", "Sends it to QoreChain.", step2],
          ].map(([t, d, s], i) => (
            <li key={t} className="flex items-start gap-3">
              {s === "done" ? <CircleCheck className="mt-0.5 size-5 text-lime" aria-hidden /> : s === "failed" ? <CircleX className="mt-0.5 size-5 text-danger" aria-hidden /> : <span className="mt-0.5 flex size-5 flex-none items-center justify-center rounded-full bg-white/10 text-xs text-muted" aria-hidden>{i + 1}</span>}
              <div><p className="font-medium">{t}</p><p className="text-muted">{d}</p></div>
              {s === "waiting" && <span className="ml-auto"><TxPill status="waiting" /></span>}
            </li>
          ))}
        </ul>
        {state === "declined" && <Badge tone="warn">You said no to signing. Nothing was sent.</Badge>}
        {state === "pending" && <TxPill status="pending" />}
        {state === "confirmed" && (
          <div className="flex flex-wrap items-center gap-3"><TxPill status="confirmed" /><AddressChip address="{txHash}" href="#" /></div>
        )}
        {state === "failed" && (
          <div className="flex flex-col gap-2 rounded-xl border border-danger/50 bg-danger/10 p-4">
            <div className="flex flex-wrap items-center gap-3"><TxPill status="failed" /><AddressChip address="{txHash}" href="#" /></div>
            <p>QoreChain did not accept the second signature. Your padlock is not in the Phone Book yet. Try again.</p>
          </div>
        )}
        {state === "confirmed"
          ? <Button href="/house" full>Go to My House</Button>
          : state === "failed" || state === "declined" || state === "funds"
            ? <Button href="/padlock?state=sign1" full>Try Again</Button>
            : <Button href={`/padlock?state=${next[state] ?? "sign1"}`} full>{state === "" ? "Register My Padlock" : state === "pending" ? "Check the Result" : "Approve in This Browser"}</Button>}
      </Panel>
      <StatePicker base="/padlock" current={state} states={[["", "Ready"], ["funds", "Not Enough Test QOR"], ["sign1", "Signature 1 of 2"], ["sign2", "Signature 2 of 2"], ["declined", "Said No to Signing"], ["pending", "Pending"], ["confirmed", "Confirmed"], ["failed", "Failed"]]} />
    </AppShell>
  );
}
