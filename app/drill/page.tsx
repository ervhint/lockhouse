import AppShell from "@/components/AppShell";
import Heading from "@/components/Heading";
import DrillView from "./DrillView";

// S-09 Drill (Simulation): the Thief's page, linked only from Welcome. Open to anyone and the same for everyone (AC-7.1):
// always the stranger's header, never a member's name or menu, so it never looks like a family member is the thief.
export default function Drill() {
  return (
    <AppShell signedIn={false}>
      <Heading title="The Q-Day Drill">You are the thief. Break in, steal every paper, and wait for Q-Day. See what you can open.</Heading>
      <DrillView />
    </AppShell>
  );
}
