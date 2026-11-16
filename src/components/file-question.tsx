import { useRef, useState } from "react";
import { FileUp, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { extOf, fileRules, formatBytes, parseFileRefs } from "@/lib/pulse/files";
import { useT } from "@/lib/store";
import type { Question } from "@/lib/types";

export interface UploadContext {
  token?: string;
  survey?: string;
  preview: boolean;
}

/**
 * "File upload" answer: the person picks files, each is checked here (kind and size) and on the server,
 * uploaded straight away with a progress bar, and can be removed again until the survey is sent.
 * The answer kept on the device is the list of uploaded files ("id.key,…") plus their names for display.
 */
export function FileQuestion({
  q,
  value,
  onChange,
  ctx,
  labelId,
}: {
  q: Question;
  value: string | number | undefined;
  onChange: (v: string) => void;
  ctx: UploadContext;
  labelId: string;
}) {
  const { loc } = useT();
  const rules = fileRules(q);
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Names are kept beside the refs so the list survives a reload: "ref|name|size" joined by "\n" in a side key.
  const [names, setNames] = useState<Record<string, { name: string; size: number }>>(() => {
    try {
      return JSON.parse(localStorage.getItem(`pulse-files-${q.id}`) ?? "{}") as Record<string, { name: string; size: number }>;
    } catch {
      return {};
    }
  });
  const refs = parseFileRefs(value).map((r) => `${r.id}.${r.key}`);
  const saveNames = (n: Record<string, { name: string; size: number }>) => {
    setNames(n);
    try {
      localStorage.setItem(`pulse-files-${q.id}`, JSON.stringify(n));
    } catch {
      /* private mode: names just won't survive a reload */
    }
  };
  const accept = rules.types.map((e) => `.${e}`).join(",");
  const typesText = rules.types.map((e) => e.toUpperCase()).join(", ");

  function upload(file: File) {
    setError(null);
    if (refs.length >= rules.maxFiles) {
      setError(loc({ en: `You can attach up to ${rules.maxFiles} file(s).`, ar: `يمكنك إرفاق ${rules.maxFiles} ملف كحد أقصى.` }));
      return;
    }
    if (!rules.types.includes(extOf(file.name))) {
      setError(loc({ en: `This kind of file is not accepted. Allowed: ${typesText}.`, ar: `هذا النوع من الملفات غير مقبول. المسموح: ${typesText}.` }));
      return;
    }
    if (file.size > rules.maxBytes) {
      setError(loc({ en: `The file is ${formatBytes(file.size)}; the limit is ${rules.maxMb} MB.`, ar: `حجم الملف ${formatBytes(file.size)}؛ والحد الأقصى ${rules.maxMb} ميغابايت.` }));
      return;
    }
    if (ctx.preview) {
      setError(loc({ en: "In a preview, files are checked but not uploaded.", ar: "في المعاينة تُفحص الملفات ولا تُرفع." }));
      return;
    }
    const form = new FormData();
    form.append("file", file);
    form.append("question", q.id);
    if (ctx.token) form.append("token", ctx.token);
    if (ctx.survey) form.append("survey", ctx.survey);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");
    xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onerror = () => {
      setProgress(null);
      setError(loc({ en: "Upload failed. Check your connection and try again.", ar: "فشل الرفع. تحقق من الاتصال وأعد المحاولة." }));
    };
    xhr.onload = () => {
      setProgress(null);
      let body: { ref?: string; name?: string; size?: number; error?: string; maxMb?: number } = {};
      try {
        body = JSON.parse(xhr.responseText) as typeof body;
      } catch {
        /* handled below */
      }
      if (xhr.status === 200 && body.ref) {
        saveNames({ ...names, [body.ref]: { name: body.name ?? file.name, size: body.size ?? file.size } });
        onChange([...refs, body.ref].join(","));
        return;
      }
      const msg: Record<string, { en: string; ar: string }> = {
        type: { en: `This kind of file is not accepted. Allowed: ${typesText}.`, ar: `هذا النوع من الملفات غير مقبول. المسموح: ${typesText}.` },
        content: { en: "The file's content does not match its type, so it was refused.", ar: "محتوى الملف لا يطابق نوعه، لذلك رُفض." },
        too_big: { en: `The file is larger than ${rules.maxMb} MB.`, ar: `الملف أكبر من ${rules.maxMb} ميغابايت.` },
        too_many: { en: "Too many uploads just now. Wait a few minutes.", ar: "عمليات رفع كثيرة الآن. انتظر بضع دقائق." },
        closed: { en: "The survey is not accepting answers right now.", ar: "الاستبيان لا يستقبل الإجابات الآن." },
      };
      setError(loc(msg[body.error ?? ""] ?? { en: "Upload failed. Try again.", ar: "فشل الرفع. أعد المحاولة." }));
    };
    setProgress(0);
    xhr.send(form);
  }

  async function remove(ref: string) {
    onChange(refs.filter((r) => r !== ref).join(","));
    const n = { ...names };
    delete n[ref];
    saveNames(n);
    try {
      await fetch(`/api/upload?ref=${encodeURIComponent(ref)}`, { method: "DELETE" });
    } catch {
      /* the server removes unsent files after a day anyway */
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs leading-relaxed text-muted">
        {loc({
          en: `${typesText} · up to ${rules.maxMb} MB each · ${rules.maxFiles === 1 ? "one file" : `up to ${rules.maxFiles} files`}.`,
          ar: `${typesText} · حتى ${rules.maxMb} ميغابايت للملف · ${rules.maxFiles === 1 ? "ملف واحد" : `حتى ${rules.maxFiles} ملفات`}.`,
        })}{" "}
        {loc({
          en: "Files can carry your name (for example in the document properties or a photo's details). Remove anything that identifies you before uploading.",
          ar: "قد تحمل الملفات اسمك (مثلاً في خصائص المستند أو بيانات الصورة). أزل ما يدل عليك قبل الرفع.",
        })}
      </p>
      {refs.length ? (
        <ul className="flex flex-col gap-2">
          {refs.map((ref) => (
            <li key={ref} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-sand px-3 py-2 text-sm">
              <span className="flex min-w-0 items-center gap-2 text-ink">
                <Paperclip className="size-4 shrink-0 text-muted" aria-hidden />
                <span className="truncate" dir="auto">
                  {names[ref]?.name ?? loc({ en: "Attached file", ar: "ملف مرفق" })}
                </span>
                {names[ref] ? <span className="shrink-0 text-xs text-muted">{formatBytes(names[ref].size)}</span> : null}
              </span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => void remove(ref)}
                aria-label={loc({ en: `Remove ${names[ref]?.name ?? "file"}`, ar: `إزالة ${names[ref]?.name ?? "الملف"}` })}
              >
                <X className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      {progress !== null ? (
        <div className="h-2 overflow-hidden rounded-full bg-sand-2" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={loc({ en: "Uploading", ar: "جارٍ الرفع" })}>
          <div className="h-full bg-ink transition-[width]" style={{ width: `${progress}%` }} />
        </div>
      ) : null}
      {refs.length < rules.maxFiles ? (
        <>
          <input
            ref={input}
            type="file"
            accept={accept}
            className="sr-only"
            aria-labelledby={labelId}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.target.value = "";
            }}
          />
          <Button type="button" variant="outline" className="self-start" disabled={progress !== null} onClick={() => input.current?.click()}>
            <FileUp className="size-4" /> {refs.length ? loc({ en: "Add another file", ar: "إضافة ملف آخر" }) : loc({ en: "Choose a file", ar: "اختيار ملف" })}
          </Button>
        </>
      ) : null}
      {error ? (
        <p className="text-sm text-score-crit" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
