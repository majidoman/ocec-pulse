import type {
  Department,
  Dimension,
  Localized,
  Question,
  TenureId,
  LevelId,
  ContractId,
} from "./types";

export const SURVEY_NAME: Localized = {
  en: "{org} Voice 2026",
  ar: "صوت {org} ٢٠٢٦",
};

export const SURVEY_CLOSE = "9 November 2026";
export const SURVEY_CLOSE_AR = "٩ نوفمبر ٢٠٢٦";
export const K_ANONYMITY = 5;

export const DIMENSIONS: Dimension[] = [
  {
    id: "leadership",
    name: { en: "Leadership & Trust", ar: "القيادة والثقة" },
    short: { en: "Leadership", ar: "القيادة" },
    blurb: {
      en: "Direction and trust in senior leaders.",
      ar: "التوجيه والثقة في القيادات العليا.",
    },
    visible: true,
    archived: false,
    order: 1,
    kind: "likert",
  },
  {
    id: "manager",
    name: { en: "Manager Effectiveness", ar: "فعالية المدير" },
    short: { en: "Manager", ar: "المدير" },
    blurb: {
      en: "Coaching, availability and support from my direct manager.",
      ar: "التوجيه والتواجد والدعم من مديري المباشر.",
    },
    visible: true,
    archived: false,
    order: 2,
    kind: "likert",
  },
  {
    id: "communication",
    name: { en: "Communication", ar: "التواصل" },
    short: { en: "Communication", ar: "التواصل" },
    blurb: {
      en: "Honest, timely information before and during events.",
      ar: "معلومات صادقة وفي وقتها قبل الفعاليات وخلالها.",
    },
    visible: true,
    archived: false,
    order: 3,
    kind: "likert",
  },
  {
    id: "fairness",
    name: { en: "Respect & Fairness", ar: "الاحترام والعدالة" },
    short: { en: "Fairness", ar: "العدالة" },
    blurb: {
      en: "Fair treatment across nationality, gender and ways of working.",
      ar: "المعاملة العادلة بين الجنسيات والجنس وأساليب العمل.",
    },
    visible: true,
    archived: false,
    order: 4,
    kind: "likert",
  },
  {
    id: "teamwork",
    name: { en: "Collaboration / Teamwork", ar: "التعاون والعمل الجماعي" },
    short: { en: "Teamwork", ar: "الفريق" },
    blurb: {
      en: "Support, collaboration and belonging on the floor.",
      ar: "الدعم والتعاون والانتماء في بيئة العمل.",
    },
    visible: true,
    archived: false,
    order: 5,
    kind: "likert",
  },
  {
    id: "recognition",
    name: { en: "Recognition & Reward", ar: "التقدير والمكافأة" },
    short: { en: "Recognition", ar: "التقدير" },
    blurb: {
      en: "Being seen for good work — including pit-stop celebrations.",
      ar: "الإحساس بأن العمل الجيد يُرى ويُقدَّر، بما في ذلك اجتماعات البيت ستوب.",
    },
    visible: true,
    archived: false,
    order: 6,
    kind: "likert",
  },
  {
    id: "career",
    name: { en: "Career Growth", ar: "النمو المهني" },
    short: { en: "Career", ar: "المسار" },
    blurb: {
      en: "Learning, progression and national talent development.",
      ar: "التعلم والتقدم الوظيفي وتنمية الكفاءات الوطنية.",
    },
    visible: true,
    archived: false,
    order: 7,
    kind: "likert",
  },
  {
    id: "wellbeing",
    name: { en: "Wellbeing", ar: "الرفاه" },
    short: { en: "Wellbeing", ar: "الرفاه" },
    blurb: {
      en: "Workload, safety and care across event peaks.",
      ar: "عبء العمل والسلامة والرعاية خلال فترات الذروة.",
    },
    visible: true,
    archived: false,
    order: 8,
    kind: "likert",
  },
  {
    id: "enablement",
    name: { en: "Resources / Enablement", ar: "الموارد والتمكين" },
    short: { en: "Enablement", ar: "التمكين" },
    blurb: {
      en: "Tools, staffing and processes that help event delivery.",
      ar: "الأدوات والتوظيف والإجراءات التي تسهّل تنفيذ الفعاليات.",
    },
    visible: true,
    archived: false,
    order: 9,
    kind: "likert",
  },
  {
    id: "pride",
    name: { en: "Pride", ar: "الفخر" },
    short: { en: "Pride", ar: "الفخر" },
    blurb: {
      en: "Pride in the house, its values and its place in Oman.",
      ar: "الفخر بالبيت وقيمه ومكانته في عُمان.",
    },
    visible: true,
    archived: false,
    order: 10,
    kind: "likert",
  },
  {
    id: "innovation",
    name: { en: "Innovation & Ideas", ar: "الابتكار والأفكار" },
    short: { en: "Innovation", ar: "الابتكار" },
    blurb: {
      en: "Whether better ways of working are heard and used.",
      ar: "إن كانت طرق العمل الأفضل تُسمع وتُستخدم.",
    },
    visible: true,
    archived: false,
    order: 11,
    kind: "likert",
  },
  {
    id: "guest",
    name: { en: "Customer / Guest Focus", ar: "التركيز على الضيف" },
    short: { en: "Guests", ar: "الضيوف" },
    blurb: {
      en: "Pride in the guest experience we host at {org}.",
      ar: "الفخر بتجربة الضيوف التي نقدّمها في {org}.",
    },
    visible: true,
    archived: false,
    order: 12,
    kind: "likert",
  },
  {
    id: "overall",
    name: { en: "Overall Engagement + eNPS", ar: "المشاركة العامة ومؤشر التوصية" },
    short: { en: "eNPS", ar: "التوصية" },
    blurb: {
      en: "Would you recommend {org} as a place to work.",
      ar: "هل توصي بالعمل في {org}.",
    },
    visible: true,
    archived: false,
    order: 13,
    kind: "enps",
  },
];

