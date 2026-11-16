/**
 * Every server function the app calls. Handlers dynamic-import the
 * `*.server` modules so nothing server-only reaches the browser bundle.
 *
 * Two groups:
 *   - PUBLIC (no sign-in): what an employee needs to take the survey.
 *   - STAFF (authMiddleware + role check): everything else.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import type { StaffRole } from "@/lib/types";
import type { ApiView } from "./api-types";
import { brandNames, brandText, type PublicConfig, type PulseConfig, type SurveySummary } from "./config";
import type {
  AuditRow,
  CampaignRow,
  InviteeStats,
  Me,
  PublicStats,
  Results,
  StaffInviteRow,
  StaffRow,
  RosterUploadSummary,
} from "./results-types";

const ROLES = ["super", "pc", "exec", "head", "viewer"] as const;

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC
// ═══════════════════════════════════════════════════════════════════════════

const publicSchema = z
  .object({ survey: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/).optional(), token: z.string().min(8).max(200).optional() })
  .optional();

/**
 * Which survey an employee is looking at: their personal link decides; otherwise ?s=<id>;
 * otherwise the survey chosen for the plain survey link and QR code.
 */
async function resolvePublicSurvey(input: { survey?: string; token?: string } | undefined): Promise<string> {
  const core = await import("./core.server");
  const { getSql } = await import("@/lib/db");
  if (input?.token) {
    const sql = await getSql();
    const rows = await sql<{ survey_id: string }>`select survey_id from pulse_invitees where token = ${input.token}`;
    if (rows[0]?.survey_id) return rows[0].survey_id;
  }
  if (input?.survey && (await core.surveyExists(input.survey))) return input.survey;
  return core.publicSurveyId();
}

export const getPublic = createServerFn({ method: "GET" })
  .validator((d: unknown) => publicSchema.parse(d))
  .handler(async ({ data }): Promise<{ config: PublicConfig; stats: PublicStats; surveyId: string }> => {
    const { loadConfig } = await import("./core.server");
    const { toPublicConfig, totalHeadcount } = await import("./config");
    const { responseCount } = await import("./results.server");
    const survey = await resolvePublicSurvey(data);
    const config = await loadConfig(survey);
    const total = await responseCount(survey);
    const headcount = totalHeadcount(config);
    const k = Math.max(3, Number(config.anonymity.kFloor) || 5);
    return {
      config: toPublicConfig(config),
      stats: {
        status: config.general.status,
        rate: total >= k && headcount ? Math.min(100, Math.round((total / headcount) * 100)) : null,
      },
      surveyId: survey,
    };
  });

export type TokenState = "ok" | "used" | "invalid";

export const checkToken = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ token: z.string().min(8).max(200) }).parse(d))
  .handler(async ({ data }): Promise<{ state: TokenState }> => {
    const { rateLimit, RateLimitedError } = await import("./core.server");
    try {
      await rateLimit("check", 120);
    } catch (e) {
      if (e instanceof RateLimitedError) return { state: "invalid" };
      throw e;
    }
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{ used: boolean }>`select used from pulse_invitees where token = ${data.token}`;
    if (!rows.length) return { state: "invalid" };
    if (rows[0].used) return { state: "used" };
    await sql`update pulse_invitees set opened = true where token = ${data.token} and opened = false`;
    return { state: "ok" };
  });

const submitSchema = z.object({
  token: z.string().min(8).max(200).optional(),
  survey: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/).optional(),
  lang: z.enum(["en", "ar"]),
  answers: z
    .record(z.string().max(40), z.union([z.number(), z.string().max(2000)]))
    .refine((o) => Object.keys(o).length <= 150, "too many answers"),
  department: z.string().max(80).optional(),
  tenure: z.string().max(20).optional(),
  level: z.string().max(20).optional(),
  contract: z.string().max(20).optional(),
});

export type SubmitResult =
  | { ok: true }
  | { ok: false; reason: "closed" | "not_open_yet" | "token_required" | "token_used" | "token_invalid" | "incomplete" | "rate_limited" };

export const submitResponse = createServerFn({ method: "POST" })
  .validator((d: unknown) => submitSchema.parse(d))
  .handler(async ({ data }): Promise<SubmitResult> => {
    const { loadConfig, newId, todayIn, rateLimit, RateLimitedError } = await import("./core.server");
    const { getSql } = await import("@/lib/db");
    try {
      // Generous: a whole office can share one address. This stops scripts, not colleagues.
      await rateLimit(data.token ? "submit-token" : "submit-open", data.token ? 200 : 120);
    } catch (e) {
      if (e instanceof RateLimitedError) return { ok: false, reason: "rate_limited" };
      throw e;
    }
    const survey = await resolvePublicSurvey({ survey: data.survey, token: data.token });
    const config = await loadConfig(survey);
    const today = todayIn(config.general.timezone);
    if (config.general.status !== "open") return { ok: false, reason: "closed" };
    if (config.calendar.fieldOpen && today < config.calendar.fieldOpen) return { ok: false, reason: "not_open_yet" };
    if (config.calendar.fieldClose && today > config.calendar.fieldClose) return { ok: false, reason: "closed" };
    if (!data.token && !config.general.allowOpenLink) return { ok: false, reason: "token_required" };

    // Validate answers against the live question bank — never trust the client.
    const questions = config.questions.filter((q) => q.visible);
    const visibleDims = new Set(config.dimensions.filter((d) => d.visible && !d.archived).map((d) => d.id));
    const { fileRules, parseFileRefs } = await import("./files");
    const numeric: Record<string, number> = {};
    const comments: { id: string; q: string; body: string }[] = [];
    const fileRefs: { id: string; key: string; q: string }[] = [];
    for (const q of questions) {
      const inScope = q.dimension === "open" || q.dimension === "demo" || visibleDims.has(q.dimension);
      if (!inScope) continue;
      const v = data.answers[q.id];
      if (q.type === "likert" || q.type === "enps") {
        const lo = q.type === "likert" ? 1 : 0;
        const hi = q.type === "likert" ? 5 : 10;
        if (typeof v === "number" && Number.isInteger(v) && v >= lo && v <= hi) numeric[q.id] = v;
        else if (q.required) return { ok: false, reason: "incomplete" };
      } else if (q.type === "file") {
        const refs = parseFileRefs(v).slice(0, fileRules(q).maxFiles);
        if (refs.length) fileRefs.push(...refs.map((r) => ({ ...r, q: q.id })));
        else if (q.required) return { ok: false, reason: "incomplete" };
      } else if (typeof v === "string") {
        const body = v.trim().slice(0, 1000);
        if (body) comments.push({ id: newId(), q: q.id, body });
      }
    }
    if (!Object.keys(numeric).length) return { ok: false, reason: "incomplete" };
    // Uploaded files must exist and still be waiting for this survey and question.
    const sqlFiles = await (await import("@/lib/db")).getSql();
    const validFiles: string[] = [];
    for (const f of fileRefs) {
      const rows = await sqlFiles<{ id: string }>`
        select id from pulse_attachments
        where id = ${f.id} and upload_key = ${f.key} and survey_id = ${survey} and question_id = ${f.q} and submitted = false`;
      if (rows.length) validFiles.push(f.id);
    }
    for (const q of questions) {
      if (q.type === "file" && q.required && !fileRefs.some((f) => f.q === q.id && validFiles.includes(f.id))) {
        return { ok: false, reason: "incomplete" };
      }
    }

    const known = (list: string[], v?: string) => (v && list.includes(v) ? v : null);
    const department = known(
      config.departments.filter((d) => !d.archived).map((d) => d.id),
      data.department,
    );
    const tenure = known(["lt1", "1to3", "3to7", "7plus"], data.tenure);
    const level = known(["frontline", "supervisor", "manager", "leadership"], data.level);
    const contract = known(["permanent", "contract"], data.contract);

    const sql = await getSql();
    const id = newId();
    const answersJson = JSON.stringify(numeric);
    const commentsJson = JSON.stringify(comments);

    if (data.token) {
      // One statement: the token is consumed and the response stored together, or
      // neither happens. The response row carries no reference to the token.
      const rows = await sql.query<{ inserted: number }>(
        `with tok as (
           update pulse_invitees set used = true, opened = true
           where token = $1 and used = false returning 1
         ), resp as (
           insert into pulse_responses (id, submitted_on, lang, department_id, tenure, level, contract, source, survey_id)
           select $2::text, $3::date, $4::text, $5::text, $6::text, $7::text, $8::text, 'token', $11::text
           where exists (select 1 from tok)
           returning id
         ), ans as (
           insert into pulse_answers (response_id, question_id, value)
           select resp.id, a.key, (a.value)::smallint from resp, jsonb_each_text($9::jsonb) a
           returning 1
         ), com as (
           insert into pulse_comments (id, question_id, department_id, body, submitted_on, survey_id)
           select c->>'id', c->>'q', $5::text, c->>'body', $3::date, $11::text
           from resp, jsonb_array_elements($10::jsonb) c
           returning 1
         )
         select (select count(*) from resp) as inserted, (select count(*) from ans) as a, (select count(*) from com) as c`,
        [data.token, id, today, data.lang, department, tenure, level, contract, answersJson, commentsJson, survey],
      );
      if (Number(rows[0]?.inserted ?? 0) === 1) {
        await attachFiles(validFiles, department, today);
        return { ok: true };
      }
      const check = await sql<{ used: boolean }>`select used from pulse_invitees where token = ${data.token}`;
      return { ok: false, reason: check.length ? "token_used" : "token_invalid" };
    }

    await sql.query(
      `with resp as (
         insert into pulse_responses (id, submitted_on, lang, department_id, tenure, level, contract, source, survey_id)
         values ($1::text, $2::date, $3::text, $4::text, $5::text, $6::text, $7::text, 'open', $10::text)
         returning id
       ), ans as (
         insert into pulse_answers (response_id, question_id, value)
         select resp.id, a.key, (a.value)::smallint from resp, jsonb_each_text($8::jsonb) a
         returning 1
       ), com as (
         insert into pulse_comments (id, question_id, department_id, body, submitted_on, survey_id)
         select c->>'id', c->>'q', $4::text, c->>'body', $2::date, $10::text
         from resp, jsonb_array_elements($9::jsonb) c
         returning 1
       )
       select (select count(*) from resp) as inserted, (select count(*) from ans) as a, (select count(*) from com) as c`,
      [id, today, data.lang, department, tenure, level, contract, answersJson, commentsJson, survey],
    );
    await attachFiles(validFiles, department, today);
    return { ok: true };
  });

