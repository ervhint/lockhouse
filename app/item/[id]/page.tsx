import { signedIn } from "@/lib/session";
import AppShell from "@/components/AppShell";
import ItemView from "./ItemView";

// S-08 Item
export default async function Item(props: PageProps<"/item/[id]">) {
  await signedIn(); // no session: off to Sign In (AC-3.5)
  const { id } = await props.params;
  return <AppShell><ItemView id={id} /></AppShell>;
}
