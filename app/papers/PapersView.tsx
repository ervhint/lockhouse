"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import Panel from "@/components/Panel";
import Button from "@/components/Button";
import Skeleton from "@/components/Skeleton";
import { NoPapers, PaperList, PutInButton, type Paper } from "../house/HouseView";

// The Papers page: how many papers the house has, and every one newest first, a page at a time from /api/items.
// The next page loads when the end of the list comes near, or with Load More Papers (keyboard, or a failed load).
export default function PapersView() {
  const router = useRouter();
  const [items, setItems] = useState<Paper[] | null>(null);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  const load = useCallback(async (from: number) => {
    setBusy(true);
    setFailed(false);
    const res = await fetch(`/api/items?from=${from}`, { cache: "no-store" }).catch(() => null);
    if (res?.status === 401) return router.replace("/sign-in");
    if (!res?.ok) { setBusy(false); return setFailed(true); }
    const page: { items: Paper[]; total: number } = await res.json();
    // a paper put in meanwhile shifts the pages by one: skip any already shown
    setItems((old) => from && old ? [...old, ...page.items.filter((n) => !old.some((o) => o.id === n.id))] : page.items);
    setTotal(page.total);
    setBusy(false);
  }, [router]);

  useEffect(() => { load(0); }, [load]);

  const left = !!items && items.length < total;
  useEffect(() => {
    if (!left || busy || failed || !end.current) return;
    const watch = new IntersectionObserver(([e]) => { if (e.isIntersecting) load(items!.length); }, { rootMargin: "300px" });
    watch.observe(end.current);
    return () => watch.disconnect();
  }, [left, busy, failed, items, load]);

  if (!items && failed) return (
    <Panel className="flex flex-col items-start gap-4">
      <p role="alert">The papers didn&apos;t load. Check your connection, then try again.</p>
      <Button variant="secondary" onClick={() => load(0)} loading={busy}>Try Again</Button>
    </Panel>
  );

  return (
    <Panel className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-medium">{items ? `${total} ${total === 1 ? "Paper" : "Papers"}` : "Papers"}</h2>
        <PutInButton />
      </div>
      {!items ? <><Skeleton /><Skeleton /><Skeleton /></> : total === 0 ? <NoPapers /> : <>
        <PaperList items={items} />
        <div ref={end} />
        <p role="status" className="flex min-h-6 items-center gap-2 text-sm text-muted">
          {busy ? <><Loader2 className="size-4 animate-spin" aria-hidden />Loading more papers…</> : `Showing ${items.length} of ${total}`}
        </p>
        {failed && <p role="alert" className="text-sm text-danger">The next papers didn&apos;t load. Check your connection, then try again.</p>}
        {left && <Button variant="secondary" onClick={() => load(items.length)} loading={busy} className="sm:self-start">Load More Papers</Button>}
      </>}
    </Panel>
  );
}