export const DEPARTMENTS: Department[] = [
  { id: "events", name: { en: "Events Operations", ar: "عمليات الفعاليات" }, headcount: 54 },
  { id: "exhibition", name: { en: "Exhibition Services", ar: "خدمات المعارض" }, headcount: 41 },
  { id: "culinary", name: { en: "Culinary & Banqueting", ar: "الطهي والمآدب" }, headcount: 72 },
  { id: "facilities", name: { en: "Facilities & Engineering", ar: "المرافق والهندسة" }, headcount: 38 },
  { id: "sales", name: { en: "Sales & Marketing", ar: "المبيعات والتسويق" }, headcount: 29 },
  { id: "people", name: { en: "People & Culture", ar: "الأفراد والثقافة" }, headcount: 14 },
  { id: "finance", name: { en: "Finance & Administration", ar: "المالية والإدارة" }, headcount: 22 },
  { id: "guest", name: { en: "Guest Experience", ar: "تجربة الضيوف" }, headcount: 36 },
  { id: "sustainability", name: { en: "Sustainability & HSE", ar: "الاستدامة والصحة والسلامة" }, headcount: 18 },
  { id: "it", name: { en: "IT & Digital", ar: "تقنية المعلومات" }, headcount: 16 },
  { id: "security", name: { en: "Security", ar: "الأمن" }, headcount: 48 },
  { id: "executive", name: { en: "Executive Office", ar: "المكتب التنفيذي" }, headcount: 12 },
];

export const TENURE: { id: TenureId; name: Localized }[] = [
  { id: "lt1", name: { en: "Less than 1 year", ar: "أقل من سنة" } },
  { id: "1to3", name: { en: "1–3 years", ar: "١–٣ سنوات" } },
  { id: "3to7", name: { en: "3–7 years", ar: "٣–٧ سنوات" } },
  { id: "7plus", name: { en: "7 years or more", ar: "٧ سنوات فأكثر" } },
];

