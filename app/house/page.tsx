import Link from "next/link";
import { FileText, Loader2, Plus, UserRound, Users, FilePlus2 } from "lucide-react";
import { signedIn } from "@/lib/session";
import AppShell from "@/components/AppShell";
import Heading from "@/components/Heading";
import Panel from "@/components/Panel";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import AddressChip from "@/components/AddressChip";
import EmptyState from "@/components/EmptyState";
import Skeleton from "@/components/Skeleton";
import Sheet from "@/components/Sheet";
import StatePicker from "@/components/StatePicker";
import { members, items } from "@/lib/mock";
import Forget from "./Forget";

// S-05 House (members + items)
export default async function House(props: PageProps<"/house">) {
  await signedIn(); // no session: off to Sign In (AC-3.5)
  const { state = "" } = (await props.searchParams) as { state?: string };
  const loading = state === "loading";
  const shownMembers = state === "no-members" ? [] : members;
  const shownItems = state === "no-items" ? [] : items;
  return (
    <AppShell>
      <Heading title="Your House">The people who can open papers here, and the papers they have put in.</Heading>
      {state === "updating" && <p className="mb-4 flex items-center gap-2 text-muted"><Loader2 className="size-4 animate-spin" aria-hidden />Updating the list…</p>}

      <div className="flex flex-col gap-8">
        <Panel className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-medium">Members</h2>
            {shownMembers.length > 0 && <Button variant="secondary" href="/house/add"><Plus className="size-4" aria-hidden />Add Someone</Button>}
          </div>
          {loading ? <><Skeleton /><Skeleton /></> : shownMembers.length === 0
            ? <EmptyState icon={Users} title="No Other Members Yet" text="Add someone with their qor1 address. You can add them once their signed card checks out." action={<Button href="/house/add">Add Someone</Button>} />
            : <ul className="flex flex-col gap-2">
                {shownMembers.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-white/6 px-4 py-3">
                    <UserRound className="size-5 text-muted" aria-hidden />
                    <span className="font-medium">{m.name}</span>
                    <AddressChip address={m.address} />
                    <span className="sm:ml-auto"><Badge tone="ok">Padlock in the Phone Book</Badge></span>
                  </li>
                ))}
              </ul>}
        </Panel>

        <Panel className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-medium">Papers</h2>
            <Button href="/put-in"><FilePlus2 className="size-4" aria-hidden />Put In a Paper</Button>
          </div>
          {loading ? <><Skeleton /><Skeleton /></> : shownItems.length === 0
            ? <EmptyState icon={FileText} title="No Papers Yet" text="Put in the first paper. It is locked on this device before anything is sent." action={<Button href="/put-in">Put In a Paper</Button>} />
            : <ul className="flex flex-col gap-2">
                {shownItems.map((it) => (
                  <li key={it.id}>
                    <Link href={`/item/${it.id}`} className="flex items-center gap-3 rounded-xl bg-white/6 px-4 py-3 hover:bg-white/12">
                      <FileText className="size-5 text-muted" aria-hidden />
                      <span><span className="block font-medium">{it.title}</span><span className="block text-sm text-muted">Put in by {it.sender} · {it.date}</span></span>
                    </Link>
                  </li>
                ))}
              </ul>}
        </Panel>
      </div>

      {state === "forget" && (
        <Sheet title="Forget Keys on This Device?" closeHref="/house">
          <p className="mb-5 text-muted">Your keys are removed from this browser. To come back you need your secret words. Without them, your papers stay locked for good.</p>
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <Forget />
            <Button variant="ghost" href="/house">Keep My Keys</Button>
          </div>
        </Sheet>
      )}
      <StatePicker base="/house" current={state} states={[["", "House"], ["loading", "Loading"], ["no-members", "No Other Members"], ["no-items", "No Papers"], ["updating", "List Updating"], ["forget", "Forget Keys Sheet"]]} />
    </AppShell>
  );
}
