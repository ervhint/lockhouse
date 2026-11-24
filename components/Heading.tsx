import type { ReactNode } from "react";

// Page title + one sentence under it. Every page uses this. The h1 can take focus from script (not by Tab),
// for a view that changes in place.
export default function Heading({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-6">
      <h1 tabIndex={-1} className="text-balance text-3xl font-medium tracking-tight sm:text-4xl">{title}</h1>
      {children && <p className="mt-2 text-pretty text-lg text-muted">{children}</p>}
    </div>
  );
}
