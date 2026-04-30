import Link from "next/link";
import { Activity, BellRing, LayoutDashboard } from "lucide-react";

import { cn } from "@/lib/utils";

interface Props {
  current: "overview" | "history" | "alerts";
  alertCount?: number;
}

const ITEMS = [
  { id: "overview", label: "Overview", href: "/", icon: LayoutDashboard },
  { id: "history", label: "History", href: "/history", icon: Activity },
  { id: "alerts", label: "Alerts", href: "/alerts", icon: BellRing },
] as const;

export function MobileNav({ current, alertCount = 0 }: Props) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border/60 bg-card/95 backdrop-blur md:hidden">
      <ul className="grid grid-cols-3 gap-1 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        {ITEMS.map(({ id, label, href, icon: Icon }) => {
          const active = id === current;
          return (
            <li key={id}>
              <Link
                href={href}
                prefetch={false}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 rounded-md px-2 py-1.5 text-[11px] transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-5" />
                {label}
                {id === "alerts" && alertCount > 0 && (
                  <span className="absolute right-3 top-1 inline-flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-semibold text-destructive-foreground">
                    {alertCount > 9 ? "9+" : alertCount}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
