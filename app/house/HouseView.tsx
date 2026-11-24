"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ExternalLink, FilePlus2, FileText, Loader2, Plus, UserRound, Users } from "lucide-react";
import { fetchKemKey } from "@qorechain/qoreseal/network";
import Panel from "@/components/Panel";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import AddressChip from "@/components/AddressChip";
import EmptyState from "@/components/EmptyState";
import Skeleton from "@/components/Skeleton";
import { explorerAddress } from "@/lib/settings";

type House = { members: { name: string; address: string }[]; items: { id: string; title: string; sender: string; date: string; readers: number }[] };

const PADLOCK = {
  wait: "Checking the Phone Book",
  ok: "Padlock in the Phone Book",
  bad: "No Padlock in the Phone Book",
  warn: "Phone Book Not Reached",
};

// Read live from the chain, not from our database (AC-4.1, D-10); links to their address on the explorer.
function PadlockBadge({ address, round }: { address: string; round: number }) {
  const [tone, setTone] = useState<keyof typeof PADLOCK>("wait");
  useEffect(() => {
    fetchKemKey({ rest: `${location.origin}/api/chain`, address }).then((k) => setTone(k.registered ? "ok" : "bad"), () => setTone("warn"));
  }, [address, round]); // checked again each time the list reloads, so "Not Reached" can recover
  return (
    <a href={explorerAddress(address)} target="_blank" rel="noreferrer" aria-label={`${PADLOCK[tone]}. Opens the explorer`} className="relative inline-flex rounded-full hover:brightness-125 after:absolute after:inset-x-0 after:-inset-y-1">
      <Badge tone={tone}>{PADLOCK[tone]}<ExternalLink className="size-3" aria-hidden /></Badge>
    </a>
  );
}

// S-05: members and papers from /api/house. First load: skeletons. Coming back to the window: "Updating the list…" (AC-4.9).
export default function HouseView() {
  const router = useRouter();
  const [house, setHouse] = useState<House | null>(null);
  const [busy, setBusy] = useState(true);
  const [failed, setFailed] = useState(false);
  const [round, setRound] = useState(0);

  const load = useCallback(async () => {
    setBusy(true);
    const res = await fetch("/api/house", { cache: "no-store" }).catch(() => null);
    if (res?.status === 401) return router.replace("/sign-in");
    if (res?.ok) { setHouse(await res.json()); setFailed(false); setRound((r) => r + 1); } else setFailed(true);
    setBusy(false);
  }, [router]);

  useEffect(() => {
    load();
    addEventListener("focus", load);
    return () => removeEventListener("focus", load);
  }, [load]);

  if (failed && !house) return (
    <Panel className="flex flex-col items-start gap-4">
      <p role="alert">Your house didn&apos;t load. Check your connection, then try again.</p>
      <Button variant="secondary" onClick={load} loading={busy}>Try Again</Button>
    </Panel>
  );

  const alone = house?.members.length === 1;
  return (
    <>
      <p role="status" className="mb-4 flex min-h-6 items-center gap-2 text-muted">
        {busy && house && <><Loader2 className="size-4 animate-spin" aria-hidden />Updating the list…</>}
      </p>
      <div className="flex flex-col gap-8">
        <Panel className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-medium">Members</h2>
            {house && !alone && <Button variant="secondary" href="/house/add"><Plus className="size-4" aria-hidden />Add Someone</Button>}
          </div>
          {!house ? <><Skeleton /><Skeleton /></> : <>
            <ul className="flex flex-col gap-2">
              {house.members.map((m) => (
                <li key={m.address} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-white/6 px-4 py-3">
                  <UserRound className="size-5 text-muted" aria-hidden />
                  <span className="font-medium">{m.name}</span>
                  <AddressChip address={m.address} copy />
                  <span className="sm:ml-auto"><PadlockBadge address={m.address} round={round} /></span>
                </li>
              ))}
            </ul>
            {alone && <EmptyState icon={Users} title="No Other Members Yet" text="Add someone with their qor1 address. You can add them once their signed card checks out." action={<Button href="/house/add">Add Someone</Button>} />}
            <p className="text-sm text-muted">The explorer opens on Mainnet. Switch it to Testnet at the top to see each padlock.</p>
          </>}
        </Panel>

        <Panel className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-medium">Papers</h2>
            <Button href="/put-in"><FilePlus2 className="size-4" aria-hidden />Put In a Paper</Button>
          </div>
          {!house ? <><Skeleton /><Skeleton /></> : house.items.length === 0
            ? <EmptyState icon={FileText} title="No Papers Yet" text="Put in the first paper. It is locked on this device before anything is sent." action={<Button href="/put-in">Put In a Paper</Button>} />
            : <ul className="flex flex-col gap-2">
                {house.items.map((it) => (
                  <li key={it.id}>
                    <Link href={`/item/${it.id}`} className="flex items-center gap-3 rounded-xl bg-white/6 px-4 py-3 hover:bg-white/12">
                      <FileText className="size-5 text-muted" aria-hidden />
                      <span><span className="block font-medium">{it.title}</span><span className="block text-sm text-muted">Put in by {it.sender} · {new Date(it.date).toLocaleDateString(undefined, { dateStyle: "medium" })} · {it.readers} {it.readers === 1 ? "Reader" : "Readers"}</span></span>
                    </Link>
                  </li>
                ))}
              </ul>}
        </Panel>
      </div>
    </>
  );
}
