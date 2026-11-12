import { create } from "zustand";
import type { ActionPlan, Department, Dimension, Localized, Question } from "./types";
import {
  defaultConfig,
  type AnonymitySettings,
  type BenchmarkSettings,
  type BrandingSettings,
  type CalendarSettings,
  type EmailSettings,
  type GeneralSettings,
  type IntegrationSettings,
  type PublicConfig,
  type PulseConfig,
  type ReminderSettings,
} from "./pulse/config";
import { logAudit, saveAdminConfig } from "./pulse/api";

export { ROLE_LABEL, canEditSettings, applyTokens } from "./pulse/config";
export type {
  AnonymitySettings,
  BenchmarkSettings,
  BrandingSettings,
  CalendarSettings,
  EmailSettings,
  GeneralSettings,
  IntegrationSettings,
  ReminderSettings,
} from "./pulse/config";

const nowIso = () => new Date().toISOString();

/**
 * The census configuration, mirrored from the server.
 *
 * - `source: "public"` — the subset an anonymous survey taker may see.
 * - `source: "admin"` — the full document; every change is saved to the server
 *   (debounced) and nothing is kept in browser storage.
 */
export interface SettingsState extends PulseConfig {
  source: "none" | "public" | "admin";
  saveState: "idle" | "saving" | "saved" | "error";
  saveError: string | null;
  hydratePublic: (c: PublicConfig) => void;
  hydrateAdmin: (c: PulseConfig) => void;
  patchGeneral: (p: Partial<GeneralSettings>) => void;
  patchBranding: (p: Partial<BrandingSettings>) => void;
  patchCalendar: (p: Partial<CalendarSettings>) => void;
  patchAnonymity: (p: Partial<AnonymitySettings>) => void;
  patchEmail: (p: Partial<EmailSettings>) => void;
  patchReminders: (p: Partial<ReminderSettings>) => void;
  patchIntegrations: (p: Partial<IntegrationSettings>) => void;
  patchBenchmarks: (p: Partial<BenchmarkSettings>) => void;
  setDepartments: (d: Department[]) => void;
  addDepartment: (d: Department) => void;
  patchDepartment: (id: string, p: Partial<Department>) => void;
  setDimensions: (d: Dimension[]) => void;
  patchDimension: (id: string, p: Partial<Dimension>) => void;
  addDimension: (d: Dimension) => void;
  setQuestions: (q: Question[]) => void;
  patchQuestion: (id: string, p: Partial<Question>) => void;
  addQuestion: (q: Question) => void;
  removeQuestion: (id: string) => void;
  setActions: (a: ActionPlan[]) => void;
  freezeInstrument: () => { ok: true } | { ok: false; error: Localized };
  cloneCycle: () => void;
  log: (en: string, ar: string) => void;
  /** Save immediately (used before actions that depend on the stored settings). */
  flush: () => Promise<void>;
}

const CONFIG_KEYS: (keyof PulseConfig)[] = [
  "version",
  "general",
  "branding",
  "calendar",
  "anonymity",
  "email",
  "reminderCfg",
  "integrations",
  "benchmarks",
  "departments",
  "dimensions",
  "questions",
  "instrumentStatus",
  "frozenAt",
  "changelog",
  "actions",
];

function snapshot(s: SettingsState): PulseConfig {
  const out: Record<string, unknown> = {};
  for (const k of CONFIG_KEYS) out[k] = s[k];
  return out as unknown as PulseConfig;
}

let timer: ReturnType<typeof setTimeout> | undefined;
let inFlight: Promise<void> | null = null;
let dirty = false;

async function push() {
  const state = useSettings.getState();
  if (state.source !== "admin") return;
  dirty = false;
  useSettings.setState({ saveState: "saving", saveError: null });
  try {
    const res = await saveAdminConfig({ data: { config: snapshot(state) as unknown as Record<string, unknown> } });
    useSettings.setState((s) => ({
      saveState: dirty ? "saving" : "saved",
      general: { ...s.general, closedAt: res.closedAt ?? undefined },
    }));
  } catch (err) {
    useSettings.setState({
      saveState: "error",
      saveError: err instanceof Error ? err.message : "Could not save",
    });
  }
}

function scheduleSave() {
  if (useSettings.getState().source !== "admin") return;
  dirty = true;
  useSettings.setState({ saveState: "saving" });
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = undefined;
    inFlight = (inFlight ?? Promise.resolve()).then(push);
  }, 700);
}

