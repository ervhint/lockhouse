import { ExternalLink } from "lucide-react";

// A short qor1 address. With `href` it links to the block explorer.
export default function AddressChip({ address = "{qorAddress}", href }: { address?: string; href?: string }) {
  const cls = "inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 font-mono text-[13px] text-muted";
  return href
    ? <a href={href} target="_blank" rel="noreferrer" className={`${cls} hover:bg-white/16`}>{address}<ExternalLink className="size-3" aria-label="Opens the explorer" /></a>
    : <span className={cls}>{address}</span>;
}
