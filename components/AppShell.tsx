"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import type { ReactNode } from "react";
import Logo from "./Logo";
import UserMenu from "./UserMenu";

const NAV = "whitespace-nowrap rounded-full px-2 py-3 hover:bg-white/10 sm:px-3";
// The page you are on is lit in the menu. A paper and Put In belong to Papers; Add Someone and the recovery key to House.
const LINKS = [["/house", "House", ["/house"]], ["/members", "Members", ["/members"]], ["/papers", "Papers", ["/papers", "/item", "/put-in"]]] as const;

// Header + night-house background for every page after the Welcome screen. `signedIn` shows the menu,
// and the logo then goes to the House instead of the Welcome screen. Every page has the same width (Laras, 27 Nov).
export default function AppShell({ children, signedIn = true }: { children: ReactNode; signedIn?: boolean }) {
  const path = usePathname();
  return (
    <div className="relative isolate min-h-svh">
      <Image src="/img/house/sky-night.webp" alt="" fill priority sizes="100vw" className="-z-10 object-cover blur-md brightness-[.55]" />
      <header className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-4 px-4 py-2">
        <Link href={signedIn ? "/house" : "/"} className="flex items-center gap-2 py-2 text-xl font-medium tracking-tight"><Logo />Lockhouse</Link>
        {signedIn && (
          <nav aria-label="Main" className="flex w-full flex-wrap items-center justify-between text-[15px] sm:w-auto sm:justify-start sm:gap-1">
            {LINKS.map(([href, label, under]) => {
              const here = under.some((p) => path === p || path.startsWith(`${p}/`));
              return <Link key={href} href={href} aria-current={here ? "page" : undefined} className={`${NAV} ${here ? "bg-white/12 text-lime" : ""}`}>{label}</Link>;
            })}
            <UserMenu />
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-6">{children}</main>
    </div>
  );
}
