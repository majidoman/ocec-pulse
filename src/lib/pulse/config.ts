/**
 * Shared (client + server) shape of the census configuration.
 *
 * The whole document is stored server-side in `pulse_settings` under the key
 * `config`. Admins read and write the full document; anonymous survey takers
 * only ever receive `toPublicConfig()`.
 *
 * No server-only imports here — this module is bundled into the browser.
 */
import type {
  ActionPlan,
  BenchmarkSource,
  CensusStatus,
  ChangelogEntry,
  Department,
  Dimension,
  InstrumentStatus,
  Lang,
  Localized,
  Question,
  ReminderRule,
  StaffRole,
} from "../types";
import { DEPARTMENTS, DIMENSIONS, QUESTIONS, SURVEY_NAME } from "../questionnaire";

export interface GeneralSettings {
  /** Full legal name, e.g. "Oman Convention & Exhibition Centre". Shown as {orgName}. */
  orgName: Localized;
  /** Short name used inside sentences and questions, e.g. "OCEC". Shown as {org}. */
  orgShort: Localized;
  cycleName: Localized;
  timezone: string;
  defaultLang: Lang;
  supportEmail: string;
  supportPhone: string;
  status: CensusStatus;
  /** Allow the survey to be taken from the shared link / QR code without a personal token. */
  allowOpenLink: boolean;
  /** Public address of this app, used in invitation links. Blank = detect from the request. */
  publicUrl: string;
  /** Set by the server when status moves to `closed`. */
  closedAt?: string;
}

export interface BrandingSettings {
  /** Product name in the header and browser tab, e.g. "OCEC Pulse". Blank = "<short name> Pulse". Shown as {app}. */
  appName: Localized;
  logoDataUrl: string;
  primary: string;
  accent: string;
}

export interface CalendarSettings {
  kickoff: string;
  freeze: string;
  fieldOpen: string;
  fieldClose: string;
  presentation: string;
  note: Localized;
}

export interface AnonymitySettings {
  kFloor: number;
  retentionMonths: number;
  inviteDeleteDays: number;
  stripSelfId: boolean;
  noExternalTraining: boolean;
  privacyNotice: Localized;
}

export type EmailProvider = "none" | "smtp";

export interface EmailSettings {
  fromName: string;
  fromAddress: string;
  replyTo: string;
  provider: EmailProvider;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  subjectEn: string;
  subjectAr: string;
  bodyEn: string;
  bodyAr: string;
}

export interface ReminderSettings {
  enabled: boolean;
  quietStart: string;
  quietEnd: string;
  rules: ReminderRule[];
}

export interface IntegrationSettings {
  webhook: string;
}

export interface PriorCycle {
  engagement: number | null;
  enps: number | null;
  response: number | null;
  /** Favourable % by dimension id for the prior cycle. */
  dimensions: Record<string, number>;
}

export interface TrendPoint {
  year: number;
  engagement: number | null;
  enps: number | null;
  response: number | null;
}

export interface BenchmarkSettings {
  priorYearLabel: string;
  prior: PriorCycle;
  /** Earlier cycles, oldest first. The current cycle is appended live. */
  trend: TrendPoint[];
  sources: BenchmarkSource[];
}

export interface PulseConfig {
  version: number;
  general: GeneralSettings;
  branding: BrandingSettings;
  calendar: CalendarSettings;
  anonymity: AnonymitySettings;
  email: EmailSettings;
  reminderCfg: ReminderSettings;
  integrations: IntegrationSettings;
  benchmarks: BenchmarkSettings;
  departments: Department[];
  dimensions: Dimension[];
  questions: Question[];
  instrumentStatus: InstrumentStatus;
  frozenAt?: string;
  changelog: ChangelogEntry[];
  actions: ActionPlan[];
}

/** What an anonymous survey taker's browser is allowed to see. */
export interface PublicConfig {
  general: Pick<
    GeneralSettings,
    "orgName" | "orgShort" | "cycleName" | "defaultLang" | "supportEmail" | "supportPhone" | "status" | "allowOpenLink"
  >;
  branding: BrandingSettings;
  calendar: Pick<CalendarSettings, "fieldOpen" | "fieldClose" | "note">;
  anonymity: Pick<AnonymitySettings, "kFloor" | "privacyNotice">;
  departments: Pick<Department, "id" | "name">[];
  dimensions: Dimension[];
  questions: Question[];
}

export const ROLE_LABEL: Record<StaffRole, Localized> = {
  super: { en: "Super admin", ar: "مدير عام" },
  pc: { en: "People & Culture", ar: "الأفراد والثقافة" },
  exec: { en: "Executive viewer", ar: "مشاهد تنفيذي" },
  head: { en: "Department head", ar: "رئيس إدارة" },
  viewer: { en: "Viewer", ar: "مشاهد" },
};

export function canEditSettings(role: StaffRole | null | undefined) {
  return role === "super" || role === "pc";
}

