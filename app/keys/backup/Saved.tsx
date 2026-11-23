"use client";
import { useState } from "react";
import Checkbox from "@/components/Checkbox";
import Button from "@/components/Button";

// The "I saved them" check. Continue stays off until it is ticked.
export default function Saved() {
  const [ok, setOk] = useState(false);
  return (
    <>
      <Checkbox checked={ok} onChange={(e) => setOk(e.target.checked)}>I saved my secret words in a safe place</Checkbox>
      <Button href="/padlock" full disabled={!ok}>Continue</Button>
    </>
  );
}