/** Files become part of the results once the survey is sent; like comments they are not linked to the answers. */
async function attachFiles(ids: string[], department: string | null, today: string) {
  if (!ids.length) return;
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  await sql.query(
    `update pulse_attachments set submitted = true, department_id = $2, submitted_on = $3::date, upload_key = '-'
     where id = any($1::text[]) and submitted = false`,
    [ids, department, today],
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STAFF — identity
// ═══════════════════════════════════════════════════════════════════════════

export const getMe = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<Me> => {
    const core = await import("./core.server");
    return core.getMe(context.userId);
  });

export const claimOwner = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => z.object({ code: z.string().max(200).optional() }).optional().parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const core = await import("./core.server");
    // Installed copies set SETUP_CODE: only the person holding it can become the owner.
    if (!(await core.setupCodeMatches(data?.code))) throw new core.ForbiddenError("The setup code is not correct.");
    await core.claimOwnership(context.userId);
    return { ok: true };
  });

export interface SetupState {
  /** No administrator yet: the first-run wizard starts from the account step. */
  needsOwner: boolean;
  /** The installer set a setup code that must be entered to claim ownership. */
  requiresCode: boolean;
  /** The owner pressed Finish in the wizard. */
  completed: boolean;
}

export const getSetupState = createServerFn({ method: "GET" }).handler(async (): Promise<SetupState> => {
  const core = await import("./core.server");
  const done = await core.readSetting<{ at: string }>("setup_completed");
  return { needsOwner: (await core.staffCount()) === 0, requiresCode: core.setupCodeRequired(), completed: !!done };
});

export const completeSetup = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ ok: true }> => {
    const core = await import("./core.server");
    const staff = await core.requireStaff(context.userId, ["super"]);
    await core.writeSetting("setup_completed", { at: new Date().toISOString(), by: core.actorOf(staff) });
    await core.audit(core.actorOf(staff), "Finished the setup wizard", "أنهى معالج الإعداد");
    return { ok: true };
  });

/** What a staff invitation link is for, so the join page can prefill the right email. No sign-in needed. */
export const getInviteInfo = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ code: z.string().min(8).max(100) }).parse(d))
  .handler(
    async ({
      data,
    }): Promise<{ status: "ok" | "used" | "expired" | "invalid"; email?: string; name?: string; role?: StaffRole; hasAccount?: boolean }> => {
    const core = await import("./core.server");
    const { getSql } = await import("@/lib/db");
    try {
      await core.rateLimit("invite-info", 60);
    } catch {
      return { status: "invalid" };
    }
    const sql = await getSql();
    const rows = await sql<{ email: string; name: string | null; role: StaffRole; used: boolean; fresh: boolean }>`
      select email, name, role, accepted_by is not null as used, created_at > now() - interval '30 days' as fresh
      from pulse_staff_invites where code = ${data.code}
    `;
    if (!rows.length) return { status: "invalid" };
    const r = rows[0];
    if (r.used) return { status: "used" };
    if (!r.fresh) return { status: "expired" };
    const email = r.email.trim().toLowerCase();
    // Only the holder of the invitation code learns this, so the page can ask for a new password
    // (first time) or the existing one.
    const { auth } = await import("@/lib/auth/server");
    const ctx = await auth.$context;
    const found = await ctx.internalAdapter.findUserByEmail(email).catch(() => null);
    return { status: "ok", email, name: r.name ?? undefined, role: r.role, hasAccount: Boolean(found?.user) };
  },
  );

export const acceptInvite = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => z.object({ code: z.string().min(8).max(100) }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true; role: StaffRole }> => {
    const core = await import("./core.server");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const me = await core.getMe(context.userId);
    if (me.role) throw new core.BadRequestError("You already have access to this survey.");
    // The link is only usable by the person it was sent to, and only for 30 days, so a forwarded
    // or leaked invitation cannot hand someone else access to the results.
    const myEmail = (me.email ?? "").trim().toLowerCase();
    const pending = await sql<{ email: string; fresh: boolean }>`
      select email, created_at > now() - interval '30 days' as fresh
      from pulse_staff_invites where code = ${data.code} and accepted_by is null
    `;
    if (!pending.length) throw new core.BadRequestError("This invitation link is not valid or was already used.");
    if (!pending[0].fresh) throw new core.BadRequestError("This invitation has expired. Ask your administrator for a new one.");
    if (!myEmail || pending[0].email.trim().toLowerCase() !== myEmail) {
      throw new core.ForbiddenError("This invitation was sent to a different email address. Sign in with that address, or ask for a new invitation.");
    }
    const claimed = await sql<{ email: string; name: string | null; role: StaffRole; department_id: string | null }>`
      update pulse_staff_invites set accepted_by = ${context.userId}, accepted_at = now()
      where code = ${data.code} and accepted_by is null
        and created_at > now() - interval '30 days' and lower(trim(email)) = ${myEmail}
      returning email, name, role, department_id
    `;
    if (!claimed.length) throw new core.BadRequestError("This invitation link is not valid or was already used.");
    const inv = claimed[0];
    await sql`
      insert into pulse_staff (user_id, email, name, role, department_id, active)
      values (${context.userId}, ${me.email ?? inv.email}, ${me.name ?? inv.name}, ${inv.role}, ${inv.department_id}, true)
      on conflict (user_id) do update
        set role = excluded.role, department_id = excluded.department_id, active = true
    `;
    await core.audit(me.email ?? inv.email, `Accepted invitation as ${inv.role}`, `قبل الدعوة بدور ${inv.role}`);
    return { ok: true, role: inv.role };
  });

// ═══════════════════════════════════════════════════════════════════════════
// STAFF — configuration
// ═══════════════════════════════════════════════════════════════════════════

