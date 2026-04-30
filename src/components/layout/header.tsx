import Link from "next/link";
import { LogOut } from "lucide-react";

import { SystemStatusPill } from "@/components/dashboard/system-status-pill";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/auth-actions";
import type { SystemStatus } from "@/lib/solar/types";

export function Header({
  title,
  plantName,
  status,
  lastUpdated,
  autoRefreshSec,
}: {
  title: string;
  plantName?: string;
  status?: SystemStatus;
  lastUpdated?: string;
  autoRefreshSec?: number;
}) {
  return (
    <>
      {autoRefreshSec ? (
        <meta httpEquiv="refresh" content={String(autoRefreshSec)} />
      ) : null}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          {plantName && <p className="text-xs text-muted-foreground">{plantName}</p>}
        </div>
        <div className="flex items-center gap-3">
          <SystemStatusPill status={status} lastUpdated={lastUpdated} />
          <Link
            href="/?_=now"
            className="rounded-md border border-border/40 bg-muted/30 px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            prefetch={false}
          >
            Refresh
          </Link>
          <form action={logoutAction}>
            <Button type="submit" variant="ghost" size="sm" className="gap-2">
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </form>
        </div>
      </header>
    </>
  );
}
