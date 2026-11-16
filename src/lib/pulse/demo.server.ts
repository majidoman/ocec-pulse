/**
 * Demo survey: a finished, realistic past survey that people can explore end to end (settings,
 * invitation list and sending history, reminders, answers, results, comments, action plans) without
 * touching real data. It is an ordinary survey marked is_demo, so it is deleted like any other
 * survey and never mixes with real answers.
 */
import { getSql } from "@/lib/db";
import type { ActionPlan, Department, Localized } from "@/lib/types";
import { defaultConfig, mergeSurveyPart, pickSurveyPart, type PulseConfig } from "./config";
import { deleteSurveyResponses, loadConfig, newId, newToken } from "./core.server";

// Small seeded random generator so the demo looks the same every time it is created.
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const COMMENTS: Localized[] = [
  {
    en: "Workload during the big events is very heavy; we need more people on shift.",
    ar: "ضغط العمل خلال الفعاليات الكبيرة شديد جداً؛ نحتاج عدداً أكبر في المناوبات.",
  },
  {
    en: "My manager listens and supports us. I feel respected.",
    ar: "مديري يستمع لنا ويدعمنا. أشعر بالاحترام.",
  },
  {
    en: "Promotions are not clear. Please explain the criteria.",
    ar: "الترقيات غير واضحة. نرجو توضيح المعايير.",
  },
  {
    en: "Training has improved this year, especially for new joiners.",
    ar: "تحسّن التدريب هذا العام، خاصة للموظفين الجدد.",
  },
  {
    en: "Communication between departments needs work before each event.",
    ar: "التواصل بين الأقسام يحتاج إلى تحسين قبل كل فعالية.",
  },
  { en: "Transport to the venue at night is a problem.", ar: "المواصلات إلى المركز ليلاً مشكلة." },
  { en: "Proud to work here; the team spirit is strong.", ar: "فخور بالعمل هنا؛ روح الفريق قوية." },
  {
    en: "Recognition is rare. A simple thank-you would help.",
    ar: "التقدير نادر. كلمة شكر بسيطة ستُحدث فرقاً.",
  },
  {
    en: "Systems are slow and we repeat the same data entry.",
    ar: "الأنظمة بطيئة ونكرر إدخال البيانات نفسها.",
  },
  {
    en: "More Omani talent development programmes, please.",
    ar: "نرجو المزيد من برامج تطوير الكفاءات العمانية.",
  },
  {
    en: "Rest areas for staff during long shifts would make a big difference.",
    ar: "توفير أماكن استراحة للموظفين في المناوبات الطويلة سيُحدث فرقاً كبيراً.",
  },
  {
    en: "Leadership shares the vision but we rarely hear about results.",
    ar: "القيادة تشارك الرؤية لكننا نادراً ما نسمع عن النتائج.",
  },
];

const ACTIONS: ActionPlan[] = [
  {
    id: "demo-a1",
    title: { en: "Event-peak staffing plan", ar: "خطة التوظيف لذروة الفعاليات" },
    owner: { en: "Operations director", ar: "مدير العمليات" },
    horizon: { en: "Next 3 months", ar: "الأشهر الثلاثة القادمة" },
    why: {
      en: "Wellbeing scored lowest; comments point to shift load during large events.",
      ar: "سجّلت الرفاهية أدنى درجة، والتعليقات تشير إلى ضغط المناوبات في الفعاليات الكبيرة.",
    },
    steps: [
      { en: "Agree a minimum crew per event size", ar: "تحديد حد أدنى للطاقم حسب حجم الفعالية" },
      {
        en: "Build a pool of trained casual staff",
        ar: "بناء قائمة احتياطية من موظفين مؤقتين مدرّبين",
      },
    ],
    departments: [],
    status: "in-motion",
  },
  {
    id: "demo-a2",
    title: { en: "Clear promotion criteria", ar: "معايير ترقية واضحة" },
    owner: { en: "People & Culture", ar: "الموارد البشرية والثقافة" },
    horizon: { en: "This quarter", ar: "هذا الربع" },
    why: {
      en: "Growth and fairness items were below the benchmark.",
      ar: "بنود النمو والعدالة جاءت أقل من المعيار المرجعي.",
    },
    steps: [
      { en: "Publish the grade framework", ar: "نشر إطار الدرجات الوظيفية" },
      { en: "Hold a briefing in every department", ar: "عقد جلسة توضيحية في كل قسم" },
    ],
    departments: [],
    status: "proposed",
  },
  {
    id: "demo-a3",
    title: { en: "Monthly recognition", ar: "تقدير شهري" },
    owner: { en: "Department heads", ar: "رؤساء الأقسام" },
    horizon: { en: "Ongoing", ar: "مستمر" },
    why: { en: "Recognition came up often in comments.", ar: "تكرّر موضوع التقدير في التعليقات." },
    steps: [
      { en: "One named thank-you per team each month", ar: "شكر باسم الموظف لكل فريق شهرياً" },
    ],
    departments: [],
    status: "done",
  },
];

