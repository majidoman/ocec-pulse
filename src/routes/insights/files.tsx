import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, Paperclip } from "lucide-react";
import { PageFrame } from "@/components/page-frame";
import { Card } from "@/components/ui/card";
import { listAttachments, type AttachmentRow } from "@/lib/pulse/api";
import { formatIsoDate, formatNumber } from "@/lib/pulse/config";
import { formatBytes } from "@/lib/pulse/files";
import { useSettings } from "@/lib/settings-store";
import { useT } from "@/lib/store";

export const Route = createFileRoute("/insights/files")({ component: FilesPage });

function FilesPage() {
  const { loc, lang } = useT();
  const questions = useSettings((s) => s.questions);
  const departments = useSettings((s) => s.departments);
  const fileQs = questions.filter((q) => q.type === "file");
  const [data, setData] = useState<Awaited<ReturnType<typeof listAttachments>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    listAttachments()
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Could not load"));
  }, []);
  const deptName = (id: string | null) => {
    if (!id) return loc({ en: "Department hidden (small group)", ar: "القسم مخفي (مجموعة صغيرة)" });
    const d = departments.find((x) => x.id === id);
    return d ? loc(d.name) : id;
  };

  return (
    <PageFrame
      title={loc({ en: "Attached files", ar: "الملفات المرفقة" })}
      hint={loc({
        en: "Files employees sent with their answers. Like comments, they are not linked to anyone's other answers, and the department is only shown once it has enough files to stay anonymous. Files download; they never open inside this site.",
        ar: "الملفات التي أرسلها الموظفون مع إجاباتهم. مثل التعليقات، لا ترتبط بباقي إجابات أي شخص، ولا يظهر القسم إلا عندما يصل عدد ملفاته إلى حد يحفظ إخفاء الهوية. تُحمَّل الملفات ولا تُفتح داخل هذا الموقع.",
      })}
    >
      {error ? <p className="text-sm text-score-crit">{error}</p> : null}
      {!data && !error ? <div className="h-32 animate-pulse rounded-2xl bg-sand-2" aria-busy="true" /> : null}
      {data && !data.allowed ? (
        <Card>
          <p className="text-sm text-muted">{loc({ en: "Your role cannot open attached files.", ar: "دورك لا يسمح بفتح الملفات المرفقة." })}</p>
        </Card>
      ) : null}
      {data?.allowed && !fileQs.length ? (
        <Card>
          <p className="text-sm text-muted">
            {loc({
              en: "This survey has no file-upload question. Add one in the Survey builder (question type: File upload).",
              ar: "لا يحتوي هذا الاستبيان على سؤال لرفع الملفات. أضفه من منشئ الاستبيان (نوع السؤال: رفع ملف).",
            })}
          </p>
        </Card>
      ) : null}
      {data?.allowed
        ? fileQs.map((q) => {
            const files: AttachmentRow[] = data.questions.find((x) => x.id === q.id)?.files ?? [];
            return (
              <Card key={q.id}>
                <h2 className="text-sm font-semibold text-ink">{loc(q.text)}</h2>
                <p className="mt-1 text-xs text-muted">{loc({ en: `${formatNumber(files.length, lang)} files`, ar: `${formatNumber(files.length, lang)} ملف` })}</p>
                {files.length ? (
                  <ul className="mt-3 divide-y divide-border">
                    {files.map((f) => (
                      <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                        <span className="flex min-w-0 items-center gap-2 text-sm text-ink">
                          <Paperclip className="size-4 shrink-0 text-muted" aria-hidden />
                          <span className="truncate" dir="auto">
                            {f.filename}
                          </span>
                          <span className="shrink-0 text-xs text-muted">
                            {formatBytes(f.size)} · {f.submittedOn ? formatIsoDate(f.submittedOn, lang) : ""} · {deptName(f.departmentId)}
                          </span>
                        </span>
                        <a
                          href={`/api/attachment?id=${encodeURIComponent(f.id)}`}
                          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-sm font-medium text-ink hover:bg-sand-2"
                          download
                        >
                          <Download className="size-4" aria-hidden /> {loc({ en: "Download", ar: "تحميل" })}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-muted">{loc({ en: "No files yet.", ar: "لا ملفات بعد." })}</p>
                )}
              </Card>
            );
          })
        : null}
    </PageFrame>
  );
}