export const useSettings = create<SettingsState>()((set, get) => {
  /** Apply a change and queue a save. */
  const change = (fn: (s: SettingsState) => Partial<SettingsState>) => {
    set(fn);
    scheduleSave();
  };
  return {
    ...defaultConfig(),
    source: "none",
    saveState: "idle",
    saveError: null,
    hydratePublic: (c) => {
      if (get().source === "admin") return;
      set((s) => ({
        source: "public",
        general: { ...s.general, ...c.general },
        branding: c.branding,
        calendar: { ...s.calendar, ...c.calendar },
        anonymity: { ...s.anonymity, ...c.anonymity },
        departments: c.departments.map((d) => ({ ...d, headcount: 0 })),
        dimensions: c.dimensions,
        questions: c.questions,
      }));
    },
    hydrateAdmin: (c) => set({ ...c, source: "admin", saveState: "idle", saveError: null }),
    patchGeneral: (p) => change((s) => ({ general: { ...s.general, ...p } })),
    patchBranding: (p) => change((s) => ({ branding: { ...s.branding, ...p } })),
    patchCalendar: (p) => change((s) => ({ calendar: { ...s.calendar, ...p } })),
    patchAnonymity: (p) => change((s) => ({ anonymity: { ...s.anonymity, ...p } })),
    patchEmail: (p) => change((s) => ({ email: { ...s.email, ...p } })),
    patchReminders: (p) => change((s) => ({ reminderCfg: { ...s.reminderCfg, ...p } })),
    patchIntegrations: (p) => change((s) => ({ integrations: { ...s.integrations, ...p } })),
    patchBenchmarks: (p) => change((s) => ({ benchmarks: { ...s.benchmarks, ...p } })),
    setDepartments: (departments) => change(() => ({ departments })),
    addDepartment: (d) => change((s) => ({ departments: [...s.departments, d] })),
    patchDepartment: (id, p) =>
      change((s) => ({ departments: s.departments.map((d) => (d.id === id ? { ...d, ...p } : d)) })),
    setDimensions: (dimensions) => change(() => ({ dimensions })),
    patchDimension: (id, p) =>
      change((s) => ({ dimensions: s.dimensions.map((d) => (d.id === id ? { ...d, ...p } : d)) })),
    addDimension: (d) => change((s) => ({ dimensions: [...s.dimensions, d] })),
    setQuestions: (questions) => change(() => ({ questions })),
    patchQuestion: (id, p) =>
      change((s) => ({ questions: s.questions.map((q) => (q.id === id ? { ...q, ...p } : q)) })),
    addQuestion: (q) => change((s) => ({ questions: [...s.questions, q] })),
    removeQuestion: (id) => change((s) => ({ questions: s.questions.filter((q) => q.id !== id) })),
    setActions: (actions) => change(() => ({ actions })),
    freezeInstrument: () => {
      const s = get();
      const missing = s.questions.filter((q) => q.visible && (!q.text.en.trim() || !q.text.ar.trim()));
      if (missing.length) {
        return {
          ok: false as const,
          error: {
            en: `${missing.length} item(s) missing English or Arabic. Freeze blocked.`,
            ar: `${missing.length} بند بلا إنجليزية أو عربية. أُوقف التجميد.`,
          },
        };
      }
      change((st) => ({
        instrumentStatus: "frozen",
        frozenAt: nowIso(),
        changelog: [
          { id: `c-${Date.now()}`, at: nowIso(), summary: { en: "Questionnaire frozen for field.", ar: "تجميد الاستبيان للميدان." } },
          ...st.changelog,
        ].slice(0, 50),
      }));
      get().log("Froze questionnaire for field", "تجميد الاستبيان للميدان");
      return { ok: true as const };
    },
    cloneCycle: () =>
      change((s) => ({
        instrumentStatus: "draft",
        frozenAt: undefined,
        changelog: [
          { id: `c-${Date.now()}`, at: nowIso(), summary: { en: "Questionnaire unlocked for editing.", ar: "فتح الاستبيان للتعديل." } },
          ...s.changelog,
        ].slice(0, 50),
      })),
    log: (en, ar) => {
      if (get().source !== "admin") return;
      void logAudit({ data: { en, ar } }).catch(() => undefined);
    },
    flush: async () => {
      if (timer) {
        clearTimeout(timer);
        timer = undefined;
        inFlight = (inFlight ?? Promise.resolve()).then(push);
      }
      await (inFlight ?? Promise.resolve());
    },
  };
});
