/**
 * Reads a questionnaire from spreadsheet rows (the "Questions" sheet of the Excel template) into
 * sections and questions. Shared and pure: the import screen uses it for the preview, and the
 * unit test runs it in Node.
 *
 * Template columns (the header row is found by name, so columns may be reordered or added):
 *   ID (optional) · Section (EN) · Section (AR) · Section description (EN) · Section description (AR)
 *   · Short name (EN, optional) · Short name (AR, optional) · Question (EN) · Question (AR)
 *   · Type · Required · Reverse-worded
 *
 * Rules
 * - Type: "Agree 1–5", "Recommend 0–10" or "Comment" (Arabic and short forms accepted).
 * - Questions are grouped into sections in the order their section first appears.
 * - A 0–10 question needs a section of its own; at most one per survey (results combine them).
 * - Comment questions all go on the comments page; their section columns are ignored.
 * - Required defaults to Yes for scale questions and No for comments.
 */
import type { Dimension, Localized, Question } from "@/lib/types";

export type ImportType = "likert" | "enps" | "text";

export interface ImportIssue {
  /** Spreadsheet row number as Excel shows it (1-based), or 0 for the whole file. */
  row: number;
  en: string;
  ar: string;
}

export interface ImportedQuestionnaire {
  surveyName: Localized | null;
  dimensions: Dimension[];
  questions: Question[];
  counts: { sections: number; scale: number; enps: number; comments: number };
}

export interface ImportResult {
  ok: boolean;
  data: ImportedQuestionnaire | null;
  errors: ImportIssue[];
  warnings: ImportIssue[];
}

export const IMPORT_LIMITS = { sections: 20, questions: 120, comments: 5, text: 300, idLength: 12 };

type Field =
  | "id"
  | "secEn"
  | "secAr"
  | "descEn"
  | "descAr"
  | "shortEn"
  | "shortAr"
  | "qEn"
  | "qAr"
  | "type"
  | "required"
  | "reverse";

