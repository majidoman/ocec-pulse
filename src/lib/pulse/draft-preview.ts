import type { PulseConfig } from "./config";

/**
 * Hands the unsaved settings draft from the settings tab to a preview tab in the same browser.
 *
 * The copy stays in this browser only (localStorage, same origin), is replaced on every change, and
 * is removed as soon as the draft is saved or discarded. A preview tab opened with `?draft=1` shows
 * it instead of the saved settings; nobody else ever sees it, because it never leaves the browser.
 * Secrets are not part of the config document (the mailbox password and API keys are stored apart).
 */
const KEY = "pulse_settings_draft";
/** A draft older than this is ignored (a tab left open overnight should not haunt a later preview). */
const MAX_AGE_MS = 12 * 60 * 60 * 1000;

export function writeDraftPreview(config: PulseConfig) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), config }));
  } catch {
    // Storage blocked or full: the preview then shows the saved settings, which is safe.
  }
}

export function clearDraftPreview() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}

export function readDraftPreview(): PulseConfig | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at?: number; config?: PulseConfig };
    if (!parsed?.config || typeof parsed.at !== "number" || Date.now() - parsed.at > MAX_AGE_MS) return null;
    const c = parsed.config;
    if (!c.general || !c.branding || !Array.isArray(c.dimensions) || !Array.isArray(c.questions)) return null;
    return c;
  } catch {
    return null;
  }
}

/** True when this page was opened as a preview of unsaved settings. */
export function wantsDraftPreview(): boolean {
  if (typeof window === "undefined") return false;
  return isOn(new URLSearchParams(window.location.search).get("draft"));
}

/** The router writes flags as `1`, `true` or `"1"` depending on how the link was made. */
export function isOn(v: string | null): boolean {
  return v === "1" || v === "true" || v === '"1"' || v === '"true"';
}
