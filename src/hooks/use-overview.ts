"use client";

import { useQuery } from "@tanstack/react-query";

import type { OverviewSnapshot } from "@/lib/solar/types";
import { api } from "./api";

export function useOverview() {
  return useQuery<OverviewSnapshot>({
    queryKey: ["solar", "overview"],
    queryFn: () => api.getJson<OverviewSnapshot>("/api/solar/overview"),
    refetchInterval: 60_000,
  });
}
