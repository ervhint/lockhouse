"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, FilePlus2, FileText, KeyRound, Loader2, Plus, UserMinus, UserRound, Users } from "lucide-react";
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

export type Paper = { id: string; title: string; sender: string; date: string; readers: number; stamped: boolean };
type House = { me: string; recovery: { by: string } | null; members: { name: string; address: string }[]; items: Paper[]; paperCount: number };
type Member = House["members"][number];
const SHORT = 5; // the House shows the first five members and the five newest papers

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
  return <Badge tone={tone} href={explorerAddress(address)} aria-label={`${PADLOCK[tone]}. Opens the explorer`}>{PADLOCK[tone]}</Badge>;
}

// AC-9.1: asks first, and says plainly what removing can't undo.
function RemoveSheet({ member, onRemoved }: { member: Member; onRemoved: (name: string) => void }) {
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
    <Sheet title={`Remove ${member.name} From the House?`} closeHref="/members">
      <p className="mb-3 text-muted">{member.name} leaves the list and can&apos;t open this house or its papers here again. Papers they put in stay in the house.</p>
      <p className="mb-5 text-muted">Anything {member.name} already opened may still be on their device. Removing can&apos;t take that back.</p>
      {error && <p role="alert" className="mb-4 text-danger">{error}</p>}
      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <Button variant="danger" onClick={remove} loading={busy}>Remove {member.name}</Button>
        <Button variant="ghost" href="/members">Keep {member.name}</Button>
      </div>
    </Sheet>
  );
}

const ROW = "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-white/6 px-4 py-3"; // a member or a paper

const MemberName = ({ m, me }: { m: Member; me: string }) =>
  <span className="font-medium sm:min-w-20">{m.name}{m.address === me && <span className="font-normal text-muted"> (You)</span>}</span>;

/** One row per paper: its title, who put it in, when, how many can open it, and whether it is stamped (U11; the paper's page checks the stamp).
 *  The House and the Papers page share it. */
export const PaperList = ({ items }: { items: Paper[] }) => (
  <ul className="flex flex-col gap-2">
    {items.map((it) => (
      <li key={it.id}>
        <Link href={`/item/${it.id}`} className={`${ROW} hover:bg-white/12`}>
          <FileText className="size-5 shrink-0 text-muted" aria-hidden />
          <span className="w-[calc(100%-2rem)] truncate font-medium sm:w-48">{it.title}</span>{/* phones: the line beside the icon */}
          <span className="text-sm text-muted sm:w-40">{it.sender} · {new Date(it.date).toLocaleDateString(undefined, { dateStyle: "medium" })}</span>
          <span className="text-sm text-muted sm:w-20">{it.readers} {it.readers === 1 ? "Reader" : "Readers"}</span>
          <span className="sm:ml-auto">{it.stamped ? <Badge tone="ok">Stamped</Badge> : <Badge tone="warn">Not Stamped</Badge>}</span>
        </Link>
      </li>
    ))}
  </ul>
);

export const NoPapers = () => <EmptyState icon={FileText} title="No Papers Yet" text="Put in the first paper. It is locked on this device before anything is sent." action={<Button href="/put-in">Put In a Paper</Button>} />;
export const PutInButton = () => <Button href="/put-in" className="whitespace-nowrap"><FilePlus2 className="size-4" aria-hidden />Put In a Paper</Button>;

const SeeAll = ({ href, children }: { href: string; children: string }) =>
  <Link href={href} className="inline-flex items-center gap-1.5 self-start py-2 font-medium underline-offset-4 hover:underline">{children}<ArrowRight className="size-4" aria-hidden /></Link>;

