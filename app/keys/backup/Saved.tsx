"use client";
import { useEffect, useState } from "react";
import Checkbox from "@/components/Checkbox";
import Button from "@/components/Button";
import { shown } from "@/lib/keys";

// The 24 words, taken from memory once. After a reload or leaving, they are gone. Continue stays off until ticked.
export default function Saved() {
  const [words] = useState(() => shown.words?.split(" "));
  const [ok, setOk] = useState(false);
  useEffect(() => { shown.words = null; }, []);
  if (!words) return <>
    <p className="text-muted">Your secret words were already shown, so they are not shown again.</p>
    <Button href="/padlock" full>Continue</Button>
  </>;
  return (
    <>
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {words.map((w, i) => (
          <li key={i} className="flex gap-2 rounded-lg bg-white/8 px-3 py-2 font-mono text-sm"><span className="w-5 text-muted">{i + 1}</span>{w}</li>
        ))}
      </ol>
      <Checkbox checked={ok} onChange={(e) => setOk(e.target.checked)}>I saved my secret words in a safe place</Checkbox>
      <Button href="/padlock" full disabled={!ok}>Continue</Button>
    </>
  );
}
