"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        gcTime: 5 * 60_000,
        retry: 3,
        retryDelay: (n) => Math.min(1000 * 2 ** n, 30_000),
        refetchOnWindowFocus: true,
      },
    },
  });
}

let _client: QueryClient | undefined;
function getClient() {
  if (typeof window === "undefined") return makeClient();
  return (_client ??= makeClient());
}

export function Providers({ children }: { children: React.ReactNode }) {
  const client = getClient();
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <QueryClientProvider client={client}>
          <TooltipProvider delayDuration={150}>
            {children}
            <Toaster theme="dark" position="bottom-right" richColors closeButton />
          </TooltipProvider>
          {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
