import { ExternalLink } from "lucide-react";

// A short qor1 address (or tx hash: long values are cut to start…end). With `href` it links to the block explorer.
export default function AddressChip({ address = "{qorAddress}", href }: { address?: string; href?: string }) {
  const cls = "inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 font-mono text-[13px] text-muted";
  const text = address.length > 20 ? `${address.slice(0, 10)}…${address.slice(-6)}` : address;
  return href
    ? <a href={href} target="_blank" rel="noreferrer" title={address} className={`${cls} hover:bg-white/16`}>{text}<ExternalLink className="size-3" aria-label="Opens the explorer" /></a>
    : <span className={cls} title={address}>{text}</span>;
}
