"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Panel from "@/components/Panel";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Checkbox from "@/components/Checkbox";
import Skeleton from "@/components/Skeleton";
import Words from "@/components/Words";
import { keysFrom, loadKeys, makeWords } from "@/lib/keys";
import { makeRecovery } from "@/lib/recovery";

type House = { id: string; members: { name: string; address: string }[]; recovery: { by: string } | null };

// The words are made in this browser and shown once; only the public half and the lookup are sent (INV-1).
export default function MakeRecovery() {
  const router = useRouter();
  const save = useRef<HTMLButtonElement>(null);
  const [house, setHouse] = useState<House | null>();
  const [words, setWords] = useState<string | null>(null);
  const [keys, setKeys] = useState<ReturnType<typeof keysFrom> | null>();
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const k = loadKeys();
    setKeys(k && keysFrom(k.words));
    setWords(makeWords());
    fetch("/api/house", { cache: "no-store" }).then(async (res) => {
      if (res.status === 401) return router.replace("/sign-in");
      setHouse(res.ok ? await res.json() : null);
    }, () => setHouse(null));
  }, [router]);

  async function send() {
    setBusy(true);
    setError("");
    const body = await makeRecovery(keys!, house!.id, words!).catch(() => null);
    const res = body && await fetch("/api/house/recovery", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const out = await res?.json().catch(() => null);
    setBusy(false);
    if (res?.ok) return router.push("/house?recovery");
    setError(out?.error ?? "Can't reach Lockhouse. Nothing was saved. Check your connection, then try again.");
    requestAnimationFrame(() => save.current?.focus());
  }

  if (house === undefined || keys === undefined) return <Panel className="flex flex-col gap-4"><Skeleton /><Skeleton /><Skeleton /></Panel>;
  if (!keys) return (
    <Panel className="flex flex-col items-start gap-4">
      <p>This browser has no keys, so it can&apos;t sign the recovery key. Restore your keys with your secret words first.</p>
      <Button href="/keys?restore">Restore Your Keys</Button>
    </Panel>
  );
  if (!house) return (
    <Panel className="flex flex-col items-start gap-4">
      <p role="alert">Your house didn&apos;t load. Check your connection, then reload the page.</p>
      <Button variant="secondary" onClick={() => location.reload()}>Reload</Button>
    </Panel>
  );
  if (house.recovery) return (
    <Panel className="flex flex-col items-start gap-4">
      <p>This house already has a recovery key, made by {house.members.find((m) => m.address === house.recovery!.by)?.name}.</p>
      <Button variant="secondary" href="/house">Back to the House</Button>
    </Panel>
  );

  return (
    <Panel className="flex flex-col gap-5">
      <Badge tone="warn">Shown Once</Badge>
      <Words words={words!.split(" ")} />
      <p className="text-muted">Write them on paper and keep it somewhere safe, away from your devices. Anyone who has these words can open the papers locked to them.</p>
      <Checkbox checked={ok} onChange={(e) => setOk(e.target.checked)} disabled={busy}>I wrote the recovery words on paper</Checkbox>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <Button ref={save} full disabled={!ok} loading={busy} onClick={send}>{busy ? "Saving the Recovery Key" : "Save the Recovery Key"}</Button>
      <Button variant="ghost" href="/house">Not Now</Button>
    </Panel>
  );
}
