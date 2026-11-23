import Link from "next/link";
import AppShell from "@/components/AppShell";
import Heading from "@/components/Heading";
import Panel from "@/components/Panel";
import Input from "@/components/Input";
import Button from "@/components/Button";
import StatePicker from "@/components/StatePicker";

// S-02 Make or Restore Keys
export default async function Keys(props: PageProps<"/keys">) {
  const { state } = (await props.searchParams) as { state?: string };
  const restore = state === "restore" || state === "wrong";
  return (
    <AppShell signedIn={false}>
      {restore ? (
        <>
          <Heading title="Restore Your Keys">Type your secret words in order. Your keys are rebuilt in this browser.</Heading>
          <Panel className="flex flex-col gap-5">
            <Input multiline autoComplete="off" autoCapitalize="none" spellCheck={false} label="Your Secret Words" placeholder="Type your secret words in order" error={state === "wrong" ? "These words do not make a set of keys. Check the order and the spelling." : undefined} hint={state === "wrong" ? undefined : "Separate the words with spaces."} />
            <Button href="/house" full>Restore My Keys</Button>
            <Link href="/keys" className="text-center text-muted underline">I Need New Keys Instead</Link>
          </Panel>
        </>
      ) : (
        <>
          <Heading title="Make Your Keys">Your keys are made in this browser from secret words. We never see them.</Heading>
          <Panel className="flex flex-col gap-5">
            <Input label="Your Name" placeholder="Your first name" hint="Your family sees this name next to your address." disabled={state === "making"} />
            <Button href="/keys/backup" full loading={state === "making"}>{state === "making" ? "Making Your Keys" : "Make My Keys"}</Button>
            <Link href="/keys?state=restore" className="text-center text-muted underline">I Already Have Secret Words</Link>
          </Panel>
        </>
      )}
      <StatePicker base="/keys" current={state} states={[["", "Type Your Name"], ["making", "Making"], ["restore", "Restore"], ["wrong", "Wrong Words"]]} />
    </AppShell>
  );
}
