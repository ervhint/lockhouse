import type { ReactNode } from "react";

// The one card/surface: frosted glass over the house picture.
export default function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-panel border border-white/15 bg-slate/70 p-5 backdrop-blur-md sm:p-6 ${className}`}>{children}</section>;
}
