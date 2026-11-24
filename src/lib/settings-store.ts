import { create } from "zustand";
import type { ActionPlan, Department, Dimension, Localized, Question } from "./types";
import {
  defaultConfig,
  type AnonymitySettings,
  type BenchmarkSettings,
  type BrandingSettings,
  type PresentationSettings,
  type CalendarSettings,
  type EmailSettings,
  type GeneralSettings,
  type IntegrationSettings,
  type PublicConfig,
  type PulseConfig,
  type ReminderSettings,
} from "./pulse/config";
import { logAudit, saveAdminConfig } from "./pulse/api";
import { clearDraftPreview, writeDraftPreview } from "./pulse/draft-preview";

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
 * - `source: "admin"` — the full document. Changes are kept as an unsaved draft (`pending`) until an
 *   administrator presses Save; they can be previewed on the staff-facing pages first, or discarded.
 *   Nothing reaches staff before Save. The draft lives in this tab only, plus a copy in this browser's
 *   storage that the preview tab reads (see `draft-preview.ts`).
 */
export interface SettingsState extends PulseConfig {
  source: "none" | "public" | "admin";
  saveState: "idle" | "unsaved" | "saving" | "saved" | "error";
  saveError: string | null;
  /** True while there are changes that have not been saved to the server. */
  pending: boolean;
  /** Set when this page shows another administrator's unsaved draft (preview tab). */
  draftPreview: boolean;
  hydratePublic: (c: PublicConfig) => void;
  hydrateAdmin: (c: PulseConfig) => void;
  /** Preview tab: show the draft written by the settings tab instead of the saved settings. */
  applyDraftPreview: (c: PulseConfig) => void;
  /** Save the draft now. */
  commit: () => Promise<void>;
  /** Throw the draft away and go back to the last saved settings. */
  discard: () => void;
  patchGeneral: (p: Partial<GeneralSettings>) => void;
  patchBranding: (p: Partial<BrandingSettings>) => void;
  patchPresentation: (p: Partial<PresentationSettings>) => void;
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
  /** Save the draft now (same as `commit`; kept for the setup wizard and older callers). */
  flush: () => Promise<void>;
}

