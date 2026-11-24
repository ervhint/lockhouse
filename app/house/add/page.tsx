import { signedIn } from "@/lib/session";
import AppShell from "@/components/AppShell";
import Heading from "@/components/Heading";
import Panel from "@/components/Panel";
import AddForm from "./AddForm";

// S-06 Add Member
export default async function AddMember() {
  await signedIn(); // no session: off to Sign In (AC-3.5)
  return (
    <AppShell>
      <Heading title="Add Someone">Type their qor1 address. Their signed card must prove the address and the padlock belong to the same person.</Heading>
      <Panel><AddForm /></Panel>
    </AppShell>
  );
}
