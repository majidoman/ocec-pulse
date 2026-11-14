import type { Localized } from "./types";

export const FAQS: { q: Localized; a: Localized }[] = [
  {
    q: {
      ar: "ما هو {app} وصوت ٢٠٢٦؟",
      en: "What is {app} and Voice 2026?",
    },
    a: {
      ar: "{app} منصة مشاركة الموظفين في {orgName}. صوت ٢٠٢٦ هو تعداد سري لكل من يعمل في البيت — من المطابخ إلى الطابق التنفيذي — لمعرفة ما يقوّي المشاركة وما يعطّلها.",
      en: "{app} is the employee-engagement platform for {orgName}. Voice 2026 is a confidential census of everyone who makes the house work — kitchens to the executive floor.",
    },
  },
  {
    q: {
      ar: "هل الاستبيان سري؟ هل يمكن معرفة من أجاب؟",
      en: "Is the survey confidential? Can anyone tell who answered?",
    },
    a: {
      ar: "نعم، سري تصميماً. لا يُحفظ اسم ولا بريد ولا بصمة جهاز مع إجاباتك. لا يمكن تتبع الرابط إليك بعد الإرسال. النتائج تُعرض لمجموعات فقط، ولا تُعرض لأي مجموعة أقل من خمسة أشخاص.",
      en: "Yes — anonymous by design. No name, email or device fingerprint is stored with your answers. Results are only shown for groups of five or more.",
    },
  },
  {
    q: {
      ar: "هل أحتاج إلى اسم أو بريد إلكتروني للإجابة؟",
      en: "Do I need a name or email to take it?",
    },
    a: {
      ar: "لا. الدعوة تصل برابط سري. عند الإرسال تُفصل الإجابة عن الدعوة. لا تكتب اسمك في التعليقات المفتوحة.",
      en: "No. You arrive on a confidential link. At submit, the response is detached from the invite. Do not put your name in the open comments.",
    },
  },
  {
    q: {
      ar: "كم يستغرق صوت ٢٠٢٦؟",
      en: "How long does Voice 2026 take?",
    },
    a: {
      ar: "حوالي اثنتي عشرة دقيقة. بنود بمقياس من خمس درجات، وسؤال توصية واحد، وتعليقات اختيارية، وأسئلة اختيارية عن الدور.",
      en: "About twelve minutes. Five-point agreement items, one employer-NPS question, optional comments, and optional questions about your role.",
    },
  },
  {
    q: {
      ar: "بأي لغة أجيب؟",
      en: "Which language should I use?",
    },
    a: {
      ar: "باللغة التي تفكّر بها. كل سؤال وكل تقرير وكل دعوة بالعربية والإنجليزية. يمكنك التبديل في أي لحظة دون أن تضيع إجاباتك.",
      en: "The language you think in. Every question, report and invitation is native in Arabic and English. Switch at any time — your answers stay.",
    },
  },
  {
    q: {
      ar: "هل يعمل الاستبيان على الهاتف؟",
      en: "Does it work on a phone?",
    },
    a: {
      ar: "نعم. صُمم للوردية على الهاتف: أزرار كبيرة، عمود واحد، ودون الحاجة إلى حاسوب. خمس دقائق على الهاتف في المطبخ أو عند الباب تكفي لبدء الإجابة.",
      en: "Yes. It is built for a shift on a phone: large targets, a single column, no desktop required.",
    },
  },
  {
    q: {
      ar: "كيف أختار الإجابة على مقياس ليكرت؟",
      en: "How does the rating scale work?",
    },
    a: {
      ar: "معظم البنود بمقياس من ١ إلى ٥: ١ أعارض بشدة، ٢ أعارض، ٣ محايد، ٤ أوافق، ٥ أوافق بشدة. لا إجابة صحيحة — فقط إجابة صادقة.",
      en: "Most items use a 1–5 scale: 1 strongly disagree through 5 strongly agree. There is no right answer — only a true one.",
    },
  },
  {
    q: {
      ar: "ما هو مؤشر التوصية (eNPS)؟",
      en: "What is eNPS?",
    },
    a: {
      ar: "سؤال واحد: ما مدى احتمالية أن توصي بالعمل في {org}؟ من ٠ إلى ١٠. من ٠ إلى ٦ غير موصين، ٧–٨ محايدون، ٩–١٠ موصون. المؤشر = نسبة الموصين ناقص نسبة غير الموصين.",
      en: "One question: how likely are you to recommend {org} as a place to work, from 0 to 10. 0–6 are detractors, 7–8 passives, 9–10 promoters. eNPS is promoters minus detractors.",
    },
  },
  {
    q: {
      ar: "هل يجب الإجابة على كل الأسئلة؟",
      en: "Do I have to answer every question?",
    },
    a: {
      ar: "بنود المقياس ومؤشر التوصية إلزامية للمتابعة. التعليقات الثلاثة وأسئلة الإدارة والمستوى ومدة العمل ونوع التعاقد اختيارية. يمكنك تخطيها دون أن تُكشف هويتك.",
      en: "The scale items and eNPS are required to continue. The three comments and the role questions (department, level, tenure, contract) are optional.",
    },
  },
  {
    q: {
      ar: "لماذا تسألون عن الإدارة والمستوى ومدة العمل؟",
      en: "Why do you ask about department, level and tenure?",
    },
    a: {
      ar: "لنعمل حيث يلزم: المطبخ غير الاستقبال، والخط الأمامي غير القيادة. هذه القطع اختيارية، ولا تُعرض إلا إذا أجاب خمسة أشخاص على الأقل في المجموعة نفسها.",
      en: "So we can act where it matters — the kitchen is not the same as guest experience. These cuts are optional and never shown for groups smaller than five.",
    },
  },
  {
    q: {
      ar: "ما معنى حد السرية «خمسة أشخاص»؟",
      en: "What does the anonymity floor of five mean?",
    },
    a: {
      ar: "إذا أجاب أقل من خمسة في إدارة أو مستوى أو نوع تعاقد، تبقى الخانة فارغة. لا متوسطات لمجموعات صغيرة يمكن أن تكشف شخصاً. المكتب التنفيذي و«الأفراد والثقافة» يخضعان للقاعدة نفسها.",
      en: "If fewer than five people in a department, level or contract type have spoken, that cell stays blank. No small-group average that could identify someone.",
    },
  },
  {
    q: {
      ar: "من يرى النتائج؟",
      en: "Who sees the results?",
    },
    a: {
      ar: "فريق الأفراد والثقافة، ورؤساء الإدارات لنتائج إداراتهم فوق حد السرية، والرئيس التنفيذي والقيادة للملخص التنفيذي. لا أحد يرى إجاباتك منفردة.",
      en: "People & Culture, heads of department for their own cuts above the anonymity floor, and the CEO for the executive summary. Nobody sees your individual answers.",
    },
  },
  {
    q: {
      ar: "متى يُغلق صوت ٢٠٢٦؟",
      en: "When does Voice 2026 close?",
    },
    a: {
      ar: "تاريخ الإغلاق يظهر في الصفحة الرئيسية وفي رسالة الدعوة. بعد الإغلاق تُشارك إحاطة البيت وخطة التسعين يوماً.",
      en: "The closing date is shown on the home page and in your invitation. After close, the house briefing and the 90-day plan are shared.",
    },
  },
  {
    q: {
      ar: "ماذا لو لم أستطع إكماله دفعة واحدة؟",
      en: "What if I cannot finish in one sitting?",
    },
    a: {
      ar: "يُحفظ التقدّم على هذا الجهاز فقط حتى ترسل. لا سحابة باسمك. إذا مسحت بيانات المتصفح أو غيّرت الهاتف، تبدأ من جديد — والإجابة السابقة لا تُربط بك.",
      en: "Progress is saved on this device only, until you submit. There is no named cloud copy. If you clear the browser or change phone, you start again — and nothing is tied to you.",
    },
  },
  {
    q: {
      ar: "هل ستصلني تذكيرات؟",
      en: "Will I get reminders?",
    },
    a: {
      ar: "إن وصلتك دعوة شخصية بالبريد فقد تصلك تذكيرات إلى أن تُرسل إجابتك. لا تذكير لمن أكمل الاستبيان. يمكن لفريق الأفراد والثقافة إيقاف التذكيرات.",
      en: "If you were invited by a personal email link, you may get reminders until you submit. Completers are not reminded. People & Culture can switch reminders off.",
    },
  },
  {
    q: {
      ar: "وصلتني دعوة بالبريد. هل أحولها لزميل؟",
      en: "I received an email invite. May I forward it?",
    },
    a: {
      ar: "هذا رابط سري لجهازك. لا تُعد توجيهه مقروناً باسمك. الزميل الذي لم تصله دعوة يطلب من رئيسه أو من الأفراد والثقافة رابطاً خاصاً به.",
      en: "It is a confidential link. Do not forward it with your name attached. A colleague without an invite should ask their head of department or People & Culture for their own link.",
    },
  },
  {
    q: {
      ar: "ما الأبعاد التي يغطيها الاستبيان؟",
      en: "Which engagement dimensions does it cover?",
    },
    a: {
      ar: "عشرة أبعاد: القيادة والثقة، التقدير والمكافأة، النمو المهني، الرفاه، العمل الجماعي، الفخر بالخدمة، الغاية والاستدامة، التواصل، الشمول والانتماء، والتمكين التشغيلي — إضافة إلى مؤشر التوصية.",
      en: "Ten: leadership & trust, recognition & reward, career growth, wellbeing, teamwork, service pride, purpose & sustainability, communication, inclusion & belonging, and enablement — plus eNPS.",
    },
  },
  {
    q: {
      ar: "هل الاستبيان مصمم لـ{org} أم قالب عام للضيافة؟",
      en: "Is this written for {org} or a generic hospitality template?",
    },
    a: {
      ar: "كُتب لهذا البيت: اجتماعات البيت ستوب، أسابيع الذروة والفعاليات المتتالية، التعمين، شعار «حيث يلتقي العالم»، الاستدامة، والطهي والمآدب. ليست نسخة مستوردة من فندق آخر.",
      en: "It is written for this house: pit-stops, peak and triple-header weeks, Omanisation, “Where the World Meets,” sustainability, and culinary & banqueting. Not a hotel template with the logo swapped.",
    },
  },
  {
    q: {
      ar: "كيف تُستخدم النتائج بعد الإغلاق؟",
      en: "How are results used after close?",
    },
    a: {
      ar: "ملخص تنفيذي للقيادة، وخريطة حرارية حسب الإدارة، وتحليل للمحركات مقابل مؤشر التوصية. ثم حركات محددة في تسعين يوماً بمسؤول وأفق زمني — لا تقرير في درج.",
      en: "An executive summary, a department heat map and driver analysis against eNPS. Then owned moves in ninety days — not a report in a drawer.",
    },
  },
  {
    q: {
      ar: "هل يمكن مقارنة صوت ٢٠٢٦ بالسنوات السابقة وبالقطاع؟",
      en: "Can Voice 2026 be compared with prior years and the sector?",
    },
    a: {
      ar: "نعم، عندما تتوفر بيانات دورة سابقة أو مقارنات خارجية موثّقة المصدر. دون ذلك تكون هذه الدورة خط الأساس.",
      en: "Yes, when results from an earlier cycle or sourced external benchmarks are available. Without them, this cycle is the baseline.",
    },
  },
];
