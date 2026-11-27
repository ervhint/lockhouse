import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import Logo from "./Logo";
import UserMenu from "./UserMenu";

const NAV = "whitespace-nowrap rounded-full px-2 py-3 hover:bg-white/10 sm:px-3";

// Header + night-house background for every page after the Welcome screen. `signedIn` shows the menu,
// and the logo then goes to the House instead of the Welcome screen.
export default function AppShell({ children, signedIn = true }: { children: ReactNode; signedIn?: boolean }) {
  return (
    <div className="relative isolate min-h-svh">
      <Image src="/img/house/sky-night.webp" alt="" fill priority sizes="100vw" className="-z-10 object-cover blur-md brightness-[.55]" />
      <header className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-4 px-4 py-2">
        <Link href={signedIn ? "/house" : "/"} className="flex items-center gap-2 py-2 text-xl font-medium tracking-tight"><Logo />Lockhouse</Link>
        {signedIn && (
          <nav aria-label="Main" className="flex w-full flex-wrap items-center justify-between text-[15px] sm:w-auto sm:justify-start sm:gap-1">
            <Link href="/house" className={NAV}>House</Link>
            <Link href="/members" className={NAV}>Members</Link>
            <Link href="/papers" className={NAV}>Papers</Link>
            <UserMenu />
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-28 pt-6">{children}</main>
    </div>
  );
}
