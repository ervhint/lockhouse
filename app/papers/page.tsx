import { signedIn } from "@/lib/session";
import AppShell from "@/components/AppShell";
import Heading from "@/components/Heading";
import PapersView from "./PapersView";

// Papers (S-05, papers part): how many papers the house has, and every one newest first, loaded a page at a time.
export default async function Papers() {
  await signedIn(); // no session: off to Sign In (AC-3.5)
  return (
    <AppShell>
      <Heading title="Papers">Every paper in this house, newest first.</Heading>
      <PapersView />
    </AppShell>
  );
}
