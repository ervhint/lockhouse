import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import Panel from "./Panel";

// The one empty state: what is missing and what to do next. `warn`: a warning (red icon), not just something missing.
// `page`: it is the whole page, so the title is the h1 and it sits on the Panel card (on the bare sky the text
// fell to 3.6:1 at 320px, U8 review).
export default function EmptyState({ icon: Icon, title, text, action, page, warn }: { icon: LucideIcon; title: string; text: string; action?: ReactNode; page?: boolean; warn?: boolean }) {
  const Title = page ? "h1" : "h3";
  const inner = <>
    <Icon className={`size-8 ${warn ? "text-danger" : "text-lime"}`} aria-hidden />
    <Title className="text-lg font-medium">{title}</Title>
    <p className="max-w-xl text-pretty text-muted">{text}</p>
    {action}
  </>;
  return page
    ? <Panel className="flex flex-col items-center gap-3 text-center">{inner}</Panel>
    : <div className="flex flex-col items-center gap-3 rounded-panel border border-dashed border-white/25 px-6 py-10 text-center">{inner}</div>;
}
