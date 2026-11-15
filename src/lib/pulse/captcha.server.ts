/**
 * "I'm not a robot" check (ALTCHA, self-hosted). No outside service is called and nothing about the
 * visitor is stored: the browser solves a small proof-of-work puzzle signed by this server, which
 * makes scripted password guessing and account creation slow and costly.
 *
 * Switch off with PULSE_CAPTCHA=off (for example on a closed network behind another check).
 */
import { createHash } from "node:crypto";
import { createChallenge, randomInt, verifySolution, type Challenge } from "altcha-lib";
import { deriveKey } from "altcha-lib/algorithms/pbkdf2";
import { getSql } from "@/lib/db";
import { secretKey } from "./core.server";

const ALGORITHM = "PBKDF2/SHA-256";
const COST = 1000;
const COUNTER_MIN = 2000;
const COUNTER_MAX = 6000;
const VALID_MINUTES = 10;
/** One solved check covers a short retry (e.g. a mistyped password once), not a guessing run. */
const MAX_USES = 3;

export const CAPTCHA_HEADER = "x-pulse-captcha";

export function captchaEnabled(): boolean {
  return (process.env.PULSE_CAPTCHA ?? "").trim().toLowerCase() !== "off";
}

function keys() {
  const base = secretKey().toString("hex");
  return {
    hmacSignatureSecret: createHash("sha256").update(`captcha-sig|${base}`).digest("hex"),
    hmacKeySignatureSecret: createHash("sha256").update(`captcha-key|${base}`).digest("hex"),
  };
}

export async function newChallenge(): Promise<Challenge> {
  return createChallenge({
    algorithm: ALGORITHM,
    cost: COST,
    counter: randomInt(COUNTER_MAX, COUNTER_MIN),
    deriveKey,
    expiresAt: Math.floor(Date.now() / 1000) + VALID_MINUTES * 60,
    ...keys(),
  });
}

/** True when the payload is a solved, unexpired check from this server that has not been over-used. */
export async function verifyCaptcha(payload: string | null | undefined): Promise<boolean> {
  if (!captchaEnabled()) return true;
  if (!payload || payload.length > 6000) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64").toString("utf8")) as {
      challenge?: Challenge;
      solution?: unknown;
      test?: boolean;
    };
    if (parsed.test || !parsed.challenge?.signature || !parsed.solution) return false;
    if (parsed.challenge.parameters?.algorithm !== ALGORITHM) return false;
    const result = await verifySolution({
      challenge: parsed.challenge,
      solution: parsed.solution as never,
      deriveKey,
      ...keys(),
    });
    if (!result.verified) return false;
    const sql = await getSql();
    const sig = createHash("sha256").update(parsed.challenge.signature).digest("hex");
    const expires = new Date(((parsed.challenge.parameters.expiresAt ?? 0) || Date.now() / 1000 + VALID_MINUTES * 60) * 1000);
    const rows = await sql.query<{ uses: number }>(
      `insert into pulse_captcha_used (sig, uses, expires_at) values ($1, 1, $2::timestamptz)
       on conflict (sig) do update set uses = pulse_captcha_used.uses + 1
       returning uses`,
      [sig, expires.toISOString()],
    );
    if (Math.random() < 0.05) await sql`delete from pulse_captcha_used where expires_at < now()`;
    return Number(rows[0]?.uses ?? 99) <= MAX_USES;
  } catch {
    return false;
  }
}