export const getAdminConfig = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<PulseConfig> => {
    const core = await import("./core.server");
    await core.requireStaff(context.userId);
    // A survey chosen earlier may have been deleted by someone else: fall back to the main one.
    const id = core.surveyId();
    if (!(await core.surveyExists(id))) {
      const { deleteCookie } = await import("@tanstack/react-start/server");
      deleteCookie(core.SURVEY_COOKIE, { path: "/" });
      return core.loadConfig(core.MAIN_SURVEY);
    }
    return core.loadConfig();
  });

// ── Questionnaire import (Excel) ────────────────────────────────────────────
// The browser reads the workbook (questionnaire-import.ts) and sends the parsed sections and
// questions. The server re-checks the shape, refuses while answers exist or the questions are
// locked, keeps the current set as a backup, and logs the change.

const loc300 = z.object({ en: z.string().max(300), ar: z.string().max(300) });
const importSchema = z.object({
  fileName: z.string().max(200),
  surveyName: z.object({ en: z.string().min(1).max(120), ar: z.string().min(1).max(120) }).nullable(),
  dimensions: z
    .array(
      z.object({
        id: z.string().regex(/^[a-z0-9-]{1,40}$/),
        name: loc300,
        short: loc300,
        blurb: loc300,
        visible: z.boolean(),
        archived: z.boolean(),
        order: z.number().int().min(0).max(100),
        kind: z.enum(["likert", "enps"]),
      }),
    )
    .min(1)
    .max(20),
  questions: z
    .array(
      z.object({
        id: z.string().regex(/^[A-Za-z0-9_-]{1,12}$/),
        dimension: z.string().max(40),
        type: z.enum(["likert", "enps", "text"]),
        text: loc300,
        required: z.boolean(),
        reverse: z.boolean().optional(),
        visible: z.boolean(),
        order: z.number().int().min(0).max(500),
      }),
    )
    .min(1)
    .max(120),
});

interface QuestionnaireBackup {
  at: string;
  by: string;
  replacedBy: string;
  cycleName: PulseConfig["general"]["cycleName"];
  dimensions: PulseConfig["dimensions"];
  questions: PulseConfig["questions"];
}

async function questionnaireGuard(core: typeof import("./core.server")) {
  const { responseCount } = await import("./results.server");
  const answers = await responseCount();
  if (answers > 0) {
    throw new core.BadRequestError(
      `This survey already has ${answers} answer(s). Replacing the questions now would break the results. Delete the answers first (Settings → Danger zone), or wait for the next survey.`,
    );
  }
  const config = await core.loadConfig();
  if (config.instrumentStatus === "frozen") {
    throw new core.BadRequestError("The questions are locked. Press \"Unlock to edit\" on the Survey builder page first.");
  }
  return config;
}

export const getQuestionnaireImportState = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const core = await import("./core.server");
    await core.requireStaff(context.userId, core.ADMIN_ROLES);
    const { responseCount } = await import("./results.server");
    const config = await core.loadConfig();
    const backup = await core.readSetting<QuestionnaireBackup>("questionnaire_backup");
    return {
      answers: await responseCount(),
      locked: config.instrumentStatus === "frozen",
      backup: backup ? { at: backup.at, by: backup.by, replacedBy: backup.replacedBy, questions: backup.questions.length } : null,
    };
  });

export const importQuestionnaire = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => importSchema.parse(d))
  .handler(async ({ data, context }) => {
    const core = await import("./core.server");
    const staff = await core.requireStaff(context.userId, core.ADMIN_ROLES);
    // Cross-checks the schema cannot express.
    const dimIds = new Set(data.dimensions.map((d) => d.id));
    const qIds = new Set(data.questions.map((q) => q.id.toUpperCase()));
    if (dimIds.size !== data.dimensions.length || qIds.size !== data.questions.length) throw new core.BadRequestError("Duplicate section or question IDs.");
    for (const q of data.questions) {
      if (q.type === "text" ? q.dimension !== "open" : !dimIds.has(q.dimension)) throw new core.BadRequestError(`Question ${q.id} points to an unknown section.`);
      const dim = data.dimensions.find((d) => d.id === q.dimension);
      if (dim && (dim.kind === "enps") !== (q.type === "enps")) throw new core.BadRequestError(`Question ${q.id} does not match its section type.`);
    }
    if (data.questions.filter((q) => q.type === "enps").length > 1) throw new core.BadRequestError("Only one 0–10 question is allowed.");
    if (!data.questions.some((q) => q.type === "likert")) throw new core.BadRequestError("At least one 1–5 question is needed.");

    const config = await questionnaireGuard(core);
    const actor = core.actorOf(staff);
    const backup: QuestionnaireBackup = {
      at: new Date().toISOString(),
      by: actor,
      replacedBy: data.fileName,
      cycleName: config.general.cycleName,
      dimensions: config.dimensions,
      questions: config.questions,
    };
    await core.writeSetting("questionnaire_backup", backup);
    config.dimensions = data.dimensions;
    config.questions = data.questions.map((q) => ({ ...q, reverse: q.type === "likert" ? q.reverse : undefined }));
    if (data.surveyName) config.general.cycleName = data.surveyName;
    await core.saveConfig(config);
    const nScale = data.questions.length;
    await core.audit(
      actor,
      `Imported the survey questions from "${data.fileName}": ${data.dimensions.length} sections, ${nScale} questions. The previous questions were kept as a backup.`,
      `استيراد أسئلة الاستبيان من "${data.fileName}": ${data.dimensions.length} أقسام، ${nScale} سؤالاً. حُفظت الأسئلة السابقة نسخة احتياطية.`,
    );
    return { ok: true as const };
  });

export const restoreQuestionnaireBackup = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const core = await import("./core.server");
    const staff = await core.requireStaff(context.userId, core.ADMIN_ROLES);
    const backup = await core.readSetting<QuestionnaireBackup>("questionnaire_backup");
    if (!backup) throw new core.BadRequestError("There is no earlier set of questions to go back to.");
    const config = await questionnaireGuard(core);
    const actor = core.actorOf(staff);
    // Swap, so the restore itself can be undone.
    await core.writeSetting("questionnaire_backup", {
      at: new Date().toISOString(),
      by: actor,
      replacedBy: "restore",
      cycleName: config.general.cycleName,
      dimensions: config.dimensions,
      questions: config.questions,
    } satisfies QuestionnaireBackup);
    config.dimensions = backup.dimensions;
    config.questions = backup.questions;
    config.general.cycleName = backup.cycleName;
    await core.saveConfig(config);
    await core.audit(actor, "Went back to the previous set of survey questions.", "الرجوع إلى مجموعة أسئلة الاستبيان السابقة.");
    return { ok: true as const };
  });

export const saveAdminConfig = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => z.object({ config: z.record(z.string(), z.unknown()) }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true; closedAt: string | null }> => {
    const core = await import("./core.server");
    const { normalizeConfig } = await import("./config");
    const staff = await core.requireStaff(context.userId, core.ADMIN_ROLES);
    if (JSON.stringify(data.config).length > 900_000) throw new core.BadRequestError("Settings are too large to save.");
    const previous = await core.loadConfig();
    const next = normalizeConfig(data.config);
    const k = Number(next.anonymity.kFloor);
    next.anonymity.kFloor = Number.isFinite(k) ? Math.min(50, Math.max(3, Math.round(k))) : 5;
    if (previous.general.status !== next.general.status) {
      next.general.closedAt = next.general.status === "closed" ? new Date().toISOString() : undefined;
      await core.audit(
        core.actorOf(staff),
        `Changed survey status: ${previous.general.status} → ${next.general.status}`,
        `تغيير حالة الاستبيان: ${previous.general.status} ← ${next.general.status}`,
      );
    } else {
      next.general.closedAt = previous.general.closedAt;
    }
    if (previous.anonymity.kFloor !== next.anonymity.kFloor) {
      await core.audit(
        core.actorOf(staff),
        `Changed anonymity floor: ${previous.anonymity.kFloor} → ${next.anonymity.kFloor}`,
        `تغيير حد السرية: ${previous.anonymity.kFloor} ← ${next.anonymity.kFloor}`,
      );
    }
    const { describeConfigChanges } = await import("./changes");
    const change = describeConfigChanges(
      previous as unknown as Record<string, unknown>,
      next as unknown as Record<string, unknown>,
    );
    await core.saveConfig(next);
    if (change)
      await core.auditCoalesced(core.actorOf(staff), change.en.slice(0, 1000), change.ar.slice(0, 1000), 15, { snapshot: previous, survey: core.surveyId() });
    return { ok: true, closedAt: next.general.closedAt ?? null };
  });

