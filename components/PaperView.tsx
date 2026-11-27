"use client";
import { useEffect, useState, type ReactNode } from "react";
import { Download, FileText } from "lucide-react";
import Heading from "@/components/Heading";
import Panel from "@/components/Panel";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import { pictureUrl, type Paper } from "@/lib/items";
import { explorerTx } from "@/lib/settings";

const when = (d: string) => new Date(d).toLocaleDateString(undefined, { dateStyle: "medium" });
type Stamp = { hash: string; at: Date | null } | null;

// The stamp result (U11, AC-11.4, AC-11.5): stamped (with its time), not stamped, or a stamp for something else.
function StampBadge({ stamp }: { stamp: Stamp }) {
  if (!stamp) return <Badge tone="warn">Not Stamped on QoreChain</Badge>;
  const label = stamp.at ? `Stamped on QoreChain · ${stamp.at.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}` : "Stamp Doesn't Match This Paper";
  return <Badge tone={stamp.at ? "ok" : "bad"} href={explorerTx(stamp.hash)} aria-label={`${label}. Opens the explorer`}>{label}</Badge>;
}
// One line under the badges saying what the stamp result means (Laras's words for the stamped case).
const stampText = (stamp: Stamp) => !stamp ? "This paper has no stamp on QoreChain, so nothing proves when it was put in."
  : !stamp.at ? "Its stamp on QoreChain belongs to another paper or another person. Don't trust its date."
  : `QoreChain recorded this paper. If anyone changes it later, you will see it here. Click the badge to see the record. If that page says "not found", click Testnet at the top.`;

// An opened paper (S-08, and Open With Recovery Words): who put it in, the signature and stamp results, the preview, Download.
// Not proven: the preview is blurred and out of reach, and there is no Download (AC-6.4).
// `readers`: who can open it, by name (S-08 only).
export default function PaperView({ title, senderName, date, changedAt, readerCount, readers, proven, stamp, paper, back }:
  { title: string; senderName: string; date: string; changedAt?: string | null; readerCount?: number; readers?: string[]; proven: boolean; stamp: Stamp; paper: Paper | null; back: ReactNode }) {
  const [url, setUrl] = useState<string | null>(null);

  // Pictures show from a data: URL (see pictureUrl); a PDF from an object URL, made here and let go on leaving.
  useEffect(() => {
    setUrl(null);
    if (paper?.type.startsWith("image/")) {
      let live = true;
      pictureUrl(paper).then((u) => live && setUrl(u), () => {});
      return () => { live = false; };
    }
    if (paper?.type !== "application/pdf") return;
    const u = URL.createObjectURL(new Blob([paper.bytes as BlobPart], { type: "application/pdf" }));
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
    : paper.type.startsWith("image/") && url ? <img src={url} alt={title} className="max-h-[min(32rem,70svh)] w-full rounded-xl object-contain" />
    : paper.type === "application/pdf" && url ? <iframe src={url} title={title} className="h-[32rem] w-full rounded-xl bg-white" />
    : paper.type === "text/plain" ? <pre className="whitespace-pre-wrap break-words p-4 font-sans">{new TextDecoder().decode(paper.bytes)}</pre>
    : <span className="flex items-center gap-3 p-4"><FileText className="size-6" aria-hidden />{paper.name}</span>;

  return (
    <>
      <Heading title={title}>Put in by {senderName} · {when(date)}{readerCount !== undefined && ` · ${readerCount} ${readerCount === 1 ? "Reader" : "Readers"}`}{changedAt && ` · Readers changed ${when(changedAt)}`}</Heading>
      {/* Wide screens: the paper on the left (3/5), what it is and what to do on the right (2/5). Phones: one column. */}
      <Panel className="grid gap-5 md:grid-cols-5 md:grid-rows-[auto_1fr] md:items-start">
        <div className="flex flex-col gap-5 md:col-span-2 md:col-start-4">
        {!proven && <div role="alert" className="flex flex-col gap-2 rounded-xl border border-danger/50 bg-danger/10 p-4"><Badge tone="bad">Signature Not Proven</Badge><p>This paper says it is from {senderName}, but the signature does not check out on QoreChain. Do not trust it.</p></div>}
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            {proven && <Badge tone="ok">Signature Checked on QoreChain</Badge>}{/* who put it in is right above, under the title */}
            <StampBadge stamp={stamp} />
          </div>
          <p className="text-pretty text-sm text-muted">{stampText(stamp)}</p>
        </div>
        {readers && (
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-medium">Who Can Open It</h2>
            <p className="text-pretty text-muted">{new Intl.ListFormat("en", { type: "conjunction" }).format(readers)}</p>
          </div>
        )}
        </div>
        <div className="md:col-span-3 md:col-start-1 md:row-span-2 md:row-start-1">
          {preview && <div className={`overflow-auto rounded-xl bg-white/6 ${proven ? "" : "select-none blur-md"}`} inert={!proven}>{preview}</div>}
          {!paper && <p className="text-muted">This paper could not be opened with your keys.</p>}
        </div>
        <div className="flex flex-col gap-3 md:col-span-2 md:col-start-4">
        {proven && paper && <Button onClick={save}><Download className="size-4" aria-hidden />Download Paper</Button>}
        {back}
        </div>
      </Panel>
    </>
  );
}
