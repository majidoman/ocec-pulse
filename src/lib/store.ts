import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ContractId, DepartmentId, Lang, LevelId, Localized, SurveyDraft, TenureId } from "./types";
import type { CopyKey } from "./i18n";
import { tx } from "./i18n";
import { brandNames, brandText } from "./pulse/config";
import { useSettings } from "./settings-store";

const emptyDraft = (): SurveyDraft => ({
  answers: {},
  step: 0,
  startedAt: new Date().toISOString(),
});

/**
 * Per-device state only: the chosen language and the survey draft, which stays
 * on the device until the person presses Submit. Nothing here is a record of
 * the census — responses live on the server.
 */
interface AppState {
  lang: Lang;
  langChosen: boolean;
  setLang: (lang: Lang) => void;
  draft: SurveyDraft;
  setAnswer: (id: string, value: number | string) => void;
  setDemo: (field: "department" | "tenure" | "level" | "contract", value: string | undefined) => void;
  setStep: (step: number) => void;
  resetDraft: () => void;
  /** Soft guard against answering twice from the shared link on this device. */
  submittedOpenLink: boolean;
  markSubmitted: (viaToken: boolean) => void;
}

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      lang: "en",
      langChosen: false,
      setLang: (lang) => set({ lang, langChosen: true }),
      draft: emptyDraft(),
      setAnswer: (id, value) =>
        set((s) => ({ draft: { ...s.draft, answers: { ...s.draft.answers, [id]: value } } })),
      setDemo: (field, value) =>
        set((s) => ({
          draft: {
            ...s.draft,
            department: field === "department" ? (value as DepartmentId | undefined) : s.draft.department,
            tenure: field === "tenure" ? (value as TenureId | undefined) : s.draft.tenure,
            level: field === "level" ? (value as LevelId | undefined) : s.draft.level,
            contract: field === "contract" ? (value as ContractId | undefined) : s.draft.contract,
          },
        })),
      setStep: (step) => set((s) => ({ draft: { ...s.draft, step } })),
      resetDraft: () => set({ draft: emptyDraft() }),
      submittedOpenLink: false,
      markSubmitted: (viaToken) =>
        set((s) => ({ draft: emptyDraft(), submittedOpenLink: viaToken ? s.submittedOpenLink : true })),
    }),
    { name: "ocec-pulse", version: 2, skipHydration: true, migrate: () => ({}) as AppState },
  ),
);

/** Client name, short name and product name from settings (see brandNames). */
export function useBrand() {
  const general = useSettings((s) => s.general);
  const branding = useSettings((s) => s.branding);
  return brandNames(general, branding);
}

export function useT() {
  const lang = useApp((s) => s.lang);
  const names = useBrand();
  return {
    lang,
    t: (key: CopyKey) => brandText(tx(lang, key), names, lang),
    loc: (value: Localized) => brandText(value[lang], names, lang),
  };
}
