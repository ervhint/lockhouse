"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { Loader2, SearchX } from "lucide-react";
import Panel from "@/components/Panel";
import Button from "@/components/Button";
import Input from "@/components/Input";
import EmptyState from "@/components/EmptyState";
import Skeleton from "@/components/Skeleton";
import { NoPapers, PaperList, PutInButton, type Paper } from "../house/HouseView";

// The Papers page: how many papers the house has, and every one newest first, a page at a time from /api/items.
// The next page loads only when asked, with Show More Papers (Laras, 27 Nov).
export default function PapersView() {
  const router = useRouter();
  const [items, setItems] = useState<Paper[] | null>(null);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [typed, setTyped] = useState("");
  const [q, setQ] = useState("");
  const [short, setShort] = useState(false);
  const [by, setBy] = useState("");
  const [members, setMembers] = useState<{ name: string; address: string }[]>([]);
  const filtered = !!(q || by);

  useEffect(() => { fetch("/api/house", { cache: "no-store" }).then((r) => r.ok ? r.json() : null).then((h) => h && setMembers(h.members.map((m: { name: string; address: string }) => ({ ...m, name: m.address === h.me ? `${m.name} (You)` : m.name })))).catch(() => {}); }, []);

  const latest = useRef("");
  const load = useCallback(async (from: number) => {
    const ask = new URLSearchParams({ from: String(from), q, by }).toString();
    latest.current = ask;
    setBusy(true);
    setFailed(false);
    const res = await fetch(`/api/items?${ask}`, { cache: "no-store" }).catch(() => null);
    if (latest.current !== ask) return; // the filters changed meanwhile: a newer answer is on its way
    if (res?.status === 401) return router.replace("/sign-in");
    if (!res?.ok) { setBusy(false); return setFailed(true); }
    const page: { items: Paper[]; total: number } = await res.json();
    if (latest.current !== ask) return;
    // a paper put in meanwhile shifts the pages by one: skip any already shown
    setItems((old) => from && old ? [...old, ...page.items.filter((n) => !old.some((o) => o.id === n.id))] : page.items);
    setTotal(page.total);
    setBusy(false);
  }, [router, q, by]);

  useEffect(() => { load(0); }, [load]);

  const left = !!items && items.length < total;

  if (!items && failed) return (
    <Panel className="flex flex-col items-start gap-4">
      <p role="alert">The papers didn&apos;t load. Check your connection, then try again.</p>
      <Button variant="secondary" onClick={() => load(0)} loading={busy}>Try Again</Button>
    </Panel>
  );

  return (
    <Panel className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-medium">{items ? `${total} ${total === 1 ? "Paper" : "Papers"}${filtered ? " Found" : ""}` : "Papers"}</h2>
        <PutInButton />
      </div>
      {/* searches on Enter (Laras, 27 Nov); emptying the box shows every paper again */}
      <form role="search" onSubmit={(e) => { e.preventDefault(); const t = typed.trim(); setShort(!!t && t.length < 3); if (!t || t.length >= 3) setQ(t); }} className="grid gap-3 sm:grid-cols-[1fr_14rem]">
        <Input label="Search Titles" hint="Press Enter to search." error={short ? "Type at least 3 characters." : undefined} type="search" enterKeyHint="search" value={typed} maxLength={80}
          onChange={(e: ChangeEvent<HTMLInputElement>) => { setTyped(e.target.value); setShort(false); if (!e.target.value) setQ(""); }} />
        <Input label="From" value={by} onChange={(e: ChangeEvent<HTMLSelectElement>) => setBy(e.target.value)}
          options={[{ value: "", label: "Everyone" }, ...members.map((m) => ({ value: m.address, label: m.name }))]} />
      </form>
      {!items ? <><Skeleton /><Skeleton /><Skeleton /></> : total === 0 ? (filtered
        ? <EmptyState icon={SearchX} title="No Papers Match" text="Try other words, or show papers from everyone." action={<Button variant="secondary" onClick={() => { setTyped(""); setQ(""); setBy(""); setShort(false); }}>Clear Filters</Button>} />
        : <NoPapers />) : <>
        <PaperList items={items} />
        <p role="status" className="flex min-h-6 items-center gap-2 text-sm text-muted">
          {busy ? <><Loader2 className="size-4 animate-spin" aria-hidden />Loading more papers…</> : `Showing ${items.length} of ${total}`}
        </p>
        {failed && <p role="alert" className="text-sm text-danger">The next papers didn&apos;t load. Check your connection, then try again.</p>}
        {left && <Button variant="secondary" onClick={() => load(items.length)} loading={busy} className="sm:self-start">Show More Papers</Button>}
      </>}
    </Panel>
  );
}
