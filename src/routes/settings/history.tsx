import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageFrame } from "@/components/page-frame";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { listAudit } from "@/lib/pulse/api";
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

  useEffect(() => {
    listAudit({ data: { limit: 500 } })
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load the history."));
  }, []);

  const fmt = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(lang === "ar" ? "ar-OM" : "en-GB", {
        timeZone: timezone,
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return new Intl.DateTimeFormat(lang === "ar" ? "ar-OM" : "en-GB", { dateStyle: "medium", timeStyle: "short" });
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
        en: "Every change an administrator made: settings, questions, departments, uploads, invitations, exports. Times are in the survey's time zone.",
        ar: "كل تغيير قام به المسؤولون: الإعدادات والأسئلة والإدارات والرفع والدعوات والتصدير. الأوقات بتوقيت الاستبيان.",
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
            <li key={a.id} className="flex flex-col gap-1 border-b border-border pb-2 last:border-0">
              <span className="text-ink">{lang === "ar" ? a.ar : a.en}</span>
              <span className="text-xs text-subtle">
                <span dir="ltr">{a.actor}</span> · {fmt.format(new Date(a.at))}
              </span>
            </li>
          ))}
          {rows && !shown.length ? <li className="text-muted">—</li> : null}
        </ul>
        {rows && rows.length >= 500 ? (
          <p className="mt-3 text-xs text-subtle">{loc({ en: "Showing the latest 500 entries.", ar: "تُعرض آخر ٥٠٠ عملية." })}</p>
        ) : null}
      </Card>
    </PageFrame>
  );
}
