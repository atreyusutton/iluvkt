"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "./ui";
import { SessionPill } from "./session-pill";

const PRIMARY = [
  { href: "/", label: "Home", icon: "⌂" },
  { href: "/practice", label: "Practice", icon: "●" },
  { href: "/songs", label: "Songs", icon: "♪" },
  { href: "/lessons", label: "Lessons", icon: "▤" },
  { href: "/tools", label: "Tools", icon: "⚙" },
];

const SECONDARY = [
  { href: "/journal", label: "Journal", icon: "✎" },
  { href: "/recordings", label: "Recordings", icon: "◉" },
  { href: "/milestones", label: "Milestones", icon: "★" },
  { href: "/settings", label: "Settings", icon: "☰" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function Nav({ passwordProtected }: { passwordProtected: boolean }) {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-surface px-3 py-6 md:flex">
        <Link href="/" className="mb-8 px-3">
          <div className="font-display text-2xl font-semibold tracking-tight">
            iluv<span className="text-rose">kt</span>
          </div>
          <div className="text-xs text-ink-3">guitar practice room</div>
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {[...PRIMARY, ...SECONDARY].map((item, index) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                index === PRIMARY.length && "mt-4",
                isActive(pathname, item.href) ? "bg-accent-soft text-accent" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
              )}
            >
              <span aria-hidden className="w-4 text-center">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <SessionPill />
        {passwordProtected && (
          <form action="/logout" method="post" className="mt-3 px-3">
            <button className="text-xs text-ink-3 hover:text-ink">Log out</button>
          </form>
        )}
      </aside>

      <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-border bg-surface/90 px-4 py-3 backdrop-blur md:hidden">
        <Link href="/" className="font-display text-xl font-semibold">
          iluv<span className="text-rose">kt</span>
        </Link>
        <div className="flex items-center gap-3 text-sm">
          {SECONDARY.map((item) => (
            <Link key={item.href} href={item.href} aria-label={item.label} className={cn(isActive(pathname, item.href) ? "text-accent" : "text-ink-3")}>
              {item.icon}
            </Link>
          ))}
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {PRIMARY.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
              isActive(pathname, item.href) ? "text-accent" : "text-ink-3",
            )}
          >
            <span aria-hidden className="text-lg leading-none">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
