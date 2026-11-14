/**
 * Email, invitations and reminders. Server-only.
 *
 * Sending is done in small batches so one request never runs long enough to hit
 * a serverless time limit: callers loop until `remaining` reaches zero.
 */
import { getSql } from "@/lib/db";
import { applyTokens, brandNames, brandText, formatIsoDate, type PulseConfig } from "./config";
import {
  BadRequestError,
  clockIn,
  decryptSecret,
  loadConfig,
  newId,
  newToken,
  readSetting,
  requestOrigin,
  todayIn,
  writeSetting,
} from "./core.server";
import type { InviteeStats } from "./results-types";

interface SmtpSecret {
  passEnc: string;
}

export interface OutgoingMail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

const escapeHtml = (s: string) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

function linkify(escaped: string) {
  return escaped.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>');
}

function block(text: string, dir: "ltr" | "rtl") {
  const html = linkify(escapeHtml(text)).replaceAll("\n", "<br>");
  return `<div dir="${dir}" style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#142A32;text-align:${dir === "rtl" ? "right" : "left"}">${html}</div>`;
}

/** One bilingual message: English first, Arabic below. */
export function bilingual(to: string, subjectEn: string, subjectAr: string, bodyEn: string, bodyAr: string): OutgoingMail {
  return {
    to,
    subject: subjectAr && subjectAr !== subjectEn ? `${subjectEn} | ${subjectAr}` : subjectEn,
    text: `${bodyEn}\n\n— — —\n\n${bodyAr}`,
    html: `${block(bodyEn, "ltr")}<hr style="border:none;border-top:1px solid #d9d4c7;margin:24px 0">${block(bodyAr, "rtl")}`,
  };
}

export async function smtpPasswordSet(): Promise<boolean> {
  const s = await readSetting<SmtpSecret>("smtp_secret");
  return Boolean(s?.passEnc);
}

export function mailReady(config: PulseConfig, hasPassword: boolean): string | null {
  const e = config.email;
  if (e.provider !== "smtp") return "Email sending is not set up yet. Choose SMTP in Settings → Invitations & email.";
  if (!e.smtpHost.trim()) return "SMTP host is missing.";
  if (!e.fromAddress.includes("@")) return "From address is missing.";
  if (e.smtpUser.trim() && !hasPassword) return "SMTP password is missing.";
  return null;
}

async function transport(config: PulseConfig) {
  const secret = await readSetting<SmtpSecret>("smtp_secret");
  const problem = mailReady(config, Boolean(secret?.passEnc));
  if (problem) throw new BadRequestError(problem);
  const pass = secret?.passEnc ? decryptSecret(secret.passEnc) : null;
  if (config.email.smtpUser.trim() && pass === null) {
    throw new BadRequestError("The saved SMTP password could not be read. Enter it again in Settings → Invitations & email.");
  }
  const nodemailer = await import("nodemailer");
  const e = config.email;
  return nodemailer.createTransport({
    host: e.smtpHost.trim(),
    port: Number(e.smtpPort) || (e.smtpSecure ? 465 : 587),
    secure: Boolean(e.smtpSecure),
    auth: e.smtpUser.trim() ? { user: e.smtpUser.trim(), pass: pass ?? "" } : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
}

export async function sendMail(config: PulseConfig, mails: OutgoingMail[]): Promise<{ to: string; ok: boolean; error?: string }[]> {
  if (!mails.length) return [];
  const tx = await transport(config);
  const e = config.email;
  const from = e.fromName.trim() ? `"${e.fromName.replaceAll('"', "")}" <${e.fromAddress.trim()}>` : e.fromAddress.trim();
  const out: { to: string; ok: boolean; error?: string }[] = [];
  for (const m of mails) {
    try {
      await tx.sendMail({
        from,
        to: m.to,
        replyTo: e.replyTo.trim() || undefined,
        subject: m.subject,
        text: m.text,
        html: m.html,
      });
      out.push({ to: m.to, ok: true });
    } catch (err) {
      out.push({ to: m.to, ok: false, error: err instanceof Error ? err.message.slice(0, 300) : "send failed" });
    }
  }
  tx.close();
  return out;
}

// ── Invitees ─────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

export interface RosterInput {
  email: string;
  departmentId?: string | null;
}

/** Add people to the invitation list. Existing emails keep their token and status. */
export async function addInvitees(rows: RosterInput[], config: PulseConfig): Promise<{ added: number; skipped: number; invalid: number }> {
  const sql = await getSql();
  const known = new Set(config.departments.map((d) => d.id));
  const byName = new Map<string, string>();
  for (const d of config.departments) {
    byName.set(d.name.en.trim().toLowerCase(), d.id);
    byName.set(d.name.ar.trim(), d.id);
  }
  let added = 0;
  let skipped = 0;
  let invalid = 0;
  const seen = new Set<string>();
  for (const row of rows.slice(0, 5000)) {
    const email = row.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email) || email.length > 254) {
      invalid += 1;
      continue;
    }
    if (seen.has(email)) {
      skipped += 1;
      continue;
    }
    seen.add(email);
    const raw = (row.departmentId ?? "").trim();
    const dept = known.has(raw) ? raw : (byName.get(raw.toLowerCase()) ?? byName.get(raw) ?? null);
    const res = await sql<{ id: string }>`
      insert into pulse_invitees (id, email, department_id, token)
      values (${newId()}, ${email}, ${dept}, ${newToken()})
      on conflict (email) do nothing
      returning id
    `;
    if (res.length) added += 1;
    else skipped += 1;
  }
  return { added, skipped, invalid };
}