export const logAudit = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => z.object({ en: z.string().min(1).max(200), ar: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const core = await import("./core.server");
    const staff = await core.requireStaff(context.userId, core.ADMIN_ROLES);
    await core.audit(core.actorOf(staff), data.en, data.ar);
    return { ok: true };
  });

export const listAudit = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((d: unknown) => z.object({ limit: z.number().int().min(1).max(1000).optional() }).optional().parse(d))
  .handler(async ({ data, context }): Promise<AuditRow[]> => {
    const core = await import("./core.server");
    const { getSql } = await import("@/lib/db");
    await core.requireStaff(context.userId, core.ADMIN_ROLES);
    const sql = await getSql();
    const rows = await sql<{ id: number; at: string | Date; actor: string; action_en: string; action_ar: string; undo: boolean }>`
      select id, at, actor, action_en, action_ar, snapshot is not null as undo from pulse_audit order by at desc, id desc limit ${data?.limit ?? 60}
    `;
    return rows.map((r) => ({
      canUndo: Boolean(r.undo),
      id: Number(r.id),
      at: new Date(r.at).toISOString(),
      actor: r.actor,
      en: r.action_en,
      ar: r.action_ar,
    }));
  });

// ═══════════════════════════════════════════════════════════════════════════
// STAFF — results
// ═══════════════════════════════════════════════════════════════════════════

export const getResults = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<Results> => {
    const core = await import("./core.server");
    const { computeResults } = await import("./results.server");
    const staff = await core.requireStaff(context.userId);
    return computeResults(await core.loadConfig(), staff);
  });

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  // Neutralise spreadsheet formulas in free text, then quote.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
};
const toCsv = (rows: unknown[][]) => `\uFEFF${rows.map((r) => r.map(csvCell).join(",")).join("\r\n")}`;

export const exportData = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => z.object({ kind: z.enum(["departments", "items", "comments"]) }).parse(d))
  .handler(async ({ data, context }): Promise<{ filename: string; csv: string }> => {
    const core = await import("./core.server");
    const { computeResults } = await import("./results.server");
    const staff = await core.requireStaff(context.userId, ["super", "pc", "exec"]);
    const config = await core.loadConfig();
    const r = await computeResults(config, staff);
    await core.audit(core.actorOf(staff), `Exported ${data.kind} (anonymised)`, `تصدير ${data.kind} (مجهول الهوية)`);
    const dims = config.dimensions.filter((d) => d.visible && !d.archived && d.kind === "likert");
    if (!r.enough) return { filename: `pulse-${data.kind}.csv`, csv: toCsv([[`Fewer than ${r.k} responses — nothing to export yet`]]) };
    if (data.kind === "departments") {
      const head = ["department", "respondents", "headcount", "response_rate_pct", "engagement_index", "enps", ...dims.map((d) => d.id)];
      const rows: unknown[][] = [head];
      rows.push(["ALL", r.total, r.headcount, r.rate, r.engagement?.index ?? "", r.enps?.score ?? "", ...dims.map((d) => r.dimensions[d.id]?.score ?? "")]);
      for (const d of r.departments) {
        const name = config.departments.find((x) => x.id === d.id)?.name.en ?? d.id;
        rows.push(
          d.dims
            ? [name, d.n, d.headcount, d.rate ?? "", d.index ?? "", d.enps ?? "", ...dims.map((x) => d.dims?.[x.id] ?? "")]
            : [name, d.suppressed ? `<${r.k} (hidden)` : 0, d.headcount, "", "", "", ...dims.map(() => "")],
        );
      }
      return { filename: "pulse-departments.csv", csv: toCsv(rows) };
    }
    if (data.kind === "items") {
      const names = brandNames(config.general, config.branding);
      const rows: unknown[][] = [["question_id", "dimension", "question_en", "question_ar", "favourable_pct", "answers"]];
      for (const it of r.items) {
        const q = config.questions.find((x) => x.id === it.id);
        rows.push([it.id, it.dimension, brandText(q?.text.en ?? "", names, "en"), brandText(q?.text.ar ?? "", names, "ar"), it.favorable, it.n]);
      }
      return { filename: "pulse-items.csv", csv: toCsv(rows) };
    }
    const rows: unknown[][] = [["question_id", "question_en", "department", "comment"]];
    for (const c of r.comments ?? []) {
      const q = config.questions.find((x) => x.id === c.question);
      const dept = c.department ? (config.departments.find((x) => x.id === c.department)?.name.en ?? c.department) : "";
      rows.push([c.question, brandText(q?.text.en ?? "", brandNames(config.general, config.branding), "en"), dept, c.body]);
    }
    return { filename: "pulse-comments.csv", csv: toCsv(rows) };
  });

// ═══════════════════════════════════════════════════════════════════════════
// STAFF — users
// ═══════════════════════════════════════════════════════════════════════════

export const listStaff = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ staff: StaffRow[]; invites: StaffInviteRow[] }> => {
    const core = await import("./core.server");
    const { getSql } = await import("@/lib/db");
    await core.requireStaff(context.userId, core.ADMIN_ROLES);
    const sql = await getSql();
    const staff = await sql<{
      user_id: string;
      email: string | null;
      name: string | null;
      role: StaffRole;
      department_id: string | null;
      active: boolean;
      last_seen_at: string | Date | null;
    }>`select user_id, email, name, role, department_id, active, last_seen_at from pulse_staff order by created_at`;
    const invites = await sql<{
      code: string;
      email: string;
      name: string | null;
      role: StaffRole;
      department_id: string | null;
      created_at: string | Date;
      accepted_by: string | null;
    }>`select code, email, name, role, department_id, created_at, accepted_by from pulse_staff_invites order by created_at desc limit 100`;
    return {
      staff: staff.map((s) => ({
        userId: s.user_id,
        email: s.email,
        name: s.name,
        role: s.role,
        departmentId: s.department_id,
        active: s.active,
        lastSeenAt: s.last_seen_at ? new Date(s.last_seen_at).toISOString() : null,
      })),
      invites: invites.map((i) => ({
        code: i.code,
        email: i.email,
        name: i.name,
        role: i.role,
        departmentId: i.department_id,
        createdAt: new Date(i.created_at).toISOString(),
        accepted: Boolean(i.accepted_by),
      })),
    };
  });

export const inviteStaff = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) =>
    z
      .object({
        email: z.string().email().max(254),
        name: z.string().max(120).optional(),
        role: z.enum(ROLES),
        departmentId: z.string().max(80).optional(),
        sendEmail: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<{ code: string; link: string; emailed: boolean; emailError?: string }> => {
    const core = await import("./core.server");
    const { getSql } = await import("@/lib/db");
    const staff = await core.requireStaff(context.userId, core.ADMIN_ROLES);
    if (data.role === "super" && staff.role !== "super") throw new core.ForbiddenError("Only a super admin can invite another super admin.");
    if (data.role === "head" && !data.departmentId) throw new core.BadRequestError("Choose the department this head may see.");
    const config = await core.loadConfig();
    const sql = await getSql();
    const code = core.newCode();
    await sql`
      insert into pulse_staff_invites (code, email, name, role, department_id, created_by)
      values (${code}, ${data.email.trim().toLowerCase()}, ${data.name?.trim() || null}, ${data.role},
              ${data.role === "head" ? (data.departmentId ?? null) : null}, ${staff.userId})
    `;
    await core.audit(core.actorOf(staff), `Invited ${data.email} as ${data.role}`, `دعوة ${data.email} بدور ${data.role}`);
    const link = `${core.requestOrigin(config)}/join?code=${encodeURIComponent(code)}`;
    let emailed = false;
    let emailError: string | undefined;
    if (data.sendEmail) {
      try {
        const mail = await import("./mail.server");
        const org = brandNames(config.general, config.branding).orgName;
        const res = await mail.sendMail(config, [
          mail.bilingual(
            data.email,
            `${org.en} — access to the survey results`,
            `${org.ar} — صلاحية الاطلاع على نتائج الاستبيان`,
            `You have been invited to the ${org.en} survey workspace.\n\nOpen this link and choose a password to finish your account (${data.email.trim().toLowerCase()}). Your access is activated straight away:\n\n${link}\n\nThe link works once, for 30 days.`,
            `تمت دعوتك إلى مساحة استبيان ${org.ar}.\n\nافتح هذا الرابط واختر كلمة مرور لإكمال حسابك (${data.email.trim().toLowerCase()}). تُفعَّل صلاحيتك مباشرة:\n\n${link}\n\nيعمل الرابط مرة واحدة خلال ٣٠ يوماً.`,
          ),
        ]);
        emailed = Boolean(res[0]?.ok);
        if (!emailed) emailError = res[0]?.error;
      } catch (err) {
        emailError = err instanceof Error ? err.message : "Email could not be sent.";
      }
    }
    return { code, link, emailed, emailError };
  });

export const revokeStaffInvite = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => z.object({ code: z.string().max(100) }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const core = await import("./core.server");
    const { getSql } = await import("@/lib/db");
    await core.requireStaff(context.userId, core.ADMIN_ROLES);
    const sql = await getSql();
    await sql`delete from pulse_staff_invites where code = ${data.code} and accepted_by is null`;
    return { ok: true };
  });

