import { signedIn } from "@/lib/session";
import AppShell from "@/components/AppShell";
import Heading from "@/components/Heading";
import HouseView from "../house/HouseView";

// Members (S-05, members part): everyone in the house, Add Someone, and Remove (`?remove={address}`, U9).
export default async function Members(props: PageProps<"/members">) {
  await signedIn(); // no session: off to Sign In (AC-3.5)
  const q = await props.searchParams;
  return (
    <AppShell>
      <Heading title="Members">The people who can open papers in this house.</Heading>
      <HouseView view="members" remove={typeof q.remove === "string" ? q.remove : undefined} />
    </AppShell>
  );
}
