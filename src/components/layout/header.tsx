import Link from "next/link";
import { LogOut, RefreshCw } from "lucide-react";

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
      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-2 border-b border-border/50 bg-background/85 px-4 py-3 backdrop-blur sm:gap-4 sm:px-6 sm:py-4">
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">{title}</h1>
          {plantName && (
            <p className="truncate text-[11px] text-muted-foreground sm:text-xs">{plantName}</p>
          )}
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <SystemStatusPill status={status} lastUpdated={lastUpdated} />
          <Link
            href="/?_=now"
            prefetch={false}
            aria-label="Refresh"
            className="inline-flex items-center gap-1 rounded-md border border-border/40 bg-muted/30 px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <RefreshCw className="size-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </Link>
          <form action={logoutAction}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="gap-2 px-2 sm:px-3"
              aria-label="Sign out"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </form>
        </div>
      </header>
    </>
  );
}
