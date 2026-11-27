"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CircleCheck, CircleX, Copy, Droplets, RotateCw } from "lucide-react";
import Panel from "@/components/Panel";
import Button from "@/components/Button";
import TxPill from "@/components/TxPill";
import Badge from "@/components/Badge";
import AddressChip from "@/components/AddressChip";
import Skeleton from "@/components/Skeleton";
import { keysFrom, loadKeys } from "@/lib/keys";
import { chainStatus, checkCard, reason, send, signCard, waitForTx } from "@/lib/padlock";
import { FAUCET, explorerAddress, explorerTx } from "@/lib/settings";

type Step = 1 | 2;
type View =
  | { at: "loading" | "funds" | "ready" | "done" }
  | { at: "ask" | "no" | "pending"; step: Step }
  | { at: "failed"; step?: Step; why: string };

const STEPS = {
  1: { title: "Signature 1 of 2", short: "Puts your signing key in the Phone Book.", name: "Add Your Signing Key",
    ask: "This puts your signing key in the Phone Book. It proves that what you put in Lockhouse really comes from you." },
  2: { title: "Signature 2 of 2", short: "Puts your padlock in the Phone Book.", name: "Add Your Padlock",
    ask: "This puts your padlock in the Phone Book. You sign it twice in one go, with today's key and with your quantum-safe key, so it stays valid after Q-Day." },
};
const fee = (both: boolean) => both
  ? "The fees are a few hundredths of a test QOR each. Nothing is sent until you press Approve Both in This Browser."
  : "The fee is a few hundredths of a test QOR. Nothing is sent until you press Approve in This Browser.";
const MIN_UQOR = 1_000_000n; // 1 test QOR covers both fees (about 0.03 each)