export const updateStaff = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) =>
    z
      .object({
        userId: z.string().max(200),
        active: z.boolean().optional(),
        role: z.enum(ROLES).optional(),
        departmentId: z.string().max(80).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const core = await import("./core.server");
    const { getSql } = await import("@/lib/db");
    const staff = await core.requireStaff(context.userId, core.ADMIN_ROLES);
    const sql = await getSql();
    const target = await sql<{ role: StaffRole; active: boolean; email: string | null }>`
      select role, active, email from pulse_staff where user_id = ${data.userId}
    `;
    if (!target.length) throw new core.BadRequestError("User not found.");
    const t = target[0];
    if ((t.role === "super" || data.role === "super") && staff.role !== "super") {
      throw new core.ForbiddenError("Only a super admin can change a super admin.");
    }
    const nextRole = data.role ?? t.role;
    const nextActive = data.active ?? t.active;
    if (t.role === "super" && t.active && (nextRole !== "super" || !nextActive)) {
      const others = await sql<{ n: number }>`
        select count(*) as n from pulse_staff where role = 'super' and active = true and user_id <> ${data.userId}
      `;
      if (Number(others[0]?.n ?? 0) === 0) throw new core.BadRequestError("Keep at least one active super admin.");
    }
    const dept = data.departmentId === undefined ? undefined : data.departmentId;
    if (dept === undefined) {
      await sql`update pulse_staff set role = ${nextRole}, active = ${nextActive} where user_id = ${data.userId}`;
    } else {
      await sql`update pulse_staff set role = ${nextRole}, active = ${nextActive}, department_id = ${dept} where user_id = ${data.userId}`;
    }
    await core.audit(
      core.actorOf(staff),
      `Updated ${t.email ?? data.userId}: ${nextRole}, ${nextActive ? "active" : "deactivated"}`,
      `تحديث ${t.email ?? data.userId}: ${nextRole}، ${nextActive ? "مفعّل" : "موقوف"}`,
    );
    return { ok: true };
  });

// ═══════════════════════════════════════════════════════════════════════════
// STAFF — invitations, email, reminders
// ═══════════════════════════════════════════════════════════════════════════

export const uploadRoster = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) =>
    z
      .object({
        rows: z
          .array(z.object({ email: z.string().max(300), departmentId: z.string().max(120).nullable().optional() }))
          .max(5000),
        allowUnmatched: z.boolean().optional(),
        /** Large lists arrive in parts; the last part records one dated summary and one audit entry. */
        batch: z
          .object({
            id: z.string().min(8).max(64),
            index: z.number().int().min(0),
            count: z.number().int().min(1).max(100),
            source: z.string().max(120),
          })
          .optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<AddInviteesResultView> => {
    const core = await import("./core.server");
    const mail = await import("./mail.server");
    const staff = await core.requireStaff(context.userId, core.ADMIN_ROLES);
    const res = await mail.addInvitees(data.rows, await core.loadConfig(), { allowUnmatched: data.allowUnmatched });
    if (res.blocked) {
      throw new core.BadRequestError(
        `Department not recognised: ${res.unmatchedNames.join(", ")}. Fix the names in the file, or choose to add these people without a department.`,
      );
    }
    const batch = data.batch ?? { id: core.newId(), index: 0, count: 1, source: "pasted list" };
    type Running = RosterUploadSummary & { id: string };
    const prev = await core.readSetting<Running>("roster_upload_running");
    const run: Running =
      prev && prev.id === batch.id && batch.index > 0
        ? prev
        : { id: batch.id, at: "", by: core.actorOf(staff), source: batch.source, rows: 0, added: 0, skipped: 0, invalid: 0, noDepartment: 0, unmatched: 0 };
    run.rows += data.rows.length;
    run.added += res.added;
    run.skipped += res.skipped;
    run.invalid += res.invalid;
    run.noDepartment += res.noDepartment;
    run.unmatched += res.unmatched;
    let summary: RosterUploadSummary | null = null;
    if (batch.index >= batch.count - 1) {
      const { id: _id, ...rest } = run;
      summary = { ...rest, at: new Date().toISOString() };
      await core.writeSetting("roster_last_upload", summary);
      await core.writeSetting("roster_upload_running", null);
      await core.audit(
        core.actorOf(staff),
        `Uploaded staff list (${summary.source}): ${summary.added} added, ${summary.skipped} already listed, ${summary.invalid} invalid${
          summary.noDepartment + summary.unmatched ? `, ${summary.noDepartment + summary.unmatched} without department` : ""
        }`,
        `رفع قائمة الموظفين (${summary.source}): أُضيف ${summary.added}، موجود مسبقاً ${summary.skipped}، غير صالح ${summary.invalid}${
          summary.noDepartment + summary.unmatched ? `، بلا إدارة ${summary.noDepartment + summary.unmatched}` : ""
        }`,
      );
    } else {
      await core.writeSetting("roster_upload_running", run);
    }
    return { ...res, summary };
  });

export type AddInviteesResultView = {
  added: number;
  skipped: number;
  invalid: number;
  noDepartment: number;
  unmatched: number;
  unmatchedNames: string[];
  blocked: boolean;
  summary: RosterUploadSummary | null;
};

export interface InvitationOverview {
  stats: InviteeStats;
  campaigns: CampaignRow[];
  mail: { passwordSet: boolean; problem: string | null; via: "settings" | "server" | null; from: string | null };
  surveyUrl: string;
  failures: { email: string; error: string }[];
  lastUpload: RosterUploadSummary | null;
}

export const getInvitationOverview = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<InvitationOverview> => {
    const core = await import("./core.server");
    const mail = await import("./mail.server");
    const { getSql } = await import("@/lib/db");
    await core.requireStaff(context.userId, core.ADMIN_ROLES);
    const config = await core.loadConfig();
    const sql = await getSql();
    const campaigns = await sql<{
      id: string;
      name: string;
      kind: string;
      audience: string;
      recipients: number;
      sent: number;
      failed: number;
      created_at: string | Date;
    }>`select id, name, kind, audience, recipients, sent, failed, created_at from pulse_campaigns where survey_id = ${core.surveyId()} order by created_at desc limit 30`;
    const failures = await sql<{ email: string; send_error: string }>`
      select email, send_error from pulse_invitees where survey_id = ${core.surveyId()} and send_error is not null order by email limit 50
    `;
    const passwordSet = await mail.smtpPasswordSet();
    const lastUpload = await core.readSetting<RosterUploadSummary>("roster_last_upload");
    return {
      lastUpload,
      stats: await mail.inviteeStats(config),
      campaigns: campaigns.map((c) => ({
        id: c.id,
        name: c.name,
        kind: c.kind,
        audience: c.audience,
        recipients: Number(c.recipients),
        sent: Number(c.sent),
        failed: Number(c.failed),
        createdAt: new Date(c.created_at).toISOString(),
      })),
      mail: { passwordSet, ...(await mail.mailRoute(config)) },
      // The plain link opens the default survey; any other survey gets its own ?s= link (and QR code).
      surveyUrl:
        core.surveyId() === (await core.publicSurveyId())
          ? `${core.requestOrigin(config)}/survey`
          : `${core.requestOrigin(config)}/survey?s=${encodeURIComponent(core.surveyId())}`,
      failures: failures.map((f) => ({ email: f.email, error: f.send_error })),
    };
  });

