"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Download, FileText, Lock } from "lucide-react";
import Heading from "@/components/Heading";
import Panel from "@/components/Panel";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import EmptyState from "@/components/EmptyState";
import Skeleton from "@/components/Skeleton";
import type { MessageSignature } from "@qorechain/qoresign";
import { keysFrom, loadKeys } from "@/lib/keys";
import { openItem, type Paper } from "@/lib/items";

type Row = { id: string; house_id: string; sender: string; senderName: string; title: string; created_at: string; readerCount: number; reader: boolean; envelope?: string; signature?: MessageSignature };
type View = { row: Row; proven: boolean; paper: Paper | null };

const when = (d: string) => new Date(d).toLocaleDateString(undefined, { dateStyle: "medium" });

// S-08: get the one locked copy, check the sender's signature on chain, open it on this device (AC-6.1).
export default function ItemView({ id }: { id: string }) {
  const router = useRouter();
  const [view, setView] = useState<View | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
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

  // Pictures and PDFs show as they are; the object URL is made here and let go on leaving.
  useEffect(() => {
    const p = view?.paper;
    if (!p || !(p.type.startsWith("image/") || p.type === "application/pdf")) return setUrl(null);
    const u = URL.createObjectURL(new Blob([p.bytes as BlobPart], { type: p.type.startsWith("image/") ? p.type : "application/pdf" }));
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [view]);

  const back = <Button variant="secondary" href="/house">Back to the House</Button>;

  if (problem === "gone") return <EmptyState icon={Lock} title="This Paper Isn't Here" text="It isn't in your house, or it was never put in. Go back and pick one from the list." action={back} />;
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
  if (!row.reader) return <EmptyState icon={Lock} title="This Paper Is Not for You" text={`You are not one of this paper's readers. Ask ${row.senderName} to add you.`} action={back} />;

  const save = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([paper!.bytes as BlobPart], { type: paper!.type }));
    a.download = paper!.name;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const preview = !paper ? null
    : paper.type.startsWith("image/") && url ? <img src={url} alt={row.title} className="max-h-[32rem] w-full rounded-xl object-contain" />
    : paper.type === "application/pdf" && url ? <iframe src={url} title={row.title} className="h-[32rem] w-full rounded-xl bg-white" />
    : paper.type === "text/plain" ? <pre className="whitespace-pre-wrap break-words p-4 font-sans">{new TextDecoder().decode(paper.bytes)}</pre>
    : <span className="flex items-center gap-3 p-4"><FileText className="size-6" aria-hidden />{paper.name}</span>;

  return (
    <>
      <Heading title={row.title}>Put in by {row.senderName} · {when(row.created_at)} · {row.readerCount} {row.readerCount === 1 ? "Reader" : "Readers"}</Heading>
      <Panel className="flex flex-col gap-5">
        {proven
          ? <Badge tone="ok">From {row.senderName} · Signature Checked on QoreChain</Badge>
          : <div role="alert" className="flex flex-col gap-2 rounded-xl border border-danger/50 bg-danger/10 p-4"><Badge tone="bad">Signature Not Proven</Badge><p>This paper says it is from {row.senderName}, but the signature does not check out on QoreChain. Do not trust it.</p></div>}
        {preview && <div className={`overflow-auto rounded-xl bg-white/6 ${proven ? "" : "select-none blur-md"}`} inert={!proven}>{preview}</div>}
        {!paper && <p className="text-muted">This paper could not be opened with your keys.</p>}
        {proven && paper && <Button onClick={save}><Download className="size-4" aria-hidden />Download Paper</Button>}
        {back}
      </Panel>
    </>
  );
}
