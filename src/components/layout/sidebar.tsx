"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BellRing, LayoutDashboard, Sun } from "lucide-react";

import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/history", label: "History", icon: Activity },
  { href: "/alerts", label: "Alerts", icon: BellRing },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden h-screen w-60 shrink-0 flex-col border-r border-border/50 bg-card/40 px-3 py-5 md:flex">
      <Link href="/" className="mb-6 flex items-center gap-2 px-2">
        <span className="rounded-lg bg-primary/15 p-1.5 text-primary">
          <Sun className="size-4" />
        </span>
        <span className="text-sm font-semibold tracking-tight">Solar Dashboard</span>
      </Link>
      <nav className="flex flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto px-3 text-[11px] text-muted-foreground/70">
        v0.1 · GoodWe SEMS
      </div>
    </aside>
  );
}
