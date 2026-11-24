import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageFrame } from "@/components/page-frame";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { listAudit, undoAuditChange } from "@/lib/pulse/api";
import type { AuditRow } from "@/lib/pulse/results-types";
import { useSettings } from "@/lib/settings-store";
import { useT } from "@/lib/store";

export const Route = createFileRoute("/settings/history")({ component: HistoryPage });

/** Everything administrators did, newest first: settings edits, uploads, sends, exports, access. */
function HistoryPage() {
  const { t, loc, lang } = useT();
  const timezone = useSettings((s) => s.general.timezone) || "Asia/Muscat";
  const [rows, setRows] = useState<AuditRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const [busy, setBusy] = useState<number | null>(null);
  const load = () =>
    listAudit({ data: { limit: 500 } })
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load the history."));
  useEffect(() => {
    void load();
  }, []);
  async function undo(id: number) {
    if (!window.confirm(loc({ en: "Put the settings back as they were before this change?", ar: "إرجاع الإعدادات كما كانت قبل هذا التعديل؟" }))) return;
    setBusy(id);
    try {
      await undoAuditChange({ data: { id } });
      toast.success(loc({ en: "Change undone. Reloading…", ar: "تم التراجع عن التعديل. جارٍ إعادة التحميل…" }));
      setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
      setBusy(null);
    }
  }

  const fmt = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(lang === "ar" ? "ar-OM-u-nu-latn" : "en-GB", {
        timeZone: timezone,
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return new Intl.DateTimeFormat(lang === "ar" ? "ar-OM-u-nu-latn" : "en-GB", { dateStyle: "medium", timeStyle: "short" });
    }
  }, [lang, timezone]);

  const shown = (rows ?? []).filter((r) => {
    if (!q.trim()) return true;
    const needle = q.trim().toLowerCase();
    return `${r.en} ${r.ar} ${r.actor}`.toLowerCase().includes(needle);
  });

  return (
    <PageFrame
      title={t("setHistory")}
      hint={loc({
        en: "Every change an administrator made: settings, questions, departments, uploads, invitations, exports. Times are in the survey's time zone. Settings changes can be reversed with Undo. Entries are never deleted, so the record stays trustworthy.",
        ar: "كل تغيير قام به المسؤولون: الإعدادات والأسئلة والإدارات والرفع والدعوات والتصدير. الأوقات بتوقيت الاستبيان. يمكن التراجع عن تعديلات الإعدادات بزر «تراجع». لا يُحذف السجل حفاظاً على المساءلة.",
      })}
    >
      <Card>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={loc({ en: "Search: a person, 'Questions', 'Uploaded'…", ar: "بحث: شخص، الأسئلة، رفع…" })}
          className="mb-4"
        />
        {error ? <p className="text-sm text-score-crit">{error}</p> : null}
        {rows === null && !error ? <p className="text-sm text-muted">{loc({ en: "Loading…", ar: "جارٍ التحميل…" })}</p> : null}
        <ul className="flex flex-col gap-2 text-sm">
          {shown.map((a) => (
            <li key={a.id} className="flex items-start justify-between gap-3 border-b border-border pb-2 last:border-0">
              <span className="flex flex-col gap-1">
                <span className="text-ink">{lang === "ar" ? a.ar : a.en}</span>
                <span className="text-xs text-subtle">
                  <span dir="ltr">{a.actor}</span> · {fmt.format(new Date(a.at))}
                </span>
              </span>
              {a.canUndo ? (
                <Button size="sm" variant="outline" disabled={busy === a.id} onClick={() => void undo(a.id)}>
                  {loc({ en: "Undo", ar: "تراجع" })}
                </Button>
              ) : null}
            </li>
          ))}
          {rows && !shown.length ? <li className="text-muted">—</li> : null}
        </ul>
        {rows && rows.length >= 500 ? (
          <p className="mt-3 text-xs text-subtle">{loc({ en: "Showing the latest 500 entries.", ar: "تُعرض آخر 500 عملية." })}</p>
        ) : null}
      </Card>
    </PageFrame>
  );
}
