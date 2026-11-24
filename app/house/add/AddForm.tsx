"use client";
import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { UserRound } from "lucide-react";
import Input from "@/components/Input";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import AddressChip from "@/components/AddressChip";
import { isAddress, NOT_ADDRESS } from "@/lib/keys";

// S-06: check the address here (AC-4.7), then the server checks their card against the chain and adds them.
export default function AddForm() {
  const router = useRouter();
  const field = useRef<HTMLInputElement>(null);
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState<{ name: string; address: string } | null>(null);

  const fail = (message: string) => { setError(message); field.current?.focus(); };

  async function submit(e: FormEvent) {
    e.preventDefault();
    const text = address.trim();
    if (!isAddress(text)) return fail(NOT_ADDRESS);
    setBusy(true);
    setError(undefined);
    const res = await fetch("/api/house/members", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ address: text }) }).catch(() => null);
    setBusy(false);
    if (res?.status === 401) return router.replace("/sign-in");
    const body = await res?.json().catch(() => ({}));
    if (res?.ok) return setAdded(body.member);
    fail(body?.error ?? "Can't reach Lockhouse right now. Nothing was added. Check your connection and try again.");
  }

  if (added) return (
    // The form is gone, so focus moves here and the result is read out (not lost to the top of the page).
    <div role="status" tabIndex={-1} ref={(el) => el?.focus()} className="flex flex-col gap-5">
      <p><Badge tone="ok">Signed Card Checked</Badge></p>
      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white/6 px-4 py-3">
        <UserRound className="size-5 text-muted" aria-hidden />
        <span className="font-medium">{added.name}</span>
        <AddressChip address={added.address} />
      </div>
      <p className="text-muted">{added.name} is in your house now.</p>
      <Button href="/house" full>Back to the House</Button>
    </div>
  );

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <Input ref={field} label="Their qor1 Address" placeholder="Paste their address, starting with qor1" autoComplete="off" spellCheck={false}
        value={address} onChange={(e: ChangeEvent<HTMLInputElement>) => setAddress(e.target.value)} error={error} />
      <Button type="submit" full loading={busy}>{busy ? "Checking Their Card" : "Check Their Card"}</Button>
    </form>
  );
}
