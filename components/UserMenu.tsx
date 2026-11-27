"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { loadKeys } from "@/lib/keys";

/** Ends the session; the keys stay in this browser (AC-3.6). */
export const signOut = () => fetch("/api/auth/sign-out", { method: "POST" });

/** A name as shown in tight spots: at most 10 characters, then "…" (Laras, 27 Nov). The full name goes in `title`. */
export const shortName = (name: string) => [...name].length > 10 ? [...name].slice(0, 10).join("") + "…" : name;

// The signed-in user menu: their name, Sign Out, Forget Keys. No keys in this browser: off to Welcome to restore them (AC-3.7).
export default function UserMenu() {
  const router = useRouter();
  const [name, setName] = useState("");
  useEffect(() => {
    const saved = loadKeys();
    if (saved) setName(saved.name);
    else router.replace("/");
  }, [router]);

  return (
    <details className="relative">
      <summary aria-label={name || "Your Menu"} className="flex min-w-16 cursor-pointer list-none items-center gap-1 rounded-full bg-white/10 px-3 py-3"><span title={name}>{shortName(name)}</span><ChevronDown className="size-4" aria-hidden /></summary>
      <div className="absolute right-0 z-10 mt-2 w-64 rounded-xl border border-white/20 bg-slate p-1">
        <button type="button" onClick={async () => { await signOut(); router.push("/"); router.refresh(); }} className="block w-full rounded-lg px-3 py-3 text-left hover:bg-white/10">Sign Out</button>
        <Link href="/house?forget" className="block rounded-lg px-3 py-3 text-danger hover:bg-white/10">Forget Keys on This Device</Link>
      </div>
    </details>
  );
}
