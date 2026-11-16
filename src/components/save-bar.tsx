import { useEffect, useRef, useState } from "react";
import { Check, Loader2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/lib/settings-store";
import { useT } from "@/lib/store";

/**
 * Settings save automatically as you type. This bar makes that visible: it shows "Saving…" and then a
 * green "Saved" confirmation, and offers "Save now" for anyone who prefers to press a button.
 */
export function SaveBar() {
  const { loc } = useT();
  const state = useSettings((s) => s.saveState);
  const error = useSettings((s) => s.saveError);
  const [flash, setFlash] = useState(false);
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
  if (state === "idle" && !flash) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 print:hidden">
      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-auto flex items-center gap-3 rounded-full px-4 py-2 text-sm font-medium shadow-lg ${
          state === "error" ? "bg-score-crit text-paper" : flash ? "bg-score-high text-paper" : "bg-ink text-sand"
        }`}
      >
        {state === "saving" ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden /> {loc({ en: "Saving…", ar: "جارٍ الحفظ…" })}
          </>
        ) : state === "error" ? (
          <>
            <TriangleAlert className="size-4" aria-hidden /> {loc({ en: "Not saved", ar: "لم يُحفظ" })}
            {error ? `: ${error}` : ""}
          </>
        ) : (
          <>
            <Check className="size-4" aria-hidden /> {loc({ en: "All changes saved", ar: "تم حفظ كل التغييرات" })}
          </>
        )}
        {state !== "saving" ? (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 rounded-full px-3 text-current hover:bg-white/15"
            onClick={async () => {
              await useSettings.getState().flush();
              if (useSettings.getState().saveState === "error") toast.error(loc({ en: "Could not save. Try again.", ar: "تعذّر الحفظ. أعد المحاولة." }));
              else toast.success(loc({ en: "Saved", ar: "تم الحفظ" }));
            }}
          >
            {state === "error" ? loc({ en: "Try again", ar: "أعد المحاولة" }) : loc({ en: "Save now", ar: "احفظ الآن" })}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
