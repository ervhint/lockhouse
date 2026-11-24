import AppShell from "@/components/AppShell";
import RecoverView from "./RecoverView";

// Open With Recovery Words (U10): no keys, no sign-in. The words open the papers locked to the house's recovery key.
export default function Recover() {
  return (
    <AppShell signedIn={false}>
      <RecoverView />
    </AppShell>
  );
}