/** Roles that may read free-text comments. */
export function canReadComments(role: StaffRole | null | undefined) {
  return role === "super" || role === "pc" || role === "exec" || role === "head";
}

const defaultReminders: ReminderRule[] = [
  {
    id: "d3",
    label: { en: "Day 3 · gentle nudge", ar: "اليوم ٣ · تذكير هادئ" },
    dayOffset: 3,
    enabled: true,
    sent: 0,
    bodyEn: "A quiet note: the census is still open, still confidential, still about twelve minutes.",
    bodyAr: "ملاحظة هادئة: الاستبيان ما زال مفتوحاً وسرياً، وما زال نحو اثنتي عشرة دقيقة.",
  },
  {
    id: "d7",
    label: { en: "Day 7 · still open", ar: "اليوم ٧ · ما زال مفتوحاً" },
    dayOffset: 7,
    enabled: true,
    sent: 0,
    bodyEn: "Halfway. The house is listening. Your confidential link cannot be traced to you.",
    bodyAr: "منتصف الطريق. البيت يستمع. رابطك السري لا يُتتبع إليك.",
  },
  {
    id: "d10",
    label: { en: "Day 10 · last week", ar: "اليوم ١٠ · الأسبوع الأخير" },
    dayOffset: 10,
    enabled: true,
    sent: 0,
    bodyEn: "Last week of the census. Five minutes on a phone is enough to start.",
    bodyAr: "الأسبوع الأخير من الاستبيان. خمس دقائق على الهاتف تكفي للبدء.",
  },
];

export const CONFIG_VERSION = 1;

export function defaultConfig(): PulseConfig {
  return {
    version: CONFIG_VERSION,
    general: {
      orgName: { en: "", ar: "" },
      orgShort: { en: "", ar: "" },
      cycleName: SURVEY_NAME,
      timezone: "Asia/Muscat",
      defaultLang: "en",
      supportEmail: "",
      supportPhone: "",
      status: "draft",
      allowOpenLink: true,
      publicUrl: "",
    },
    branding: {
      appName: { en: "", ar: "" },
      logoDataUrl: "",
      primary: "#142A32",
      accent: "#2C6A6A",
    },
    calendar: {
      kickoff: "",
      freeze: "",
      fieldOpen: "",
      fieldClose: "",
      presentation: "",
      note: {
        en: "Field dates are confirmed at kick-off with People & Culture.",
        ar: "تُؤكَّد تواريخ الميدان عند الانطلاق مع الأفراد والثقافة.",
      },
    },
    anonymity: {
      kFloor: 5,
      retentionMonths: 24,
      inviteDeleteDays: 30,
      stripSelfId: true,
      noExternalTraining: true,
      privacyNotice: {
        en: "This census is anonymous. We do not store your name, email, IP address or device fingerprint with your answers. Results are never shown for groups smaller than five people. If you received a personal link, it is used only to make sure each person answers once; it is not stored with your response.",
        ar: "هذا الاستبيان مجهول الهوية. لا نحتفظ باسمك أو بريدك أو عنوان جهازك مع إجاباتك. لا تُعرض النتائج لمجموعات أقل من خمسة أشخاص. إن وصلك رابط شخصي فهو يُستخدم فقط لضمان إجابة واحدة لكل شخص ولا يُحفظ مع إجابتك.",
      },
    },
    email: {
      fromName: "",
      fromAddress: "",
      replyTo: "",
      provider: "none",
      smtpHost: "",
      smtpPort: 465,
      smtpSecure: true,
      smtpUser: "",
      subjectEn: "{{org_name}} — a confidential 12 minutes",
      subjectAr: "{{org_name}} — اثنتا عشرة دقيقة سرية",
      bodyEn:
        "Hello,\n\nThis is your confidential link for the {{org_name}} employee census. It cannot be traced to your answers. The census closes {{close_date}}.\n\n{{survey_link}}",
      bodyAr:
        "مرحباً،\n\nهذا رابطك السري لاستبيان موظفي {{org_name}}. لا يمكن ربطه بإجاباتك. يُغلق الاستبيان في {{close_date}}.\n\n{{survey_link}}",
    },
    reminderCfg: { enabled: true, quietStart: "21:00", quietEnd: "07:00", rules: defaultReminders },
    integrations: { webhook: "" },
    benchmarks: {
      priorYearLabel: "",
      prior: { engagement: null, enps: null, response: null, dimensions: {} },
      trend: [],
      sources: [],
    },
    departments: DEPARTMENTS.map((d) => ({ ...d })),
    dimensions: DIMENSIONS.map((d) => ({ ...d })),
    questions: QUESTIONS.map((q) => ({ ...q })),
    instrumentStatus: "draft",
    changelog: [],
    actions: [],
  };
}

