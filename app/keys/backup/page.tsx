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
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Array.from({ length: 24 }, (_, i) => (
            <li key={i} className="flex gap-2 rounded-lg bg-white/8 px-3 py-2 font-mono text-sm"><span className="w-5 text-muted">{i + 1}</span>{"{secretWord}"}</li>
          ))}
        </ol>
        <Saved />
      </Panel>
    </AppShell>
  );
}
