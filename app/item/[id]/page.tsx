import { Download, FileText, Lock } from "lucide-react";
import { signedIn } from "@/lib/session";
import AppShell from "@/components/AppShell";
import Heading from "@/components/Heading";
import Panel from "@/components/Panel";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import EmptyState from "@/components/EmptyState";
import Skeleton from "@/components/Skeleton";
import StatePicker from "@/components/StatePicker";

// S-08 Item
export default async function Item(props: PageProps<"/item/[id]">) {
  await signedIn(); // no session: off to Sign In (AC-3.5)
  const { id } = await props.params;
  const { state = "" } = (await props.searchParams) as { state?: string };
  const base = `/item/${id}`;
  return (
    <AppShell>
      {state === "notyou" ? (
        <EmptyState icon={Lock} title="This Paper Is Not for You" text="You are not one of this paper's readers. Ask {senderName} to add you." action={<Button href="/house">Back to the House</Button>} />
      ) : (
        <>
          <Heading title="{itemTitle}">Put in by {"{senderName}"} · {"{date}"} · {"{readerCount}"} readers</Heading>
          <Panel className="flex flex-col gap-5">
            {state === "opening"
              ? <><Skeleton className="h-52" /><p className="text-muted">Opening on this device…</p></>
              : <>
                  {state === "unproven"
                    ? <div className="flex flex-col gap-2 rounded-xl border border-danger/50 bg-danger/10 p-4"><Badge tone="bad">Signature Not Proven</Badge><p>This paper says it is from {"{senderName}"}, but the signature does not check out on QoreChain. Do not trust it.</p></div>
                    : <Badge tone="ok">From {"{senderName}"} · Signature Checked on QoreChain</Badge>}
                  <div className={`flex min-h-52 items-center justify-center gap-3 rounded-xl bg-white/6 text-muted ${state === "unproven" ? "blur-sm" : ""}`}><FileText className="size-6" aria-hidden />{"{itemPreview}"}</div>
                  {state !== "unproven" && <Button href="#"><Download className="size-4" aria-hidden />Download Paper</Button>}
                </>}
            <Button variant="secondary" href="/house">Back to the House</Button>
          </Panel>
        </>
      )}
      <StatePicker base={base} current={state} states={[["", "Opened"], ["opening", "Opening"], ["notyou", "Not for You"], ["unproven", "Signature Not Proven"]]} />
    </AppShell>
  );
}
