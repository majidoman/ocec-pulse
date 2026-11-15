/** Browser-side helpers for the "I'm not a robot" check (see components/captcha.tsx). */
/** Fetch options carrying a solved check, for authClient.signIn.email / signUp.email (second argument). */
export function captchaFetch(payload: string | null): { headers?: Record<string, string> } {
  return payload && payload !== "off" ? { headers: { "x-pulse-captcha": payload } } : {};
}

export const CAPTCHA_MISSING = {
  en: "Tick “I'm not a robot” first, and wait for the green tick.",
  ar: "ضع علامة على «أنا لست روبوتاً» أولاً وانتظر ظهور علامة التحقق.",
};

/** Plain-language message for a sign-in / sign-up error from /api/auth. */
export function authErrorText(
  err: { code?: string; message?: string; status?: number } | null | undefined,
  loc: (v: { en: string; ar: string }) => string,
  fallback: { en: string; ar: string },
): string {
  switch (err?.code) {
    case "CAPTCHA_REQUIRED":
      return loc({ en: "The “I'm not a robot” check expired or was not done. Tick it again, then retry.", ar: "انتهت صلاحية التحقق «أنا لست روبوتاً» أو لم يكتمل. ضع العلامة مرة أخرى ثم أعد المحاولة." });
    case "TOO_MANY_ATTEMPTS":
      return loc({ en: "Too many sign-in attempts. Wait an hour, then try again.", ar: "محاولات دخول كثيرة. انتظر ساعة ثم أعد المحاولة." });
    case "INVALID_EMAIL_OR_PASSWORD":
      return loc({ en: "The email or password is not right.", ar: "البريد الإلكتروني أو كلمة المرور غير صحيحة." });
    case "INVITE_ONLY":
      return loc({ en: "Accounts are by invitation only. Open the invitation link from your email.", ar: "الحسابات بالدعوة فقط. افتح رابط الدعوة من بريدك." });
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return loc({ en: "An account with this email already exists. Sign in instead.", ar: "يوجد حساب بهذا البريد. سجّل الدخول بدلاً من ذلك." });
    default:
      return err?.message || loc(fallback);
  }
}

let statusPromise: Promise<boolean> | null = null;
/** Whether the server wants the check (asked once per page load). */
export function captchaEnabledOnServer(): Promise<boolean> {
  statusPromise ??= fetch("/api/captcha?status=1", { cache: "no-store" })
    .then((r) => r.json() as Promise<{ enabled?: boolean }>)
    .then((s) => s.enabled !== false)
    .catch(() => true);
  return statusPromise;
}

/** The payload to send: the solved one, "off" when the server has the check switched off, or null. */
export async function captchaForSubmit(current: string | null): Promise<string | null> {
  if (current) return current;
  return (await captchaEnabledOnServer()) ? null : "off";
}
