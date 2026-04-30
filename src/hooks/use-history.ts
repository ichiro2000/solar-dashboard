"use client";

import { useQuery } from "@tanstack/react-query";

import type { HistoryPoint, HistoryRange } from "@/lib/solar/types";
import { api } from "./api";

interface HistoryResponse {
  range: HistoryRange;
  points: HistoryPoint[];
}

export function useHistory(range: HistoryRange) {
  return useQuery<HistoryResponse>({
    queryKey: ["solar", "history", range],
    queryFn: () => api.getJson<HistoryResponse>(`/api/solar/history?range=${range}`),
    staleTime: 60_000,
  });
}
