/** The surveys this organisation has, and which one staff are working on (one shared store). */
import { create } from "zustand";
import { listSurveys, selectSurvey } from "./api";
import type { SurveySummary } from "./config";

interface SurveysState {
  state: "idle" | "loading" | "ready" | "error";
  current: string;
  publicDefault: string;
  surveys: SurveySummary[];
  load: (force?: boolean) => Promise<void>;
  /** Switches the survey staff are working on, then reloads so every page shows that survey. */
  switchTo: (id: string, then?: string) => Promise<void>;
}

export const useSurveys = create<SurveysState>()((set, get) => ({
  state: "idle",
  current: "main",
  publicDefault: "main",
  surveys: [],
  load: async (force) => {
    if (!force && (get().state === "loading" || get().state === "ready")) return;
    set({ state: "loading" });
    try {
      const r = await listSurveys();
      set({ state: "ready", current: r.current, publicDefault: r.publicDefault, surveys: r.surveys });
    } catch {
      set({ state: "error" });
    }
  },
  switchTo: async (id, then) => {
    await selectSurvey({ data: { id } });
    if (then) window.location.href = then;
    else window.location.reload();
  },
}));

export function useCurrentSurvey(): SurveySummary | undefined {
  return useSurveys((s) => s.surveys.find((x) => x.id === s.current));
}
