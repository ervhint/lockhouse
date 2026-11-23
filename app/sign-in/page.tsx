import AppShell from "@/components/AppShell";
import Heading from "@/components/Heading";
import Panel from "@/components/Panel";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import StatePicker from "@/components/StatePicker";

// S-10 Sign In With QoreChain
export default async function SignIn(props: PageProps<"/sign-in">) {
  const { state } = (await props.searchParams) as { state?: string };
  return (
    <AppShell signedIn={false}>
      <Heading title="Sign In With Your Key">Your browser signs a one-time message with your key. Nothing else leaves your device.</Heading>
      <Panel className="flex flex-col gap-5">
        {state === "rejected" && <Badge tone="warn">You said no to signing. Nothing was sent.</Badge>}
        {state === "failed" && <Badge tone="bad">Sign-in failed. Try again.</Badge>}
        <Button href="/house" full loading={state === "signing"}>{state === "signing" ? "Signing" : state ? "Try Again" : "Sign In With My Key"}</Button>
        <p className="text-center text-muted">No keys in this browser yet? <a href="/keys?state=restore" className="underline">Restore Your Keys</a></p>
      </Panel>
      <StatePicker base="/sign-in" current={state} states={[["", "Ready"], ["signing", "Signing"], ["rejected", "Rejected"], ["failed", "Failed"]]} />
    </AppShell>
  );
}
