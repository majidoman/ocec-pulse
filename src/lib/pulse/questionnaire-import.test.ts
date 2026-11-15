import assert from "node:assert/strict";
import { test } from "node:test";
import { parseQuestionnaire } from "./questionnaire-import.ts";

const HEAD = [
  "ID (optional) / الرمز",
  "Section (EN) / القسم (إنجليزي)",
  "Section (AR) / القسم (عربي)",
  "Section description (EN) / وصف القسم (إنجليزي)",
  "Section description (AR) / وصف القسم (عربي)",
  "Question (EN) / السؤال (إنجليزي)",
  "Question (AR) / السؤال (عربي)",
  "Type / النوع",
  "Required / مطلوب",
  "Reverse-worded / معكوس",
];

const row = (id: string, sec: string, secAr: string, q: string, qAr: string, type: string, req = "", rev = "") => [id, sec, secAr, "", "", q, qAr, type, req, rev];

const good = [
  ["Instructions above the header are ignored"],
  HEAD,
  row("", "Leadership & Direction", "القيادة والتوجه", "Leaders explain where we are going.", "يشرح القادة إلى أين نتجه.", "Agree 1–5"),
  row("", "Leadership & Direction", "القيادة والتوجه", "I trust senior leaders.", "أثق بالقيادة العليا.", "موافقة ١–٥"),
  row("", "Workload", "عبء العمل", "I often feel overwhelmed.", "أشعر غالباً بالإرهاق.", "Agree 1-5", "Yes", "Yes"),
  row("", "Workload", "عبء العمل", "I can finish my work in normal hours.", "أنهي عملي في الساعات المعتادة.", "likert"),
  row("", "Recommendation", "التوصية", "How likely are you to recommend us?", "ما مدى احتمال أن توصي بنا؟", "Recommend 0–10"),
  [],
  row("", "", "", "What should we change first?", "ما أول ما يجب تغييره؟", "Comment"),
];

test("reads sections, questions, types and defaults", () => {
  const r = parseQuestionnaire(good, [["Survey name (EN)", "Staff Pulse"], ["Survey name (AR)", "نبض الموظفين"]]);
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  const d = r.data!;
  assert.deepEqual(d.surveyName, { en: "Staff Pulse", ar: "نبض الموظفين" });
  assert.deepEqual(d.counts, { sections: 3, scale: 4, enps: 1, comments: 1 });
  assert.deepEqual(d.dimensions.map((x) => [x.id, x.kind, x.order]), [["leadership-direction", "likert", 1], ["workload", "likert", 2], ["recommendation", "enps", 3]]);
  const [q1, , q3, , nps, o1] = d.questions;
  assert.equal(q1.id, "Q1");
  assert.equal(q1.required, true);
  assert.equal(q3.reverse, true);
  assert.equal(nps.id, "NPS1");
  assert.equal(nps.dimension, "recommendation");
  assert.equal(o1.dimension, "open");
  assert.equal(o1.required, false);
  assert.equal(new Set(d.questions.map((q) => q.id)).size, d.questions.length);
});

test("columns may be in any order", () => {
  const rows = [
    ["Type", "Question (AR)", "Question (EN)", "Section (AR)", "Section (EN)"],
    ["Agree 1-5", "س١", "Q one", "أ", "A"],
    ["Agree 1-5", "س٢", "Q two", "أ", "A"],
  ];
  const r = parseQuestionnaire(rows);
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.equal(r.data!.questions[1].text.en, "Q two");
});

test("refuses files that would break results", () => {
  const mixed = [HEAD, row("", "A", "أ", "x", "س", "Agree 1-5"), row("", "A", "أ", "y", "ص", "Recommend 0-10")];
  assert.match(parseQuestionnaire(mixed).errors[0].en, /mixes 1–5 and 0–10/);
  const twoNps = [HEAD, row("", "A", "أ", "x", "س", "Agree 1-5"), row("", "B", "ب", "y", "ص", "0-10"), row("", "C", "ج", "z", "ع", "0-10")];
  assert.match(parseQuestionnaire(twoNps).errors[0].en, /Only one Recommend/);
  const noArabic = [HEAD, row("", "A", "أ", "x", "", "Agree 1-5")];
  assert.match(parseQuestionnaire(noArabic).errors[0].en, /English and Arabic/);
  const badType = [HEAD, row("", "A", "أ", "x", "س", "Stars")];
  assert.equal(parseQuestionnaire(badType).errors[0].row, 2);
  const dupId = [HEAD, row("A1", "A", "أ", "x", "س", "Agree 1-5"), row("a1", "A", "أ", "y", "ص", "Agree 1-5")];
  assert.match(parseQuestionnaire(dupId).errors[0].en, /used twice/);
  assert.equal(parseQuestionnaire([["a", "b"]]).ok, false);
});

test("keeps given IDs and avoids clashes with generated ones", () => {
  const rows = [HEAD, row("Q2", "A", "أ", "x", "س", "Agree 1-5"), row("", "A", "أ", "y", "ص", "Agree 1-5"), row("", "A", "أ", "z", "ع", "Agree 1-5")];
  const ids = parseQuestionnaire(rows).data!.questions.map((q) => q.id);
  assert.deepEqual(ids, ["Q2", "Q1", "Q3"]);
});
