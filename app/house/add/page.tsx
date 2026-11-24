import { UserRound } from "lucide-react";
import { signedIn } from "@/lib/session";
import AppShell from "@/components/AppShell";
import Heading from "@/components/Heading";
import Panel from "@/components/Panel";
import Input from "@/components/Input";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import AddressChip from "@/components/AddressChip";
import StatePicker from "@/components/StatePicker";

// S-06 Add Member
export default async function AddMember(props: PageProps<"/house/add">) {
  await signedIn(); // no session: off to Sign In (AC-3.5)
  const { state = "" } = (await props.searchParams) as { state?: string };
  const error = state === "nophone" ? "This address has no padlock in the Phone Book yet. Ask them to register their padlock first." : state === "bad" ? "Their signed card does not match this address. Nothing was added." : undefined;
  return (
    <AppShell>
      <Heading title="Add Someone">Type their qor1 address. Their signed card must prove the address and the padlock belong to the same person.</Heading>
      <Panel className="flex flex-col gap-5">
        {state === "added" ? (
          <>
            <Badge tone="ok">Signed Card Checked</Badge>
            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white/6 px-4 py-3"><UserRound className="size-5 text-muted" aria-hidden /><span className="font-medium">{"{memberName}"}</span><AddressChip /></div>
            <Button href="/house" full>Back to the House</Button>
          </>
        ) : (
          <>
            <Input label="Their qor1 Address" placeholder="Paste their address, starting with qor1" error={error} disabled={state === "checking"} />
            <Button href="/house/add?state=added" full loading={state === "checking"}>{state === "checking" ? "Checking Their Card" : "Check Their Card"}</Button>
          </>
        )}
      </Panel>
      <StatePicker base="/house/add" current={state} states={[["", "Type the Address"], ["checking", "Checking Card"], ["nophone", "No Padlock in Phone Book"], ["bad", "Bad Card"], ["added", "Added"]]} />
    </AppShell>
  );
}
