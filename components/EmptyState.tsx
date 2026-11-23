import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

// The one empty state: what is missing and what to do next.
export default function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-panel border border-dashed border-white/25 px-6 py-10 text-center">
      <Icon className="size-8 text-lime" aria-hidden />
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="max-w-sm text-muted">{text}</p>
      {action}
    </div>
  );
}
