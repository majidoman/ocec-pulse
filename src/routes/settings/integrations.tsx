import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageFrame } from "@/components/page-frame";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { deleteApi, exportData, listApis, saveApi } from "@/lib/pulse/api";
import type { ApiView } from "@/lib/pulse/api-types";
import { downloadText } from "@/lib/pulse/format";
import { useT } from "@/lib/store";

export const Route = createFileRoute("/settings/integrations")({ component: IntPage });

function IntPage() {
  const { t, loc } = useT();

  async function download(kind: "departments" | "items" | "comments") {
    try {
      const res = await exportData({ data: { kind } });
      downloadText(res.filename, res.csv);
      toast.success(t("excelExport"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    }
  }

  return (
    <PageFrame
      title={loc({ en: "Integrations", ar: "التكاملات" })}
      hint={loc({ en: "Connect APIs and take anonymised results into Excel or Power BI.", ar: "اربط واجهات برمجية، وانقل النتائج المجهولة إلى إكسل أو Power BI." })}
    >
      <ApisCard />
      <Card>
        <h2 className="mb-2 text-sm font-semibold">{t("excelExport")}</h2>
        <p className="mb-3 text-sm leading-relaxed text-muted">
          {loc({
            en: "CSV files that open in Excel and load into Power BI. They contain totals only, with the same hidden groups as the screens. Individual answers are never exported.",
            ar: "ملفات CSV تُفتح في إكسل وتُحمَّل في Power BI. تحتوي مجاميع فقط، بالمجموعات المحجوبة نفسها في الشاشات. لا تُصدَّر الإجابات الفردية أبداً.",
          })}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void download("departments")}>{loc({ en: "Departments × dimensions", ar: "الإدارات × الأبعاد" })}</Button>
          <Button variant="outline" onClick={() => void download("items")}>{loc({ en: "Every question", ar: "كل سؤال" })}</Button>
          <Button variant="outline" onClick={() => void download("comments")}>{t("themesTitle")}</Button>
        </div>
      </Card>
      <Card>
        <h2 className="mb-2 text-sm font-semibold">{loc({ en: "Email", ar: "البريد" })}</h2>
        <p className="text-sm leading-relaxed text-muted">
          {loc({
            en: "Microsoft 365, Hostinger or any other mailbox connects through SMTP.",
            ar: "يتصل Microsoft 365 أو Hostinger أو أي صندوق بريد عبر SMTP.",
          })}{" "}
          <Link to="/settings/email" className="font-medium text-accent">
            {t("setEmail")}
          </Link>
        </p>
      </Card>
      <Card>
        <h2 className="mb-2 text-sm font-semibold">{loc({ en: "Not connected", ar: "غير موصول" })}</h2>
        <p className="text-sm leading-relaxed text-muted">
          {loc({
            en: "There is no automatic sync with an HR system: the invitation list is uploaded as a file. A live Power BI connection is not provided: use the downloads above.",
            ar: "لا مزامنة تلقائية مع نظام الموارد البشرية: تُرفع قائمة الدعوات كملف. لا اتصال مباشر مع Power BI: استخدم التنزيلات أعلاه.",
          })}
        </p>
      </Card>
    </PageFrame>
  );
}

interface Draft {
  id?: string;
  preset: boolean;
  hasKey: boolean;
  name: string;
  baseUrl: string;
  note: string;
  enabled: boolean;
  key: string;
  clearKey: boolean;
}

/** Settings → Integrations: any API the app uses, with its key encrypted and never shown again. */
function ApisCard() {
  const { loc } = useT();
  const [apis, setApis] = useState<ApiView[] | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await listApis({ data: {} });
      setApis(res.apis);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load the APIs");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function edit(a: ApiView) {
    setDraft({ id: a.id, preset: a.preset, hasKey: a.hasKey, name: a.name, baseUrl: a.baseUrl, note: a.note, enabled: a.enabled, key: "", clearKey: false });
  }

  function add() {
    setDraft({ preset: false, hasKey: false, name: "", baseUrl: "https://", note: "", enabled: true, key: "", clearKey: false });
  }

  async function save() {
    if (!draft) return;
    setBusy(true);
    try {
      await saveApi({
        data: { id: draft.id, name: draft.name, baseUrl: draft.baseUrl, note: draft.note, enabled: draft.enabled, key: draft.key || undefined, clearKey: draft.clearKey },
      });
      toast.success(loc({ en: "API saved", ar: "حُفظت الواجهة" }));
      setDraft(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!draft?.id) return;
    const name = draft.name;
    if (!window.confirm(loc({ en: `Remove "${name}" and its saved key?`, ar: `حذف "${name}" ومفتاحه المحفوظ؟` }))) return;
    setBusy(true);
    try {
      await deleteApi({ data: { id: draft.id } });
      toast.success(loc({ en: "API removed", ar: "حُذفت الواجهة" }));
      setDraft(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove");
    } finally {
      setBusy(false);
    }
  }

  function status(a: ApiView): string {
    if (!a.enabled) return loc({ en: "Off", ar: "متوقفة" });
    if (a.hasKey) return loc({ en: `Key saved (ends …${a.keyHint ?? ""})`, ar: `المفتاح محفوظ (ينتهي بـ …${a.keyHint ?? ""})` });
    if (a.envFallback) return loc({ en: "Using the server's key", ar: "تستخدم مفتاح الخادم" });
    return loc({ en: "No key set", ar: "لا يوجد مفتاح" });
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{loc({ en: "APIs", ar: "الواجهات البرمجية" })}</h2>
        <Button size="sm" variant="outline" onClick={add} disabled={busy}>
          {loc({ en: "Add API", ar: "إضافة واجهة" })}
        </Button>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        {loc({
          en: "Keys are encrypted and never shown again. Only super admins can see or change them, and every change is recorded in Change history.",
          ar: "تُشفَّر المفاتيح ولا تُعرض مرة أخرى. لا يراها أو يغيّرها إلا المشرف العام، وكل تغيير يُسجَّل في سجل التغييرات.",
        })}
      </p>

      {apis === null ? (
        <p className="mt-4 text-sm text-muted">{loc({ en: "Loading…", ar: "جارٍ التحميل…" })}</p>
      ) : (
        <ul className="mt-4 flex flex-col divide-y divide-border">
          {apis.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{a.name}</p>
                <p className="truncate text-xs text-muted" dir="ltr">
                  {a.baseUrl}
                </p>
                {a.note ? <p className="text-xs text-muted">{a.note}</p> : null}
                <p className="text-xs text-muted">{status(a)}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => edit(a)} disabled={busy || draft !== null}>
                {loc({ en: "Edit", ar: "تعديل" })}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {draft ? (
        <div className="mt-4 grid gap-3 border-t border-border pt-4">
          <label className="grid gap-1 text-sm">
            <span className="text-ink">{loc({ en: "Name", ar: "الاسم" })}</span>
            <Input value={draft.name} maxLength={80} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-ink">{loc({ en: "Address (https://)", ar: "العنوان (https://)" })}</span>
            <Input dir="ltr" value={draft.baseUrl} maxLength={300} onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })} />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-ink">{loc({ en: "What it is used for", ar: "وظيفتها" })}</span>
            <Input value={draft.note} maxLength={200} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-ink">{loc({ en: "Key", ar: "المفتاح" })}</span>
            <Input
              type="password"
              autoComplete="off"
              dir="ltr"
              maxLength={500}
              value={draft.key}
              disabled={draft.clearKey}
              placeholder={draft.hasKey ? loc({ en: "Leave empty to keep the saved key", ar: "اتركه فارغاً للإبقاء على المفتاح المحفوظ" }) : loc({ en: "Paste the key", ar: "الصق المفتاح" })}
              onChange={(e) => setDraft({ ...draft, key: e.target.value })}
            />
          </label>
          {draft.hasKey ? (
            <div>
              <Button size="sm" variant="outline" aria-pressed={draft.clearKey} onClick={() => setDraft({ ...draft, clearKey: !draft.clearKey, key: "" })}>
                {draft.clearKey
                  ? loc({ en: "Keep the saved key", ar: "الإبقاء على المفتاح المحفوظ" })
                  : loc({ en: "Remove the saved key", ar: "حذف المفتاح المحفوظ" })}
              </Button>
            </div>
          ) : null}
          <label className="flex items-center gap-2 text-sm text-ink">
            <Switch checked={draft.enabled} onCheckedChange={(v) => setDraft({ ...draft, enabled: v })} />
            {loc({ en: "Enabled", ar: "مفعّلة" })}
          </label>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void save()} disabled={busy}>
              {loc({ en: "Save", ar: "حفظ" })}
            </Button>
            <Button variant="outline" onClick={() => setDraft(null)} disabled={busy}>
              {loc({ en: "Cancel", ar: "إلغاء" })}
            </Button>
            {draft.id && !draft.preset ? (
              <Button variant="ghost" onClick={() => void remove()} disabled={busy}>
                {loc({ en: "Remove API", ar: "حذف الواجهة" })}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </Card>
  );
}
