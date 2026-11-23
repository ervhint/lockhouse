import Link from "next/link";
import AppShell from "@/components/AppShell";
import Heading from "@/components/Heading";
import Panel from "@/components/Panel";
import Input from "@/components/Input";
import Checkbox from "@/components/Checkbox";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import AddressChip from "@/components/AddressChip";
import Toast from "@/components/Toast";
import StatePicker from "@/components/StatePicker";
import { members } from "@/lib/mock";

// S-07 Gate (Put In)
export default async function PutIn(props: PageProps<"/put-in">) {
  const { state = "" } = (await props.searchParams) as { state?: string };
  const busy = state === "locking" || state === "signing";
  return (
    <AppShell>
      <Heading title="Put In a Paper">Pick a file or write a note, then pick who can open it. It is locked on this device first. Then it is signed with your key.</Heading>
      <Panel className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <Input label="Choose a File" type="file" disabled={busy} error={state === "toolarge" ? "This file is {fileSize} MB. The limit is {sizeLimit} MB. Pick a smaller file or a smaller photo." : undefined} />
          <Input multiline label="Or Write a Note" placeholder="Write anything you want to keep private" disabled={busy} />
        </div>
        <fieldset className="flex flex-col gap-2" disabled={busy}>
          <legend className="mb-1 text-sm font-medium">Who Can Open It</legend>
          {members.map((m) => (
            <Checkbox key={m.id} defaultChecked><span className="font-medium">{m.name}</span><AddressChip address={m.address} /></Checkbox>
          ))}
        </fieldset>
        {state === "locking" && <Badge tone="wait">Locking on This Device…</Badge>}
        {state === "signing" && <div className="flex flex-wrap gap-2"><Badge tone="ok">Locked on This Device</Badge><Badge tone="wait">Signing With Your Key…</Badge></div>}
        <Button href="/put-in?state=saved" full loading={busy}>{state === "locking" ? "Locking" : state === "signing" ? "Signing" : "Lock and Put In"}</Button>
      </Panel>
      {state === "saved" && <Toast>Put in. {"{readerCount}"} readers can open it. <Link href="/house" className="underline">See the House</Link></Toast>}
      {state === "savefail" && <Toast tone="bad">Could not save. Nothing was sent. Try again.</Toast>}
      <StatePicker base="/put-in" current={state} states={[["", "Choose and Pick"], ["toolarge", "File Too Big"], ["locking", "Locking"], ["signing", "Signing"], ["saved", "Saved"], ["savefail", "Save Failed"]]} />
    </AppShell>
  );
}
