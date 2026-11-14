import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageFrame } from "@/components/page-frame";
import { Qr } from "@/components/qr";
import { RosterUpload } from "@/components/roster-upload";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCensus } from "@/lib/census";
import {
  getInvitationOverview,
  retryFailedInvitations,
  sendCampaignBatch,
  startCampaign,
  type InvitationOverview,
} from "@/lib/pulse/api";
import { canEditSettings } from "@/lib/pulse/config";
import { usePulse } from "@/lib/pulse/session";
import { useSettings } from "@/lib/settings-store";
import { useT } from "@/lib/store";

export const Route = createFileRoute("/insights/invitations")({ component: InvitationsPage });

function InvitationsPage() {
  const { t, loc } = useT();
  const { departments, currentRole, status, allowOpenLink } = useCensus();
  const timezone = useSettings((st) => st.general.timezone);
  const [data, setData] = useState<InvitationOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [audience, setAudience] = useState("all");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await getInvitationOverview());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!canEditSettings(currentRole)) {
    return (
      <PageFrame title={t("navInvite")}>
        <Card>
          <p className="text-sm text-muted">{loc({ en: "Only administrators manage invitations.", ar: "إدارة الدعوات للمديرين فقط." })}</p>
        </Card>
      </PageFrame>
    );
  }

  async function send() {
    setBusy(true);
    try {
      await useSettings.getState().flush();
      const camp = await startCampaign({ data: { name, audience } });
      setProgress({ done: 0, total: camp.recipients });
      let done = 0;
      let failed = 0;
      for (let i = 0; i < 400; i += 1) {
        const res = await sendCampaignBatch({ data: { id: camp.id } });
        done += res.sent + res.failed;
        failed += res.failed;
        setProgress({ done, total: camp.recipients });
        if (!res.remaining || (!res.sent && !res.failed)) break;
      }
      toast.success(
        loc({ en: `Sent ${done - failed}${failed ? ` · ${failed} failed` : ""}`, ar: `أُرسل ${done - failed}${failed ? ` · فشل ${failed}` : ""}` }),
      );
      setName("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sending failed");
    } finally {
      setProgress(null);
      setBusy(false);
      await load();
      void usePulse.getState().refreshResults();
    }
  }

  const s = data?.stats;
  const deptName = (id: string) => loc(departments.find((d) => d.id === id)?.name ?? { en: id, ar: id });

  return (
    <PageFrame title={t("navInvite")} hint={t("inviteHint")}>
      {error ? (
        <Card>
          <p className="text-sm text-score-crit">{error}</p>
        </Card>
      ) : null}

      <Card>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <Stat label={loc({ en: "On the list", ar: "في القائمة" })} value={s?.total} />
          <Stat label={t("invited")} value={s?.invited} />
          <Stat label={loc({ en: "Link opened", ar: "فُتح الرابط" })} value={s?.opened} />
          <Stat label={t("completed")} value={s?.completed} />
          <Stat label={loc({ en: "Failed to send", ar: "فشل الإرسال" })} value={s?.failed} />
        </dl>
        <p className="mt-4 text-xs text-subtle">
          {loc({
            en: "This list records who has used their link, never what they answered. Answers are stored separately with no connection to this list.",
            ar: "تسجّل هذه القائمة من استخدم رابطه، لا ما أجاب به. تُحفظ الإجابات منفصلة دون أي صلة بهذه القائمة.",
          })}
        </p>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <RosterUpload departments={departments} timezone={timezone} lastUpload={data?.lastUpload ?? null} onDone={load} />

        <Card>
          <h2 className="mb-1 text-sm font-semibold text-ink">{loc({ en: "2 · Send personal links", ar: "٢ · إرسال الروابط الشخصية" })}</h2>
          {data?.mail.problem ? (
            <div className="mb-3 rounded-xl bg-sand-2 px-4 py-3 text-sm text-ink">
              {data.mail.problem}{" "}
              <Link to="/settings/email" className="font-medium text-accent">
                {t("setEmail")}
              </Link>
            </div>
          ) : null}
          {status !== "open" ? (
            <div className="mb-3 rounded-xl bg-sand-2 px-4 py-3 text-sm text-ink">
              {loc({ en: "The census is not open. Open it in Settings → General before sending.", ar: "الاستبيان غير مفتوح. افتحه من الإعدادات ← عام قبل الإرسال." })}
            </div>
          ) : null}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="camp">{t("campaignName")}</Label>
              <Input id="camp" value={name} placeholder={loc({ en: "House launch", ar: "إطلاق البيت" })} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="aud">{t("pickDept")}</Label>
              <select id="aud" className="h-11 rounded-md border border-border bg-paper px-3 text-sm text-fg" value={audience} onChange={(e) => setAudience(e.target.value)}>
                <option value="all">{t("allDepts")}</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {loc(d.name)}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-muted">
              {loc({
                en: `Goes to people on the list who have not been invited yet (${s?.pending ?? 0} waiting). Each gets a link that works once. The wording is set in Settings → Invitations & email.`,
                ar: `تُرسل لمن في القائمة ولم يُدعَ بعد (${s?.pending ?? 0} بالانتظار). لكل شخص رابط يعمل مرة واحدة. الصياغة من الإعدادات ← الدعوات والبريد.`,
              })}
            </p>
            <Button disabled={busy || Boolean(data?.mail.problem) || status !== "open" || !s?.pending} onClick={() => void send()}>
              {progress ? `${progress.done} / ${progress.total}` : t("sendInvite")}
            </Button>
          </div>
        </Card>
      </div>

      <Card className="print:shadow-none">
        <div className="grid gap-6 md:grid-cols-[auto_1fr] md:items-center">
          {data?.surveyUrl ? <Qr value={data.surveyUrl} /> : <div className="size-[180px] rounded-lg bg-sand-2" />}
          <div>
            <h2 className="text-sm font-semibold text-ink">{loc({ en: "Shared link and QR code", ar: "الرابط المشترك ورمز QR" })}</h2>
            <p className="mt-1 break-all font-mono text-sm text-ink" dir="ltr">{data?.surveyUrl}</p>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
              {allowOpenLink
                ? loc({
                    en: "For colleagues without a work email (kitchen, security, night shift): print this on a poster. Anyone with the link can answer, and one device answers once. Reminders only reach people invited by email.",
                    ar: "للزملاء دون بريد عمل (المطبخ، الأمن، الوردية الليلية): اطبعه على ملصق. كل من لديه الرابط يستطيع الإجابة، والجهاز الواحد يجيب مرة واحدة. التذكيرات تصل فقط لمن دُعي بالبريد.",
                  })
                : loc({
                    en: "The shared link is switched off: only personal email links can answer. Switch it on in Settings → General if you need a poster.",
                    ar: "الرابط المشترك متوقف: الإجابة فقط عبر الروابط الشخصية. فعّله من الإعدادات ← عام إن احتجت ملصقاً.",
                  })}
            </p>
            <Button className="mt-3 print:hidden" variant="outline" onClick={() => window.print()}>
              {loc({ en: "Print poster", ar: "طباعة الملصق" })}
            </Button>
          </div>
        </div>
      </Card>

      {s?.byDepartment.length ? (
        <Card className="print:hidden">
          <h2 className="mb-3 text-sm font-semibold text-ink">{loc({ en: "Emailed list by department", ar: "قائمة البريد حسب الإدارة" })}</h2>
          <ul className="flex flex-col text-sm">
            {s.byDepartment.map((d) => (
              <li key={d.id} className="flex justify-between gap-3 border-b border-border py-2 last:border-0">
                <span>{deptName(d.id)}</span>
                <span className="tabular-nums text-muted">
                  {d.completed === null ? "—" : d.completed} / {d.total}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {data?.failures.length ? (
        <Card className="print:hidden">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-ink">{loc({ en: "Could not be delivered", ar: "تعذّر التسليم" })}</h2>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                const res = await retryFailedInvitations();
                toast.success(loc({ en: `${res.reset} moved back to waiting`, ar: `أُعيد ${res.reset} إلى الانتظار` }));
                await load();
              }}
            >
              {loc({ en: "Put back in the queue", ar: "إعادة إلى قائمة الانتظار" })}
            </Button>
          </div>
          <ul className="flex flex-col gap-1 text-sm text-muted">
            {data.failures.map((f) => (
              <li key={f.email} dir="ltr">
                {f.email} — {f.error}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {data?.campaigns.length ? (
        <div className="grid gap-3 print:hidden">
          {data.campaigns.map((c) => (
            <Card key={c.id}>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-display text-xl text-ink">{c.name}</h3>
                  <p className="text-sm text-muted">
                    {c.audience === "all" ? t("allDepts") : deptName(c.audience)} · {new Date(c.createdAt).toLocaleString()}
                  </p>
                </div>
                <p className="text-sm tabular-nums text-ink">
                  {c.sent} / {c.recipients}
                  {c.failed ? ` · ${c.failed} ${loc({ en: "failed", ar: "فشل" })}` : ""}
                </p>
              </div>
            </Card>
          ))}
        </div>
      ) : null}
    </PageFrame>
  );
}

function Stat({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div>
      <dt className="text-xs text-subtle">{label}</dt>
      <dd className="mt-0.5 font-display text-2xl tabular-nums text-ink">{value ?? "—"}</dd>
    </div>
  );
}
