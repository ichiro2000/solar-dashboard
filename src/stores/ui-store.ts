import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { HistoryRange } from "@/lib/solar/types";

interface UiState {
  range: HistoryRange;
  setRange: (r: HistoryRange) => void;
  plantId: string | null;
  setPlantId: (id: string | null) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      range: "day",
      setRange: (range) => set({ range }),
      plantId: null,
      setPlantId: (plantId) => set({ plantId }),
    }),
    { name: "solar-ui" },
  ),
);
