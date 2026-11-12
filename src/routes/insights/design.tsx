import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageFrame } from "@/components/page-frame";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Likert } from "@/components/likert";
import { LIKERT, questionsByDimension } from "@/lib/questionnaire";
import { useCensus } from "@/lib/census";
import { useT } from "@/lib/store";

export const Route = createFileRoute("/insights/design")({ component: DesignPage });

function DesignPage() {
  const { t, loc, lang } = useT();
  const [demo, setDemo] = useState(4);
  const { dimensions, questions, kFloor } = useCensus();
  const likertN = questions.filter((q) => q.type === "likert").length;
  return (
    <PageFrame title={t("navDesign")} hint={t("designHint")}>
      <Card>
        <h2 className="font-display text-xl text-ink">{t("method")}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t("methodIntro")}</p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { k: t("likertQs"), v: String(likertN) },
            { k: t("enpsQs"), v: String(questions.filter((q) => q.type === "enps").length) },
            { k: t("openQs"), v: String(questions.filter((q) => q.type === "text").length) },
            { k: t("demoQs"), v: "4" },
          ].map((x) => (
            <li key={x.k} className="rounded-xl bg-sand-2 px-4 py-3">
              <div className="text-xs text-subtle">{x.k}</div>
              <div className="mt-1 font-display text-2xl text-ink">{x.v}</div>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-ink">{t("likert")}</h2>
        <p className="mb-4 text-sm text-muted">{t("scaleBody")}</p>
        <Likert name="demo-scale" value={demo} onChange={setDemo} />
        <p className="mt-3 text-xs text-subtle">
          {LIKERT.map((o) => `${o.value} · ${loc(o.label)}`).join("   ")}
        </p>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-ink">{t("anonymityTitle")}</h2>
        <p className="text-sm leading-relaxed text-muted">
          {t("kAnon")} k≥{kFloor}. {t("noName")}.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {lang === "ar"
            ? "لا بصمة جهاز، ولا عنوان بروتوكول، ولا بريد يُحفظ مع الإجابات. الرابط الشخصي يُعلَّم «مستخدَماً» فقط، والإجابة تُحفظ دون أي إشارة إليه، بتاريخ اليوم دون الوقت. التعليقات تُحفظ منفصلة عن بقية الإجابة."
            : "No device fingerprint, IP address or email is stored with answers. A personal link is only marked as used; the response is stored with no reference to it and with the date but not the time. Comments are stored separately from the rest of the response."}
        </p>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {dimensions.map((d) => {
          const qs = questionsByDimension(d.id, questions);
          return (
            <Card key={d.id}>
              <h3 className="font-display text-lg text-ink">{loc(d.name)}</h3>
              <p className="mt-1 text-sm text-muted">{loc(d.blurb)}</p>
              <p className="mt-3 text-xs text-subtle">
                {qs.length} {t("questions")}
              </p>
            </Card>
          );
        })}
      </div>

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-ink">{t("questionBank")}</h2>
        <ul className="flex flex-col gap-2">
          {questions.map((q) => (
            <li key={q.id} className="flex flex-col gap-1 rounded-xl bg-sand-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm text-ink">{loc(q.text)}</p>
                <p className="mt-1 text-xs text-subtle">
                  {q.id} · {q.type} · {q.required ? t("requiredMark") : t("optionalMark")}
                </p>
              </div>
              {q.required ? null : <Badge tone="sand">{t("optionalMark")}</Badge>}
            </li>
          ))}
        </ul>
      </Card>
    </PageFrame>
  );
}
