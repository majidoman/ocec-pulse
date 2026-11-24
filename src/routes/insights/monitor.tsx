import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageFrame } from "@/components/page-frame";
import { Card } from "@/components/ui/card";
import { useCensus } from "@/lib/census";
import { getMonitor, type MonitorData } from "@/lib/pulse/api";
import { canEditSettings } from "@/lib/pulse/config";
import { useT } from "@/lib/store";

export const Route = createFileRoute("/insights/monitor")({ component: MonitorPage });

const AXIS = { fill: "var(--color-muted)", fontSize: 11 };
const TIP = { background: "var(--color-paper)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 };

/** Every calendar day from the first answer (or open date) to today or the close date, gaps as 0. */
function fillDays(daily: { day: string; n: number }[], open: string, close: string): { day: string; n: number }[] {
  if (!daily.length) return [];
  const byDay = new Map(daily.map((d) => [d.day, d.n]));
  const start = open && open < daily[0].day ? open : daily[0].day;
  const today = new Date().toISOString().slice(0, 10);
  const end = close && close < today ? close : today;
  const out: { day: string; n: number }[] = [];
  for (let d = new Date(`${start}T00:00:00Z`); d.toISOString().slice(0, 10) <= end && out.length < 400; d.setUTCDate(d.getUTCDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    out.push({ day: key, n: byDay.get(key) ?? 0 });
  }
  return out;
}

function MonitorPage() {
  const { t, loc } = useT();
  const { currentRole, dimensions } = useCensus();
  const admin = canEditSettings(currentRole);
  const [data, setData] = useState<MonitorData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!admin) return;
    getMonitor()
      .then(setData)
      .catch(() => setFailed(true));
  }, [admin]);

  const title = loc({ en: "Response monitor", ar: "متابعة الاستجابة" });
  if (!admin) {
    return (
      <PageFrame title={title}>
        <Card>
          <p className="text-sm text-muted">{loc({ en: "Only administrators see the response monitor.", ar: "متابعة الاستجابة للمديرين فقط." })}</p>
        </Card>
      </PageFrame>
    );
  }

  const days = data ? fillDays(data.daily, data.fieldOpen, data.fieldClose) : [];
  // c-chart: daily counts behave like a Poisson count, so the limits are mean ± 3·√mean.
  const mean = days.length ? days.reduce((a, d) => a + d.n, 0) / days.length : 0;
  const ucl = mean + 3 * Math.sqrt(mean);
  const lcl = Math.max(0, mean - 3 * Math.sqrt(mean));
  // Signals: a day outside the limits, or the last three days all below the average (a slowing survey).
  const outside = days.filter((d) => d.n > ucl || (lcl > 0 && d.n < lcl));
  const lastThree = days.slice(-3);
  const slowing = lastThree.length === 3 && lastThree.every((d) => d.n < mean);

  const stepName = (id: string) =>
    id === "open"
      ? loc({ en: "Comments", ar: "التعليقات" })
      : id === "demo"
        ? loc({ en: "About you", ar: "عنك" })
        : loc(dimensions.find((d) => d.id === id)?.short ?? { en: id, ar: id });
  const started = data?.steps[0]?.n ?? 0;
  const funnel = data
    ? [
        ...data.steps.map((s) => ({ name: stepName(s.step), n: s.n })),
        { name: loc({ en: "Submitted", ar: "أُرسلت" }), n: data.submitted },
      ]
    : [];
  const biggestDrop = funnel.reduce<{ name: string; lost: number } | null>((best, f, i) => {
    if (!i) return best;
    const lost = funnel[i - 1].n - f.n;
    return lost > (best?.lost ?? 0) ? { name: f.name, lost } : best;
  }, null);

  const schedulerStale = Boolean(
    data?.schedulerLastRun && !data.schedulerLastRun.startsWith("1970") && Date.now() - new Date(data.schedulerLastRun).getTime() > 3 * 3_600_000,
  );
  const rate = data && data.headcount ? Math.round((data.submitted / data.headcount) * 100) : null;
  const sendFailRate = data && data.email.invited ? Math.round((data.email.failed / data.email.invited) * 100) : 0;

  return (
    <PageFrame
      title={title}
      hint={loc({
        en: "Spot a slowing survey early: daily answers against their normal range, where people stop, and whether emails arrive.",
        ar: "اكتشف تباطؤ الاستبيان مبكراً: الإجابات اليومية مقابل مداها الطبيعي، وأين يتوقف الناس، وهل تصل الرسائل.",
      })}
    >
      {failed ? (
        <Card>
          <p className="text-sm text-score-crit">{loc({ en: "Could not load the monitor. Reload the page.", ar: "تعذّر تحميل المتابعة. أعد تحميل الصفحة." })}</p>
        </Card>
      ) : !data ? (
        <div className="h-40 animate-pulse rounded-2xl bg-sand-2" aria-busy="true" />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label={loc({ en: "Answered", ar: "أجابوا" })} value={`${data.submitted}${data.headcount ? ` / ${data.headcount}` : ""}`} sub={rate !== null ? `${rate}%` : undefined} />
            <Stat label={loc({ en: "Invited by email", ar: "دُعوا بالبريد" })} value={String(data.email.invited)} sub={data.email.pending ? loc({ en: `${data.email.pending} not sent yet`, ar: `${data.email.pending} لم تُرسل بعد` }) : undefined} />
            <Stat label={loc({ en: "Opened their link", ar: "فتحوا الرابط" })} value={String(data.email.opened)} sub={data.email.invited ? `${Math.round((data.email.opened / data.email.invited) * 100)}%` : undefined} />
            <Stat
              label={loc({ en: "Emails that failed", ar: "رسائل فشلت" })}
              value={String(data.email.failed)}
              sub={data.email.invited ? `${sendFailRate}%` : undefined}
              warn={sendFailRate >= 2}
            />
          </div>

          <Card>
            <h2 className="text-sm font-semibold text-ink">{loc({ en: "Answers per day", ar: "الإجابات يومياً" })}</h2>
            {data.daily.length ? (
              <>
                <p className="mt-1 text-xs text-subtle">
                  {loc({
                    en: `Average ${mean.toFixed(1)} a day. The dashed lines are the normal range (control limits ${lcl.toFixed(1)}–${ucl.toFixed(1)}).`,
                    ar: `المتوسط ${mean.toFixed(1)} يومياً. الخطان المتقطعان هما المدى الطبيعي (حدود التحكم ${lcl.toFixed(1)}–${ucl.toFixed(1)}).`,
                  })}
                </p>
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={days} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                      <CartesianGrid stroke="var(--color-border)" vertical={false} />
                      <XAxis dataKey="day" tick={AXIS} axisLine={false} tickLine={false} tickFormatter={(d: string) => d.slice(5)} />
                      <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={TIP} />
                      <ReferenceLine y={mean} stroke="var(--color-muted)" />
                      <ReferenceLine y={ucl} stroke="var(--color-muted)" strokeDasharray="4 4" />
                      {lcl > 0 ? <ReferenceLine y={lcl} stroke="var(--color-muted)" strokeDasharray="4 4" /> : null}
                      <Line type="monotone" dataKey="n" name={loc({ en: "Answers", ar: "الإجابات" })} stroke="var(--color-accent)" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {slowing || outside.length ? (
                  <ul className="mt-3 flex flex-col gap-1 text-sm text-score-crit">
                    {slowing ? (
                      <li>
                        {loc({
                          en: "The last three days were all below average. Consider a reminder or a word from managers.",
                          ar: "الأيام الثلاثة الأخيرة كلها دون المتوسط. فكّر في تذكير أو كلمة من المديرين.",
                        })}
                      </li>
                    ) : null}
                    {outside.map((d) => (
                      <li key={d.day}>
                        {loc({
                          en: `${d.day}: ${d.n} answers, outside the normal range. Check what happened that day (a reminder, a meeting, a problem with the link).`,
                          ar: `${d.day}: ${d.n} إجابة، خارج المدى الطبيعي. تحقق مما حدث ذلك اليوم (تذكير، اجتماع، مشكلة في الرابط).`,
                        })}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            ) : (
              <p className="mt-2 text-sm text-muted">
                {loc({
                  en: `Shown once at least ${data.k} people have answered, like every other result.`,
                  ar: `يظهر عندما يجيب ${data.k} أشخاص على الأقل، مثل بقية النتائج.`,
                })}
              </p>
            )}
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-ink">{loc({ en: "Where people stop", ar: "أين يتوقف الناس" })}</h2>
            {started ? (
              <>
                <p className="mt-1 text-xs text-subtle">
                  {loc({
                    en: "Browsers that reached each page, then the answers sent. Counts only: nothing links a count to a person or an answer.",
                    ar: "المتصفحات التي وصلت إلى كل صفحة، ثم الإجابات المرسلة. أعداد فقط: لا شيء يربط العدد بشخص أو بإجابة.",
                  })}
                </p>
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={funnel} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                      <CartesianGrid stroke="var(--color-border)" vertical={false} />
                      <XAxis dataKey="name" tick={AXIS} axisLine={false} tickLine={false} interval={0} />
                      <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={TIP} formatter={(v: number) => [`${v} (${started ? Math.round((v / started) * 100) : 0}%)`, ""]} />
                      <Bar dataKey="n" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {biggestDrop && biggestDrop.lost > 0 ? (
                  <p className="mt-3 text-sm text-muted">
                    {loc({
                      en: `Biggest drop is just before “${biggestDrop.name}” (${biggestDrop.lost} fewer). Check the length and wording of the page before it.`,
                      ar: `أكبر انخفاض قبل «${biggestDrop.name}» مباشرة (أقل بـ ${biggestDrop.lost}). راجع طول الصفحة التي قبلها وصياغتها.`,
                    })}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="mt-2 text-sm text-muted">{loc({ en: "Nobody has opened the survey since counting started.", ar: "لم يفتح أحد الاستبيان منذ بدء العدّ." })}</p>
            )}
          </Card>
          <p className={`text-xs ${schedulerStale ? "text-score-crit" : "text-subtle"}`}>
            {data.schedulerLastRun && !data.schedulerLastRun.startsWith("1970")
              ? loc({
                  en: `Reminders and data clean-up last ran ${new Date(data.schedulerLastRun).toLocaleString("en-GB")}. They run every hour.`,
                  ar: `آخر تشغيل للتذكيرات وتنظيف البيانات: ${new Date(data.schedulerLastRun).toLocaleString("ar-OM-u-nu-latn")}. تعمل كل ساعة.`,
                })
              : loc({ en: "Reminders and data clean-up have not run yet.", ar: "لم تعمل التذكيرات وتنظيف البيانات بعد." })}
            {schedulerStale
              ? loc({ en: " More than 3 hours ago: check the host's scheduled job that calls /api/health.", ar: " منذ أكثر من 3 ساعات: تحقق من المهمة المجدولة التي تستدعي ‎/api/health." })
              : ""}
          </p>
          <p className="text-xs text-subtle">{t("navInviteAll")}: {loc({ en: "the list of failed addresses and resend are on the Invitations page.", ar: "قائمة العناوين التي فشلت وإعادة الإرسال في صفحة الدعوات." })}</p>
        </>
      )}
    </PageFrame>
  );
}

function Stat({ label, value, sub, warn }: { label: string; value: string; sub?: string; warn?: boolean }) {
  return (
    <Card>
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 font-display text-2xl tabular-nums ${warn ? "text-score-crit" : "text-ink"}`}>{value}</p>
      {sub ? <p className="text-xs text-subtle">{sub}</p> : null}
    </Card>
  );
}
