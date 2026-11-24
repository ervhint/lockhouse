"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ExternalLink, FilePlus2, FileText, Loader2, Plus, UserMinus, UserRound, Users } from "lucide-react";
import { fetchKemKey } from "@qorechain/qoreseal/network";
import Panel from "@/components/Panel";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import AddressChip from "@/components/AddressChip";
import EmptyState from "@/components/EmptyState";
import Skeleton from "@/components/Skeleton";
import Sheet from "@/components/Sheet";
import Toast from "@/components/Toast";
import { explorerAddress } from "@/lib/settings";

type House = { me: string; members: { name: string; address: string }[]; items: { id: string; title: string; sender: string; date: string; readers: number }[] };

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

// AC-9.1: asks first, and says plainly what removing can't undo.
function RemoveSheet({ member, onRemoved }: { member: { name: string; address: string }; onRemoved: (name: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const remove = async () => {
    setBusy(true);
    setError("");
    const res = await fetch("/api/house/members", { method: "DELETE", body: JSON.stringify({ address: member.address }) }).catch(() => null);
    const body = await res?.json().catch(() => null);
    setBusy(false);
    if (res?.ok) onRemoved(member.name);
    else setError(body?.error ?? "Can't reach Lockhouse. Nothing was changed. Check your connection, then try again.");
  };
  return (
    <Sheet title={`Remove ${member.name} From the House?`} closeHref="/house">
      <p className="mb-3 text-muted">{member.name} leaves the list and can&apos;t open this house or its papers here again. Papers they put in stay in the house.</p>
      <p className="mb-5 text-muted">Anything {member.name} already opened may still be on their device. Removing can&apos;t take that back.</p>
      {error && <p role="alert" className="mb-4 text-danger">{error}</p>}
      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <Button variant="danger" onClick={remove} loading={busy}>Remove {member.name}</Button>
        <Button variant="ghost" href="/house">Keep {member.name}</Button>
      </div>
    </Sheet>
  );
}

// S-05: members and papers from /api/house. First load: skeletons. Coming back to the window: "Updating the list…" (AC-4.9).
// `remove` (an address, from `?remove=`) opens the Remove sheet (U9).
export default function HouseView({ remove }: { remove?: string }) {
  const router = useRouter();
  const [house, setHouse] = useState<House | null>(null);
  const [busy, setBusy] = useState(true);
  const [failed, setFailed] = useState(false);
  const [round, setRound] = useState(0);
  const [removed, setRemoved] = useState<{ name: string; round: number } | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    const res = await fetch("/api/house", { cache: "no-store" }).catch(() => null);
    if (res?.status === 401) return router.replace("/sign-in");
    if (res?.ok) { setHouse(await res.json()); setFailed(false); setRound((r) => r + 1); } else setFailed(true);
    setBusy(false);
  }, [router]);

  // After a removal the button that opened the sheet is gone: focus the list it changed, not the page.
  const closed = removed && !remove;
  useEffect(() => { if (closed) document.getElementById("members")?.focus(); }, [closed]);

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
  const leaving = house?.members.find((m) => m.address === remove && m.address !== house.me);
  return (
    <>
      <p role="status" className="mb-4 flex min-h-6 items-center gap-2 text-muted">
        {busy && house && <><Loader2 className="size-4 animate-spin" aria-hidden />Updating the list…</>}
      </p>
      <div className="flex flex-col gap-8">
        <Panel className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <h2 id="members" tabIndex={-1} className="text-xl font-medium">Members</h2>
            {house && !alone && <Button variant="secondary" href="/house/add"><Plus className="size-4" aria-hidden />Add Someone</Button>}
          </div>
          {!house ? <><Skeleton /><Skeleton /></> : <>
            <ul className="flex flex-col gap-2">
              {house.members.map((m) => (
                <li key={m.address} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-white/6 px-4 py-3">
                  <UserRound className="size-5 text-muted" aria-hidden />
                  <span className="font-medium">{m.name}</span>
                  <AddressChip address={m.address} copy />
                  <span className="flex flex-wrap items-center gap-2 sm:ml-auto">
                    <PadlockBadge address={m.address} round={round} />
                    {m.address !== house.me
                      ? <Button variant="ghost" href={`/house?remove=${m.address}`} className="h-9! px-3!" aria-label={`Remove ${m.name}`}><UserMinus className="size-4" aria-hidden />Remove</Button>
                      : <span aria-hidden className="invisible max-sm:hidden"><Button variant="ghost" className="h-9! px-3!" tabIndex={-1}><UserMinus className="size-4" />Remove</Button></span>}{/* keeps the badges in one column on wide screens */}
                  </span>
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
      {leaving && <RemoveSheet member={leaving} onRemoved={(name) => { setRemoved({ name, round: Date.now() }); router.replace("/house"); load(); }} />}
      {removed && <Toast key={removed.round}>{removed.name} is out of the house.</Toast>}
    </>
  );
}
