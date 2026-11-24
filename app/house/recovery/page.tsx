import { signedIn } from "@/lib/session";
import AppShell from "@/components/AppShell";
import Heading from "@/components/Heading";
import MakeRecovery from "./MakeRecovery";

// Make a Recovery Key (U10, like S-03): new secret words for the whole house, shown once, kept on paper.
export default async function Recovery() {
  await signedIn(); // no session: off to Sign In (AC-3.5)
  return (
    <AppShell>
      <Heading title="Make a Recovery Key">A second set of secret words for the whole house. Every paper put in from now on can also be opened with them, on any device.</Heading>
      <MakeRecovery />
    </AppShell>
  );
}
