import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { PageFrame } from "@/components/page-frame";
import { NeedResults } from "@/components/results";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCensus } from "@/lib/census";
import { generateAiBriefing } from "@/lib/pulse/api";
import { buildNarrative } from "@/lib/pulse/narrative";
import { useSettings } from "@/lib/settings-store";
import { useT } from "@/lib/store";

export const Route = createFileRoute("/insights/ai")({ component: AiPage });

function AiPage() {
  const { t, lang, loc } = useT();
  const { dimensions, departments, benchmarks } = useCensus();
  const general = useSettings((s) => s.general);
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await generateAiBriefing({ data: { lang } });
      if (res.ok) setText(res.text);
      else if (res.error === "unavailable") {
        setError(loc({ en: "AI writing is not connected for this app, so the summary below is written directly from the numbers.", ar: "الكتابة الذكية غير موصولة لهذا التطبيق، لذا الملخص أدناه مكتوب مباشرة من الأرقام." }));
      } else setError(t("generateFailed"));
    } catch (err) {
      setError(err instanceof Error && err.message.startsWith("Your role") ? err.message : t("generateFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageFrame
      title={t("navAi")}
      hint={loc({
        en: "A leadership note from the live numbers. The AI receives only anonymised totals, never comments or individual answers.",
        ar: "مذكرة للقيادة من الأرقام الحية. يتلقى الذكاء الاصطناعي مجاميع مجهولة فقط، لا تعليقات ولا إجابات فردية.",
      })}
      actions={
        <Button onClick={() => void run()} disabled={busy} className="print:hidden">
          <Sparkles className="size-4" />
          {busy ? t("generating") : t("generateAi")}
        </Button>
      }
    >
      <NeedResults>
        {(r) => {
          const fallback = buildNarrative(r, { dimensions, departments, general, benchmarks }, lang);
          const paras = text ? text.split("\n").filter((p) => p.trim()) : fallback;
          return (
            <Card>
              <div className="mb-4 flex items-center gap-2">
                <Badge tone={text ? "accent" : "sand"}>{text ? t("aiFresh") : t("aiSeeded")}</Badge>
              </div>
              <div className="flex flex-col gap-4 text-sm leading-relaxed text-ink">
                {paras.map((p, i) => (
                  <p key={`${i}-${p.slice(0, 16)}`}>{p}</p>
                ))}
              </div>
              {error ? <p className="mt-4 text-sm text-muted">{error}</p> : null}
              {text ? (
                <p className="mt-4 text-xs text-subtle">
                  {loc({ en: "AI-written. Check every figure against the dashboard before sharing.", ar: "مكتوب بالذكاء الاصطناعي. تحقق من كل رقم مقابل اللوحة قبل المشاركة." })}
                </p>
              ) : null}
            </Card>
          );
        }}
      </NeedResults>
    </PageFrame>
  );
}
