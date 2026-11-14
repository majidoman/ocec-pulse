/**
 * Server-only data access for OCEC Pulse: configuration, staff and audit log.
 * Import ONLY from server function handlers (dynamic import) or server routes.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { getRequest } from "@tanstack/react-start/server";
import { getSql } from "@/lib/db";
import type { StaffRole } from "@/lib/types";
import { defaultConfig, normalizeConfig, type PulseConfig } from "./config";
import type { Me } from "./results-types";

export class ForbiddenError extends Error {
  readonly status = 403;
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class BadRequestError extends Error {
  readonly status = 400;
  constructor(message: string) {
    super(message);
    this.name = "BadRequestError";
  }
}

export class RateLimitedError extends Error {
  readonly status = 429;
  constructor() {
    super("Too many requests");
    this.name = "RateLimitedError";
  }
}

export const newId = () => randomUUID();
export const newToken = () => randomBytes(24).toString("base64url");
export const newCode = () => randomBytes(18).toString("base64url");

// ── Settings documents ───────────────────────────────────────────────────────

export async function readSetting<T>(key: string): Promise<T | null> {
  const sql = await getSql();
  const rows = await sql<{ value: T }>`select value from pulse_settings where key = ${key}`;
  if (!rows.length) return null;
  const v = rows[0].value as unknown;
  // PGLite returns jsonb parsed; pg does too. Be tolerant of a string anyway.
  return (typeof v === "string" ? JSON.parse(v) : v) as T;
}

export async function writeSetting(key: string, value: unknown): Promise<void> {
  const sql = await getSql();
  const json = JSON.stringify(value);
  await sql`
    insert into pulse_settings (key, value, updated_at)
    values (${key}, ${json}::jsonb, now())
    on conflict (key) do update set value = excluded.value, updated_at = now()
  `;
}

export async function loadConfig(): Promise<PulseConfig> {
  const stored = await readSetting<unknown>("config");
  if (!stored) return defaultConfig();
  return normalizeConfig(stored);
}

export async function saveConfig(config: PulseConfig): Promise<void> {
  await writeSetting("config", normalizeConfig(config));
}

// ── Secrets (SMTP password) ──────────────────────────────────────────────────
// Encrypted at rest with a key derived from the app's own session secret, so a
// database dump alone does not reveal the mailbox password.

function secretKey(): Buffer {
  const base = process.env.BETTER_AUTH_SECRET?.trim() || "ocec-pulse-preview-key";
  return createHash("sha256").update(`pulse-secrets:${base}`).digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secretKey(), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv.toString("base64"), cipher.getAuthTag().toString("base64"), body.toString("base64")].join(".");
}

export function decryptSecret(stored: string): string | null {
  try {
    const [iv, tag, body] = stored.split(".");
    const decipher = createDecipheriv("aes-256-gcm", secretKey(), Buffer.from(iv, "base64"));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(body, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

// ── Staff ────────────────────────────────────────────────────────────────────

export interface StaffContext {
  userId: string;
  email: string | null;
  name: string | null;
  role: StaffRole;
  departmentId: string | null;
}

async function sessionProfile(userId: string): Promise<{ email: string | null; name: string | null }> {
  const sql = await getSql();
  try {
    const rows = await sql<{ email: string | null; name: string | null }>`
      select email, name from "user" where id = ${userId}
    `;
    return rows[0] ?? { email: null, name: null };
  } catch {
    return { email: null, name: null };
  }
}

export async function staffCount(): Promise<number> {
  const sql = await getSql();
  const rows = await sql<{ n: number }>`select count(*) as n from pulse_staff where active = true`;
  return Number(rows[0]?.n ?? 0);
}

export async function getMe(userId: string): Promise<Me> {
  const sql = await getSql();
  const profile = await sessionProfile(userId);
  const rows = await sql<{ role: StaffRole; department_id: string | null; active: boolean }>`
    select role, department_id, active from pulse_staff where user_id = ${userId}
  `;
  const staff = rows[0];
  if (staff?.active) {
    await sql`
      update pulse_staff
      set last_seen_at = now(), email = coalesce(${profile.email}, email), name = coalesce(${profile.name}, name)
      where user_id = ${userId} and (last_seen_at is null or last_seen_at < now() - interval '10 minutes')
    `;
    return { userId, ...profile, role: staff.role, departmentId: staff.department_id, canClaim: false };
  }
  const canClaim = !staff && (await staffCount()) === 0;
  return { userId, ...profile, role: null, departmentId: null, canClaim };
}

/** Resolve the caller as active staff with one of `roles`, or throw 403. */
export async function requireStaff(userId: string, roles?: StaffRole[]): Promise<StaffContext> {
  const sql = await getSql();
  const rows = await sql<{
    role: StaffRole;
    department_id: string | null;
    active: boolean;
    email: string | null;
    name: string | null;
  }>`select role, department_id, active, email, name from pulse_staff where user_id = ${userId}`;
  const staff = rows[0];
  if (!staff || !staff.active) throw new ForbiddenError("You do not have access to this census.");
  if (roles && !roles.includes(staff.role)) throw new ForbiddenError("Your role cannot do this.");
  return {
    userId,
    email: staff.email,
    name: staff.name,
    role: staff.role,
    departmentId: staff.department_id,
  };
}