// S-04: two real testnet transactions. One approval sends both, one after the other: the second is signed with the key the
// first puts on chain (Laras, 27 Nov; D-21). If only the second is left (a retry), it asks for that one alone (AC-2.1–2.7).
export default function Register() {
  const router = useRouter();
  const keys = useRef<ReturnType<typeof keysFrom>>(null);
  const rest = useRef("");
  const [view, setView] = useState<View>({ at: "loading" });
  const [done, setDone] = useState<Record<Step, boolean>>({ 1: false, 2: false });
  const [hash, setHash] = useState<Partial<Record<Step, string>>>({});
  const [uqor, setUqor] = useState(0n);
  const [card, setCard] = useState<"checking" | "ok" | string>("checking");
  const [copied, setCopied] = useState(false);

  // Read the chain; skip finished steps (AC-2.5). `ask` goes straight to the next approval.
  const load = async (ask = false) => {
    setView({ at: "loading" });
    try {
      const s = await chainStatus(keys.current!, rest.current);
      setDone({ 1: s.signingKey, 2: s.padlock });
      setUqor(s.uqor);
      if (s.signingKey && s.padlock) return finish();
      if (s.uqor < MIN_UQOR) return setView({ at: "funds" });
      setView(ask ? { at: "ask", step: s.signingKey ? 2 : 1 } : { at: "ready" });
    } catch (e) {
      setView({ at: "failed", why: reason(e) });
    }
  };

  // Both on chain: sign the recipient card here and check it against the chain (AC-2.7). U3 saves it at sign-in.
  const finish = async () => {
    setView({ at: "done" });
    setCard("checking");
    try {
      await checkCard(signCard(keys.current!), rest.current);
      setCard("ok");
    } catch (e) {
      setCard(reason(e));
    }
  };

  const approve = async (step: Step) => {
    setView({ at: "pending", step });
    try {
      const h = await send(step, keys.current!, rest.current);
      setHash((x) => ({ ...x, [step]: h }));
      await waitForTx(h, rest.current);
      setDone((d) => ({ ...d, [step]: true }));
      if (step === 1) return approve(2); // same approval: send the padlock as soon as the signing key is on chain
      finish();
    } catch (e) {
      setView({ at: "failed", step, why: reason(e) });
    }
  };

  useEffect(() => {
    const saved = loadKeys();
    if (!saved) return router.replace("/");
    keys.current = keysFrom(saved.words);
    rest.current = `${location.origin}/api/chain`;
    load(); // eslint-disable-line react-hooks/exhaustive-deps
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const address = keys.current?.address ?? "";
  const copy = async () => { await navigator.clipboard.writeText(address); setCopied(true); };
  const icon = (s: Step) => {
    if (done[s]) return <CircleCheck className="mt-0.5 size-5 flex-none text-lime" aria-label="Done" />;
    if (view.at === "failed" && view.step === s) return <CircleX className="mt-0.5 size-5 flex-none text-danger" aria-label="Failed" />;
    return <span className="mt-0.5 flex size-5 flex-none items-center justify-center rounded-full bg-white/10 text-xs text-muted" aria-hidden>{s}</span>;
  };
  const txLink = (s: Step) => hash[s] && <AddressChip address={hash[s]} href={explorerTx(hash[s])} />;

  if (view.at === "loading") return <Panel className="flex flex-col gap-4" ><p className="sr-only" role="status">Reading QoreChain…</p><Skeleton className="h-6 w-40" /><Skeleton className="h-14" /><Skeleton className="h-14" /><Skeleton className="h-11" /></Panel>;

  return (
    <Panel className="flex flex-col gap-5">
      {view.at === "funds" && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber/50 bg-amber/10 p-4">
          <Badge tone="warn">Not Enough Test QOR</Badge>
          <p>Your address has {(Number(uqor) / 1e6).toLocaleString()} test QOR. You need at least 1 for the two network fees. Copy your address, paste it on the faucet (sign in there first), then check again.</p>
          <code className="break-all rounded-lg bg-black/30 px-3 py-2 font-mono text-[13px]">{address}</code>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={copy}><Copy className="size-4" aria-hidden />{copied ? "Copied" : "Copy Address"}</Button>
            <Button variant="secondary" href={FAUCET} newTab><Droplets className="size-4" aria-hidden />Open the Faucet</Button>
          </div>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {([1, 2] as const).map((s) => (
          <li key={s} className="flex items-start gap-3">
            {icon(s)}
            {/* The pills sit right of the text, and drop under it when there is no room (phones). */}
            <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-x-3 gap-y-2">
              <div className="grow basis-48"><p className="font-medium">{STEPS[s].title}</p><p className="text-muted">{STEPS[s].short}</p></div>
              {view.at === "ask" && view.step === s && <TxPill status="waiting" />}
              {view.at === "pending" && view.step === s && <TxPill status="pending" />}
              {done[s] && <span className="flex flex-wrap items-center gap-2"><TxPill status="confirmed" />{txLink(s)}</span>}
            </div>
          </li>
        ))}
      </ul>

      {view.at === "ask" && (
        <div className="flex flex-col gap-2 rounded-xl border border-white/20 bg-white/5 p-4">
          {view.step === 1
            ? <>
                <p className="font-medium">Two Signatures, One Approval</p>
                {([1, 2] as const).map((s) => <p key={s} className="text-pretty"><b className="font-medium">{STEPS[s].title}: {STEPS[s].name}.</b> {STEPS[s].ask}</p>)}
                <p className="text-muted">{fee(true)}</p>
              </>
            : <>
                <p className="font-medium">{STEPS[2].title}: {STEPS[2].name}</p>
                <p className="text-pretty">{STEPS[2].ask}</p>
                <p className="text-muted">{fee(false)}</p>
              </>}
        </div>
      )}
      {view.at === "no" && <Badge tone="warn">You said no to signing. Nothing was sent.</Badge>}
      {view.at === "pending" && <p className="text-muted" role="status">Sent to QoreChain. Waiting for it to be confirmed, up to 60 seconds. {txLink(view.step)}</p>}
      {view.at === "failed" && (
        <div className="flex flex-col gap-2 rounded-xl border border-danger/50 bg-danger/10 p-4" role="alert">
          <div className="flex flex-wrap items-center gap-3"><TxPill status="failed" />{view.step && txLink(view.step)}</div>
          <p>{view.step ? `${STEPS[view.step].title} did not go through. ` : "Couldn't read QoreChain. "}{view.why}</p>
        </div>
      )}
      {view.at === "done" && (
        <div className="flex flex-col gap-3">
          <p>Your padlock is in the Phone Book. <AddressChip address={address} href={explorerAddress(address)} /></p>
          {card === "checking" ? <Badge tone="wait">Checking Your Recipient Card…</Badge>
            : card === "ok" ? <Badge tone="ok">Recipient Card Signed and Checked on QoreChain</Badge>
            : <p className="text-danger" role="alert">Your recipient card did not check out. {card}</p>}
        </div>
      )}
      {(hash[1] || hash[2] || view.at === "done") && <p className="text-sm text-muted">The explorer opens on Mainnet. Switch it to Testnet at the top to see these.</p>}

      {view.at === "ready" && <Button full onClick={() => setView({ at: "ask", step: done[1] ? 2 : 1 })}>Register My Padlock</Button>}
      {view.at === "ask" && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button full autoFocus onClick={() => approve(view.step)}>{view.step === 1 ? "Approve Both in This Browser" : "Approve in This Browser"}</Button>
          <Button full variant="ghost" onClick={() => setView({ at: "no", step: view.step })}>Not Now</Button>
        </div>
      )}
      {view.at === "pending" && <Button full loading>Waiting for QoreChain</Button>}
      {/* autoFocus: the button pressed is gone, so focus moves to the next action, not the top of the page. */}
      {view.at === "no" && <Button full autoFocus onClick={() => setView({ at: "ask", step: view.step })}>Try Again</Button>}
      {view.at === "failed" && <Button full autoFocus onClick={() => load(true)}><RotateCw className="size-4" aria-hidden />Try Again</Button>}
      {view.at === "funds" && <Button full onClick={() => load()}><RotateCw className="size-4" aria-hidden />Check Again</Button>}
      {view.at === "done" && (card === "ok" ? <Button full href="/sign-in">Continue</Button> : card !== "checking" && <Button full autoFocus onClick={finish}>Try Again</Button>)}
    </Panel>
  );
}
