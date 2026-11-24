"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { FileText } from "lucide-react";
import { deriveSealKeys, type SealKeyPair } from "@qorechain/qoreseal";
import type { MessageSignature } from "@qorechain/qoresign";
import Heading from "@/components/Heading";
import Panel from "@/components/Panel";
import Input from "@/components/Input";
import Button from "@/components/Button";
import PaperView from "@/components/PaperView";
import { checkWords } from "@/lib/keys";
import { openItem, type Paper } from "@/lib/items";
import { lookupOf } from "@/lib/recovery";

type Row = { id: string; house_id: string; sender: string; senderName: string; title: string; created_at: string; envelope: string; signature: MessageSignature };
const when = (d: string) => new Date(d).toLocaleDateString(undefined, { dateStyle: "medium" });

// The words stay in this page's memory: nothing is saved in this browser, and only their lookup is sent (INV-1).
export default function RecoverView() {
  const list = useRef<HTMLHeadingElement>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState<{ seal: SealKeyPair; items: Row[] } | null>(null);
  const [opened, setOpened] = useState<{ row: Row; proven: boolean; paper: Paper | null } | null>(null);
  const [opening, setOpening] = useState("");

  async function find(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const field = e.currentTarget.elements.namedItem("words") as HTMLTextAreaElement;
    const words = checkWords(field.value);
    const fail = (msg: string) => { setError(msg); field.focus(); };
    if (!words) return fail("These words do not make a key. Check the order and the spelling.");
    setBusy(true);
    setError("");
    const seal = deriveSealKeys({ mnemonic: words });
    const res = await fetch("/api/recover", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lookup: await lookupOf(seal) }) }).catch(() => null);
    setBusy(false);
    if (res?.status === 404) return fail("No papers are locked to these words. Check the words, or ask your family whether your house has a recovery key.");
    if (!res?.ok) return fail("Can't reach Lockhouse. Check your connection, then try again.");
    setFound({ seal, items: (await res.json()).items });
  }

  async function show(row: Row) {
    setOpening(row.id);
    setError("");
    try {
      setOpened({ row, ...await openItem({ seal: found!.seal }, { ...row, houseId: row.house_id }, `${location.origin}/api/chain`) });
    } catch {
      setError("Can't reach QoreChain to check the signature. Nothing was shown. Try again.");
      list.current?.focus(); // the button that was pressed is off while opening
    }
    setOpening("");
  }

  // The view changes in place: focus its new title (a paper), or the list it came back to, never the page.
  useEffect(() => {
    if (opened) document.querySelector<HTMLElement>("main h1")?.focus();
    else if (found) list.current?.focus();
  }, [found, opened]);

  if (opened) return <PaperView title={opened.row.title} senderName={opened.row.senderName} date={opened.row.created_at} proven={opened.proven} paper={opened.paper}
    back={<Button variant="secondary" onClick={() => setOpened(null)}>Back to the List</Button>} />;

  if (found) return (
    <>
      <Heading title="Papers for These Words">Locked to your house&apos;s recovery key. Each one is checked on QoreChain and opened on this device.</Heading>
      <Panel className="flex flex-col gap-4">
        <h2 ref={list} tabIndex={-1} className="text-xl font-medium">{found.items.length} {found.items.length === 1 ? "Paper" : "Papers"}</h2>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <ul className="flex flex-col gap-2">
          {found.items.map((it) => (
            <li key={it.id}>
              <button type="button" onClick={() => show(it)} disabled={!!opening} aria-busy={opening === it.id || undefined}
                className="flex w-full items-center gap-3 rounded-xl bg-white/6 px-4 py-3 text-left hover:bg-white/12 disabled:opacity-60">
                <FileText className="size-5 text-muted" aria-hidden />
                <span><span className="block font-medium">{it.title}</span><span className="block text-sm text-muted">{opening === it.id ? "Opening on This Device…" : `Put in by ${it.senderName} · ${when(it.created_at)}`}</span></span>
              </button>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );

  return (
    <>
      <Heading title="Open With Recovery Words">Type your house&apos;s recovery words in order. They open every paper put in after the recovery key was made. Nothing is saved in this browser.</Heading>
      <form onSubmit={find} noValidate>
        <Panel className="flex flex-col gap-5">
          <Input name="words" multiline autoComplete="off" autoCapitalize="none" spellCheck={false} label="Recovery Words" placeholder="Type the recovery words in order" hint="Separate the words with spaces." error={error} />
          <Button type="submit" full loading={busy}>{busy ? "Finding the Papers" : "Find the Papers"}</Button>
        </Panel>
      </form>
    </>
  );
}
