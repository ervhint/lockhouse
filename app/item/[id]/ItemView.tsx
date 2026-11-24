"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Lock, ShieldAlert } from "lucide-react";
import Heading from "@/components/Heading";
import Panel from "@/components/Panel";
import Button from "@/components/Button";
import EmptyState from "@/components/EmptyState";
import PaperView from "@/components/PaperView";
import Skeleton from "@/components/Skeleton";
import type { MessageSignature } from "@qorechain/qoresign";
import { keysFrom, loadKeys } from "@/lib/keys";
import { openItem, type Paper } from "@/lib/items";

type Row = { id: string; house_id: string; sender: string; senderName: string; title: string; created_at: string; readerCount: number; reader: boolean; fromMe: boolean; envelope?: string; signature?: MessageSignature };
type View = { row: Row; proven: boolean; paper: Paper | null };

// S-08: get the one locked copy, check the sender's signature on chain, open it on this device (AC-6.1).
export default function ItemView({ id }: { id: string }) {
  const router = useRouter();
  const [view, setView] = useState<View | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const retry = useRef<HTMLButtonElement>(null);

  const load = useCallback(async () => {
    setProblem(null);
    const k = loadKeys();
    const res = await fetch(`/api/items/${id}`, { cache: "no-store" }).catch(() => null);
    if (res?.status === 401) return router.replace("/sign-in");
    if (res?.status === 403 || res?.status === 404) return setProblem("gone");
    if (!res?.ok) return setProblem("load");
    const row: Row = await res.json();
    if (!row.reader) return setView({ row, proven: false, paper: null });
    if (!k) return setProblem("keys");
    try {
      const { proven, paper } = await openItem(keysFrom(k.words), { id: row.id, houseId: row.house_id, sender: row.sender, title: row.title, envelope: row.envelope!, signature: row.signature! }, `${location.origin}/api/chain`);
      setView({ row, proven, paper });
    } catch {
      setProblem("chain");
    }
  }, [id, router]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (problem) retry.current?.focus(); }, [problem]);

  const back = <Button variant="secondary" href="/house">Back to the House</Button>;

  if (problem === "gone") return <EmptyState page icon={Lock} title="This Paper Isn't Here" text="It isn't in your house, or it was never put in. Go back and pick one from the list." action={back} />;
  if (problem) return (
    <Panel className="flex flex-col items-start gap-4">
      <p role="alert">{problem === "keys" ? "This browser has no keys, so it can't open papers. Restore your keys with your secret words first."
        : problem === "chain" ? "Can't reach QoreChain to check the signature. Nothing was shown. Try again."
        : "The paper didn't load. Check your connection, then try again."}</p>
      {problem === "keys" ? <Button href="/keys?restore">Restore Your Keys</Button> : <Button ref={retry} onClick={load}>Try Again</Button>}
    </Panel>
  );
  if (!view) return (
    <>
      <Heading title="Opening on This Device…" />
      <Panel className="flex flex-col gap-5" aria-busy><Skeleton className="h-52" /><p role="status" className="text-muted">Checking the signature, then opening on this device…</p></Panel>
    </>
  );

  const { row, proven, paper } = view;
  if (!row.reader && row.fromMe) return <EmptyState page warn icon={ShieldAlert} title="You Did Not Put This In" text="This paper says it is from you, but you are not one of its readers, and you can open everything you put in. Someone used your name. Do not trust it." action={back} />;
  if (!row.reader) return <EmptyState page icon={Lock} title="This Paper Is Not for You" text={`You are not one of this paper's readers. Ask ${row.senderName} to add you.`} action={back} />;

  return <PaperView title={row.title} senderName={row.senderName} date={row.created_at} readerCount={row.readerCount} proven={proven} paper={paper} back={back} />;
}
