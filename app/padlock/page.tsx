import AppShell from "@/components/AppShell";
import Heading from "@/components/Heading";
import Register from "./Register";

// S-04 Register Padlock
export default function Padlock() {
  return (
    <AppShell signedIn={false}>
      <Heading title="Register Your Padlock">Your padlock lets your family lock papers for you. It goes in QoreChain&apos;s Phone Book so they can find it. A small network fee in test QOR pays for it, like a delivery fee.</Heading>
      <Register />
    </AppShell>
  );
}
