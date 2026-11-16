import { createFileRoute } from "@tanstack/react-router";

/**
 * Employee file uploads for "file upload" questions.
 *   POST   /api/upload  (multipart: file, question, survey?, token?)  → { ref, name, size }
 *   DELETE /api/upload?ref=<id.key>                                     → removes a file not yet sent
 * A file is "pending" until the survey is sent (submitResponse attaches it); pending files expire
 * after a day. Only allowed file kinds within the question's size limit are accepted, and the first
 * bytes must match the file kind, so a renamed program is refused.
 */

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

function looksLike(ext: string, b: Uint8Array): boolean {
  const at = (i: number, ...xs: number[]) => xs.every((x, k) => b[i + k] === x);
  const ascii = (i: number, s: string) => at(i, ...[...s].map((c) => c.charCodeAt(0)));
  switch (ext) {
    case "pdf":
      return ascii(0, "%PDF");
    case "png":
      return at(0, 0x89, 0x50, 0x4e, 0x47);
    case "jpg":
    case "jpeg":
      return at(0, 0xff, 0xd8, 0xff);
    case "webp":
      return ascii(0, "RIFF") && ascii(8, "WEBP");
    case "docx":
    case "xlsx":
    case "pptx":
      return at(0, 0x50, 0x4b, 0x03, 0x04);
    case "doc":
    case "xls":
    case "ppt":
      return at(0, 0xd0, 0xcf, 0x11, 0xe0);
    case "heic":
    case "m4a":
      return ascii(4, "ftyp");
    case "mp3":
      return ascii(0, "ID3") || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0);
    case "txt":
    case "csv":
      return !b.subarray(0, 4096).includes(0);
    default:
      return false;
  }
}

export const Route = createFileRoute("/api/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const core = await import("@/lib/pulse/core.server");
        const files = await import("@/lib/pulse/files");
        const { getSql } = await import("@/lib/db");
        try {
          await core.rateLimit("upload", 60);
        } catch (e) {
          if (e instanceof core.RateLimitedError) return json({ error: "too_many" }, 429);
          throw e;
        }
        const len = Number(request.headers.get("content-length") ?? 0);
        if (len > (files.FILE_LIMIT_MB + 0.25) * 1024 * 1024) return json({ error: "too_big" }, 413);
        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return json({ error: "bad_request" }, 400);
        }
        const file = form.get("file");
        const questionId = String(form.get("question") ?? "");
        const token = String(form.get("token") ?? "") || undefined;
        const surveyParam = String(form.get("survey") ?? "") || undefined;
        if (!(file instanceof File) || !/^[A-Za-z0-9_.-]{1,60}$/.test(questionId)) return json({ error: "bad_request" }, 400);

        // Which survey: the personal link decides, then ?s=, then the default one.
        const sql = await getSql();
        let survey: string | null = null;
        if (token && token.length >= 8 && token.length <= 200) {
          const rows = await sql<{ survey_id: string; used: boolean }>`select survey_id, used from pulse_invitees where token = ${token}`;
          if (rows[0]?.used) return json({ error: "token_used" }, 403);
          survey = rows[0]?.survey_id ?? null;
        }
        if (!survey && surveyParam && core.isSurveyId(surveyParam) && (await core.surveyExists(surveyParam))) survey = surveyParam;
        survey ??= await core.publicSurveyId();
        const config = await core.loadConfig(survey);
        const today = core.todayIn(config.general.timezone);
        const open =
          config.general.status === "open" &&
          (!config.calendar.fieldOpen || today >= config.calendar.fieldOpen) &&
          (!config.calendar.fieldClose || today <= config.calendar.fieldClose);
        if (!open) return json({ error: "closed" }, 403);
        if (!token && !config.general.allowOpenLink) return json({ error: "token_required" }, 403);
        const q = config.questions.find((x) => x.id === questionId && x.visible && x.type === "file");
        if (!q) return json({ error: "bad_request" }, 400);

        const rules = files.fileRules(q);
        const ext = files.extOf(file.name);
        if (!rules.types.includes(ext)) return json({ error: "type", allowed: rules.types }, 415);
        if (file.size > rules.maxBytes) return json({ error: "too_big", maxMb: rules.maxMb }, 413);
        if (file.size === 0) return json({ error: "empty" }, 400);
        const bytes = new Uint8Array(await file.arrayBuffer());
        if (!looksLike(ext, bytes)) return json({ error: "content" }, 415);

        // Housekeeping: files that were never sent with a survey are removed after a day.
        await sql`delete from pulse_attachments where submitted = false and created_at < now() - interval '1 day'`;

        const id = core.newId().replace(/-/g, "");
        const key = core.newToken();
        // eslint-disable-next-line no-control-regex -- strip control characters from the file name
        const name = file.name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").slice(-120);
        await sql.query(
          `insert into pulse_attachments (id, survey_id, question_id, upload_key, filename, mime, size, data)
           values ($1, $2, $3, $4, $5, $6, $7, decode($8, 'base64'))`,
          [id, survey, q.id, key, name, files.MIME_BY_EXT[ext] ?? "application/octet-stream", bytes.length, Buffer.from(bytes).toString("base64")],
        );
        return json({ ref: `${id}.${key}`, name, size: bytes.length });
      },
      DELETE: async ({ request }) => {
        const files = await import("@/lib/pulse/files");
        const { getSql } = await import("@/lib/db");
        const ref = files.parseFileRefs(new URL(request.url).searchParams.get("ref") ?? "")[0];
        if (!ref) return json({ error: "bad_request" }, 400);
        const sql = await getSql();
        await sql`delete from pulse_attachments where id = ${ref.id} and upload_key = ${ref.key} and submitted = false`;
        return json({ ok: true });
      },
    },
  },
});
