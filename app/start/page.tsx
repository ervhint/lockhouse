import AppShell from "@/components/AppShell";
import Heading from "@/components/Heading";
import Panel from "@/components/Panel";
import Button from "@/components/Button";

// Get Started (Laras, 27 Nov): the one first step for a new visitor. New here, or bring the address you already have.
export default function Start() {
  const choices = [
    { title: "I'm New", text: "Make a new QoreChain address and its 24 secret words.", href: "/keys", label: "Make My Keys", variant: "primary" as const },
    { title: "I Have My 24 Words", text: "Use the QoreChain address you already have. Type its 24 secret words.", href: "/keys?restore", label: "Restore My Keys", variant: "secondary" as const },
  ];
  return (
    <AppShell signedIn={false}>
      <Heading title="Get Started">Your keys are made in this browser from 24 secret words. We never see them.</Heading>
      <div className="grid gap-4 sm:grid-cols-2">
        {choices.map((c) => (
          <Panel key={c.href} className="flex flex-col gap-3">
            <h2 className="text-xl font-medium">{c.title}</h2>
            <p className="grow text-muted">{c.text}</p>
            <Button href={c.href} variant={c.variant} full>{c.label}</Button>
          </Panel>
        ))}
      </div>
    </AppShell>
  );
}
