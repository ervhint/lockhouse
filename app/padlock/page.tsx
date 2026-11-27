import AppShell from "@/components/AppShell";
import Heading from "@/components/Heading";
import Register from "./Register";

// S-04 Register Padlock
export default function Padlock() {
  return (
    <AppShell signedIn={false}>
      <Heading title="Register Your Padlock">Your padlock keeps the papers in Lockhouse locked, so only the members picked for each paper can open it, even after Q-Day. It is kept in QoreChain&apos;s Phone Book, a public list. Adding it costs a tiny fee in free test QOR.</Heading>
      <Register />
    </AppShell>
  );
}