/** Header text → field. Checked in order, so the more specific names come first. */
const HEADERS: [Field, RegExp][] = [
  ["descEn", /section description.*\(en|وصف القسم.*إنجليزي/i],
  ["descAr", /section description.*\(ar|وصف القسم.*عربي/i],
  ["shortEn", /short name.*\(en|الاسم المختصر.*إنجليزي/i],
  ["shortAr", /short name.*\(ar|الاسم المختصر.*عربي/i],
  ["secEn", /^section.*\(en|القسم.*إنجليزي/i],
  ["secAr", /^section.*\(ar|القسم.*عربي/i],
  ["qEn", /question.*\(en|السؤال.*إنجليزي/i],
  ["qAr", /question.*\(ar|السؤال.*عربي/i],
  ["type", /^type|نوع/i],
  ["required", /^required|مطلوب|إلزامي/i],
  ["reverse", /^reverse|معكوس/i],
  ["id", /^id\b|^رمز|المعرّف|المعرف/i],
];

const clean = (v: unknown) =>
  String(v ?? "")
    .replace(/[‎‏‪-‮]/g, "")
    .replace(/\s+/g, " ")
    .trim();

function parseType(raw: string): ImportType | null {
  const v = raw.toLowerCase().replace(/[–—]/g, "-");
  if (!v) return null;
  if (/comment|text|open|تعليق|نص|مفتوح/.test(v)) return "text";
  if (/0\s*-\s*10|recommend|enps|nps|توصية|٠\s*-\s*١٠/.test(v)) return "enps";
  if (/1\s*-\s*5|agree|likert|scale|موافق|١\s*-\s*٥|مقياس/.test(v)) return "likert";
  return null;
}

function parseYesNo(raw: string): boolean | null {
  const v = raw.toLowerCase();
  if (!v) return null;
  if (/^(yes|y|true|1|نعم|✓)$/.test(v)) return true;
  if (/^(no|n|false|0|لا|✗)$/.test(v)) return false;
  return null;
}

/** A short label for charts: the name itself when short, otherwise its first two words. */
function shortOf(name: string) {
  if (name.length <= 22) return name;
  const words = name.split(" ");
  return words.slice(0, 2).join(" ").replace(/[,&/·-]+$/, "").trim();
}

function slug(s: string, used: Set<string>) {
  const base =
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24) || "section";
  let id = base;
  for (let i = 2; used.has(id); i += 1) id = `${base}-${i}`;
  used.add(id);
  return id;
}

/** Reads the optional "Survey" sheet: rows like ["Survey name (EN)", "…"], ["Survey name (AR)", "…"]. */
export function readSurveyName(rows: unknown[][] | null | undefined): Localized | null {
  if (!rows) return null;
  let en = "";
  let ar = "";
  for (const r of rows) {
    const label = clean(r[0]);
    const value = clean(r[1]).slice(0, 120);
    if (/name.*\(en|الاسم.*إنجليزي|اسم الاستبيان.*إنجليزي/i.test(label)) en = value;
    else if (/name.*\(ar|الاسم.*عربي|اسم الاستبيان.*عربي/i.test(label)) ar = value;
  }
  return en && ar ? { en, ar } : null;
}

export function parseQuestionnaire(rows: unknown[][], surveyRows?: unknown[][] | null): ImportResult {
  const errors: ImportIssue[] = [];
  const warnings: ImportIssue[] = [];
  const fail = (row: number, en: string, ar: string) => errors.push({ row, en, ar });
  const warn = (row: number, en: string, ar: string) => warnings.push({ row, en, ar });

  // Find the header row (the first row naming both question columns).
  const headerIndex = rows.findIndex((r) => {
    const cells = r.map(clean);
    return cells.some((c) => HEADERS.find(([f]) => f === "qEn")![1].test(c)) && cells.some((c) => HEADERS.find(([f]) => f === "qAr")![1].test(c));
  });
  if (headerIndex < 0) {
    fail(
      0,
      'No header row found. The sheet needs columns "Question (EN)" and "Question (AR)" — start from the template.',
      'لم يُعثر على صف العناوين. يجب أن يحتوي الملف على عمودَي "السؤال (إنجليزي)" و"السؤال (عربي)" — ابدأ من القالب.',
    );
    return { ok: false, data: null, errors, warnings };
  }
  const col: Partial<Record<Field, number>> = {};
  rows[headerIndex].forEach((cell, i) => {
    const text = clean(cell);
    const hit = HEADERS.find(([f, re]) => col[f] === undefined && re.test(text));
    if (hit) col[hit[0]] = i;
  });
  for (const [f, en, ar] of [
    ["secEn", "Section (EN)", "القسم (إنجليزي)"],
    ["secAr", "Section (AR)", "القسم (عربي)"],
    ["type", "Type", "النوع"],
  ] as const) {
    if (col[f] === undefined) fail(headerIndex + 1, `Missing column "${en}".`, `العمود "${ar}" غير موجود.`);
  }
  if (errors.length) return { ok: false, data: null, errors, warnings };

  const get = (r: unknown[], f: Field) => (col[f] === undefined ? "" : clean(r[col[f]!]));

  interface Section {
    key: string;
    name: Localized;
    blurb: Localized;
    short: Localized;
    firstRow: number;
    types: Set<ImportType>;
  }
  const sections = new Map<string, Section>();
  const sectionOrder: string[] = [];
  const raw: { row: number; id: string; section: string | null; type: ImportType; text: Localized; required: boolean; reverse: boolean }[] = [];
  const ids = new Set<string>();

  for (let i = headerIndex + 1; i < rows.length; i += 1) {
    const r = rows[i];
    const rowNo = i + 1;
    const qEn = get(r, "qEn");
    const qAr = get(r, "qAr");
    const typeText = get(r, "type");
    if (!qEn && !qAr && !typeText) continue; // blank row
    const type = parseType(typeText);
    if (!type) {
      fail(rowNo, `Type "${typeText || "(empty)"}" is not recognised. Use Agree 1–5, Recommend 0–10 or Comment.`, `النوع "${typeText || "(فارغ)"}" غير معروف. استخدم: موافقة ١–٥، أو توصية ٠–١٠، أو تعليق.`);
      continue;
    }
    if (!qEn || !qAr) {
      fail(rowNo, "The question needs both English and Arabic text.", "يجب كتابة السؤال بالإنجليزية والعربية.");
      continue;
    }
    if (qEn.length > IMPORT_LIMITS.text || qAr.length > IMPORT_LIMITS.text) {
      fail(rowNo, `The question is longer than ${IMPORT_LIMITS.text} characters.`, `السؤال أطول من ${IMPORT_LIMITS.text} حرفاً.`);
      continue;
    }
    const idRaw = get(r, "id");
    if (idRaw) {
      if (!/^[A-Za-z0-9_-]+$/.test(idRaw) || idRaw.length > IMPORT_LIMITS.idLength) {
        fail(rowNo, `ID "${idRaw}" may use only English letters, digits, - and _ (up to ${IMPORT_LIMITS.idLength}).`, `الرمز "${idRaw}" يقبل أحرفاً إنجليزية وأرقاماً و- و_ فقط (حتى ${IMPORT_LIMITS.idLength}).`);
        continue;
      }
      if (ids.has(idRaw.toUpperCase())) {
        fail(rowNo, `ID "${idRaw}" is used twice.`, `الرمز "${idRaw}" مكرر.`);
        continue;
      }
      ids.add(idRaw.toUpperCase());
    }
    const reqText = get(r, "required");
    const required = parseYesNo(reqText);
    if (reqText && required === null) warn(rowNo, `"Required" should be Yes or No; "${reqText}" was read as the default.`, `"مطلوب" يجب أن تكون نعم أو لا؛ اعتُمدت القيمة الافتراضية بدل "${reqText}".`);
    const revText = get(r, "reverse");
    const reverse = parseYesNo(revText);
    if (revText && reverse === null) warn(rowNo, `"Reverse-worded" should be Yes or No; "${revText}" was read as No.`, `"معكوس" يجب أن تكون نعم أو لا؛ اعتُبرت لا بدل "${revText}".`);
    if (reverse && type !== "likert") warn(rowNo, "Only Agree 1–5 questions can be reverse-worded; ignored.", "الأسئلة المعكوسة تكون في أسئلة الموافقة ١–٥ فقط؛ تم التجاهل.");

    let sectionKey: string | null = null;
    if (type !== "text") {
      const secEn = get(r, "secEn");
      const secAr = get(r, "secAr");
      if (!secEn || !secAr) {
        fail(rowNo, "Scale questions need a section name in English and Arabic.", "أسئلة المقياس تحتاج اسم القسم بالإنجليزية والعربية.");
        continue;
      }
      sectionKey = secEn.toLowerCase();
      let s = sections.get(sectionKey);
      if (!s) {
        const shortEn = get(r, "shortEn") || shortOf(secEn);
        const shortAr = get(r, "shortAr") || shortOf(secAr);
        s = {
          key: sectionKey,
          name: { en: secEn.slice(0, 80), ar: secAr.slice(0, 80) },
          blurb: { en: get(r, "descEn").slice(0, 200), ar: get(r, "descAr").slice(0, 200) },
          short: { en: shortEn.slice(0, 24), ar: shortAr.slice(0, 24) },
          firstRow: rowNo,
          types: new Set(),
        };
        sections.set(sectionKey, s);
        sectionOrder.push(sectionKey);
      } else if (s.name.ar !== secAr) {
        warn(rowNo, `Section "${secEn}" has a different Arabic name here; the first one is used.`, `القسم "${secAr}" له اسم عربي مختلف هنا؛ اعتُمد الاسم الأول.`);
      }
      s.types.add(type);
    }
    raw.push({
      row: rowNo,
      id: idRaw,
      section: sectionKey,
      type,
      text: { en: qEn, ar: qAr },
      required: required ?? type !== "text",
      reverse: type === "likert" && reverse === true,
    });
  }

  // Whole-file rules.
  const scale = raw.filter((q) => q.type === "likert");
  const enps = raw.filter((q) => q.type === "enps");
  const comments = raw.filter((q) => q.type === "text");
  if (!scale.length) fail(0, "The survey needs at least one Agree 1–5 question.", "يحتاج الاستبيان إلى سؤال موافقة ١–٥ واحد على الأقل.");
  if (enps.length > 1) fail(enps[1].row, "Only one Recommend 0–10 question is allowed.", "يُسمح بسؤال توصية ٠–١٠ واحد فقط.");
  if (raw.length > IMPORT_LIMITS.questions) fail(0, `Too many questions (${raw.length}); the limit is ${IMPORT_LIMITS.questions}.`, `عدد الأسئلة كبير (${raw.length})؛ الحد الأقصى ${IMPORT_LIMITS.questions}.`);
  if (sections.size > IMPORT_LIMITS.sections) fail(0, `Too many sections (${sections.size}); the limit is ${IMPORT_LIMITS.sections}.`, `عدد الأقسام كبير (${sections.size})؛ الحد الأقصى ${IMPORT_LIMITS.sections}.`);
  if (comments.length > IMPORT_LIMITS.comments) fail(comments[IMPORT_LIMITS.comments].row, `At most ${IMPORT_LIMITS.comments} comment questions.`, `الحد الأقصى ${IMPORT_LIMITS.comments} أسئلة تعليق.`);
  for (const s of sections.values()) {
    if (s.types.size > 1) fail(s.firstRow, `Section "${s.name.en}" mixes 1–5 and 0–10 questions. Put the 0–10 question in a section of its own.`, `القسم "${s.name.ar}" يجمع أسئلة ١–٥ و٠–١٠. ضع سؤال ٠–١٠ في قسم مستقل.`);
  }
  if (!comments.length) warn(0, "There are no comment questions. The comments page will be empty.", "لا توجد أسئلة تعليق، ستكون صفحة التعليقات فارغة.");
  if (!enps.length) warn(0, "There is no Recommend 0–10 question, so eNPS and key drivers will not be shown.", "لا يوجد سؤال توصية ٠–١٠، فلن يظهر مؤشر التوصية ولا المحركات الرئيسية.");
  for (const s of sections.values()) {
    const n = scale.filter((q) => q.section === s.key).length;
    if (s.types.has("likert") && n < 2) warn(s.firstRow, `Section "${s.name.en}" has only one question; a topic score from one question is less reliable.`, `القسم "${s.name.ar}" فيه سؤال واحد فقط؛ درجة المحور من سؤال واحد أقل موثوقية.`);
  }
  if (errors.length) return { ok: false, data: null, errors, warnings };

  // Build sections and questions with stable, unique IDs.
  const usedSlugs = new Set<string>(["open", "demo"]);
  const sectionId = new Map<string, string>();
  const dimensions: Dimension[] = sectionOrder.map((key, i) => {
    const s = sections.get(key)!;
    const id = slug(s.name.en, usedSlugs);
    sectionId.set(key, id);
    return {
      id,
      name: s.name,
      short: s.short,
      blurb: s.blurb,
      visible: true,
      archived: false,
      order: i + 1,
      kind: s.types.has("enps") ? "enps" : "likert",
    };
  });
  const counters = new Map<string, number>();
  const takenIds = new Set(raw.filter((q) => q.id).map((q) => q.id.toUpperCase()));
  const nextId = (prefix: string) => {
    for (;;) {
      const n = (counters.get(prefix) ?? 0) + 1;
      counters.set(prefix, n);
      const id = `${prefix}${n}`;
      if (!takenIds.has(id)) {
        takenIds.add(id);
        return id;
      }
    }
  };
  const questions: Question[] = raw.map((q, order) => {
    const dim = q.type === "text" ? "open" : sectionId.get(q.section!)!;
    const id = q.id || (q.type === "enps" ? nextId("NPS") : q.type === "text" ? nextId("O") : nextId("Q"));
    return {
      id,
      dimension: dim,
      type: q.type,
      text: q.text,
      required: q.required,
      ...(q.reverse ? { reverse: true } : {}),
      visible: true,
      order,
    };
  });

  return {
    ok: true,
    data: {
      surveyName: readSurveyName(surveyRows),
      dimensions,
      questions,
      counts: { sections: dimensions.length, scale: scale.length, enps: enps.length, comments: comments.length },
    },
    errors,
    warnings,
  };
}
