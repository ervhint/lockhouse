import Link from "next/link";

// Prototype only: jump between the states of a screen with ?state=. Removed in P6.
export default function StatePicker({ base, states, current }: { base: string; states: [key: string, label: string][]; current?: string }) {
  return (
    <details className="fixed bottom-3 left-3 z-[60] max-w-[calc(100vw-1.5rem)] rounded-xl border border-white/20 bg-night/90 text-sm backdrop-blur">
      <summary className="cursor-pointer px-3 py-2 text-muted">Prototype States</summary>
      <ul className="flex flex-col gap-1 px-2 pb-2">
        {states.map(([k, label]) => (
          <li key={k}><Link href={k ? `${base}?state=${k}` : base} className={`block rounded-lg px-2 py-1 hover:bg-white/10 ${(current ?? "") === k ? "text-lime" : ""}`}>{label}</Link></li>
        ))}
      </ul>
    </details>
  );
}
