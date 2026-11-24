"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, KeyRound, Lock, LockOpen } from "lucide-react";
import { fetchMlkemPublicKey } from "@qorechain/qoreseal/network";
import Panel from "@/components/Panel";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import EmptyState from "@/components/EmptyState";
import Skeleton from "@/components/Skeleton";
import { pretendQDay } from "@/lib/drill";
import { unpack } from "@/lib/items";

type Store = { copies: { id: string; envelope: string }[]; given: { address: string; x25519Secret: string; oldCopy: string }[] };
type Result = { pictures: string[]; shut: Set<string> };

// S-09: the public store (AC-7.1) and Pretend Q-Day, run in this browser with the old keys members gave (AC-7.3, AC-7.4).
export default function DrillView({ member }: { member: boolean }) {
  const [store, setStore] = useState<Store | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const summary = useRef<HTMLHeadingElement>(null);
  const router = useRouter();
  const [faking, setFaking] = useState(false);
  const [fakeProblem, setFakeProblem] = useState<string | null>(null);
  const fakeButton = useRef<HTMLButtonElement>(null);

  const load = useCallback(async () => {
    setProblem(null);
    const res = await fetch("/api/drill", { cache: "no-store" }).catch(() => null);
    if (res?.ok) setStore(await res.json());
    else setProblem("The stored copies didn't load. Check your connection, then try again.");
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (result) summary.current?.focus(); }, [result]);
  useEffect(() => { if (fakeProblem) fakeButton.current?.focus(); }, [fakeProblem]); // the button was off while working, so focus fell away
  useEffect(() => () => result?.pictures.forEach(URL.revokeObjectURL), [result]);

  const run = async () => {
    if (!store?.given.length) return setProblem("No old keys yet. A family member must give their old keys to the drill first, from their own window.");
    setRunning(true);
    setProblem(null);
    try {
      // The Thief also takes each member's public ML-KEM-1024 key from the phone book; it still lacks the secret half.
      const rest = `${location.origin}/api/chain`;
      const given = await Promise.all(store.given.map(async (g) => ({ ...g, mlkemPublicKey: await fetchMlkemPublicKey({ rest, address: g.address }) })));
      const { old, shut } = await pretendQDay(store.copies, given);
      const pictures = old.map((o) => { const p = unpack(o.plain); return URL.createObjectURL(new Blob([p.bytes as BlobPart], { type: p.type })); });
      setResult({ pictures, shut: new Set(shut) });
    } catch {
      setProblem("Can't reach QoreChain's phone book. Nothing was tried. Try again.");
    }
    setRunning(false);
  };

  // AC-8.1: the server plays a hacked server and slips in a paper with a wrong signature; open it to see it refused.
  const fake = async () => {
    setFaking(true);
    setFakeProblem(null);
    const res = await fetch("/api/drill/fake", { method: "POST" }).catch(() => null);
    if (res?.status === 401) return router.push("/sign-in");
    if (res?.ok) return router.push(`/item/${(await res.json()).id}`);
    setFakeProblem((res && (await res.json().catch(() => null))?.error) || "The fake paper was not made. Check your connection, then try again.");
    setFaking(false);
  };

  if (!store) return (
    <Panel className="flex flex-col gap-4">
      {problem ? <><p role="alert">{problem}</p><Button variant="secondary" onClick={load}>Try Again</Button></> : <><Skeleton /><Skeleton /></>}
    </Panel>
  );

  const nothing = !store.copies.length && !store.given.length;
  return (
    <div className="flex flex-col gap-6">
      <Panel className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-medium">Every Stored Copy</h2>
          <Badge tone="warn">Simulation</Badge>
        </div>
        <p className="text-muted">The store is public: anyone can take a copy. Titles, names and readers are not shown here.</p>
        {nothing ? <EmptyState icon={FileText} title="Nothing Stored Yet" text="Papers put in a house show here as locked copies." /> : (
          <ul className="flex flex-col gap-2">
            {store.given.map((g, i) => (
              <li key={g.address} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-white/6 px-4 py-3">
                <KeyRound className="size-5 text-amber" aria-hidden />
                <span className="font-medium">Drill Sample {i + 1}</span>
                <span className="sm:ml-auto">{result ? <Badge tone="warn">Opened</Badge> : <Badge tone="warn">Locked With the Old Lock</Badge>}</span>
              </li>
            ))}
            {store.copies.map((c, i) => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-white/6 px-4 py-3">
                <Lock className="size-5 text-lime" aria-hidden />
                <span className="font-medium">Locked Copy {i + 1}</span>
                {result && result.shut.has(c.id) && <span className="basis-full text-sm text-muted sm:order-last">The ML-KEM-1024 part is missing.</span>}
                <span className="sm:ml-auto">{result ? (result.shut.has(c.id) ? <Badge tone="ok">Stayed Shut</Badge> : <Badge tone="warn">Opened</Badge>) : <Badge tone="ok">Locked With ML-KEM-1024</Badge>}</span>
              </li>
            ))}
          </ul>
        )}
        {problem && <p role="alert" className="text-danger">{problem}</p>}
        {!result && <>
          <Button onClick={run} loading={running} full>{running ? "Pretending Q-Day" : "Pretend Q-Day"}</Button>
          {member && <Button variant="secondary" href="/drill?give">Give My Old Keys to the Drill (Simulation)</Button>}
        </>}
      </Panel>

      {result && (
        <Panel className="flex flex-col gap-4">
          <h2 ref={summary} tabIndex={-1} className="text-xl font-medium">Thief (Simulation)</h2>
          <p className="flex flex-wrap items-center gap-3"><LockOpen className="size-5 text-amber" aria-hidden />Old-Lock Copies <Badge tone="warn">{result.pictures.length} Opened</Badge></p>
          <p className="flex flex-wrap items-center gap-3"><Lock className="size-5 text-lime" aria-hidden />Lockhouse Copies <Badge tone="ok">{result.shut.size} of {store.copies.length} Stayed Shut</Badge></p>
          <p className="text-muted">The old keys opened every old-lock copy. Every Lockhouse copy needs the ML-KEM-1024 secret key too, and that never left its owner&apos;s device.</p>
          {result.pictures.map((u, i) => <img key={u} src={u} alt={`Drill Sample ${i + 1}, opened by the Thief`} className="w-full rounded-xl outline outline-1 -outline-offset-1 outline-white/10" />)}
          {member && <>
            <p className="text-muted">Your own papers still open for you, with your own keys.</p>
            <Button href="/house" full>Open My Papers</Button>
          </>}
        </Panel>
      )}

      {member && (
        <Panel className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-medium">A Fake Drop-In</h2>
            <Badge tone="warn">Simulation</Badge>
          </div>
          <p className="text-muted">Pretend our server was hacked. It slips a paper into your house that says it is from someone else in it, but it can&apos;t sign with their key. Only you can open it.</p>
          {fakeProblem && <p role="alert" className="text-danger">{fakeProblem}</p>}
          <Button ref={fakeButton} variant="secondary" onClick={fake} loading={faking}>{faking ? "Making the Fake Paper" : "Try a Fake Drop-In (Simulation)"}</Button>
        </Panel>
      )}
    </div>
  );
}