/** Fill any keys missing from a stored document (older saves, partial writes). */
export function normalizeConfig(raw: unknown): PulseConfig {
  const base = defaultConfig();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<PulseConfig>;
  return {
    ...base,
    ...r,
    version: CONFIG_VERSION,
    general: { ...base.general, ...(r.general ?? {}) },
    branding: { ...base.branding, ...(r.branding ?? {}) },
    calendar: { ...base.calendar, ...(r.calendar ?? {}) },
    anonymity: { ...base.anonymity, ...(r.anonymity ?? {}) },
    email: { ...base.email, ...(r.email ?? {}) },
    reminderCfg: { ...base.reminderCfg, ...(r.reminderCfg ?? {}) },
    integrations: { ...base.integrations, ...(r.integrations ?? {}) },
    benchmarks: {
      ...base.benchmarks,
      ...(r.benchmarks ?? {}),
      prior: { ...base.benchmarks.prior, ...(r.benchmarks?.prior ?? {}) },
    },
    departments: Array.isArray(r.departments) ? r.departments : base.departments,
    dimensions: Array.isArray(r.dimensions) ? r.dimensions : base.dimensions,
    questions: Array.isArray(r.questions) ? r.questions : base.questions,
    changelog: Array.isArray(r.changelog) ? r.changelog : [],
    actions: Array.isArray(r.actions) ? r.actions : [],
  };
}

export function toPublicConfig(c: PulseConfig): PublicConfig {
  return {
    general: {
      orgName: c.general.orgName,
      orgShort: c.general.orgShort,
      cycleName: c.general.cycleName,
      defaultLang: c.general.defaultLang,
      supportEmail: c.general.supportEmail,
      supportPhone: c.general.supportPhone,
      status: c.general.status,
      allowOpenLink: c.general.allowOpenLink,
    },
    branding: c.branding,
    calendar: {
      fieldOpen: c.calendar.fieldOpen,
      fieldClose: c.calendar.fieldClose,
      note: c.calendar.note,
    },
    anonymity: { kFloor: c.anonymity.kFloor, privacyNotice: c.anonymity.privacyNotice },
    departments: c.departments.filter((d) => !d.archived).map((d) => ({ id: d.id, name: d.name })),
    dimensions: c.dimensions.filter((d) => d.visible && !d.archived),
    questions: c.questions.filter((q) => q.visible),
  };
}

export function totalHeadcount(c: Pick<PulseConfig, "departments">) {
  return c.departments.filter((d) => !d.archived).reduce((n, d) => n + (Number(d.headcount) || 0), 0);
}

export function applyTokens(
  template: string,
  vars: { survey_link?: string; close_date?: string; org_name?: string; first_name?: string; department?: string },
) {
  return template
    .replaceAll("{{first_name}}", vars.first_name ?? "")
    .replaceAll("{{department}}", vars.department ?? "")
    .replaceAll("{{survey_link}}", vars.survey_link ?? "")
    .replaceAll("{{close_date}}", vars.close_date ?? "")
    .replaceAll("{{org_name}}", vars.org_name ?? "");
}

export function formatIsoDate(iso: string, lang: Lang) {
  if (!iso) return lang === "ar" ? "يُؤكَّد عند الانطلاق" : "to be confirmed";
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-OM" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Muscat",
  }).format(d);
}

// ── White-label names ────────────────────────────────────────────────────────
// Every client-specific name in copy, questions and emails is written as a placeholder:
//   {org}      short name   ("OCEC")
//   {orgName}  full name    ("Oman Convention & Exhibition Centre")
//   {app}      product name ("OCEC Pulse")
// and filled in from settings when shown, so the same build serves any client.

export interface BrandNames {
  org: Localized;
  orgName: Localized;
  app: Localized;
}

const pick = (v: Localized | undefined, lang: Lang) => (v?.[lang] ?? "").trim() || (v?.[lang === "ar" ? "en" : "ar"] ?? "").trim();

export function brandNames(
  general: { orgName?: Localized; orgShort?: Localized },
  branding?: { appName?: Localized },
): BrandNames {
  const one = (lang: Lang) => {
    const full = pick(general.orgName, lang);
    const short = pick(general.orgShort, lang) || full;
    const org = short || (lang === "ar" ? "مؤسستك" : "your organisation");
    const orgName = full || org;
    const app = pick(branding?.appName, lang) || (short ? (lang === "ar" ? `نبض ${short}` : `${short} Pulse`) : lang === "ar" ? "نبض" : "Pulse");
    return { org, orgName, app };
  };
  const en = one("en");
  const ar = one("ar");
  return {
    org: { en: en.org, ar: ar.org },
    orgName: { en: en.orgName, ar: ar.orgName },
    app: { en: en.app, ar: ar.app },
  };
}

export function brandText(text: string, names: BrandNames, lang: Lang): string {
  if (!text || !text.includes("{")) return text;
  return text
    .replaceAll("{app}", names.app[lang])
    .replaceAll("{orgName}", names.orgName[lang])
    .replaceAll("{org}", names.org[lang]);
}

export function brandLocalized(value: Localized, names: BrandNames): Localized {
  return { en: brandText(value.en, names, "en"), ar: brandText(value.ar, names, "ar") };
}
