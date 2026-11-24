"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import { keysFrom, loadKeys, saveKeys, type Saved } from "@/lib/keys";
import { signInBody } from "@/lib/signin";

// S-10: pressing the button is the approval (D-13). The browser signs; the server checks it against the chain.
export default function SignInForm() {
  const router = useRouter();
  const [saved, setSaved] = useState<Saved | null>();
  const [state, setState] = useState<"ready" | "signing" | "failed">("ready");
  useEffect(() => setSaved(loadKeys()), []);

  const signIn = async () => {
    setState("signing");
    try {
      const { nonce } = await (await fetch("/api/auth/nonce")).json();
      const body = signInBody(keysFrom(saved!.words), saved!.name, nonce, location.origin);
      const res = await fetch("/api/auth/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
      saveKeys({ ...saved!, signedInBefore: true });
      router.push("/house");
    } catch {
      setState("failed");
    }
  };

  if (saved === undefined) return null;
  if (!saved) return (
    <>
      <p>This browser has no keys yet. Restore them with your secret words, or make new keys.</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button href="/keys?restore" full>Restore Your Keys</Button>
        <Button href="/keys" variant="secondary" full>Make Your Keys</Button>
      </div>
    </>
  );
  return (
    <>
      {state === "failed" && (
        <div className="flex flex-col items-start gap-2" role="alert">
          <Badge tone="bad">Sign-in failed. Try again.</Badge>
          <p className="text-muted">If it fails again, check that your padlock is in the Phone Book. <a href="/padlock" className="underline">Check Your Padlock</a></p>
        </div>
      )}
      {/* A new key when it fails makes a fresh button, so autoFocus moves focus to Try Again. */}
      <Button key={state === "failed" ? "retry" : "go"} full autoFocus={state === "failed"} loading={state === "signing"} onClick={signIn}>
        {state === "signing" ? "Signing" : state === "failed" ? "Try Again" : `Sign In as ${saved.name}`}
      </Button>
    </>
  );
}
