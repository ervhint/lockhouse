"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import Button from "./Button";

// 24 secret words in a numbered grid, to copy onto paper (S-03, and the house's recovery key).
// `copy` adds Copy All Words: the words with single spaces, the way Restore Your Keys takes them (Laras, 27 Nov).
export default function Words({ words, copy }: { words: string[]; copy?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {words.map((w, i) => (
          <li key={i} className="flex gap-2 rounded-lg bg-white/8 px-3 py-2 font-mono text-sm"><span className="w-5 text-muted">{i + 1}</span>{w}</li>
        ))}
      </ol>
      {copy && <>
        <Button variant="secondary" className="sm:self-start" onClick={async () => { const ok = await navigator.clipboard.writeText(words.join(" ")).then(() => true, () => false); setFailed(!ok); if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); } }}>
          {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}{copied ? "Copied" : "Copy All Words"}
        </Button>
        <span className="sr-only" role="status">{copied ? "All 24 words copied" : ""}</span>
        {failed && <p role="alert" className="text-sm text-danger">This browser didn&apos;t let us copy. Write the words down from the list above instead.</p>}
      </>}
    </div>
  );
}
