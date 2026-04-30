"use client";

import { useQuery } from "@tanstack/react-query";

import type { Alert } from "@/lib/solar/types";
import { api } from "./api";

export function useAlerts() {
  return useQuery<{ alerts: Alert[] }>({
    queryKey: ["solar", "alerts"],
    queryFn: () => api.getJson<{ alerts: Alert[] }>("/api/solar/alerts"),
    refetchInterval: 5 * 60_000,
  });
}