export const ADMIN_ROLES: StaffRole[] = ["super", "pc"];

/** The first signed-in user becomes the owner. Fails once any administrator exists. */
export async function claimOwnership(userId: string): Promise<void> {
  const sql = await getSql();
  const profile = await sessionProfile(userId);
  // Single statement so two simultaneous claims cannot both succeed.
  const rows = await sql<{ user_id: string }>`
    insert into pulse_staff (user_id, email, name, role, active)
    select ${userId}, ${profile.email}, ${profile.name}, 'super', true
    where not exists (select 1 from pulse_staff where active = true)
    on conflict (user_id) do nothing
    returning user_id
  `;
  if (!rows.length) throw new ForbiddenError("An administrator already exists. Ask them for an invitation.");
  await audit(profile.email ?? userId, "Claimed ownership of the census", "تولّى ملكية الاستبيان");
}

// ── Audit ────────────────────────────────────────────────────────────────────

export async function audit(actor: string, en: string, ar: string): Promise<void> {
  const sql = await getSql();
  await sql`insert into pulse_audit (actor, action_en, action_ar) values (${actor}, ${en}, ${ar})`;
}

/**
 * Like audit(), but if the same person's most recent entry has the same text and is under
 * `minutes` old, its time is moved forward instead of adding a duplicate line (settings save
 * as you type).
 */
export async function auditCoalesced(actor: string, en: string, ar: string, minutes = 15): Promise<void> {
  const sql = await getSql();
  const last = await sql<{ id: number; actor: string; action_en: string; recent: boolean }>`
    select id, actor, action_en, (at > now() - make_interval(mins => ${minutes})) as recent
    from pulse_audit order by id desc limit 1
  `;
  const row = last[0];
  if (row && row.actor === actor && row.action_en === en && row.recent) {
    await sql`update pulse_audit set at = now() where id = ${row.id}`;
    return;
  }
  await audit(actor, en, ar);
}

export function actorOf(ctx: StaffContext): string {
  return ctx.email ?? ctx.name ?? ctx.userId;
}

// ── Request helpers ──────────────────────────────────────────────────────────

/** Public origin of this app, for links in emails. */
export function requestOrigin(config: PulseConfig): string {
  const fixed = config.general.publicUrl.trim().replace(/\/+$/, "");
  if (fixed) return fixed;
  const request = getRequest();
  if (!request) return "";
  const h = request.headers;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return new URL(request.url).origin;
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto.split(",")[0].trim()}://${host.split(",")[0].trim()}`;
}

/** Today's date (YYYY-MM-DD) in the census timezone. */
export function todayIn(timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: timezone || "Asia/Muscat" }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/** HH:MM now in the census timezone. */
export function clockIn(timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone || "Asia/Muscat",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(11, 16);
  }
}

// ── Abuse protection ─────────────────────────────────────────────────────────

function callerAddress(): string | null {
  const request = getRequest();
  if (!request) return null;
  const h = request.headers;
  const raw = h.get("x-vercel-forwarded-for") ?? h.get("x-real-ip") ?? h.get("x-forwarded-for");
  return raw ? raw.split(",")[0].trim() || null : null;
}

/**
 * Counts one call from the caller's network address within the current hour and throws
 * RateLimitedError past `limit`. Only a salted one-way hash of the address is kept, per hour,
 * and it is never linked to a response, an invitation or an account.
 */
export async function rateLimit(kind: string, limit: number): Promise<void> {
  const address = callerAddress();
  if (!address) return;
  const sql = await getSql();
  const hour = new Date();
  hour.setUTCMinutes(0, 0, 0);
  const bucket = createHash("sha256").update(`${secretKey().toString("hex")}|${kind}|${address}|${hour.toISOString()}`).digest("hex");
  const rows = await sql.query<{ n: number }>(
    `insert into pulse_ratelimit (bucket, hour, n) values ($1, $2::timestamptz, 1)
     on conflict (bucket, hour) do update set n = pulse_ratelimit.n + 1
     returning n`,
    [bucket, hour.toISOString()],
  );
  if (Number(rows[0]?.n ?? 0) > limit) throw new RateLimitedError();
  if (Math.random() < 0.02) await sql`delete from pulse_ratelimit where hour < now() - interval '3 hours'`;
}
