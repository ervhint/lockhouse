import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { ComponentProps } from "react";

const variants = {
  primary: "bg-gradient-to-br from-lime-light to-lime text-ink shadow-[inset_0_0_14px_rgba(255,255,255,.6)] hover:-translate-y-px",
  secondary: "bg-white/10 border border-white/20 text-mist hover:bg-white/16",
  ghost: "text-mist hover:bg-white/10",
  danger: "bg-danger/15 border border-danger/50 text-danger hover:bg-danger/25",
};

type Props = { variant?: keyof typeof variants; loading?: boolean; href?: string; full?: boolean } & Omit<ComponentProps<"button">, "type">;

// The one button. A link when `href` is set. Disabled and loading look the same everywhere.
export default function Button({ variant = "primary", loading, href, full, className = "", children, disabled, ...rest }: Props) {
  const off = disabled || loading;
  const cls = `inline-flex h-11 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-medium transition-[transform,background-color] active:scale-[0.96] ${variants[variant]} ${full ? "w-full" : ""} ${off ? "pointer-events-none opacity-50" : ""} ${className}`;
  const inner = <>{loading && <Loader2 className="size-4 animate-spin" aria-hidden />}{children}</>;
  if (href && !off) return <Link href={href} className={cls}>{inner}</Link>;
  return <button type="button" className={cls} disabled={off} aria-busy={loading || undefined} {...rest}>{inner}</button>;
}
