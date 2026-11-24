"use client";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import { signOut } from "@/components/UserMenu";
import { forgetKeys } from "@/lib/keys";

// Removes the words and name from this browser and signs out; Welcome then shows the first visit (AC-1.7).
export default function Forget() {
  const router = useRouter();
  return <Button variant="danger" onClick={async () => { forgetKeys(); await signOut(); router.push("/"); router.refresh(); }}>Forget My Keys</Button>;
}
