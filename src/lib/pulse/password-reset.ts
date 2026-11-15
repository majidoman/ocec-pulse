/**
 * "Forgot password" for staff accounts (email and password sign-in).
 *
 * Built on the sign-in library's own pieces (its verification table and password hashing) without
 * changing its frozen configuration file:
 * - requestPasswordReset: always answers the same way whether or not the email has an account, so
 *   nobody can use it to find out who has access. When it does, a single-use link valid for 60
 *   minutes is emailed. Only a hash of the link's token is stored.
 * - resetPassword: checks the link, sets the new password, signs the account out everywhere and
 *   writes the change history.
 * Both are limited per network address and per account.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const TOKEN_MINUTES = 60;
const MIN_LENGTH = 10;

export type ResetRequestResult = { ok: true } | { ok: false; reason: "mail_not_set_up" | "rate_limited" };
export type ResetResult = { ok: true } | { ok: false; reason: "invalid_or_expired" | "too_short" | "rate_limited" };

function appBaseUrl() {
  return (process.env.BETTER_AUTH_URL ?? "").replace(/\/+$/, "");
}

export const requestPasswordReset = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ email: z.string().trim().toLowerCase().email().max(254) }).parse(d))
  .handler(async ({ data }): Promise<ResetRequestResult> => {
    const core = await import("./core.server");
    const mail = await import("./mail.server");
    const { createHash, randomBytes } = await import("node:crypto");
    try {
      await core.rateLimit("pw-reset", 10);
      await core.rateLimit(`pw-reset:${data.email}`, 3, { perAddress: false });
    } catch (e) {
      if (e instanceof core.RateLimitedError) return { ok: false, reason: "rate_limited" };
      throw e;
    }
    const config = await core.loadConfig();
    if (!(await mail.systemMailAvailable(config))) return { ok: false, reason: "mail_not_set_up" };

    const { auth } = await import("@/lib/auth/server");
    const ctx = await auth.$context;
    const found = await ctx.internalAdapter.findUserByEmail(data.email).catch(() => null);
    if (!found?.user) return { ok: true }; // same answer as for a real account

    const token = randomBytes(32).toString("base64url");
    const hash = createHash("sha256").update(token).digest("hex");
    await ctx.internalAdapter.createVerificationValue({
      identifier: `pulse-reset:${hash}`,
      value: found.user.id,
      expiresAt: new Date(Date.now() + TOKEN_MINUTES * 60_000),
    });
    const link = `${appBaseUrl()}/reset-password?token=${token}`;
    const { brandNames } = await import("./config");
    const names = brandNames(config.general, config.branding);
    try {
      await mail.sendSystemMail(
        config,
        mail.bilingual(
          found.user.email,
          `Reset your ${names.app.en} password`,
          `إعادة تعيين كلمة مرور ${names.app.ar}`,
          `Someone asked to reset the password for this email on ${names.app.en}.\n\nTo choose a new password, open this link within ${TOKEN_MINUTES} minutes:\n${link}\n\nIf it was not you, ignore this email; your password stays the same.`,
          `طُلبت إعادة تعيين كلمة المرور لهذا البريد في ${names.app.ar}.\n\nلاختيار كلمة مرور جديدة افتح هذا الرابط خلال ${TOKEN_MINUTES} دقيقة:\n${link}\n\nإن لم تكن أنت صاحب الطلب فتجاهل هذه الرسالة، وستبقى كلمة المرور كما هي.`,
        ),
      );
    } catch (e) {
      // Do not reveal the failure to the requester (it would confirm the account exists); log it.
      console.error("[password-reset] email not sent:", e instanceof Error ? e.message : e);
    }
    return { ok: true };
  });

export const resetPassword = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{20,100}$/), password: z.string().max(128) }).parse(d),
  )
  .handler(async ({ data }): Promise<ResetResult> => {
    const core = await import("./core.server");
    const { createHash } = await import("node:crypto");
    try {
      await core.rateLimit("pw-reset-set", 20);
    } catch (e) {
      if (e instanceof core.RateLimitedError) return { ok: false, reason: "rate_limited" };
      throw e;
    }
    if (data.password.length < MIN_LENGTH) return { ok: false, reason: "too_short" };
    const { auth } = await import("@/lib/auth/server");
    const ctx = await auth.$context;
    const hash = createHash("sha256").update(data.token).digest("hex");
    const row = await ctx.internalAdapter.consumeVerificationValue(`pulse-reset:${hash}`);
    if (!row || new Date(row.expiresAt).getTime() < Date.now()) return { ok: false, reason: "invalid_or_expired" };
    const userId = row.value;
    const hashed = await ctx.password.hash(data.password);
    const accounts = await ctx.internalAdapter.findAccounts(userId);
    if (accounts.some((a) => a.providerId === "credential")) await ctx.internalAdapter.updatePassword(userId, hashed);
    else await ctx.internalAdapter.createAccount({ userId, providerId: "credential", accountId: userId, password: hashed });
    await ctx.internalAdapter.deleteUserSessions(userId);
    const user = await ctx.internalAdapter.findUserById(userId);
    await core.audit(
      user?.email ?? userId,
      "Password changed with a reset link; signed out everywhere.",
      "تغيير كلمة المرور عبر رابط إعادة التعيين؛ تم تسجيل الخروج من كل الأجهزة.",
    );
    return { ok: true };
  });
