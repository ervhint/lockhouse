"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import type { RecipientCard } from "@qorechain/qoreseal";
import Input from "@/components/Input";
import Checkbox from "@/components/Checkbox";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import AddressChip from "@/components/AddressChip";
import Panel from "@/components/Panel";
import Skeleton from "@/components/Skeleton";
import Toast from "@/components/Toast";
import { keysFrom, loadKeys } from "@/lib/keys";
import { NOTE, fileProblem, lockCopy, signItem, titleProblem, type Item } from "@/lib/items";
import { checkRecovery, type Recovery } from "@/lib/recovery";

type House = { id: string; members: { name: string; address: string; card: RecipientCard }[]; recovery: Recovery | null };
type Step = "ready" | "locking" | "signing" | "saving";
const SAVE_FAILED = "Could not save. Nothing was sent. Try again.";
const nextFrame = () => new Promise((ok) => requestAnimationFrame(() => setTimeout(ok)));

// S-07: check the readers' cards on chain, lock on this device, sign, and only then send (AC-5.1, AC-5.2).
export default function PutInForm() {
  const router = useRouter();
  const titleField = useRef<HTMLInputElement>(null);
  const fileField = useRef<HTMLInputElement>(null);
  const noteField = useRef<HTMLTextAreaElement>(null);
  const [kind, setKind] = useState<"file" | "note">("file");
  const [house, setHouse] = useState<House | null>();
  const [keys, setKeys] = useState<ReturnType<typeof keysFrom> | null>();
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [errors, setErrors] = useState<{ title?: string; file?: string; note?: string; lock?: string }>({});
  const [step, setStep] = useState<Step>("ready");
  const [locked, setLocked] = useState(0); // readers in the locked copy, once it is locked
  const [failed, setFailed] = useState<{ item: Item; message: string; round: number } | null>(null);
  const [saved, setSaved] = useState<{ readers: number; round: number } | null>(null);
  const [round, setRound] = useState(0); // a new form after each save, so the file field clears

  useEffect(() => {
    const k = loadKeys();
    setKeys(k && keysFrom(k.words));
    fetch("/api/house", { cache: "no-store" }).then(async (res) => {
      if (res.status === 401) return router.replace("/sign-in");
      setHouse(res.ok ? await res.json() : null);
    }, () => setHouse(null));
  }, [router]);

  async function send(item: Item) {
    setStep("saving");
    setFailed(null);
    const res = await fetch("/api/items", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(item) }).catch(() => null);
    setStep("ready");
    if (res?.status === 401) return router.replace("/sign-in");
    const body = await res?.json().catch(() => ({}));
    if (!res?.ok) return setFailed({ item, message: res && res.status < 500 && body?.error ? body.error : SAVE_FAILED, round: round + 1 });
    setSaved({ readers: body.readers, round: round + 1 });
    setRound((r) => r + 1);
    setTitle(""); setFile(null); setNote(""); setPicked([]); setLocked(0);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const bad = {
      title: titleProblem(title) ?? undefined,
      file: kind === "file" ? (file ? fileProblem(file.size) ?? undefined : "Choose a file.") : undefined,
      note: kind === "note" && !note.trim() ? "Write a note." : undefined,
    };
    setErrors(bad);
    if (bad.title) return titleField.current?.focus();
    if (bad.file) return fileField.current?.focus();
    if (bad.note) return noteField.current?.focus();

    const me = keys!.address;
    const readers = house!.members.filter((m) => m.address === me || picked.includes(m.address));
    setSaved(null); setFailed(null); setLocked(0);
    setStep("locking");
    await nextFrame();
    let item: Item;
    const rest = `${location.origin}/api/chain`;
    let extra;
    try { // the house's recovery key, if any, is one more reader; a member must have signed it (U10)
      extra = house!.recovery ? [await checkRecovery(house!.recovery, house!.id, house!.members.map((m) => m.address), rest)] : [];
    } catch {
      setStep("ready");
      return setErrors({ lock: "The house's recovery key didn't check out on QoreChain, so nothing was locked or sent. Try again in a moment." });
    }
    try {
      const paper = kind === "file" ? { name: file!.name, type: file!.type || "application/octet-stream", bytes: new Uint8Array(await file!.arrayBuffer()) }
        : { ...NOTE, bytes: new TextEncoder().encode(note) };
      performance.mark("lock-start");
      const copy = await lockCopy(paper, readers.map((m) => m.card), rest, extra);
      console.info(`Locked for ${readers.length} readers in ${Math.round(performance.measure("lock", "lock-start").duration)} ms (card checks included)`);
      setLocked(readers.length);
      setStep("signing");
      await nextFrame(); // "Locked on This Device" is on screen before anything is sent
      item = { ...copy, title: title.trim(), signature: await signItem(keys!, house!.id, copy.id, title.trim(), copy.envelope) };
    } catch {
      setStep("ready");
      setLocked(0);
      return setErrors({ lock: "A reader's signed card didn't check out on QoreChain, so nothing was locked or sent. Try again; if it keeps failing, ask them to sign in again to renew their card." });
    }
    await send(item);
  }

  if (house === undefined || keys === undefined) return <Panel className="flex flex-col gap-4"><Skeleton /><Skeleton /><Skeleton /></Panel>;
  if (!keys) return (
    <Panel className="flex flex-col items-start gap-4">
      <p>This browser has no keys, so it can&apos;t lock or sign. Restore your keys with your secret words first.</p>
      <Button href="/keys?restore">Restore Your Keys</Button>
    </Panel>
  );
  if (!house) return (
    <Panel className="flex flex-col items-start gap-4">
      <p role="alert">Your house didn&apos;t load. Check your connection, then reload the page.</p>
      <Button variant="secondary" onClick={() => location.reload()}>Reload</Button>
    </Panel>
  );

  const busy = step !== "ready";
  const count = 1 + picked.length;
  return (
    <>
      <Panel>
        <form key={round} onSubmit={submit} noValidate className="flex flex-col gap-6">
          <Input ref={titleField} label="Title" hint="House members see the title. Only the readers you pick can open the paper." maxLength={120} autoComplete="off"
            value={title} onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)} error={errors.title} disabled={busy} />
          <fieldset className="flex flex-col gap-2" disabled={busy}>
            <legend className="mb-1 text-sm font-medium">What Are You Putting In?</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {([["file", "A File"], ["note", "A Note"]] as const).map(([k, label]) => (
                <Checkbox key={k} radio name="kind" value={k} checked={kind === k} onChange={() => { setKind(k); setFile(null); setNote(""); setErrors((e) => ({ ...e, file: undefined, note: undefined })); }}>
                  <span className="font-medium">{label}</span>
                </Checkbox>
              ))}
            </div>
          </fieldset>
          {kind === "file"
            ? <Input ref={fileField} label="Choose a File" type="file" accept="image/*,application/pdf" hint="A photo or PDF, up to 2 MB." disabled={busy} error={errors.file}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] ?? null)} />
            : <Input ref={noteField} multiline label="Your Note" placeholder="Write anything you want to keep private" disabled={busy} error={errors.note}
                value={note} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNote(e.target.value)} />}
          <fieldset className="flex flex-col gap-2" disabled={busy}>
            <legend className="mb-1 text-sm font-medium">Who Can Open It</legend>
            {house.members.map((m) => {
              const mine = m.address === keys.address;
              return (
                <Checkbox key={m.address} checked={mine || picked.includes(m.address)} disabled={mine}
                  onChange={(e) => setPicked((p) => e.target.checked ? [...p, m.address] : p.filter((a) => a !== m.address))}>
                  <span className="font-medium">{m.name}</span>
                  <AddressChip address={m.address} />
                  {mine && <span className="ml-auto text-sm text-muted">Always a Reader</span>}
                </Checkbox>
              );
            })}
            {house.recovery && (
              <Checkbox checked disabled readOnly>
                <span className="font-medium">Recovery Key</span>
                <span className="ml-auto text-sm text-muted">Always a Reader</span>
              </Checkbox>
            )}
          </fieldset>
          <div className="flex flex-col gap-3">
          {/* Always in the page (never display:none), so screen readers announce each step. */}
          <div role="status" className="flex flex-wrap gap-2">
            {step === "locking" && <Badge tone="wait">Locking on This Device…</Badge>}
            {locked > 0 && <Badge tone="ok">Locked on This Device · ML-KEM-1024 + X25519 · {locked} {locked === 1 ? "Reader" : "Readers"}{house.recovery && " + Recovery Key"}</Badge>}
            {step === "signing" && <Badge tone="wait">Signing With Your Key…</Badge>}
            {step === "saving" && <Badge tone="wait">Saving the Locked Copy…</Badge>}
          </div>
          {errors.lock && <p role="alert" className="text-sm text-danger">{errors.lock}</p>}
          <Button type="submit" full loading={busy}>
            {step === "locking" ? "Locking" : step === "signing" ? "Signing" : step === "saving" ? "Saving" : `Lock and Put In for ${count} ${count === 1 ? "Reader" : "Readers"}`}
          </Button>
          </div>
        </form>
      </Panel>
      {saved && <Toast key={`ok${saved.round}`}>Put in. {saved.readers} {saved.readers === 1 ? "reader" : "readers"}{house.recovery && " and the recovery key"} can open it. <Link href="/house" className="underline">See the House</Link></Toast>}
      {failed && (
        <Toast key={`bad${failed.round}`} tone="bad">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-2">{failed.message}
            {/* Sends the same locked copy again: no need to pick the file again (AC-5.6). */}
            <button type="button" autoFocus onClick={() => send(failed.item)} className="font-medium underline">Try Again</button>
          </span>
        </Toast>
      )}
    </>
  );
}
