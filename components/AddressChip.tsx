"use client";
import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";

// A short qor1 address (or tx hash: long values are cut to start…end). With `href` it links to the block explorer;
// with `copy` it is a button that copies the full value (so it can be shared, e.g. to be added to a house).
export default function AddressChip({ address = "{qorAddress}", href, copy }: { address?: string; href?: string; copy?: boolean }) {
  const [copied, setCopied] = useState(false);
  const cls = "inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 font-mono text-[13px] text-muted";
  const text = address.length > 20 ? `${address.slice(0, 10)}…${address.slice(-6)}` : address;
  if (href) return <a href={href} target="_blank" rel="noreferrer" title={address} className={`${cls} hover:bg-white/16`}>{text}<ExternalLink className="size-3" aria-label="Opens the explorer" /></a>;
  if (copy) return (
    <button type="button" title={address} aria-label={`Copy Full Address ${address}`} className={`${cls} hover:bg-white/16`}
      onClick={async () => { await navigator.clipboard.writeText(address); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
      {text}{copied ? <Check className="size-3" aria-hidden /> : <Copy className="size-3" aria-hidden />}
      <span className="sr-only" role="status">{copied ? "Address copied" : ""}</span>
    </button>
  );
  return <span className={cls} title={address}>{text}</span>;
}
