import { KeyRound } from "lucide-react";
import Checkbox from "./Checkbox";
import AddressChip from "./AddressChip";
import type { Recovery } from "@/lib/recovery";

// Who can open a paper (Put In, Change Readers): the house's members with ticks, me ticked and greyed (I can't
// leave myself out, D-14), then the recovery-key line when the house has one (U10). `picked`: the others ticked.
export default function ReaderPicker({ members, me, picked, onPick, recovery, disabled }:
  { members: { name: string; address: string }[]; me: string; picked: string[]; onPick: (picked: string[]) => void; recovery: Recovery | null; disabled?: boolean }) {
  return (
    <>
      <fieldset className="flex flex-col gap-2" disabled={disabled}>
        <legend className="mb-1 text-sm font-medium">Who Can Open It</legend>
        {members.map((m) => {
          const mine = m.address === me;
          return (
            <Checkbox key={m.address} checked={mine || picked.includes(m.address)} disabled={mine}
              onChange={(e) => onPick(e.target.checked ? [...picked, m.address] : picked.filter((a) => a !== m.address))}>
              <span className="font-medium sm:min-w-20">{m.name}{mine && <span className="font-normal text-muted"> (You)</span>}</span>
              <AddressChip address={m.address} />
            </Checkbox>
          );
        })}
      </fieldset>
      {/* Not a person, so not in the list: the recovery key opens every paper (U10). The maker's name shows so a stranger stands out. */}
      {recovery && (
        <p className="-mt-3 flex items-start gap-2 text-sm text-muted">
          <KeyRound className="mt-0.5 size-4 shrink-0" aria-hidden />
          The house&apos;s recovery key (made by {members.find((m) => m.address === recovery.by)?.name}) can open it too.
        </p>
      )}
    </>
  );
}
