import { signedIn } from "@/lib/session";
import AppShell from "@/components/AppShell";
import ReadersForm from "./ReadersForm";

// S-13 Change Readers (U12)
export default async function ChangeReaders(props: PageProps<"/item/[id]/readers">) {
  await signedIn(); // no session: off to Sign In (AC-3.5)
  const { id } = await props.params;
  return <AppShell><ReadersForm id={id} /></AppShell>;
}
