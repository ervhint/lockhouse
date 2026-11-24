import AppShell from "@/components/AppShell";
import Heading from "@/components/Heading";
import Panel from "@/components/Panel";
import SignInForm from "./SignInForm";

// S-10 Sign In With QoreChain
export default function SignIn() {
  return (
    <AppShell signedIn={false}>
      <Heading title="Sign In With Your Key">Your browser signs a one-time message with your key. Nothing else leaves your device.</Heading>
      <Panel className="flex flex-col gap-5">
        <SignInForm />
      </Panel>
    </AppShell>
  );
}
