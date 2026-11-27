"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Lock, ShieldAlert, TriangleAlert } from "lucide-react";
import type { RecipientCard } from "@qorechain/qoreseal";
import type { MessageSignature } from "@qorechain/qoresign";
import Heading from "@/components/Heading";
import Panel from "@/components/Panel";
import Button from "@/components/Button";
import EmptyState from "@/components/EmptyState";
import LockSteps, { BUSY, type Step } from "@/components/LockSteps";
import ReaderPicker from "@/components/ReaderPicker";
import Skeleton from "@/components/Skeleton";
import Toast from "@/components/Toast";
import { keysFrom, loadKeys } from "@/lib/keys";
import { lockSignStamp, openItem, type Item, type Paper } from "@/lib/items";
import type { Recovery } from "@/lib/recovery";

type Row = { id: string; house_id: string; sender: string; senderName: string; title: string; reader: boolean; fromMe: boolean; envelope?: string; signature?: MessageSignature; stamp?: string | null; readers?: string[] };
type House = { id: string; members: { name: string; address: string; card: RecipientCard }[]; recovery: Recovery | null };
type Ready = { row: Row; house: House; keys: ReturnType<typeof keysFrom> | null; paper: Paper | null; proven: boolean };
const SAVE_FAILED = "Could not save. Nothing was changed. Try again.";
const nextFrame = () => new Promise((ok) => requestAnimationFrame(() => setTimeout(ok)));
const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

