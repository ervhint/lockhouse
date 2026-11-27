import Badge from "./Badge";

export type Step = "ready" | "locking" | "signing" | "stamping" | "saving";
/** The submit button's words while a step runs (Put In, Change Readers). */
export const BUSY: Record<Exclude<Step, "ready">, string> = { locking: "Locking", signing: "Signing", stamping: "Stamping", saving: "Saving" };

// Each step of locking a paper as it happens (Put In, Change Readers). `locked`: readers in the locked copy, once locked.
// Always in the page (never display:none), so screen readers announce each step.
export default function LockSteps({ step, locked, recovery }: { step: Step; locked: number; recovery: boolean }) {
  return (
    <div role="status" className="flex flex-wrap gap-2">
      {step === "locking" && <Badge tone="wait">Locking on This Device…</Badge>}
      {locked > 0 && <Badge tone="ok">Locked on This Device · ML-KEM-1024 + X25519 · {locked} {locked === 1 ? "Reader" : "Readers"}{recovery && " + Recovery Key"}</Badge>}
      {step === "signing" && <Badge tone="wait">Signing With Your Key…</Badge>}
      {step === "stamping" && <Badge tone="wait">Stamping on QoreChain…</Badge>}
      {step === "saving" && <Badge tone="wait">Saving the Locked Copy…</Badge>}
    </div>
  );
}
