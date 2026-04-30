"use client";

import { useQuery } from "@tanstack/react-query";

import type { RealtimeSnapshot } from "@/lib/solar/types";
import { api } from "./api";

export function useRealtime() {
  return useQuery<RealtimeSnapshot>({
    queryKey: ["solar", "realtime"],
    queryFn: () => api.getJson<RealtimeSnapshot>("/api/solar/realtime"),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
}
