"use client";
import { useEffect, useState, type ReactNode } from "react";
import { Download, FileText } from "lucide-react";
import Heading from "@/components/Heading";
import Panel from "@/components/Panel";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import type { Paper } from "@/lib/items";

const when = (d: string) => new Date(d).toLocaleDateString(undefined, { dateStyle: "medium" });

// An opened paper (S-08, and Open With Recovery Words): who put it in, the signature result, the preview, Download.
// Not proven: the preview is blurred and out of reach, and there is no Download (AC-6.4).
export default function PaperView({ title, senderName, date, readerCount, proven, paper, back }:
  { title: string; senderName: string; date: string; readerCount?: number; proven: boolean; paper: Paper | null; back: ReactNode }) {
  const [url, setUrl] = useState<string | null>(null);

  // Pictures and PDFs show as they are; the object URL is made here and let go on leaving.
  useEffect(() => {
    if (!paper || !(paper.type.startsWith("image/") || paper.type === "application/pdf")) return setUrl(null);
    const u = URL.createObjectURL(new Blob([paper.bytes as BlobPart], { type: paper.type.startsWith("image/") ? paper.type : "application/pdf" }));
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [paper]);

  const save = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([paper!.bytes as BlobPart], { type: paper!.type }));
    a.download = paper!.name;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const preview = !paper ? null
    : paper.type.startsWith("image/") && url ? <img src={url} alt={title} className="max-h-[32rem] w-full rounded-xl object-contain" />
    : paper.type === "application/pdf" && url ? <iframe src={url} title={title} className="h-[32rem] w-full rounded-xl bg-white" />
    : paper.type === "text/plain" ? <pre className="whitespace-pre-wrap break-words p-4 font-sans">{new TextDecoder().decode(paper.bytes)}</pre>
    : <span className="flex items-center gap-3 p-4"><FileText className="size-6" aria-hidden />{paper.name}</span>;

  return (
    <>
      <Heading title={title}>Put in by {senderName} · {when(date)}{readerCount !== undefined && ` · ${readerCount} ${readerCount === 1 ? "Reader" : "Readers"}`}</Heading>
      <Panel className="flex flex-col gap-5">
        {proven
          ? <Badge tone="ok">From {senderName} · Signature Checked on QoreChain</Badge>
          : <div role="alert" className="flex flex-col gap-2 rounded-xl border border-danger/50 bg-danger/10 p-4"><Badge tone="bad">Signature Not Proven</Badge><p>This paper says it is from {senderName}, but the signature does not check out on QoreChain. Do not trust it.</p></div>}
        {preview && <div className={`overflow-auto rounded-xl bg-white/6 ${proven ? "" : "select-none blur-md"}`} inert={!proven}>{preview}</div>}
        {!paper && <p className="text-muted">This paper could not be opened with your keys.</p>}
        {proven && paper && <Button onClick={save}><Download className="size-4" aria-hidden />Download Paper</Button>}
        {back}
      </Panel>
    </>
  );
}
