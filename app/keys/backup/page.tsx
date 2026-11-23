import AppShell from "@/components/AppShell";
import Heading from "@/components/Heading";
import Panel from "@/components/Panel";
import Badge from "@/components/Badge";
import Saved from "./Saved";

// S-03 Secret Words Backup (shown once)
export default function Backup() {
  return (
    <AppShell signedIn={false}>
      <Heading title="Your Secret Words">These words are the only way back to your keys. They are shown once. Write them down and keep them safe.</Heading>
      <Panel className="flex flex-col gap-5">
        <Badge tone="warn">Shown Once</Badge>
        <Saved />
      </Panel>
    </AppShell>
  );
}
