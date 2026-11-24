"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toBase64Url } from "@qorechain/qoreseal";
import Button from "@/components/Button";
import { keysFrom, loadKeys } from "@/lib/keys";
import { pack } from "@/lib/items";
import { oldLock } from "@/lib/drill";

// AC-7.2: lock the drill sample with the old lock to my own X25519 key, then send that copy and the X25519 secret key. Nothing else.
export default function GiveKeys() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const give = async () => {
    const saved = loadKeys();
    if (!saved) return setProblem("This browser has no keys. Restore your keys with your secret words first.");
    setBusy(true);
    setProblem(null);
    let res: Response | null = null;
    try {
      const { x25519PublicKey, x25519SecretKey } = keysFrom(saved.words).seal;
      const bytes = new Uint8Array(await (await fetch("/drill-sample.svg")).arrayBuffer());
      const oldCopy = await oldLock(pack({ name: "drill-sample.svg", type: "image/svg+xml", bytes }), x25519PublicKey);
      res = await fetch("/api/drill", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ oldCopy, x25519Secret: toBase64Url(x25519SecretKey) }) });
    } catch { /* no connection: res stays null */ }
    if (res?.status === 401) return router.push("/sign-in");
    if (res?.ok) return router.push("/drill?gave");
    // The server's own reason when it gave one; otherwise plain words, never the browser's error text.
    setProblem((res && (await res.json().catch(() => null))?.error) || "Your old keys were not given. Check your connection, then press Give My Old Keys again.");
    setBusy(false);
  };

  return (
    <>
      {problem && <p role="alert" className="text-danger sm:order-last sm:basis-full">{problem}</p>}
      <Button onClick={give} loading={busy}>{busy ? "Giving My Old Keys" : "Give My Old Keys"}</Button>
    </>
  );
}
