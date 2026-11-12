import { useApp, useT } from "@/lib/store";
import { cn } from "@/lib/utils";

export function LangToggle({ className }: { className?: string }) {
  const { lang, t } = useT();
  const setLang = useApp((s) => s.setLang);
  const other = lang === "en" ? "ar" : "en";
  return (
    <button
      type="button"
      onClick={() => setLang(other)}
      className={cn(
        "inline-flex h-11 min-h-11 items-center rounded-full border border-border bg-paper px-3.5 text-sm font-medium text-ink hover:bg-sand-2",
        className,
      )}
      aria-label={t("langOther")}
    >
      {t("langOther")}
    </button>
  );
}