export const startCampaign = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => z.object({ name: z.string().max(120), audience: z.string().max(80) }).parse(d))
  .handler(async ({ data, context }): Promise<{ id: string; recipients: number }> => {
    const core = await import("./core.server");
    const mail = await import("./mail.server");
    const { getSql } = await import("@/lib/db");
    const staff = await core.requireStaff(context.userId, core.ADMIN_ROLES);
    const config = await core.loadConfig();
    if (config.general.status !== "open") throw new core.BadRequestError("Open the survey before sending invitations.");
    const { problem } = await mail.mailRoute(config);
    if (problem) throw new core.BadRequestError(problem);
    const sql = await getSql();
    const count =
      data.audience === "all"
        ? await sql<{ n: number }>`select count(*) as n from pulse_invitees where survey_id = ${core.surveyId()} and invited_at is null and used = false`
        : await sql<{ n: number }>`select count(*) as n from pulse_invitees where survey_id = ${core.surveyId()} and invited_at is null and used = false and department_id = ${data.audience}`;
    const recipients = Number(count[0]?.n ?? 0);
    if (!recipients) throw new core.BadRequestError("Everyone on this list has already been invited. Add people first.");
    const id = core.newId();
    const e = config.email;
    await sql`
      insert into pulse_campaigns (id, name, kind, audience, subject_en, subject_ar, body_en, body_ar, recipients, created_by, survey_id)
      values (${id}, ${data.name.trim() || "Invitation"}, 'invitation', ${data.audience}, ${e.subjectEn}, ${e.subjectAr},
              ${e.bodyEn}, ${e.bodyAr}, ${recipients}, ${staff.userId}, ${core.surveyId()})
    `;
    await core.audit(core.actorOf(staff), `Started sending ${recipients} invitations`, `بدء إرسال ${recipients} دعوة`);
    return { id, recipients };
  });

export const sendCampaignBatch = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => z.object({ id: z.string().max(80) }).parse(d))
  .handler(async ({ data, context }): Promise<{ sent: number; failed: number; remaining: number }> => {
    const core = await import("./core.server");
    const mail = await import("./mail.server");
    const { getSql } = await import("@/lib/db");
    await core.requireStaff(context.userId, core.ADMIN_ROLES);
    const sql = await getSql();
    const camp = await sql<{ audience: string }>`select audience from pulse_campaigns where id = ${data.id} and survey_id = ${core.surveyId()}`;
    if (!camp.length) throw new core.BadRequestError("Campaign not found.");
    const res = await mail.sendInvitationBatch(await core.loadConfig(), camp[0].audience, 20);
    await sql`update pulse_campaigns set sent = sent + ${res.sent}, failed = failed + ${res.failed} where id = ${data.id}`;
    return res;
  });

export const retryFailedInvitations = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ reset: number }> => {
    const core = await import("./core.server");
    const { getSql } = await import("@/lib/db");
    await core.requireStaff(context.userId, core.ADMIN_ROLES);
    const sql = await getSql();
    const rows = await sql<{ id: string }>`
      update pulse_invitees set invited_at = null, send_error = null, reminders_sent = 0
      where survey_id = ${core.surveyId()} and send_error is not null and used = false returning id
    `;
    return { reset: rows.length };
  });

export const setSmtpPassword = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => z.object({ password: z.string().max(500) }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const core = await import("./core.server");
    const staff = await core.requireStaff(context.userId, core.ADMIN_ROLES);
    await core.writeSetting("smtp_secret", data.password ? { passEnc: core.encryptSecret(data.password) } : {});
    await core.audit(core.actorOf(staff), "Updated the email password", "تحديث كلمة مرور البريد");
    return { ok: true };
  });

// ── Connected APIs (super admin only) ───────────────────────────────────────

export const listApis = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => z.object({}).parse(d))
  .handler(async ({ context }): Promise<{ apis: ApiView[] }> => {
    const core = await import("./core.server");
    const apis = await import("./apis.server");
    await core.requireStaff(context.userId, ["super"]);
    return { apis: await apis.viewApis() };
  });

export const saveApi = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) =>
    z
      .object({
        id: z.string().max(64).optional(),
        name: z.string().trim().min(1, "Give the API a name.").max(80),
        baseUrl: z
          .string()
          .trim()
          .max(300)
          .refine((u) => /^https:\/\//.test(u) || /^http:\/\/localhost(:\d+)?(\/|$)/.test(u), "The address must start with https://."),
        note: z.string().max(200).default(""),
        enabled: z.boolean(),
        key: z.string().max(500).optional(),
        clearKey: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const core = await import("./core.server");
    const apis = await import("./apis.server");
    const staff = await core.requireStaff(context.userId, ["super"]);
    if (data.id && !apis.isKnownApi(data.id) && !(await apis.readApis()).some((a) => a.id === data.id)) {
      throw new core.BadRequestError("Unknown API.");
    }
    const saved = await apis.saveApiEntry(data);
    const change = saved.keyChanged ? " (key changed)" : "";
    await core.audit(core.actorOf(staff), `Updated API "${saved.name}"${change}`, `تحديث الواجهة "${saved.name}"${change ? " (تغيّر المفتاح)" : ""}`);
    return { ok: true };
  });

export const deleteApi = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => z.object({ id: z.string().min(1).max(64) }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const core = await import("./core.server");
    const apis = await import("./apis.server");
    const staff = await core.requireStaff(context.userId, ["super"]);
    const removed = await apis.deleteApiEntry(data.id);
    if (removed) await core.audit(core.actorOf(staff), `Removed API "${removed.name}"`, `حذف الواجهة "${removed.name}"`);
    return { ok: true };
  });

export const sendTestEmail = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => z.object({ to: z.string().email().max(254) }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string }> => {
    const core = await import("./core.server");
    const mail = await import("./mail.server");
    const { applyTokens, formatIsoDate } = await import("./config");
    await core.requireStaff(context.userId, core.ADMIN_ROLES);
    const config = await core.loadConfig();
    const link = `${core.requestOrigin(config)}/survey?t=TEST-LINK-NOT-VALID`;
    const vars = (lang: "en" | "ar") => ({
      survey_link: link,
      close_date: formatIsoDate(config.calendar.fieldClose, lang),
      org_name: brandNames(config.general, config.branding).orgName[lang],
    });
    const names = brandNames(config.general, config.branding);
    const fill = (text: string, lang: "en" | "ar") => brandText(applyTokens(text, vars(lang)), names, lang);
    try {
      const res = await mail.sendMail(config, [
        mail.bilingual(
          data.to,
          `[TEST] ${fill(config.email.subjectEn, "en")}`,
          fill(config.email.subjectAr, "ar"),
          fill(config.email.bodyEn, "en"),
          fill(config.email.bodyAr, "ar"),
        ),
      ]);
      return res[0]?.ok ? { ok: true } : { ok: false, error: res[0]?.error ?? "send failed" };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "send failed" };
    }
  });

export interface ReminderOverview {
  state: Record<string, { lastRun?: string; sent: number }>;
  cronUrl: string;
  waiting: number;
}

export const getReminderOverview = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<ReminderOverview> => {
    const core = await import("./core.server");
    const mail = await import("./mail.server");
    const { getSql } = await import("@/lib/db");
    await core.requireStaff(context.userId, core.ADMIN_ROLES);
    const config = await core.loadConfig();
    const sql = await getSql();
    const waiting = await sql<{ n: number }>`
      select count(*) as n from pulse_invitees where survey_id = ${core.surveyId()} and used = false and invited_at is not null and send_error is null
    `;
    return {
      state: await mail.reminderState(),
      cronUrl: `${core.requestOrigin(config)}/api/cron/reminders?key=${await mail.cronKey()}`,
      waiting: Number(waiting[0]?.n ?? 0),
    };
  });

