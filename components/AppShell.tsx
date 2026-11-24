import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import Logo from "./Logo";
import UserMenu from "./UserMenu";

// Header + night-house background for every page after the Welcome screen. `signedIn` shows the menu.
export default function AppShell({ children, signedIn = true }: { children: ReactNode; signedIn?: boolean }) {
  return (
    <div className="relative isolate min-h-svh">
      <Image src="/img/house/sky-night.webp" alt="" fill priority sizes="100vw" className="-z-10 object-cover blur-md brightness-[.55]" />
      <header className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-4 px-4 py-2">
        <Link href="/" className="flex items-center gap-2 py-2 text-xl font-medium tracking-tight"><Logo />Lockhouse</Link>
        {signedIn && (
          <nav aria-label="Main" className="flex w-full items-center justify-between text-[15px] sm:w-auto sm:justify-start sm:gap-1">
            <Link href="/house" className="rounded-full px-3 py-3 hover:bg-white/10">House</Link>
            <Link href="/put-in" className="rounded-full px-3 py-3 hover:bg-white/10">Put In</Link>
            <Link href="/drill" className="rounded-full px-3 py-3 hover:bg-white/10">Drill</Link>
            <UserMenu />
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-28 pt-6">{children}</main>
    </div>
  );
}
