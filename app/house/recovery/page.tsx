import { signedIn } from "@/lib/session";
import AppShell from "@/components/AppShell";
import Heading from "@/components/Heading";
import MakeRecovery from "./MakeRecovery";

// Make a Recovery Key (U10, like S-03): new secret words for the whole house, shown once, kept on paper.
export default async function Recovery() {
  await signedIn(); // no session: off to Sign In (AC-3.5)
  return (
    <AppShell>
      <Heading title="Make a Recovery Key">Spare words for the whole house. If someone loses their own words, these words can still open the papers.</Heading>
      <MakeRecovery />
    </AppShell>
  );
}
