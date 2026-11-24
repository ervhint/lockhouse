import { Check, TriangleAlert, X, Clock } from "lucide-react";
import type { ReactNode } from "react";

const tones = {
  ok: { cls: "bg-lime/15 text-lime", Icon: Check },
  warn: { cls: "bg-amber/15 text-amber", Icon: TriangleAlert },
  bad: { cls: "bg-danger/15 text-danger", Icon: X },
  wait: { cls: "bg-white/10 text-muted", Icon: Clock },
};

// The one status pill. Colour is never the only signal: every tone has its own icon.
export default function Badge({ tone, children }: { tone: keyof typeof tones; children: ReactNode }) {
  const { cls, Icon } = tones[tone];
  return <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${cls}`}><Icon className="size-3.5" aria-hidden />{children}</span>;
}
