"use client";
import { useState, type ReactNode } from "react";
import { CheckCircle2, CircleAlert, X } from "lucide-react";

// The one toast: a short message that says what just happened. The × closes it.
export default function Toast({ tone = "ok", children }: { tone?: "ok" | "bad"; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  const Icon = tone === "ok" ? CheckCircle2 : CircleAlert;
  return (
    <div role={tone === "ok" ? "status" : "alert"} className={`fixed inset-x-4 bottom-6 z-40 mx-auto flex max-w-md items-center gap-3 rounded-2xl border bg-slate/90 py-1 pl-4 pr-1 text-[15px] backdrop-blur-md ${tone === "ok" ? "border-lime/50" : "border-danger/60"}`}>
      <Icon className={`size-5 flex-none ${tone === "ok" ? "text-lime" : "text-danger"}`} aria-hidden />
      <div className="py-2">{children}</div>
      <button type="button" aria-label="Close message" onClick={() => setOpen(false)} className="ml-auto flex-none rounded-full p-3 hover:bg-white/10"><X className="size-4" aria-hidden /></button>
    </div>
  );
}