const CONFIG_KEYS: (keyof PulseConfig)[] = [
  "version",
  "general",
  "branding",
  "presentation",
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

/** The settings as last saved on the server; Discard goes back to these. */
let baseline: PulseConfig | null = null;
let inFlight: Promise<void> | null = null;
/** A change arrived while a save was on its way, so the draft is still not fully saved. */
let changedDuringSave = false;

async function push() {
  const state = useSettings.getState();
  if (state.source !== "admin" || !state.pending) return;
  changedDuringSave = false;
  const sent = snapshot(state);
  useSettings.setState({ saveState: "saving", saveError: null });
  try {
    const res = await saveAdminConfig({ data: { config: sent as unknown as Record<string, unknown> } });
    baseline = { ...sent, general: { ...sent.general, closedAt: res.closedAt ?? undefined } };
    const still = changedDuringSave;
    useSettings.setState((s) => ({
      pending: still,
      saveState: still ? "unsaved" : "saved",
      general: { ...s.general, closedAt: res.closedAt ?? undefined },
    }));
    if (still) writeDraftPreview(snapshot(useSettings.getState()));
    else clearDraftPreview();
  } catch (err) {
    useSettings.setState({
      saveState: "error",
      saveError: err instanceof Error ? err.message : "Could not save",
    });
  }
}

let draftTimer: ReturnType<typeof setTimeout> | undefined;
function markPending() {
  const st = useSettings.getState();
  if (st.source !== "admin") return;
  if (st.saveState === "saving") changedDuringSave = true;
  useSettings.setState({ pending: true, saveState: st.saveState === "saving" ? "saving" : "unsaved", saveError: null });
  // Keep the copy the preview tab reads up to date (cheap, but not on every keystroke).
  if (draftTimer) clearTimeout(draftTimer);
  draftTimer = setTimeout(() => {
    draftTimer = undefined;
    const now = useSettings.getState();
    if (now.pending) writeDraftPreview(snapshot(now));
  }, 250);
}

/** The latest draft, written straight away (used just before opening a preview). */
export function publishDraftPreview() {
  const st = useSettings.getState();
  if (st.source === "admin") writeDraftPreview(snapshot(st));
}

export const useSettings = create<SettingsState>()((set, get) => {
  /** Apply a change to the draft. It is saved when an administrator presses Save. */
  const change = (fn: (s: SettingsState) => Partial<SettingsState>) => {
    set(fn);
    markPending();
  };
  return {
    ...defaultConfig(),
    source: "none",
    saveState: "idle",
    saveError: null,
    pending: false,
    draftPreview: false,
    hydratePublic: (c) => {
      if (get().source === "admin") return;
      set((s) => ({
        source: "public",
        general: { ...s.general, ...c.general },
        branding: c.branding,
        presentation: { ...s.presentation, ...(c.presentation ?? {}) },
        calendar: { ...s.calendar, ...c.calendar },
        anonymity: { ...s.anonymity, ...c.anonymity },
        departments: c.departments.map((d) => ({ ...d, headcount: 0 })),
        dimensions: c.dimensions,
        questions: c.questions,
      }));
    },
    hydrateAdmin: (c) => {
      baseline = c;
      set({ ...c, source: "admin", saveState: "idle", saveError: null, pending: false });
    },
    applyDraftPreview: (c) => {
      if (get().source === "admin") return;
      set((s) => ({
        draftPreview: true,
        general: { ...s.general, ...c.general },
        branding: { ...s.branding, ...c.branding },
        presentation: { ...s.presentation, ...(c.presentation ?? {}) },
        calendar: { ...s.calendar, ...c.calendar },
        anonymity: { ...s.anonymity, ...c.anonymity },
        departments: c.departments.map((d) => ({ ...d, headcount: 0 })),
        dimensions: c.dimensions,
        questions: c.questions,
      }));
    },
    commit: async () => {
      if (draftTimer) {
        clearTimeout(draftTimer);
        draftTimer = undefined;
      }
      inFlight = (inFlight ?? Promise.resolve()).then(push);
      await inFlight;
    },
    discard: () => {
      if (get().source !== "admin" || !baseline) return;
      if (draftTimer) {
        clearTimeout(draftTimer);
        draftTimer = undefined;
      }
      clearDraftPreview();
      set({ ...baseline, pending: false, saveState: "idle", saveError: null });
    },
    patchGeneral: (p) => change((s) => ({ general: { ...s.general, ...p } })),
    patchBranding: (p) => change((s) => ({ branding: { ...s.branding, ...p } })),
    patchPresentation: (p) => change((s) => ({ presentation: { ...s.presentation, ...p } })),
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
            ar: `${missing.length} بند بلا إنجليزية أو عربية. أُلغي القفل.`,
          },
        };
      }
      change((st) => ({
        instrumentStatus: "frozen",
        frozenAt: nowIso(),
        changelog: [
          { id: `c-${Date.now()}`, at: nowIso(), summary: { en: "Questions locked for the survey.", ar: "قُفلت أسئلة الاستبيان." } },
          ...st.changelog,
        ].slice(0, 50),
      }));
      get().log("Locked the survey questions", "قفل أسئلة الاستبيان");
      void get().commit();
      return { ok: true as const };
    },
    cloneCycle: () => {
      change((s) => ({
        instrumentStatus: "draft",
        frozenAt: undefined,
        changelog: [
          { id: `c-${Date.now()}`, at: nowIso(), summary: { en: "Questionnaire unlocked for editing.", ar: "فتح الاستبيان للتعديل." } },
          ...s.changelog,
        ].slice(0, 50),
      }));
      void get().commit();
    },
    log: (en, ar) => {
      if (get().source !== "admin") return;
      void logAudit({ data: { en, ar } }).catch(() => undefined);
    },
    flush: async () => {
      await get().commit();
    },
  };
});
