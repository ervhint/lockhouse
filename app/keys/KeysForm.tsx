"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import Panel from "@/components/Panel";
import Input from "@/components/Input";
import Button from "@/components/Button";
import { checkWords, loadKeys, makeWords, saveKeys, shown } from "@/lib/keys";

// S-02 form: make new keys, or restore them from the secret words. Nothing here is sent anywhere.
export default function KeysForm({ restore }: { restore: boolean }) {
  const router = useRouter();
  const [err, setErr] = useState<{ name?: string; words?: string }>({});

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const name = String(f.get("name")).trim();
    const words = restore ? checkWords(String(f.get("words"))) : makeWords();
    const had = loadKeys();
    const fail = (field: "name" | "words", msg: string) => { setErr({ [field]: msg }); (form.elements.namedItem(field) as HTMLElement).focus(); };
    if (!name) return fail("name", "Type your name.");
    if (had) return fail("name", `This browser already has keys for ${had.name}. Go to Welcome to carry on with them.`);
    if (!words) return fail("words", "These words do not make a set of keys. Check the order and the spelling.");
    saveKeys({ name, words });
    if (restore) return router.push("/padlock");
    shown.words = words;
    router.push("/keys/backup");
  };

  return (
    <form onSubmit={submit} noValidate>
      <Panel className="flex flex-col gap-5">
        <Input name="name" autoComplete="given-name" label="Your Name" placeholder="Your first name" hint="Your family sees this name next to your address." error={err.name} />
        {restore && <Input name="words" multiline autoComplete="off" autoCapitalize="none" spellCheck={false} label="Your Secret Words" placeholder="Type your secret words in order" hint="Separate the words with spaces." error={err.words} />}
        <Button type="submit" full>{restore ? "Restore My Keys" : "Make My Keys"}</Button>
        <Link href={restore ? "/keys" : "/keys?restore"} className="text-center text-muted underline">{restore ? "I Need New Keys Instead" : "I Already Have Secret Words"}</Link>
      </Panel>
    </form>
  );
}
