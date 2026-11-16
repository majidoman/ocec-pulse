/**
 * Client-side session for the insights room: who is signed in, what role they
 * hold, and the latest results. One shared store so every page reads the same
 * numbers and a refresh updates all of them.
 */
import { create } from "zustand";
import { useSettings } from "../settings-store";
import { getAdminConfig, getMe, getPublic, getResults } from "./api";
import type { Me, PublicStats, Results } from "./results-types";

type Load = "idle" | "loading" | "ready" | "error";

interface PulseSession {
  publicState: Load;
  /** The survey the employee pages are showing (from the personal link, ?s=, or the default). */
  publicSurveyId: string | null;
  stats: PublicStats | null;
  me: Me | null;
  meState: Load | "signed_out";
  results: Results | null;
  resultsState: Load;
  resultsError: string | null;
  loadPublic: () => Promise<void>;
  loadMe: () => Promise<Me | null>;
  loadAdmin: () => Promise<void>;
  refreshResults: () => Promise<void>;
  reset: () => void;
}

export const usePulse = create<PulseSession>()((set, get) => ({
  publicState: "idle",
  publicSurveyId: null,
  stats: null,
  me: null,
  meState: "idle",
  results: null,
  resultsState: "idle",
  resultsError: null,
  loadPublic: async () => {
    if (get().publicState === "loading") return;
    set({ publicState: "loading" });
    try {
      const params = typeof window === "undefined" ? null : new URLSearchParams(window.location.search);
      const survey = params?.get("s")?.replace(/^"|"$/g, "") || undefined;
      const token = params?.get("t")?.replace(/^"|"$/g, "") || undefined;
      const res = await getPublic({
        data: {
          ...(survey && /^[A-Za-z0-9_-]{1,64}$/.test(survey) ? { survey } : {}),
          ...(token && token.length >= 8 && token.length <= 200 ? { token } : {}),
        },
      });
      useSettings.getState().hydratePublic(res.config);
      set({ publicState: "ready", stats: res.stats, publicSurveyId: res.surveyId });
    } catch {
      set({ publicState: "error" });
    }
  },
  loadMe: async () => {
    set({ meState: "loading" });
    try {
      const me = await getMe();
      set({ me, meState: "ready" });
      return me;
    } catch (err) {
      const signedOut = err instanceof Error && err.message === "Unauthorized";
      set({ me: null, meState: signedOut ? "signed_out" : "error" });
      return null;
    }
  },
  loadAdmin: async () => {
    const config = await getAdminConfig();
    useSettings.getState().hydrateAdmin(config);
    await get().refreshResults();
  },
  refreshResults: async () => {
    set({ resultsState: "loading", resultsError: null });
    try {
      const results = await getResults();
      set({ results, resultsState: "ready" });
    } catch (err) {
      set({ resultsState: "error", resultsError: err instanceof Error ? err.message : "Could not load results" });
    }
  },
  reset: () => set({ me: null, meState: "idle", results: null, resultsState: "idle" }),
}));