export const LEVELS: { id: LevelId; name: Localized }[] = [
  { id: "frontline", name: { en: "Frontline", ar: "الخط الأمامي" } },
  { id: "supervisor", name: { en: "Supervisor", ar: "مشرف" } },
  { id: "manager", name: { en: "Manager", ar: "مدير" } },
  { id: "leadership", name: { en: "Leadership", ar: "قيادة" } },
];

export const CONTRACTS: { id: ContractId; name: Localized }[] = [
  { id: "permanent", name: { en: "Permanent", ar: "دائم" } },
  { id: "contract", name: { en: "Contract", ar: "تعاقد" } },
];

export const LIKERT: { value: number; label: Localized }[] = [
  { value: 1, label: { en: "Strongly disagree", ar: "أعارض بشدة" } },
  { value: 2, label: { en: "Disagree", ar: "أعارض" } },
  { value: 3, label: { en: "Neutral", ar: "محايد" } },
  { value: 4, label: { en: "Agree", ar: "أوافق" } },
  { value: 5, label: { en: "Strongly agree", ar: "أوافق بشدة" } },
];

const RAW_QUESTIONS: Omit<Question, "visible" | "order">[] = [
  { id: "L1", dimension: "leadership", type: "likert", required: true, text: { en: "My manager treats me with respect.", ar: "يعاملني مديري باحترام." } },
  { id: "L2", dimension: "leadership", type: "likert", required: true, text: { en: "Senior leaders at {org} communicate a clear direction.", ar: "تتواصل القيادات العليا في {org} بتوجه واضح." } },
  { id: "L3", dimension: "leadership", type: "likert", required: true, text: { en: "I trust the decisions of {org} leadership.", ar: "أثق بقرارات قيادة {orgName}." } },
  { id: "L4", dimension: "leadership", type: "likert", required: true, text: { en: "Senior leaders act consistently with what they say.", ar: "تتصرف القيادات العليا بما يتفق مع ما تقوله." } },
  { id: "MG1", dimension: "manager", type: "likert", required: true, text: { en: "My manager coaches me to do my best work.", ar: "يدرّبني مديري لأقدّم أفضل ما لدي." } },
  { id: "MG2", dimension: "manager", type: "likert", required: true, text: { en: "My manager is available when I need them.", ar: "مديري متاح عندما أحتاجه." } },
  { id: "MG3", dimension: "manager", type: "likert", required: true, text: { en: "My manager gives useful feedback.", ar: "يقدّم مديري ملاحظات مفيدة." } },
  { id: "MG4", dimension: "manager", type: "likert", required: true, text: { en: "My manager supports me during peak event periods.", ar: "يدعمني مديري خلال فترات ذروة الفعاليات." } },
  { id: "CM1", dimension: "communication", type: "likert", required: true, text: { en: "I hear about important changes in time.", ar: "أطلع على التغييرات المهمة في الوقت المناسب." } },
  { id: "CM2", dimension: "communication", type: "likert", required: true, text: { en: "I can raise a concern and it will be heard.", ar: "أستطيع طرح ملاحظة وأثق بأنها ستُسمع." } },
  { id: "CM3", dimension: "communication", type: "likert", required: true, text: { en: "Information from leadership is honest.", ar: "المعلومات الصادرة عن القيادة صادقة." } },
  { id: "CM4", dimension: "communication", type: "likert", required: true, text: { en: "Team briefings before events are effective.", ar: "الإحاطات قبل الفعاليات فعّالة." } },
  { id: "I1", dimension: "fairness", type: "likert", required: true, text: { en: "People of all nationalities are treated fairly.", ar: "يُعامل الجميع بعدل بغض النظر عن الجنسية." } },
  { id: "I2", dimension: "fairness", type: "likert", required: true, text: { en: "I can be myself at work.", ar: "أستطيع أن أكون نفسي في العمل." } },
  { id: "I3", dimension: "fairness", type: "likert", required: true, text: { en: "Women and men have equal opportunity here.", ar: "تتساوى فرص النساء والرجال هنا." } },
  { id: "I4", dimension: "fairness", type: "likert", required: true, text: { en: "Different perspectives are welcomed.", ar: "تُرحَّب بوجهات النظر المختلفة." } },
  { id: "T1", dimension: "teamwork", type: "likert", required: true, text: { en: "People on my team support one another.", ar: "يدعم أفراد فريقي بعضهم بعضاً." } },
  { id: "T2", dimension: "teamwork", type: "likert", required: true, text: { en: "Departments collaborate well during events.", ar: "تتعاون الإدارات بشكل جيد خلال الفعاليات." } },
  { id: "T3", dimension: "teamwork", type: "likert", required: true, text: { en: "I feel I belong on my team.", ar: "أشعر بالانتماء إلى فريقي." } },
  { id: "T4", dimension: "teamwork", type: "likert", required: true, text: { en: "Conflicts are handled constructively.", ar: "تُعالج الخلافات بطريقة بنّاءة." } },
  { id: "R1", dimension: "recognition", type: "likert", required: true, text: { en: "I am recognised when I do good work.", ar: "يتم تقديري عندما أقدّم عملاً جيداً." } },
  { id: "R2", dimension: "recognition", type: "likert", required: true, text: { en: "{org}’s pit-stop meetings make me feel my contribution is seen.", ar: "تجعلني اجتماعات البيت ستوب أشعر أن مساهمتي مرئية." } },
  { id: "R3", dimension: "recognition", type: "likert", required: true, text: { en: "Pay and benefits feel fair for my role.", ar: "أشعر أن الراتب والمزايا عادلان لدورى." } },
  { id: "R4", dimension: "recognition", type: "likert", required: true, text: { en: "Outstanding service to guests is celebrated here.", ar: "يُحتفى هنا بالخدمة المتميزة للضيوف." } },
  { id: "C1", dimension: "career", type: "likert", required: true, text: { en: "I can see a future for myself at {org}.", ar: "أستطيع أن أرى مستقبلاً لي في {org}." } },
  { id: "C2", dimension: "career", type: "likert", required: true, text: { en: "I have access to learning that helps me grow.", ar: "أحصل على فرص تعلم تساعدني على النمو." } },
  { id: "C3", dimension: "career", type: "likert", required: true, text: { en: "Omanisation and national talent development are taken seriously.", ar: "يُؤخذ التعمين وتنمية الكفاءات الوطنية بجدية." } },
  { id: "C4", dimension: "career", type: "likert", required: true, text: { en: "My last performance conversation was useful.", ar: "كان آخر حديث لتقييم الأداء مفيداً لي." } },
  { id: "W1", dimension: "wellbeing", type: "likert", required: true, text: { en: "My workload is manageable across event peaks and quieter periods.", ar: "عبء عملي قابل للإدارة بين فترات الذروة والهدوء." } },
  { id: "W2", dimension: "wellbeing", type: "likert", required: true, text: { en: "{org} cares about my wellbeing.", ar: "يهتم {org} برفاهي." } },
  { id: "W3", dimension: "wellbeing", type: "likert", required: true, text: { en: "I can take time off without guilt.", ar: "أستطيع أخذ إجازة دون شعور بالذنب." } },
  { id: "W4", dimension: "wellbeing", type: "likert", required: true, text: { en: "I feel safe at work.", ar: "أشعر بالأمان في مكان العمل." } },
  { id: "E1", dimension: "enablement", type: "likert", required: true, text: { en: "I have the tools I need to do my job well.", ar: "أتوفر على الأدوات اللازمة لأداء عملي جيداً." } },
  { id: "E2", dimension: "enablement", type: "likert", required: true, text: { en: "Processes help rather than hinder event delivery.", ar: "الإجراءات تساعد على تنفيذ الفعاليات ولا تعيقها." } },
  { id: "E3", dimension: "enablement", type: "likert", required: true, text: { en: "Staffing levels are adequate for the events we host.", ar: "مستويات التوظيف كافية للفعاليات التي نستضيفها." } },
  { id: "E4", dimension: "enablement", type: "likert", required: true, text: { en: "I can make decisions in my role without unnecessary delay.", ar: "أستطيع اتخاذ قرارات في دوري دون تأخير غير مبرر." } },
  { id: "P1", dimension: "pride", type: "likert", required: true, text: { en: "{org}’s sustainability commitments make me proud.", ar: "التزامات {org} بالاستدامة تجعلني فخوراً." } },
  { id: "P2", dimension: "pride", type: "likert", required: true, text: { en: "I understand how my work contributes to Oman’s events sector.", ar: "أفهم كيف يساهم عملي في قطاع الفعاليات في عُمان." } },
  { id: "P3", dimension: "pride", type: "likert", required: true, text: { en: "Our values — excellence, sustainability, innovation — show up in daily work.", ar: "تظهر قيمنا — التميز والاستدامة والابتكار — في العمل اليومي." } },
  { id: "P4", dimension: "pride", type: "likert", required: true, text: { en: "I believe {org} has a positive impact on the community.", ar: "أعتقد أن لـ{org} أثراً إيجابياً على المجتمع." } },
  { id: "IN1", dimension: "innovation", type: "likert", required: true, text: { en: "I can suggest a better way of working and it will be considered.", ar: "أستطيع اقتراح طريقة أفضل للعمل وستُؤخذ بعين الاعتبار." } },
  { id: "IN2", dimension: "innovation", type: "likert", required: true, text: { en: "We try new ideas between events, not only during them.", ar: "نجرّب أفكاراً جديدة بين الفعاليات لا خلالها فقط." } },
  { id: "IN3", dimension: "innovation", type: "likert", required: true, text: { en: "Lessons from one event are used on the next.", ar: "تُستخدم دروس فعالية في الفعالية التالية." } },
  { id: "S1", dimension: "guest", type: "likert", required: true, text: { en: "I am proud of the guest experience we deliver.", ar: "أنا فخور بتجربة الضيوف التي نقدّمها." } },
  { id: "S2", dimension: "guest", type: "likert", required: true, text: { en: "I would recommend {org} as a venue to a friend.", ar: "أنصح أصدقائي بـ{org} كوجهة للفعاليات." } },
  { id: "S3", dimension: "guest", type: "likert", required: true, text: { en: "“Where the World Meets” feels true in how we work.", ar: "شعار «حيث يلتقي العالم» ينعكس في طريقة عملنا." } },
  { id: "S4", dimension: "guest", type: "likert", required: true, text: { en: "I understand how my role affects our guests.", ar: "أفهم كيف يؤثر دوري على ضيوفنا." } },
  { id: "NPS", dimension: "overall", type: "enps", required: true, text: { en: "How likely are you to recommend {org} as a place to work?", ar: "ما مدى احتمالية أن توصي بالعمل في {orgName}؟" } },
  { id: "O1", dimension: "open", type: "text", required: false, text: { en: "What makes you most proud to work at {org}?", ar: "ما الذي يجعلك أكثر فخراً بالعمل في {org}؟" } },
  { id: "O2", dimension: "open", type: "text", required: false, text: { en: "What one change would most improve your experience at work?", ar: "ما التغيير الواحد الذي سيحسّن تجربتك في العمل أكثر من غيره؟" } },
  { id: "O3", dimension: "open", type: "text", required: false, text: { en: "Anything else you want the CEO and leadership team to hear?", ar: "هل هناك شيء آخر تود أن يسمعه الرئيس التنفيذي وفريق القيادة؟" } },
];

export const QUESTIONS: Question[] = RAW_QUESTIONS.map((q, i) => ({
  ...q,
  visible: true,
  order: i,
}));

export const LIKERT_QUESTIONS = QUESTIONS.filter((q) => q.type === "likert");
export const TOTAL_HEADCOUNT = DEPARTMENTS.reduce((n, d) => n + d.headcount, 0);

export function questionsByDimension(id: Dimension["id"], bank: Question[] = QUESTIONS) {
  return bank.filter((q) => q.dimension === id && q.visible).sort((a, b) => a.order - b.order);
}

export const SURVEY_STEPS = [...DIMENSIONS.map((d) => d.id), "open", "demo"] as const;
