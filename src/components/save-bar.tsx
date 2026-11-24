import { useEffect, useRef, useState } from "react";
import { Check, Eye, Loader2, RotateCcw, Save, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/lib/settings-store";
import { openHomePreview, openSurveyPreview } from "@/lib/pulse/preview";
import { useApp, useT } from "@/lib/store";

/**
 * Settings are no longer saved as you type. Every change is kept as a draft: this bar appears, the
 * administrator can preview the staff-facing pages with the draft, then Save (it goes live, and is
 * recorded in Change history with Undo) or Discard (back to the last saved settings).
 */
export function SaveBar() {
  const { loc } = useT();
  const state = useSettings((s) => s.saveState);
  const pending = useSettings((s) => s.pending);
  const error = useSettings((s) => s.saveError);
  const [flash, setFlash] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const prev = useRef(state);

  useEffect(() => {
    if (prev.current === "saving" && state === "saved") {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 2500);
      prev.current = state;
      return () => clearTimeout(t);
    }
    prev.current = state;
  }, [state]);

  // Leaving the page with unsaved changes: the browser asks first.
  useEffect(() => {
    if (!pending) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [pending]);

  useEffect(() => {
    if (!pending) setConfirmDiscard(false);
  }, [pending]);

  async function save() {
    await useSettings.getState().commit();
    if (useSettings.getState().saveState === "error") toast.error(loc({ en: "Could not save. Try again.", ar: "تعذّر الحفظ. أعد المحاولة." }));
  }

  if (!pending && state !== "saving" && state !== "error" && !flash) return null;

  if (!pending && flash) {
    return (
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 print:hidden">
        <div role="status" aria-live="polite" className="flex items-center gap-2 rounded-full bg-score-high px-4 py-2 text-sm font-medium text-paper shadow-lg">
          <Check className="size-4" aria-hidden />
          {loc({ en: "Saved. Staff now see these changes.", ar: "تم الحفظ. يرى الموظفون هذه التغييرات الآن." })}
        </div>
      </div>
    );
  }

  return (
    <>
    {/* Room at the end of the page, so the bar never covers the last field. */}
    <div aria-hidden className="h-28 shrink-0 print:hidden" />
    <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 print:hidden md:start-56 lg:start-60" data-save-bar>
      <div
        role="region"
        aria-label={loc({ en: "Unsaved changes", ar: "تغييرات غير محفوظة" })}
        className={`mx-auto flex max-w-4xl flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl px-4 py-3 shadow-lg ${
          state === "error" ? "bg-score-crit text-paper" : "bg-ink text-sand"
        }`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 text-sm" role="status" aria-live="polite">
          {state === "saving" ? (
            <>
              <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
              <span>{loc({ en: "Saving…", ar: "جارٍ الحفظ…" })}</span>
            </>
          ) : state === "error" ? (
            <>
              <TriangleAlert className="size-4 shrink-0" aria-hidden />
              <span>
                {loc({ en: "Not saved", ar: "لم يُحفظ" })}
                {error ? `: ${error}` : ""}
              </span>
            </>
          ) : confirmDiscard ? (
            <span className="font-medium">{loc({ en: "Discard all unsaved changes?", ar: "تجاهل كل التغييرات غير المحفوظة؟" })}</span>
          ) : (
            <span className="min-w-0">
              <span className="font-semibold">{loc({ en: "Unsaved changes", ar: "تغييرات غير محفوظة" })}</span>
              <span className="hidden text-sand/75 sm:inline">
                {" · "}
                {loc({ en: "Staff see nothing until you save. Preview them first.", ar: "لا يرى الموظفون شيئاً قبل الحفظ. عاينها أولاً." })}
              </span>
            </span>
          )}
        </div>

        {confirmDiscard ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="ghost" className="h-9 rounded-full px-3 text-current hover:bg-white/15" onClick={() => setConfirmDiscard(false)}>
              {loc({ en: "Keep editing", ar: "متابعة التعديل" })}
            </Button>
            <Button
              size="sm"
              className="h-9 rounded-full bg-score-crit px-4 text-paper hover:bg-score-crit/90"
              onClick={() => {
                useSettings.getState().discard();
                toast(loc({ en: "Changes discarded", ar: "تم تجاهل التغييرات" }));
              }}
            >
              {loc({ en: "Discard", ar: "تجاهل" })}
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-9 rounded-full px-3 text-current hover:bg-white/15"
              disabled={state === "saving"}
              onClick={() => void openSurveyPreview()}
            >
              <Eye className="size-4" aria-hidden />
              {loc({ en: "Preview survey", ar: "معاينة الاستبيان" })}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-9 rounded-full px-3 text-current hover:bg-white/15"
              disabled={state === "saving"}
              onClick={() => void openHomePreview()}
            >
              <Eye className="size-4" aria-hidden />
              {loc({ en: "Preview home page", ar: "معاينة الصفحة الرئيسية" })}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-9 rounded-full px-3 text-current hover:bg-white/15"
              disabled={state === "saving"}
              onClick={() => setConfirmDiscard(true)}
            >
              <RotateCcw className="size-4" aria-hidden />
              {loc({ en: "Discard", ar: "تجاهل" })}
            </Button>
            <Button size="sm" className="h-9 rounded-full px-4" disabled={state === "saving"} onClick={() => void save()}>
              <Save className="size-4" aria-hidden />
              {state === "error" ? loc({ en: "Try again", ar: "أعد المحاولة" }) : loc({ en: "Save", ar: "حفظ" })}
            </Button>
          </div>
        )}
      </div>
    </div>
    </>
  );
}

/**
 * Actions that use the stored settings (sending email, invitations, reminders, deleting data, importing
 * questions) must not run on a half-finished draft. Returns false, with a message, while one exists.
 */
export function requireSaved(): boolean {
  if (!useSettings.getState().pending) return true;
  const lang = useApp.getState().lang;
  toast.error(
    lang === "ar"
      ? "لديك تغييرات غير محفوظة. احفظها أو تجاهلها أولاً، ثم أعد المحاولة."
      : "You have unsaved changes. Save or discard them first, then try again.",
  );
  return false;
}