export async function inviteeStats(config: PulseConfig): Promise<InviteeStats> {
  const sql = await getSql();
  const k = Math.max(2, Number(config.anonymity.kFloor) || 5);
  const rows = await sql<{ department_id: string | null; total: number; invited: number; opened: number; completed: number; failed: number }>`
    select department_id,
           count(*) as total,
           count(*) filter (where invited_at is not null) as invited,
           count(*) filter (where opened) as opened,
           count(*) filter (where used) as completed,
           count(*) filter (where send_error is not null) as failed
    from pulse_invitees group by department_id
  `;
  const sum = (f: (r: (typeof rows)[number]) => number) => rows.reduce((n, r) => n + Number(f(r)), 0);
  const total = sum((r) => r.total);
  const invited = sum((r) => r.invited);
  return {
    total,
    invited,
    opened: sum((r) => r.opened),
    completed: sum((r) => r.completed),
    failed: sum((r) => r.failed),
    pending: total - invited,
    // Completion by department is shown only once it reaches the anonymity floor.
    byDepartment: rows
      .filter((r) => r.department_id)
      .map((r) => {
        const t = Number(r.total);
        const c = Number(r.completed);
        return { id: r.department_id as string, total: t, completed: c >= k ? c : null };
      }),
  };
}

function closeDate(config: PulseConfig, lang: "en" | "ar") {
  return formatIsoDate(config.calendar.fieldClose, lang);
}

function inviteMail(config: PulseConfig, origin: string, row: { email: string; token: string }, extra?: { en: string; ar: string }): OutgoingMail {
  const link = `${origin}/survey?t=${encodeURIComponent(row.token)}`;
  const names = brandNames(config.general, config.branding);
  const vars = (lang: "en" | "ar") => ({
    survey_link: link,
    close_date: closeDate(config, lang),
    org_name: names.orgName[lang],
  });
  const fill = (text: string, lang: "en" | "ar") => brandText(applyTokens(text, vars(lang)), names, lang);
  const withLink = (body: string) => (body.includes(link) ? body : `${body}\n\n${link}`);
  const e = config.email;
  const bodyEn = withLink(fill(extra ? `${extra.en}\n\n{{survey_link}}` : e.bodyEn, "en"));
  const bodyAr = withLink(fill(extra ? `${extra.ar}\n\n{{survey_link}}` : e.bodyAr, "ar"));
  return bilingual(row.email, fill(e.subjectEn, "en"), fill(e.subjectAr, "ar"), bodyEn, bodyAr);
}

/**
 * Send first invitations to people who have not been invited yet.
 * `audience` is a department id or "all". Processes at most `limit` people.
 */
export async function sendInvitationBatch(
  config: PulseConfig,
  audience: string,
  limit: number,
): Promise<{ sent: number; failed: number; remaining: number }> {
  const sql = await getSql();
  const origin = requestOrigin(config);
  if (!origin) throw new BadRequestError("Set the public address of the app in Settings → General before sending.");
  const rows =
    audience === "all"
      ? await sql<{ id: string; email: string; token: string }>`
          select id, email, token from pulse_invitees
          where invited_at is null and used = false order by created_at, id limit ${limit}`
      : await sql<{ id: string; email: string; token: string }>`
          select id, email, token from pulse_invitees
          where invited_at is null and used = false and department_id = ${audience} order by created_at, id limit ${limit}`;
  if (!rows.length) return { sent: 0, failed: 0, remaining: 0 };
  const results = await sendMail(config, rows.map((r) => inviteMail(config, origin, r)));
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < rows.length; i += 1) {
    const r = results[i];
    if (r?.ok) {
      sent += 1;
      await sql`update pulse_invitees set invited_at = now(), last_sent_at = now(), send_error = null where id = ${rows[i].id}`;
    } else {
      failed += 1;
      // Mark as attempted so one bad address cannot block the queue.
      await sql`update pulse_invitees set invited_at = now(), send_error = ${r?.error ?? "send failed"} where id = ${rows[i].id}`;
    }
  }
  const left =
    audience === "all"
      ? await sql<{ n: number }>`select count(*) as n from pulse_invitees where invited_at is null and used = false`
      : await sql<{ n: number }>`select count(*) as n from pulse_invitees where invited_at is null and used = false and department_id = ${audience}`;
  return { sent, failed, remaining: Number(left[0]?.n ?? 0) };
}

