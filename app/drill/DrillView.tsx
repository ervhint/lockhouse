"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, X } from "lucide-react";
import { envelopeFromText, generateSealKeys, open, parseEnvelope } from "@qorechain/qoreseal";
import Panel from "@/components/Panel";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import { CHAIN_ID, ITEM_PURPOSE } from "@/lib/settings";

type Copy = { id: string; envelope: string; date: string };
const mb = (n: number) => `${(n / 1024 ** 2).toFixed(1)} MB`;

// S-09: the Thief's three steps, all real except the broken old lock (AC-7.3, D-19):
// 1 steal every stored copy (this page downloads them), 2 try to open each with the Thief's own keys (QoreSeal open),
// 3 Q-Day: the old lock is broken (pretend), and each copy is read to see it still carries ML-KEM-1024.
export default function DrillView() {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [copies, setCopies] = useState<Copy[]>([]);
  const [opened, setOpened] = useState(0);
  const [withMlkem, setWithMlkem] = useState(0);
  const latest = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (step) latest.current?.focus(); }, [step]);

  const steal = async () => {
    setBusy(true);
    setProblem(null);
    const res = await fetch("/api/drill", { cache: "no-store" }).catch(() => null);
    if (res?.ok) { setCopies((await res.json()).copies); setStep(1); }
    else setProblem("The break-in failed: the store didn't answer. Check your connection, then try again.");
    setBusy(false);
  };

  // Real attempts: the Thief has keys, just not any reader's. QoreSeal refuses every copy.
  const tryOpen = () => {
    const thief = generateSealKeys();
    setOpened(copies.filter((c) => {
      try { open({ chainId: CHAIN_ID, purpose: ITEM_PURPOSE, envelope: envelopeFromText(c.envelope), keys: thief, aad: new TextEncoder().encode(c.id) }); return true; } catch { return false; }
    }).length);
    setStep(2);
  };

  const qday = () => {
    setWithMlkem(copies.filter((c) => ["hybrid", "mlkem"].includes(parseEnvelope(envelopeFromText(c.envelope)).mode)).length);
    setStep(3);
  };

  const size = copies.reduce((n, c) => n + c.envelope.length, 0);
  const sample = copies.at(-1)?.envelope.slice(0, 240);
  const head = (n: number, title: string) => (
    <h2 ref={step === n ? latest : undefined} tabIndex={-1} className="flex items-center gap-3 text-xl font-medium">
      <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-white/10 text-base">{n}</span>{title}
    </h2>
  );
  const Row = ({ ok, children }: { ok: boolean; children: ReactNode }) => (
    <li className="flex items-center gap-3 rounded-xl bg-white/6 px-4 py-3">
      {ok ? <Check className="size-5 text-lime" aria-hidden /> : <X className="size-5 text-amber" aria-hidden />}{children}
    </li>
  );

  return (
    <div className="flex flex-col gap-6">
      <Panel className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {head(1, "Break In")}
          <Badge tone="warn">Simulation</Badge>
        </div>
        {step < 1
          ? <><p className="text-muted">Lockhouse&apos;s server holds every family&apos;s papers. Get in and take them all.</p>
              <Button onClick={steal} loading={busy} full>{busy ? "Stealing" : "Break In and Steal Everything"}</Button></>
          : <p>You broke into Lockhouse&apos;s server and stole every paper stored there, from every house: <b className="font-medium">{copies.length} papers</b> ({mb(size)}). If your house has papers, yours are in this pile too.</p>}
        {problem && <p role="alert" className="text-danger">{problem}</p>}
      </Panel>

      {step >= 1 && (
        <Panel className="flex flex-col gap-4">
          {head(2, "Try to Open Them")}
          {step < 2
            ? <><p className="text-muted">You have the papers. Now read them.</p>
                <Button onClick={tryOpen} full>Try to Open Them</Button></>
            : <>
                <p className="text-muted">This is what one stolen paper looks like to you:</p>
                <pre className="overflow-hidden rounded-xl bg-black/40 p-4 text-sm break-all whitespace-pre-wrap text-muted">{sample}…</pre>
                <p><b className="font-medium">You opened {opened} of {copies.length}.</b> Every one is locked to its family&apos;s keys, and you don&apos;t have them.</p>
              </>}
        </Panel>
      )}

      {step >= 2 && (
        <Panel className="flex flex-col gap-4">
          {head(3, "Wait for Q-Day")}
          {step < 3
            ? <><p className="text-muted">Keep the papers. One day a quantum computer will break today&apos;s locks. Then try again. Thieves call this &ldquo;harvest now, decrypt later&rdquo;: steal locked papers today, open them after Q-Day.</p>
                <Button onClick={qday} full>It&apos;s Q-Day: Try Again</Button></>
            : <>
                <ul className="flex flex-col gap-2">
                  <Row ok={false}>Old lock (X25519): broken by your quantum computer <span className="text-sm text-muted">(Simulation)</span></Row>
                  <Row ok>ML-KEM-1024: still holds on {withMlkem} of {copies.length} papers</Row>
                </ul>
                <p className="text-xl font-medium">You stole {copies.length} papers. You opened {copies.length - withMlkem}.</p>
                <p className="text-muted">Apps that use only the old lock would open here. Lockhouse locks every paper with ML-KEM-1024 too, and a quantum computer can&apos;t break it.</p>
              </>}
        </Panel>
      )}
    </div>
  );
}
