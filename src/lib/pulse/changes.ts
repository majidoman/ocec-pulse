/**
 * Plain-language description of what changed between two saved settings documents, for the audit log.
 * Shared and pure (no server imports) so it can be unit-tested.
 *
 * Values are shown as "old → new" only for short, non-sensitive facts (dates, numbers, on/off, status-like
 * words). Free text (names, email bodies, question wording) is reported by field name only, so the log
 * stays readable while someone is typing and never copies long text around.
 */

type Json = unknown;

const SECTION: Record<string, [string, string]> = {
  general: ["General", "عام"],
  branding: ["Branding", "الهوية"],
  calendar: ["Delivery calendar", "تقويم التسليم"],
  anonymity: ["Anonymity & privacy", "السرية والخصوصية"],
  email: ["Invitation email", "بريد الدعوة"],
  reminderCfg: ["Reminders", "التذكيرات"],
  integrations: ["Integrations", "التكاملات"],
  benchmarks: ["Benchmarks", "المقارنات"],
  departments: ["Departments", "الإدارات"],
  dimensions: ["Survey topics", "محاور الاستبيان"],
  questions: ["Questions", "الأسئلة"],
  instrumentStatus: ["Questionnaire status", "حالة الاستبيان"],
  actions: ["Action plans", "خطط العمل"],
};

const FIELD: Record<string, [string, string]> = {
  orgName: ["organisation name", "اسم الجهة"],
  orgShort: ["short name", "الاسم المختصر"],
  cycleName: ["survey name", "اسم الاستبيان"],
  timezone: ["time zone", "المنطقة الزمنية"],
  defaultLang: ["default language", "اللغة الافتراضية"],
  supportEmail: ["support email", "بريد الدعم"],
  supportPhone: ["support phone", "هاتف الدعم"],
  allowOpenLink: ["shared link", "الرابط العام"],
  publicUrl: ["site address", "عنوان الموقع"],
  appName: ["product name", "اسم المنتج"],
  logoDataUrl: ["logo", "الشعار"],
  primary: ["primary colour", "اللون الأساسي"],
  accent: ["accent colour", "لون التمييز"],
  fieldOpen: ["open date", "تاريخ الفتح"],
  fieldClose: ["close date", "تاريخ الإغلاق"],
  privacyNotice: ["privacy notice", "إشعار الخصوصية"],
  subjectEn: ["subject (EN)", "الموضوع (إنجليزي)"],
  subjectAr: ["subject (AR)", "الموضوع (عربي)"],
  bodyEn: ["message (EN)", "النص (إنجليزي)"],
  bodyAr: ["message (AR)", "النص (عربي)"],
  smtpHost: ["mail server", "خادم البريد"],
  smtpPort: ["mail port", "منفذ البريد"],
  fromAddress: ["sender address", "عنوان المرسل"],
  retentionDays: ["retention days", "أيام الاحتفاظ"],
  fromName: ["sender name", "اسم المرسل"],
  smtpSecure: ["SSL", "SSL"],
  smtpUser: ["mail user", "مستخدم البريد"],
  provider: ["mail provider", "مزود البريد"],
  rules: ["reminder rules", "قواعد التذكير"],
  quietStart: ["quiet hours start", "بداية ساعات الهدوء"],
  quietEnd: ["quiet hours end", "نهاية ساعات الهدوء"],
};

/** Keys whose changes are already logged separately, or are bookkeeping. */
const IGNORE = new Set(["general.status", "general.closedAt", "anonymity.kFloor", "changelog", "frozenAt", "version"]);

const isPlainObject = (v: Json): v is Record<string, Json> => typeof v === "object" && v !== null && !Array.isArray(v);
const same = (a: Json, b: Json) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** Short facts worth showing as old → new. */
function showable(v: Json): string | null {
  if (typeof v === "boolean") return v ? "on" : "off";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") {
    if (v === "") return "—";
    if (/^\d{4}-\d{2}-\d{2}/.test(v) && v.length <= 25) return v.slice(0, 10);
    if (/^[a-z0-9_.-]{1,20}$/i.test(v) && !v.includes("@")) return v;
  }
  return null;
}

function fieldLabel(key: string): [string, string] {
  return FIELD[key] ?? [key, key];
}

function describeObject(section: string, a: Record<string, Json>, b: Record<string, Json>) {
  const en: string[] = [];
  const ar: string[] = [];
  const keys = [...new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})])];
  for (const k of keys) {
    if (IGNORE.has(`${section}.${k}`) || same(a?.[k], b?.[k])) continue;
    const [le, la] = fieldLabel(k);
    const from = showable(a?.[k]);
    const to = showable(b?.[k]);
    if (from !== null && to !== null) {
      en.push(`${le} ${from} → ${to}`);
      ar.push(`${la} ${from} ← ${to}`);
    } else {
      en.push(le);
      ar.push(la);
    }
  }
  return { en, ar };
}

function describeList(a: Json[], b: Json[]) {
  const id = (x: Json) => (isPlainObject(x) && typeof x.id === "string" ? x.id : JSON.stringify(x));
  const before = new Map((a ?? []).map((x) => [id(x), x]));
  const after = new Map((b ?? []).map((x) => [id(x), x]));
  let added = 0;
  let removed = 0;
  let edited = 0;
  for (const [k, v] of after) {
    if (!before.has(k)) added += 1;
    else if (!same(before.get(k), v)) edited += 1;
  }
  for (const k of before.keys()) if (!after.has(k)) removed += 1;
  const order = !added && !removed && !edited && !same([...before.keys()], [...after.keys()]);
  const en: string[] = [];
  const ar: string[] = [];
  if (added) (en.push(`${added} added`), ar.push(`أُضيف ${added}`));
  if (edited) (en.push(`${edited} edited`), ar.push(`عُدّل ${edited}`));
  if (removed) (en.push(`${removed} removed`), ar.push(`حُذف ${removed}`));
  if (order) (en.push("reordered"), ar.push("أُعيد الترتيب"));
  return { en, ar };
}

/** Returns null when nothing a person would care about changed. */
export function describeConfigChanges(prev: Record<string, Json>, next: Record<string, Json>): { en: string; ar: string } | null {
  const partsEn: string[] = [];
  const partsAr: string[] = [];
  const keys = [...new Set([...Object.keys(prev), ...Object.keys(next)])];
  for (const key of keys) {
    if (IGNORE.has(key) || same(prev[key], next[key])) continue;
    const [se, sa] = SECTION[key] ?? [key, key];
    const a = prev[key];
    const b = next[key];
    let detail: { en: string[]; ar: string[] };
    if (Array.isArray(a) || Array.isArray(b)) detail = describeList((a as Json[]) ?? [], (b as Json[]) ?? []);
    else if (isPlainObject(a) || isPlainObject(b)) detail = describeObject(key, (a as Record<string, Json>) ?? {}, (b as Record<string, Json>) ?? {});
    else {
      const from = showable(a);
      const to = showable(b);
      detail = from !== null && to !== null ? { en: [`${from} → ${to}`], ar: [`${from} ← ${to}`] } : { en: [], ar: [] };
    }
    if (!detail.en.length && (isPlainObject(a) || isPlainObject(b))) continue;
    partsEn.push(detail.en.length ? `${se} (${detail.en.join(", ")})` : se);
    partsAr.push(detail.ar.length ? `${sa} (${detail.ar.join("، ")})` : sa);
  }
  if (!partsEn.length) return null;
  return { en: `Changed settings: ${partsEn.join("; ")}`, ar: `تعديل الإعدادات: ${partsAr.join("؛ ")}` };
}