const FALLBACK_DEPARTMENTS: Department[] = [
  { id: "ops", name: { en: "Operations", ar: "العمليات" }, headcount: 60 },
  { id: "events", name: { en: "Events", ar: "الفعاليات" }, headcount: 45 },
  { id: "fnb", name: { en: "Food & beverage", ar: "الأغذية والمشروبات" }, headcount: 50 },
  { id: "admin", name: { en: "Administration", ar: "الإدارة" }, headcount: 25 },
];

export async function createDemoSurvey(
  base: PulseConfig,
): Promise<{ id: string; responses: number }> {
  const sql = await getSql();
  const rand = rng(2025);
  const pick = <T>(xs: T[], w?: number[]) => {
    if (!w) return xs[Math.floor(rand() * xs.length)];
    const total = w.reduce((a, b) => a + b, 0);
    let r = rand() * total;
    for (let i = 0; i < xs.length; i += 1) if ((r -= w[i]) < 0) return xs[i];
    return xs[xs.length - 1];
  };
  const normal = () => {
    const u = Math.max(rand(), 1e-9);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
  };

  // Questionnaire: the current survey's questions, or the standard ones if it has none.
  const source = base.questions.some((q) => q.visible) ? base : defaultConfig();
  const shared = await loadConfig("main");
  const depts = shared.departments.filter((d) => !d.archived && d.headcount > 0);
  const departments = depts.length ? depts : FALLBACK_DEPARTMENTS;

  const id = `demo-${Date.now().toString(36)}`;
  const config = mergeSurveyPart(shared, {
    ...pickSurveyPart(source),
    general: {
      cycleName: { en: "Demo — Employee Survey 2025", ar: "تجريبي — استبيان الموظفين ٢٠٢٥" },
      status: "closed",
      allowOpenLink: false,
      closedAt: "2025-10-27T08:00:00.000Z",
    },
    calendar: {
      ...source.calendar,
      fieldOpen: "2025-10-05",
      fieldClose: "2025-10-26",
      note: { en: "", ar: "" },
    },
    instrumentStatus: "frozen",
    frozenAt: "2025-10-05T05:00:00.000Z",
    actions: ACTIONS,
    changelog: [],
  });
  await sql`insert into pulse_surveys (id, config, is_demo) values (${id}, ${JSON.stringify(pickSurveyPart(config))}::jsonb, true)`;

  // How each section tends to score in the demo (some strong, some weak), and how departments differ.
  const visibleDims = config.dimensions.filter((d) => d.visible && !d.archived);
  const dimMean = new Map(visibleDims.map((d, i) => [d.id, 3.55 + ((i * 37) % 11) / 11]));
  const deptShift = new Map(
    departments.map((d, i) => [d.id, [-0.35, 0.25, -0.1, 0.3, 0, -0.2, 0.15][i % 7]]),
  );
  const likert = config.questions.filter(
    (q) => q.visible && q.type === "likert" && visibleDims.some((d) => d.id === q.dimension),
  );
  const enps = config.questions.filter((q) => q.visible && q.type === "enps");
  const open = config.questions.filter((q) => q.visible && q.type === "text");

  const invitees: Record<string, unknown>[] = [];
  const responses: Record<string, unknown>[] = [];
  const answers: Record<string, unknown>[] = [];
  const comments: Record<string, unknown>[] = [];
  const start = new Date("2025-10-05T06:00:00Z").getTime();
  for (const d of departments) {
    const headcount = Math.min(Math.max(d.headcount, 8), 120);
    const rate = 0.62 + rand() * 0.28;
    for (let i = 0; i < headcount; i += 1) {
      const answered = rand() < rate;
      const reminders = answered ? (rand() < 0.4 ? 1 : 0) : rand() < 0.6 ? 2 : 1;
      invitees.push({
        id: newId(),
        email: `demo.${d.id}.${i + 1}@example.invalid`,
        department_id: d.id,
        token: newToken(),
        invited_at: new Date(start).toISOString(),
        opened: answered || rand() < 0.3,
        used: answered,
        reminders_sent: reminders,
      });
      if (!answered) continue;
      const rid = newId();
      const day = new Date(start + Math.floor(rand() * 20) * 86_400_000).toISOString().slice(0, 10);
      const person = normal() * 0.55;
      responses.push({
        id: rid,
        submitted_on: day,
        lang: rand() < 0.6 ? "ar" : "en",
        department_id: rand() < 0.93 ? d.id : null,
        tenure: pick(["lt1", "1to3", "3to7", "7plus"], [2, 4, 3, 2]),
        level: pick(["frontline", "supervisor", "manager", "leadership"], [6, 3, 1.5, 0.4]),
        contract: pick(["permanent", "contract"], [4, 1]),
        source: "token",
      });
      let sum = 0;
      for (const q of likert) {
        const mean =
          (dimMean.get(q.dimension as string) ?? 3.6) + (deptShift.get(d.id) ?? 0) + person;
        let v = Math.round(mean + normal() * 0.7);
        v = Math.min(5, Math.max(1, v));
        if (q.reverse) v = 6 - v;
        sum += q.reverse ? 6 - v : v;
        answers.push({ response_id: rid, question_id: q.id, value: v });
      }
      const avg = likert.length ? sum / likert.length : 3.6;
      for (const q of enps) {
        const v = Math.min(10, Math.max(0, Math.round((avg - 1) * 2.7 + 0.6 + normal() * 1.3)));
        answers.push({ response_id: rid, question_id: q.id, value: v });
      }
      for (const q of open) {
        if (rand() < 0.28) {
          const c = pick(COMMENTS);
          comments.push({
            id: newId(),
            question_id: q.id,
            department_id: d.id,
            body: rand() < 0.6 ? c.ar : c.en,
            submitted_on: day,
          });
        }
      }
    }
  }

  try {
    const insertJson = async (
      table: string,
      cols: string,
      types: string,
      rows: Record<string, unknown>[],
    ) => {
      for (let i = 0; i < rows.length; i += 2000) {
        const chunk = JSON.stringify(rows.slice(i, i + 2000));
        await sql.query(
          `insert into ${table} (${cols}, survey_id) select ${cols}, $2::text from jsonb_to_recordset($1::jsonb) as x(${types})`,
          [chunk, id],
        );
      }
    };
    await insertJson(
      "pulse_invitees",
      "id, email, department_id, token, invited_at, opened, used, reminders_sent",
      "id text, email text, department_id text, token text, invited_at timestamptz, opened boolean, used boolean, reminders_sent int",
      invitees,
    );
    await insertJson(
      "pulse_responses",
      "id, submitted_on, lang, department_id, tenure, level, contract, source",
      "id text, submitted_on date, lang text, department_id text, tenure text, level text, contract text, source text",
      responses,
    );
    for (let i = 0; i < answers.length; i += 4000) {
      await sql.query(
        `insert into pulse_answers (response_id, question_id, value) select response_id, question_id, value from jsonb_to_recordset($1::jsonb) as x(response_id text, question_id text, value smallint)`,
        [JSON.stringify(answers.slice(i, i + 4000))],
      );
    }
    await insertJson(
      "pulse_comments",
      "id, question_id, department_id, body, submitted_on",
      "id text, question_id text, department_id text, body text, submitted_on date",
      comments,
    );
    await sql.query(
      `insert into pulse_campaigns (id, name, kind, audience, subject_en, subject_ar, body_en, body_ar, recipients, sent, failed, created_by, created_at, survey_id)
     values ($1, 'Invitation — all staff', 'invitation', 'all', $2, $3, '', '', $4, $4, 0, 'demo', '2025-10-05T06:00:00Z', $5)`,
      [
        newId(),
        shared.email.subjectEn ?? "Your survey link",
        shared.email.subjectAr ?? "رابط الاستبيان",
        invitees.length,
        id,
      ],
    );
  } catch (e) {
    // Leave nothing half-made behind.
    await deleteSurveyResponses(id);
    await sql`delete from pulse_invitees where survey_id = ${id}`;
    await sql`delete from pulse_campaigns where survey_id = ${id}`;
    await sql`delete from pulse_surveys where id = ${id}`;
    throw e;
  }
  return { id, responses: responses.length };
}
