"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

// The one modal. Closing is a link back to the page without the state (works without script).
// With script: Esc closes it, focus moves inside, Tab stays inside, focus returns to the opener.
export default function Sheet({ title, closeHref, children }: { title: string; closeHref: string; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const router = useRouter();
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const focusable = () => Array.from(box.current!.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"));
    focusable()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return router.push(closeHref);
      if (e.key !== "Tab") return;
      const f = focusable();
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); opener?.focus?.(); };
  }, [closeHref, router]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-night/70 p-4 backdrop-blur-sm sm:items-center">
      <div ref={box} role="dialog" aria-modal="true" aria-labelledby="sheet-title" className="w-full max-w-md rounded-panel border border-white/20 bg-slate p-6">
        <div className="mb-3 flex items-start justify-between gap-4">
          <h2 id="sheet-title" className="text-xl font-medium">{title}</h2>
          <Link href={closeHref} aria-label="Close" className="rounded-full p-3 hover:bg-white/10"><X className="size-5" /></Link>
        </div>
        {children}
      </div>
    </div>
  );
}
