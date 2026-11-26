import { Check, Clock, ExternalLink, TriangleAlert, X } from "lucide-react";
import type { ReactNode } from "react";

const tones = {
  ok: { cls: "bg-lime/15 text-lime", Icon: Check },
  warn: { cls: "bg-amber/15 text-amber", Icon: TriangleAlert },
  bad: { cls: "bg-danger/15 text-danger", Icon: X },
  wait: { cls: "bg-white/10 text-muted", Icon: Clock },
};

// The one status pill. Colour is never the only signal: every tone has its own icon.
// `href` makes it a link to another site (the explorer), opened in a new tab, with a taller hit area.
export default function Badge({ tone, children, href, "aria-label": label }: { tone: keyof typeof tones; children: ReactNode; href?: string; "aria-label"?: string }) {
  const { cls, Icon } = tones[tone];
  const pill = (
    <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${cls}`}>
      <Icon className="size-3.5" aria-hidden />{children}{href && <ExternalLink className="size-3" aria-hidden />}
    </span>
  );
  return href
    ? <a href={href} target="_blank" rel="noreferrer" aria-label={label} className="relative inline-flex w-fit rounded-full hover:brightness-125 after:absolute after:inset-x-0 after:-inset-y-1">{pill}</a>
    : pill;
}