interface ReminderState {
  [ruleId: string]: { lastRun?: string; sent: number };
}

export async function reminderState(): Promise<ReminderState> {
  return (await readSetting<ReminderState>("reminder_state")) ?? {};
}

function inQuietHours(config: PulseConfig): boolean {
  const { quietStart, quietEnd } = config.reminderCfg;
  if (!quietStart || !quietEnd || quietStart === quietEnd) return false;
  const now = clockIn(config.general.timezone);
  return quietStart < quietEnd ? now >= quietStart && now < quietEnd : now >= quietStart || now < quietEnd;
}

/**
 * Send any reminders that are due. Safe to call often: each invitee receives
 * each reminder step once, and only while they have not answered.
 */
export async function runDueReminders(
  limit: number,
  opts: { ignoreQuietHours?: boolean } = {},
): Promise<{ sent: number; failed: number; remaining: number; skipped?: string }> {
  const config = await loadConfig();
  if (!config.reminderCfg.enabled) return { sent: 0, failed: 0, remaining: 0, skipped: "Reminders are switched off." };
  if (config.general.status !== "open") return { sent: 0, failed: 0, remaining: 0, skipped: "The census is not open." };
  const today = todayIn(config.general.timezone);
  if (config.calendar.fieldClose && today > config.calendar.fieldClose) {
    return { sent: 0, failed: 0, remaining: 0, skipped: "The census window has ended." };
  }
  if (!opts.ignoreQuietHours && inQuietHours(config)) {
    return { sent: 0, failed: 0, remaining: 0, skipped: "Quiet hours — reminders wait until morning." };
  }
  const hasPass = await smtpPasswordSet();
  const problem = mailReady(config, hasPass);
  if (problem) return { sent: 0, failed: 0, remaining: 0, skipped: problem };
  const origin = requestOrigin(config);
  if (!origin) return { sent: 0, failed: 0, remaining: 0, skipped: "Public address is not set." };

  const sql = await getSql();
  const rules = [...config.reminderCfg.rules].sort((a, b) => a.dayOffset - b.dayOffset);
  const state = await reminderState();
  let sent = 0;
  let failed = 0;
  let remaining = 0;
  let budget = limit;
  for (let step = 0; step < rules.length; step += 1) {
    const rule = rules[step];
    if (!rule.enabled) continue;
    const days = Math.max(0, Math.round(Number(rule.dayOffset) || 0));
    const due = await sql<{ id: string; email: string; token: string }>`
      select id, email, token from pulse_invitees
      where used = false and send_error is null and invited_at is not null
        and reminders_sent <= ${step}
        and invited_at <= now() - make_interval(days => ${days})
      order by invited_at, id
      limit ${Math.max(budget, 0) + 1}
    `;
    if (!due.length) continue;
    const batch = due.slice(0, Math.max(budget, 0));
    remaining += due.length - batch.length;
    if (!batch.length) continue;
    const results = await sendMail(
      config,
      batch.map((r) => inviteMail(config, origin, r, { en: rule.bodyEn, ar: rule.bodyAr })),
    );
    for (let i = 0; i < batch.length; i += 1) {
      if (results[i]?.ok) {
        sent += 1;
        await sql`update pulse_invitees set reminders_sent = ${step + 1}, last_sent_at = now() where id = ${batch[i].id}`;
      } else {
        failed += 1;
        await sql`update pulse_invitees set reminders_sent = ${step + 1}, send_error = ${results[i]?.error ?? "send failed"} where id = ${batch[i].id}`;
      }
    }
    budget -= batch.length;
    const s = state[rule.id] ?? { sent: 0 };
    state[rule.id] = { sent: s.sent + results.filter((r) => r.ok).length, lastRun: new Date().toISOString() };
  }
  if (sent || failed) await writeSetting("reminder_state", state);
  return { sent, failed, remaining };
}

/**
 * Housekeeping that should happen even if nobody presses a button: delete the
 * invitation list once the configured number of days after close has passed.
 */
export async function runRetention(): Promise<{ purgedInvitees: number }> {
  const config = await loadConfig();
  const days = Number(config.anonymity.inviteDeleteDays) || 0;
  if (config.general.status !== "closed" || !config.general.closedAt || days <= 0) return { purgedInvitees: 0 };
  const closed = new Date(config.general.closedAt).getTime();
  if (!Number.isFinite(closed) || Date.now() - closed < days * 86_400_000) return { purgedInvitees: 0 };
  const sql = await getSql();
  const rows = await sql<{ id: string }>`delete from pulse_invitees returning id`;
  return { purgedInvitees: rows.length };
}

/** A random key that lets an external scheduler call the reminder endpoint. */
export async function cronKey(): Promise<string> {
  const existing = await readSetting<{ key: string }>("cron_key");
  if (existing?.key) return existing.key;
  const key = newToken();
  await writeSetting("cron_key", { key });
  return key;
}