// S-13: open the paper on this device first, pick the new readers, then lock it again (same id), sign, stamp and save.
// Only the person who put it in (AC-12.1–12.6, D-22).
export default function ReadersForm({ id }: { id: string }) {
  const router = useRouter();
  const [ready, setReady] = useState<Ready | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [step, setStep] = useState<Step>("ready");
  const [locked, setLocked] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [failed, setFailed] = useState<{ item: Item; message: string; round: number } | null>(null);
  const retry = useRef<HTMLButtonElement>(null);

  const load = useCallback(async () => {
    setProblem(null);
    const k = loadKeys();
    const [res, h] = await Promise.all([fetch(`/api/items/${id}`, { cache: "no-store" }), fetch("/api/house", { cache: "no-store" })].map((p) => p.catch(() => null)));
    if (res?.status === 401 || h?.status === 401) return router.replace("/sign-in");
    if (res?.status === 403 || res?.status === 404) return setProblem("gone");
    if (!res?.ok || !h?.ok) return setProblem("load");
    const [row, house]: [Row, House] = [await res.json(), await h.json()];
    if (!row.fromMe || !row.reader) return setReady({ row, house, keys: null, paper: null, proven: false });
    if (!k) return setProblem("keys");
    const keys = keysFrom(k.words);
    try {
      const opened = await openItem(keys, { id: row.id, houseId: row.house_id, sender: row.sender, title: row.title, envelope: row.envelope!, signature: row.signature!, stamp: row.stamp }, `${location.origin}/api/chain`);
      setPicked(row.readers!.filter((a) => a !== keys.address && house.members.some((m) => m.address === a))); // readers who left the house drop out (AC-12.8)
      setReady({ row, house, keys, paper: opened.paper, proven: opened.proven });
    } catch {
      setProblem("chain");
    }
  }, [id, router]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (problem) retry.current?.focus(); }, [problem]);

  const toPaper = <Button variant="secondary" href={`/item/${id}`}>Back to the Paper</Button>;

  async function send(item: Item) {
    setStep("saving");
    setFailed(null);
    const res = await fetch(`/api/items/${id}`, { method: "PUT", headers: { "content-type": "application/json" },
      body: JSON.stringify({ envelope: item.envelope, signature: item.signature, readers: item.readers, stamp: item.stamp }) }).catch(() => null);
    if (res?.status === 401) return router.replace("/sign-in");
    if (res?.ok) return router.push(`/item/${id}?changed=1`);
    setStep("ready");
    const body = await res?.json().catch(() => ({}));
    setFailed((f) => ({ item, message: res && res.status < 500 && body?.error ? body.error : SAVE_FAILED, round: (f?.round ?? 0) + 1 }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const { row, house, keys, paper } = ready!;
    const readers = house.members.filter((m) => m.address === keys!.address || picked.includes(m.address));
    setError(null); setFailed(null); setLocked(0);
    setStep("locking");
    await nextFrame();
    let item: Item;
    try {
      item = await lockSignStamp({ keys: keys!, house, title: row.title, paper: paper!, cards: readers.map((m) => m.card), rest: `${location.origin}/api/chain`, id,
        onStep: async (s) => {
          setStep(s);
          if (s === "signing") { setLocked(readers.length); await nextFrame(); }
        } });
    } catch (e) {
      setStep("ready");
      setLocked(0);
      return setError((e as Error).message);
    }
    await send(item);
  }

  if (problem === "gone") return <EmptyState page icon={Lock} title="This Paper Isn't Here" text="It isn't in your house, or it was never put in. Go back and pick one from the list." action={<Button variant="secondary" href="/papers">Back to Papers</Button>} />;
  if (problem) return (
    <Panel className="flex flex-col items-start gap-4">
      <p role="alert">{problem === "keys" ? "This browser has no keys, so it can't open papers. Restore your keys with your secret words first."
        : problem === "chain" ? "Can't reach QoreChain to check the signature and stamp. Nothing was changed. Try again."
        : "The paper didn't load. Check your connection, then try again."}</p>
      {problem === "keys" ? <Button href="/keys?restore">Restore Your Keys</Button> : <Button ref={retry} onClick={load}>Try Again</Button>}
    </Panel>
  );
  if (!ready) return (
    <>
      <Heading title="Opening on This Device…" />
      <Panel className="flex flex-col gap-5" aria-busy><Skeleton className="h-40" /><p role="status" className="text-muted">Checking the signature, then opening on this device…</p></Panel>
    </>
  );

  const { row, house, keys, paper, proven } = ready;
  if (!row.fromMe) return <EmptyState page icon={Lock} title="Only the Sender Can Change This" text={`Only ${row.senderName} can change who can open this paper.`} action={toPaper} />;
  if (!keys || !proven || !paper) return <EmptyState page warn icon={ShieldAlert} title="This Paper Can't Be Changed" text="Its signature doesn't check out on QoreChain, or it didn't open with your keys, so its readers can't be changed. Open the paper to see why." action={toPaper} />;

  const busy = step !== "ready";
  const before = row.readers!.filter((a) => a !== keys.address);
  const removed = house.members.filter((m) => before.includes(m.address) && !picked.includes(m.address));
  const count = 1 + picked.length;
  return (
    <>
      <Heading title="Change Readers">Pick who can open &ldquo;{row.title}&rdquo;. It is locked again on this device for the people you pick, signed with your key and stamped on QoreChain.</Heading>
      <Panel>
        <form onSubmit={submit} noValidate className="flex flex-col gap-6">
          <ReaderPicker members={house.members} me={keys.address} picked={picked} onPick={setPicked} recovery={house.recovery} disabled={busy} />
          <div className="flex flex-col gap-3">
            {/* Always in the page, so a screen reader hears each warning as it appears (AC-12.3). */}
            <div aria-live="polite" className="flex flex-col gap-2">
              {removed.map((m) => (
                <p key={m.address} className="flex items-start gap-2 rounded-xl border border-amber/40 bg-amber/10 p-3 text-sm">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber" aria-hidden />
                  {m.name} may already have this paper on their device. Removing them only stops them opening it here from now on.
                </p>
              ))}
            </div>
            <LockSteps step={step} locked={locked} recovery={!!house.recovery} />
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
            <Button type="submit" full loading={busy} disabled={sameSet(picked, before)}>
              {step === "ready" ? `Save for ${count} ${count === 1 ? "Reader" : "Readers"}` : BUSY[step]}
            </Button>
            {toPaper}
          </div>
        </form>
      </Panel>
      {failed && (
        <Toast key={failed.round} tone="bad">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-2">{failed.message}
            {/* Sends the same locked copy again (AC-12.4). */}
            <button type="button" autoFocus onClick={() => send(failed.item)} className="font-medium underline">Try Again</button>
          </span>
        </Toast>
      )}
    </>
  );
}
