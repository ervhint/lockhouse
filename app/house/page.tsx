import { signedIn } from "@/lib/session";
import AppShell from "@/components/AppShell";
import Heading from "@/components/Heading";
import Button from "@/components/Button";
import Sheet from "@/components/Sheet";
import Forget from "./Forget";
import HouseView from "./HouseView";

// S-05 House (members + papers). `?forget` opens the Forget Keys sheet from the menu; `?remove={address}` the Remove sheet;
// `?recovery` says the recovery key was just saved (U10).
export default async function House(props: PageProps<"/house">) {
  await signedIn(); // no session: off to Sign In (AC-3.5)
  const q = await props.searchParams;
  const forget = "forget" in q;
  return (
    <AppShell>
      <Heading title="Your House">The people who can open papers here, and the papers they have put in.</Heading>
      <HouseView remove={typeof q.remove === "string" ? q.remove : undefined} recoverySaved={"recovery" in q} />
      {forget && (
        <Sheet title="Forget Keys on This Device?" closeHref="/house">
          <p className="mb-5 text-muted">Your keys are removed from this browser. To come back you need your secret words. Without them, your papers stay locked for good.</p>
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <Forget />
            <Button variant="ghost" href="/house">Keep My Keys</Button>
          </div>
        </Sheet>
      )}
    </AppShell>
  );
}
