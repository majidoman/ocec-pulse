import type { ThemeId } from "./config";
import { publishDraftPreview, useSettings } from "../settings-store";

/**
 * Opens a staff-facing page in a new tab as a preview. When there are unsaved changes, the preview
 * shows them (from this browser only) and nothing is saved; otherwise it shows the saved settings.
 */
async function openPreview(path: "/" | "/survey", opts: { theme?: ThemeId; mode?: "section" | "single" } = {}) {
  // Open the tab first (inside the click) so pop-up blockers allow it, then point it at the preview.
  const w = window.open("about:blank", "_blank");
  const pending = useSettings.getState().pending;
  if (pending) publishDraftPreview();
  const q = new URLSearchParams();
  if (path === "/survey") {
    // Preview the survey staff are working on, which may not be the one the plain link opens.
    const { useSurveys } = await import("./surveys-store");
    await useSurveys.getState().load();
    q.set("preview", "1");
    q.set("s", useSurveys.getState().current);
    if (opts.theme) q.set("theme", opts.theme);
    if (opts.mode) q.set("mode", opts.mode);
  }
  if (pending) q.set("draft", "1");
  const qs = q.toString();
  const url = qs ? `${path}?${qs}` : path;
  if (w) w.location.href = url;
  else window.location.href = url;
}

/** The employee survey as a preview (answers are never sent). */
export function openSurveyPreview(opts: { theme?: ThemeId; mode?: "section" | "single" } = {}) {
  return openPreview("/survey", opts);
}

/** The home page staff see first. */
export function openHomePreview() {
  return openPreview("/");
}
