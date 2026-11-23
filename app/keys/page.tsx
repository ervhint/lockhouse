import AppShell from "@/components/AppShell";
import Heading from "@/components/Heading";
import KeysForm from "./KeysForm";

// S-02 Make or Restore Keys. `/keys?restore` restores from secret words.
export default async function Keys(props: PageProps<"/keys">) {
  const restore = "restore" in (await props.searchParams);
  return (
    <AppShell signedIn={false}>
      {restore
        ? <Heading title="Restore Your Keys">Type your name and your secret words in order. Your keys are rebuilt in this browser.</Heading>
        : <Heading title="Make Your Keys">Your keys are made in this browser from secret words. We never see them.</Heading>}
      <KeysForm key={String(restore)} restore={restore} />
    </AppShell>
  );
}
