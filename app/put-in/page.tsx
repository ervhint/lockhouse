import { signedIn } from "@/lib/session";
import AppShell from "@/components/AppShell";
import Heading from "@/components/Heading";
import PutInForm from "./PutInForm";

// S-07 Gate (Put In)
export default async function PutIn() {
  await signedIn(); // no session: off to Sign In (AC-3.5)
  return (
    <AppShell>
      <Heading title="Put In a Paper">Pick a file or write a note, then pick who can open it. It is locked on this device first. Then it is signed with your key.</Heading>
      <PutInForm />
    </AppShell>
  );
}