export const runReminders = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => z.object({ manual: z.boolean().optional() }).parse(d))
  .handler(async ({ data, context }): Promise<{ sent: number; failed: number; remaining: number; skipped?: string }> => {
    const core = await import("./core.server");
    const mail = await import("./mail.server");
    const staff = await core.requireStaff(context.userId, core.ADMIN_ROLES);
    const res = await mail.runDueReminders(20, { ignoreQuietHours: Boolean(data.manual) });
    if (data.manual && res.sent) {
      await core.audit(core.actorOf(staff), `Sent ${res.sent} reminders`, `إرسال ${res.sent} تذكيراً`);
    }
    await mail.runRetention();
    return res;
  });

// ═══════════════════════════════════════════════════════════════════════════
// STAFF — data management
// ═══════════════════════════════════════════════════════════════════════════

export const manageData = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) =>
    z
      .object({
        action: z.enum(["reset_responses", "delete_invitees", "delete_everything"]),
        confirm: z.literal("DELETE"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const core = await import("./core.server");
    const { getSql } = await import("@/lib/db");
    const { defaultConfig } = await import("./config");
    const staff = await core.requireStaff(context.userId, ["super"]);
    const sql = await getSql();
    // Only the survey being worked on is affected; other surveys keep their data.
    const survey = core.surveyId();
    if (data.action === "reset_responses" || data.action === "delete_everything") {
      await core.deleteSurveyResponses(survey);
      await sql`update pulse_invitees set used = false, opened = false where survey_id = ${survey}`;
    }
    if (data.action === "delete_invitees" || data.action === "delete_everything") {
      await sql`delete from pulse_invitees where survey_id = ${survey}`;
      await sql`delete from pulse_campaigns where survey_id = ${survey}`;
      await core.writeSetting(survey === core.MAIN_SURVEY ? "reminder_state" : `reminder_state:${survey}`, {});
    }
    if (data.action === "delete_everything") {
      if (survey === core.MAIN_SURVEY) await core.saveConfig(defaultConfig());
      else {
        const { mergeSurveyPart, pickSurveyPart } = await import("./config");
        const current = await core.loadConfig(survey);
        await core.saveConfig(mergeSurveyPart(current, pickSurveyPart(defaultConfig())), survey);
      }
    }
    const label =
      data.action === "reset_responses"
        ? ["Deleted all responses", "حذف جميع الإجابات"]
        : data.action === "delete_invitees"
          ? ["Deleted the invitation list", "حذف قائمة الدعوات"]
          : ["Deleted the survey data: responses, invitation list and settings", "حذف بيانات الاستبيان: الإجابات وقائمة الدعوات والإعدادات"];
    await core.audit(core.actorOf(staff), label[0], label[1]);
    return { ok: true };
  });

// ═══════════════════════════════════════════════════════════════════════════
// STAFF — AI briefing
// ═══════════════════════════════════════════════════════════════════════════

export const generateAiBriefing = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => z.object({ lang: z.enum(["en", "ar"]) }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true; text: string } | { ok: false; error: "unavailable" | "not_enough" | "failed" }> => {
    const core = await import("./core.server");
    const { computeResults } = await import("./results.server");
    const staff = await core.requireStaff(context.userId, ["super", "pc", "exec"]);
    const apiKey = await (await import("./apis.server")).getApiKey("xai");
    if (!apiKey) return { ok: false, error: "unavailable" };
    const config = await core.loadConfig();
    const r = await computeResults(config, { role: staff.role, departmentId: staff.departmentId });
    if (!r.enough || !r.engagement) return { ok: false, error: "not_enough" };

    // Aggregates only, already filtered by the anonymity floor. No comments, no rows.
    const dimName = (id: string) => config.dimensions.find((d) => d.id === id)?.name.en ?? id;
    const stats = {
      organisation: brandNames(config.general, config.branding).orgName.en,
      cycle: brandText(config.general.cycleName.en, brandNames(config.general, config.branding), "en"),
      respondents: r.total,
      headcount: r.headcount,
      responseRatePct: r.rate,
      engagementIndex: r.engagement.index,
      favourablePct: r.engagement.favorable,
      neutralPct: r.engagement.neutral,
      unfavourablePct: r.engagement.unfavorable,
      enps: r.enps,
      dimensions: Object.entries(r.dimensions).map(([id, v]) => ({ dimension: dimName(id), favourablePct: v.score })),
      departments: r.departments
        .filter((d) => d.index !== null)
        .map((d) => ({
          department: config.departments.find((x) => x.id === d.id)?.name.en ?? d.id,
          respondents: d.n,
          engagementIndex: d.index,
          enps: d.enps,
        })),
      driversOfEnps: (r.drivers ?? []).map((d) => ({ dimension: dimName(d.dimension), correlation: d.r })),
      priorCycle: config.benchmarks.prior.engagement !== null ? { label: config.benchmarks.priorYearLabel, ...config.benchmarks.prior } : null,
      benchmarks: config.benchmarks.sources.filter((s) => s.score !== null && s.licence.trim()).map((s) => ({ name: s.name.en, score: s.score, year: s.year })),
    };
    const langName = data.lang === "ar" ? "Arabic (Modern Standard, Gulf corporate tone)" : "English";
    try {
      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "grok-4.5",
          max_tokens: 900,
          temperature: 0.3,
          messages: [
            {
              role: "system",
              content:
                "You are a people-analytics briefing writer. Voice is editorial, precise, no slogans, no emoji. Write for the CEO and heads of department. Use ONLY the numbers in the stats provided. Never invent a number, a prior-year figure or a benchmark. If prior-cycle or benchmark data is null or empty, do not mention comparisons. Never identify individuals. Departments missing from the stats are hidden for anonymity — do not speculate about them.",
            },
            {
              role: "user",
              content: `Write a ${langName} executive briefing from these stats only:\n${JSON.stringify(stats)}\n\nCover: (1) the overall story in two short paragraphs (2) the two highest-leverage moves, using the drivers of eNPS if present (3) the departments that need most attention (4) a 90-day plan of three steps.`,
            },
          ],
        }),
      });
      if (!res.ok) return { ok: false, error: "failed" };
      const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = body.choices?.[0]?.message?.content ?? "";
      return text ? { ok: true, text } : { ok: false, error: "failed" };
    } catch {
      return { ok: false, error: "failed" };
    }
  });


// ═══════════════════════════════════════════════════════════════════════════
// STAFF — several surveys
// ═══════════════════════════════════════════════════════════════════════════

const surveyIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);

export const listSurveys = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ current: string; publicDefault: string; surveys: SurveySummary[] }> => {
    const core = await import("./core.server");
    const { responseCount } = await import("./results.server");
    const { getSql } = await import("@/lib/db");
    await core.requireStaff(context.userId);
    const sql = await getSql();
    const meta = await sql<{ id: string; is_demo: boolean; created_at: string }>`select id, is_demo, created_at from pulse_surveys`;
    const publicDefault = await core.publicSurveyId();
    const surveys: SurveySummary[] = [];
    for (const id of await core.listSurveyIds()) {
      const c = await core.loadConfig(id);
      const m = meta.find((r) => r.id === id);
      surveys.push({
        id,
        name: c.general.cycleName,
        status: c.general.status,
        isDemo: Boolean(m?.is_demo),
        createdAt: m ? new Date(m.created_at).toISOString() : "",
        responses: await responseCount(id),
        fieldOpen: c.calendar.fieldOpen,
        fieldClose: c.calendar.fieldClose,
        isPublicDefault: id === publicDefault,
      });
    }
    const current = core.surveyId();
    return { current: surveys.some((x) => x.id === current) ? current : core.MAIN_SURVEY, publicDefault, surveys };
  });

export const selectSurvey = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => z.object({ id: surveyIdSchema }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const core = await import("./core.server");
    await core.requireStaff(context.userId);
    if (!(await core.surveyExists(data.id))) throw new core.BadRequestError("That survey no longer exists.");
    const { setCookie } = await import("@tanstack/react-start/server");
    setCookie(core.SURVEY_COOKIE, data.id, { path: "/", sameSite: "lax", httpOnly: true, secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 365 });
    return { ok: true };
  });

