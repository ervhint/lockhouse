"use client";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import { forgetKeys } from "@/lib/keys";

// Removes the words and name from this browser, then Welcome shows the first visit. U3 adds sign-out here.
export default function Forget() {
  const router = useRouter();
  return <Button variant="danger" onClick={() => { forgetKeys(); router.push("/"); }}>Forget My Keys</Button>;
}
