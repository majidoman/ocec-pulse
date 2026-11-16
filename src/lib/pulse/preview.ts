import type { ThemeId } from "./config";
import { useSettings } from "../settings-store";

/** Saves pending changes, then opens the employee survey as a preview in a new tab. */
export async function openSurveyPreview(opts: { theme?: ThemeId; mode?: "section" | "single" } = {}) {
  // Open the tab first (inside the click) so pop-up blockers allow it, then point it at the preview.
  const w = window.open("about:blank", "_blank");
  await useSettings.getState().flush();
  // Preview the survey staff are working on, which may not be the one the plain link opens.
  const { useSurveys } = await import("./surveys-store");
  await useSurveys.getState().load();
  const survey = useSurveys.getState().current;
  const q = new URLSearchParams({ preview: "1", s: survey, ...(opts.theme ? { theme: opts.theme } : {}), ...(opts.mode ? { mode: opts.mode } : {}) });
  const url = `/survey?${q.toString()}`;
  if (w) w.location.href = url;
  else window.location.href = url;
}