export const createSurvey = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) =>
    z
      .object({
        name: z.object({ en: z.string().trim().min(1).max(120), ar: z.string().trim().max(120) }),
        start: z.enum(["copy", "standard"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const core = await import("./core.server");
    const { getSql } = await import("@/lib/db");
    const { defaultConfig, mergeSurveyPart, pickSurveyPart } = await import("./config");
    const staff = await core.requireStaff(context.userId, core.ADMIN_ROLES);
    const current = await core.loadConfig();
    const from = data.start === "copy" ? current : defaultConfig();
    const id = `s-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const config = mergeSurveyPart(current, {
      ...pickSurveyPart(from),
      general: { cycleName: { en: data.name.en, ar: data.name.ar || data.name.en }, status: "draft", allowOpenLink: current.general.allowOpenLink },
      calendar: { ...from.calendar, fieldOpen: "", fieldClose: "" },
      instrumentStatus: "draft",
      frozenAt: undefined,
      changelog: [],
      actions: [],
    });
    const sql = await getSql();
    await sql`insert into pulse_surveys (id, config) values (${id}, ${JSON.stringify(pickSurveyPart(config))}::jsonb)`;
    const { setCookie } = await import("@tanstack/react-start/server");
    setCookie(core.SURVEY_COOKIE, id, { path: "/", sameSite: "lax", httpOnly: true, secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 365 });
    await core.audit(core.actorOf(staff), `Created a new survey: ${data.name.en}`, `إنشاء استبيان جديد: ${data.name.ar || data.name.en}`);
    return { id };
  });

export const createDemoSurvey = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ id: string; responses: number }> => {
    const core = await import("./core.server");
    const demo = await import("./demo.server");
    const staff = await core.requireStaff(context.userId, core.ADMIN_ROLES);
    const res = await demo.createDemoSurvey(await core.loadConfig());
    const { setCookie } = await import("@tanstack/react-start/server");
    setCookie(core.SURVEY_COOKIE, res.id, { path: "/", sameSite: "lax", httpOnly: true, secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 365 });
    await core.audit(core.actorOf(staff), `Loaded the demo survey (${res.responses} sample answers)`, `تحميل الاستبيان التجريبي (${res.responses} إجابة تجريبية)`);
    return res;
  });

export const setPublicSurvey = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => z.object({ id: surveyIdSchema }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const core = await import("./core.server");
    const { getSql } = await import("@/lib/db");
    const staff = await core.requireStaff(context.userId, core.ADMIN_ROLES);
    if (!(await core.surveyExists(data.id))) throw new core.BadRequestError("That survey no longer exists.");
    const sql = await getSql();
    const demo = await sql<{ is_demo: boolean }>`select is_demo from pulse_surveys where id = ${data.id}`;
    if (demo[0]?.is_demo) throw new core.BadRequestError("The demo survey cannot be given to employees.");
    await core.writeSetting("public_survey", { id: data.id });
    const c = await core.loadConfig(data.id);
    await core.audit(core.actorOf(staff), `The plain survey link now opens: ${c.general.cycleName.en}`, `رابط الاستبيان العام يفتح الآن: ${c.general.cycleName.ar}`);
    return { ok: true };
  });

export const deleteSurvey = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => z.object({ id: surveyIdSchema, confirm: z.literal("DELETE") }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const core = await import("./core.server");
    const { getSql } = await import("@/lib/db");
    const staff = await core.requireStaff(context.userId, ["super"]);
    if (data.id === core.MAIN_SURVEY) throw new core.BadRequestError("The first survey cannot be deleted. Use the Danger zone to clear it.");
    if (!(await core.surveyExists(data.id))) return { ok: true };
    const c = await core.loadConfig(data.id);
    const sql = await getSql();
    await core.deleteSurveyResponses(data.id);
    await sql`delete from pulse_invitees where survey_id = ${data.id}`;
    await sql`delete from pulse_campaigns where survey_id = ${data.id}`;
    await sql`delete from pulse_settings where key = ${`reminder_state:${data.id}`}`;
    await sql`delete from pulse_surveys where id = ${data.id}`;
    if ((await core.readSetting<{ id?: string }>("public_survey"))?.id === data.id) await core.writeSetting("public_survey", { id: core.MAIN_SURVEY });
    if (core.surveyId() === data.id) {
      const { setCookie } = await import("@tanstack/react-start/server");
      setCookie(core.SURVEY_COOKIE, core.MAIN_SURVEY, { path: "/", sameSite: "lax", httpOnly: true, secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 365 });
    }
    await core.audit(
      core.actorOf(staff),
      `Deleted the survey "${c.general.cycleName.en}" with its answers, comments and invitation list`,
      `حذف الاستبيان «${c.general.cycleName.ar}» مع إجاباته وتعليقاته وقائمة دعواته`,
    );
    return { ok: true };
  });

// ═══════════════════════════════════════════════════════════════════════════
// STAFF — attached files
// ═══════════════════════════════════════════════════════════════════════════

export interface AttachmentRow {
  id: string;
  filename: string;
  size: number;
  mime: string;
  submittedOn: string | null;
  /** Shown only when the department has at least the minimum group size of files, like comments. */
  departmentId: string | null;
}

export const listAttachments = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ k: number; allowed: boolean; questions: { id: string; files: AttachmentRow[] }[] }> => {
    const core = await import("./core.server");
    const { canReadComments } = await import("./config");
    const { getSql } = await import("@/lib/db");
    const staff = await core.requireStaff(context.userId);
    const config = await core.loadConfig();
    const k = Math.max(3, Number(config.anonymity.kFloor) || 5);
    if (!canReadComments(staff.role)) return { k, allowed: false, questions: [] };
    const sql = await getSql();
    const rows = await sql<{ id: string; question_id: string; filename: string; size: number; mime: string; submitted_on: string | null; department_id: string | null }>`
      select id, question_id, filename, size, mime, submitted_on, department_id from pulse_attachments
      where survey_id = ${core.surveyId()} and submitted = true order by submitted_on desc, filename`;
    const perDept = new Map<string, number>();
    for (const r of rows) if (r.department_id) perDept.set(r.department_id, (perDept.get(r.department_id) ?? 0) + 1);
    const visible = staff.role === "head" ? rows.filter((r) => r.department_id && r.department_id === staff.departmentId && (perDept.get(r.department_id) ?? 0) >= k) : rows;
    const byQ = new Map<string, AttachmentRow[]>();
    for (const r of visible) {
      const list = byQ.get(r.question_id) ?? [];
      list.push({
        id: r.id,
        filename: r.filename,
        size: Number(r.size),
        mime: r.mime,
        submittedOn: r.submitted_on ? new Date(r.submitted_on).toISOString().slice(0, 10) : null,
        departmentId: r.department_id && (perDept.get(r.department_id) ?? 0) >= k ? r.department_id : null,
      });
      byQ.set(r.question_id, list);
    }
    return { k, allowed: true, questions: [...byQ.entries()].map(([id, files]) => ({ id, files })) };
  });


/** Undo a settings change from Change history: puts the settings back as they were just before it. */
export const undoAuditChange = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => z.object({ id: z.number().int().positive() }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const core = await import("./core.server");
    const { getSql } = await import("@/lib/db");
    const { normalizeConfig } = await import("./config");
    const staff = await core.requireStaff(context.userId, core.ADMIN_ROLES);
    const sql = await getSql();
    const rows = await sql<{ snapshot: unknown; survey_id: string | null; action_en: string; action_ar: string }>`
      select snapshot, survey_id, action_en, action_ar from pulse_audit where id = ${data.id}`;
    const row = rows[0];
    if (!row?.snapshot) throw new core.BadRequestError("This entry cannot be undone.");
    const survey = row.survey_id ?? core.MAIN_SURVEY;
    if (!(await core.surveyExists(survey))) throw new core.BadRequestError("That survey no longer exists.");
    const current = await core.loadConfig(survey);
    const restored = normalizeConfig(typeof row.snapshot === "string" ? JSON.parse(row.snapshot) : row.snapshot);
    // The survey's open/closed state and the questionnaire lock are never changed by an undo.
    restored.general = { ...restored.general, status: current.general.status, closedAt: current.general.closedAt };
    restored.instrumentStatus = current.instrumentStatus;
    restored.frozenAt = current.frozenAt;
    await core.saveConfig(restored, survey);
    await core.auditCoalesced(core.actorOf(staff), `Undid: ${row.action_en}`.slice(0, 1000), `تراجع عن: ${row.action_ar}`.slice(0, 1000), 0, {
      snapshot: current,
      survey,
    });
    return { ok: true };
  });