// S-05, from /api/house. First load: skeletons. Coming back to the window: "Updating the list…" (AC-4.9).
// `home` (/house): the first five members, the five newest papers, and the recovery key (U10; `?recovery` says it was just saved).
// `members` (/members): everyone, Add Someone, and Remove (`?remove=` opens the sheet, U9).
export default function HouseView({ view, remove, recoverySaved }: { view: "home" | "members"; remove?: string; recoverySaved?: boolean }) {
  const router = useRouter();
  const [house, setHouse] = useState<House | null>(null);
  const [busy, setBusy] = useState(true);
  const [failed, setFailed] = useState(false);
  const [round, setRound] = useState(0);
  const [removed, setRemoved] = useState<{ name: string; round: number } | null>(null);
  const [saved] = useState(recoverySaved); // kept after the address loses `?recovery`, so a reload doesn't say it again
  useEffect(() => { if (saved) router.replace("/house"); }, [saved, router]);

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

  const home = view === "home";
  const alone = house?.members.length === 1;
  const leaving = home ? undefined : house?.members.find((m) => m.address === remove && m.address !== house.me);
  const members = house && (home ? house.members.slice(0, SHORT) : house.members);
  const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  return (
    <>
      <p role="status" className="mb-4 flex min-h-6 items-center gap-2 text-muted">
        {busy && house && <><Loader2 className="size-4 animate-spin" aria-hidden />Updating the list…</>}
      </p>
      <div className="flex flex-col gap-8">
        <Panel className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="members" tabIndex={-1} className="text-xl font-medium">{house ? count(house.members.length, "Member", "Members") : "Members"}</h2>
            {house && !alone && <Button variant="secondary" href="/house/add" className="whitespace-nowrap"><Plus className="size-4" aria-hidden />Add Someone</Button>}
          </div>
          {!house ? <><Skeleton /><Skeleton /></> : <>
            <ul className="flex flex-col gap-2">
              {members!.map((m) => (
                <li key={m.address} className={ROW}>
                  <UserRound className="size-5 text-muted" aria-hidden />
                  <MemberName m={m} me={house.me} />
                  <AddressChip address={m.address} copy />
                  <span className="flex flex-wrap items-center gap-2 sm:ml-auto">
                    <PadlockBadge address={m.address} round={round} />
                    {m.address !== house.me
                      ? <Button variant="ghost" href={`/members?remove=${m.address}`} className="min-h-9! px-3!" aria-label={`Remove ${m.name}`}><UserMinus className="size-4" aria-hidden />Remove</Button>
                      : <span aria-hidden className="invisible max-sm:hidden"><Button variant="ghost" className="min-h-9! px-3!" tabIndex={-1}><UserMinus className="size-4" />Remove</Button></span>}{/* keeps the badges in one column on wide screens */}
                  </span>
                </li>
              ))}
            </ul>
            {alone && <EmptyState icon={Users} title="No Other Members Yet" text="Add someone with their qor1 address. You can add them once their signed card checks out." action={<Button href="/house/add">Add Someone</Button>} />}
            {home
              ? <SeeAll href="/members">{house.members.length > SHORT ? `See All ${house.members.length} Members` : "See All Members"}</SeeAll>
              : <p className="text-sm text-muted">The explorer opens on Mainnet. Switch it to Testnet at the top to see each padlock.</p>}
          </>}
        </Panel>

        {home && (
          <Panel className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-medium">{house ? count(house.paperCount, "Paper", "Papers") : "Papers"}</h2>
              <PutInButton />
            </div>
            {!house ? <><Skeleton /><Skeleton /></> : house.paperCount === 0 ? <NoPapers /> : <>
              <PaperList items={house.items} />
              <SeeAll href="/papers">{house.paperCount > SHORT ? `See All ${house.paperCount} Papers` : "See All Papers"}</SeeAll>
            </>}
          </Panel>
        )}

        {/* U10: one more reader of every paper put in from now on, opened with its own words on any device */}
        {home && (
          <Panel className="flex flex-col gap-4">
            <h2 className="text-xl font-medium">Recovery Key</h2>
            {!house ? <Skeleton /> : house.recovery
              ? <>
                  <Badge tone="ok">Recovery Key Made by {house.members.find((m) => m.address === house.recovery!.by)?.name}</Badge>
                  <p className="text-muted">The recovery key can only open every paper put in after it was made, on any device. It cannot open older papers from before it was made.</p>
                  <Button variant="secondary" href="/recover" className="sm:self-start">Open With Recovery Words</Button>
                </>
              : <EmptyState icon={KeyRound} title="No Recovery Key Yet" text="If someone loses their secret words, what was locked for them is lost. A recovery key is a second set of words, kept on paper, that can also open every paper put in after it is made." action={<Button variant="secondary" href="/house/recovery">Make a Recovery Key</Button>} />}
          </Panel>
        )}
      </div>
      {leaving && <RemoveSheet member={leaving} onRemoved={(name) => { setRemoved({ name, round: Date.now() }); router.replace("/members"); load(); }} />}
      {removed && <Toast key={removed.round}>{removed.name} is out of the house.</Toast>}
      {saved && !removed && <Toast>The recovery key is saved. Papers put in from now on can also be opened with its words.</Toast>}
    </>
  );
}
