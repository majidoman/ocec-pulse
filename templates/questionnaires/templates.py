# Five professional employee-survey templates (original wording, bilingual).
# Row: (section_en, section_ar, desc_en, desc_ar, question_en, question_ar, type, reverse)
# type: L = Agree 1–5, N = Recommend 0–10, C = Comment. {org} is replaced by the organisation's short name.

L, N, C = "L", "N", "C"

def sec(en, ar, den, dar, items):
    return [(en, ar, den, dar, q_en, q_ar, t, rev) for (q_en, q_ar, t, rev) in items]

TEMPLATES = []

# 1 ─────────────────────────────────────────────────────────────────────────────
TEMPLATES.append(dict(
    file="01-engagement-pulse",
    name=("Quarterly Engagement Pulse", "نبض المشاركة الربعي"),
    purpose=("A short check-in between full surveys: engagement, direction, manager support, growth and intent to stay.",
             "قياس قصير بين الاستبيانات الشاملة: المشاركة والتوجه ودعم المدير والنمو والرغبة في البقاء."),
    when=("Every 3 months, or after a major change.", "كل ٣ أشهر، أو بعد تغيير كبير."),
    minutes="5–7",
    rows=
    sec("Engagement", "المشاركة", "How people feel about working here.", "شعور الموظفين تجاه العمل هنا.", [
        ("I am proud to work for {org}.", "أفخر بالعمل في {org}.", L, False),
        ("I feel motivated to go beyond what is expected of me.", "أشعر بالحافز لتقديم أكثر مما هو متوقع مني.", L, False),
        ("I rarely think about looking for a job elsewhere.", "نادراً ما أفكر في البحث عن عمل في مكان آخر.", L, False),
    ]) +
    sec("Direction", "التوجه", "Clarity about where the organisation is going.", "وضوح الوجهة التي تسير إليها المؤسسة.", [
        ("I understand the organisation's priorities for the next few months.", "أفهم أولويات المؤسسة للأشهر القادمة.", L, False),
        ("I know how my work contributes to those priorities.", "أعرف كيف يسهم عملي في تحقيق هذه الأولويات.", L, False),
    ]) +
    sec("My Manager", "مديري", "Day-to-day support from the direct manager.", "الدعم اليومي من المدير المباشر.", [
        ("My manager keeps me informed about things that affect my work.", "يُطلعني مديري على ما يؤثر في عملي.", L, False),
        ("My manager recognises good work.", "يقدّر مديري العمل الجيد.", L, False),
        ("I can raise a problem with my manager without worrying about the consequences.", "أستطيع طرح أي مشكلة على مديري دون قلق من العواقب.", L, False),
    ]) +
    sec("Growth", "النمو", "Learning and development opportunities.", "فرص التعلم والتطوير.", [
        ("I have learned something in the last three months that makes me better at my job.", "تعلمت خلال الأشهر الثلاثة الماضية ما جعلني أفضل في عملي.", L, False),
        ("I can see a realistic next step for my career here.", "أرى خطوة تالية واقعية لمساري المهني هنا.", L, False),
    ]) +
    sec("Workload", "عبء العمل", "Whether the amount of work is sustainable.", "مدى استدامة حجم العمل.", [
        ("My workload is manageable most of the time.", "عبء عملي قابل للإدارة في معظم الأوقات.", L, False),
        ("I often feel exhausted at the end of the working day.", "أشعر غالباً بالإنهاك في نهاية يوم العمل.", L, True),
    ]) +
    sec("Recommendation", "التوصية", "Would you recommend {org} as a place to work?", "هل توصي بالعمل في {org}؟", [
        ("How likely are you to recommend {org} as a place to work to a friend?", "ما مدى احتمال أن توصي صديقاً بالعمل في {org}؟", N, False),
    ]) +
    [("", "", "", "", "What is one thing we should keep doing?", "ما الشيء الذي يجب أن نستمر في فعله؟", C, False),
     ("", "", "", "", "What is one thing we should change first?", "ما أول شيء يجب أن نغيّره؟", C, False)],
))

# 2 ─────────────────────────────────────────────────────────────────────────────
TEMPLATES.append(dict(
    file="02-onboarding-experience",
    name=("New Joiner Experience (first 90 days)", "تجربة الموظف الجديد (أول ٩٠ يوماً)"),
    purpose=("How well recruitment, the first day, induction and early support prepared new staff.",
             "مدى نجاح التوظيف واليوم الأول والتعريف والدعم المبكر في تهيئة الموظفين الجدد."),
    when=("Send 60–90 days after the start date. Run once enough new joiners exist to keep groups of 5 or more.",
          "يُرسل بعد ٦٠–٩٠ يوماً من تاريخ المباشرة، عندما يكفي عدد المنضمين لتكوين مجموعات من ٥ فأكثر."),
    minutes="5–7",
    rows=
    sec("Recruitment", "التوظيف", "The hiring process and what you were told.", "إجراءات التعيين وما قيل لك عن الوظيفة.", [
        ("The job turned out to be what was described during recruitment.", "تبيّن أن الوظيفة مطابقة لما وُصف خلال التوظيف.", L, False),
        ("The hiring process was well organised.", "كانت إجراءات التعيين منظمة جيداً.", L, False),
    ]) +
    sec("First Day and Week", "اليوم والأسبوع الأول", "Being ready to start work.", "الجاهزية لبدء العمل.", [
        ("My workspace, equipment and system access were ready when I started.", "كانت مساحة عملي وأجهزتي وصلاحيات الأنظمة جاهزة عند مباشرتي.", L, False),
        ("I knew where to go and who to ask on my first day.", "عرفت في يومي الأول إلى أين أذهب ومن أسأل.", L, False),
        ("I felt welcomed by my team.", "شعرت بترحيب فريقي.", L, False),
    ]) +
    sec("Induction and Training", "التعريف والتدريب", "Learning the organisation and the role.", "التعرّف على المؤسسة وعلى الدور.", [
        ("The induction helped me understand how {org} works.", "ساعدني برنامج التعريف على فهم طريقة عمل {org}.", L, False),
        ("I received the training I needed to do my job.", "تلقيت التدريب الذي أحتاجه لأداء عملي.", L, False),
        ("I understand the policies on health, safety and conduct that apply to me.", "أفهم سياسات الصحة والسلامة والسلوك التي تنطبق عليّ.", L, False),
    ]) +
    sec("Role Clarity", "وضوح الدور", "Knowing what is expected.", "معرفة ما هو متوقع منك.", [
        ("I clearly understand what is expected of me in my role.", "أفهم بوضوح ما هو متوقع مني في دوري.", L, False),
        ("I know how my performance will be assessed.", "أعرف كيف سيُقيَّم أدائي.", L, False),
    ]) +
    sec("Support and Belonging", "الدعم والانتماء", "Help and connection in the first months.", "المساندة والارتباط في الأشهر الأولى.", [
        ("My manager has met with me regularly since I joined.", "يلتقي بي مديري بانتظام منذ انضمامي.", L, False),
        ("I have someone I can go to with questions.", "يوجد شخص ألجأ إليه عند وجود أسئلة.", L, False),
        ("I still feel like an outsider in my team.", "ما زلت أشعر أنني غريب في فريقي.", L, True),
    ]) +
    sec("Recommendation", "التوصية", "Would you recommend {org} to someone like you?", "هل توصي بـ{org} لشخص مثلك؟", [
        ("Based on your first months, how likely are you to recommend {org} as a place to work?", "بناءً على أشهرك الأولى، ما مدى احتمال أن توصي بالعمل في {org}؟", N, False),
    ]) +
    [("", "", "", "", "What would have made your first weeks easier?", "ما الذي كان سيجعل أسابيعك الأولى أسهل؟", C, False),
     ("", "", "", "", "Is anything still unclear about your role or the organisation?", "هل ما زال هناك ما هو غير واضح بشأن دورك أو المؤسسة؟", C, False)],
))

# 3 ─────────────────────────────────────────────────────────────────────────────
TEMPLATES.append(dict(
    file="03-exit-survey",
    name=("Exit Survey", "استبيان المغادرة"),
    purpose=("Why people leave and what would have kept them, to reduce avoidable turnover.",
             "أسباب مغادرة الموظفين وما كان سيبقيهم، للحد من الدوران الوظيفي الذي يمكن تجنبه."),
    when=("Send in the employee's last two weeks. Report only once 5 or more leavers have answered.",
          "يُرسل خلال الأسبوعين الأخيرين للموظف، ولا تُعرض النتائج إلا بعد إجابة ٥ مغادرين فأكثر."),
    minutes="6–8",
    rows=
    sec("The Role", "الوظيفة", "The job itself.", "طبيعة العمل نفسه.", [
        ("My job made good use of my skills and abilities.", "استفادت وظيفتي جيداً من مهاراتي وقدراتي.", L, False),
        ("My workload was reasonable.", "كان عبء عملي معقولاً.", L, False),
        ("I had the resources I needed to do my job well.", "توفرت لي الموارد التي أحتاجها لأداء عملي جيداً.", L, False),
    ]) +
    sec("Manager", "المدير", "Your relationship with your direct manager.", "علاقتك بمديرك المباشر.", [
        ("My manager treated me fairly.", "عاملني مديري بإنصاف.", L, False),
        ("My manager supported my development.", "دعم مديري تطوري المهني.", L, False),
        ("My manager's behaviour was one of the reasons I decided to leave.", "كان سلوك مديري أحد أسباب قراري بالمغادرة.", L, True),
    ]) +
    sec("Pay and Benefits", "الراتب والمزايا", "Reward compared with the role and the market.", "المكافأة مقارنة بالدور وبالسوق.", [
        ("My pay was fair for the work I did.", "كان راتبي عادلاً مقابل العمل الذي أقوم به.", L, False),
        ("The benefits met my needs.", "لبّت المزايا احتياجاتي.", L, False),
    ]) +
    sec("Growth", "النمو", "Career and learning opportunities.", "فرص المسار المهني والتعلم.", [
        ("I had clear opportunities to progress here.", "كانت لدي فرص واضحة للتقدم هنا.", L, False),
        ("I received the training I needed to grow.", "تلقيت التدريب الذي أحتاجه لأتطور.", L, False),
    ]) +
    sec("Culture", "ثقافة العمل", "How it felt to work here.", "كيف كان الشعور بالعمل هنا.", [
        ("I was treated with respect by colleagues.", "عوملت باحترام من زملائي.", L, False),
        ("I could voice concerns without fear.", "استطعت التعبير عن مخاوفي دون خوف.", L, False),
        ("Leadership communicated openly about decisions that affected me.", "تواصلت القيادة بانفتاح بشأن القرارات التي أثّرت عليّ.", L, False),
    ]) +
    sec("Recommendation", "التوصية", "Would you recommend {org} as an employer?", "هل توصي بـ{org} كجهة عمل؟", [
        ("How likely are you to recommend {org} as a place to work?", "ما مدى احتمال أن توصي بالعمل في {org}؟", N, False),
    ]) +
    [("", "", "", "", "What was the main reason you decided to leave?", "ما السبب الرئيسي لقرارك بالمغادرة؟", C, False),
     ("", "", "", "", "What could {org} have done to keep you?", "ما الذي كان بإمكان {org} فعله لإبقائك؟", C, False),
     ("", "", "", "", "What did you value most about working here?", "ما أكثر ما قدّرته في العمل هنا؟", C, False)],
))

# 4 ─────────────────────────────────────────────────────────────────────────────
TEMPLATES.append(dict(
    file="04-wellbeing-workload-safety",
    name=("Wellbeing, Workload & Safety", "الرفاه وعبء العمل والسلامة"),
    purpose=("Early warning on burnout, workload, speaking up and physical safety, especially after busy periods.",
             "إنذار مبكر بشأن الإرهاق وعبء العمل وحرية التعبير والسلامة الجسدية، خاصة بعد فترات الذروة."),
    when=("After peak periods, or twice a year.", "بعد فترات الذروة، أو مرتين في السنة."),
    minutes="6–8",
    rows=
    sec("Workload", "عبء العمل", "Volume and pace of work.", "حجم العمل ووتيرته.", [
        ("I can usually complete my work within my normal working hours.", "أستطيع عادةً إنجاز عملي ضمن ساعات العمل المعتادة.", L, False),
        ("Work is shared fairly in my team.", "يُوزَّع العمل بعدل في فريقي.", L, False),
        ("I regularly feel I cannot keep up with what is asked of me.", "أشعر بانتظام أنني لا أستطيع مجاراة ما يُطلب مني.", L, True),
    ]) +
    sec("Rest and Balance", "الراحة والتوازن", "Recovery time and life outside work.", "وقت التعافي والحياة خارج العمل.", [
        ("I get enough rest between shifts or working days.", "أحصل على راحة كافية بين المناوبات أو أيام العمل.", L, False),
        ("I can take my annual leave when I need it.", "أستطيع أخذ إجازتي السنوية عند الحاجة.", L, False),
        ("My work allows me enough time for family and personal life.", "يتيح لي عملي وقتاً كافياً لعائلتي وحياتي الخاصة.", L, False),
    ]) +
    sec("Speaking Up", "حرية التعبير", "Feeling safe to raise issues and mistakes.", "الشعور بالأمان عند طرح المشكلات والأخطاء.", [
        ("In my team it is safe to admit a mistake.", "من الآمن في فريقي الاعتراف بالخطأ.", L, False),
        ("I can disagree with my manager without negative consequences.", "أستطيع الاختلاف مع مديري دون عواقب سلبية.", L, False),
        ("Concerns raised in my team are acted on.", "يُتخذ إجراء بشأن الملاحظات التي تُطرح في فريقي.", L, False),
    ]) +
    sec("Health and Safety", "الصحة والسلامة", "Physical safety at work.", "السلامة الجسدية في العمل.", [
        ("I have the protective equipment and training I need to work safely.", "تتوفر لي معدات الحماية والتدريب اللازم للعمل بأمان.", L, False),
        ("I would report a safety hazard without hesitation.", "سأبلّغ عن أي خطر على السلامة دون تردد.", L, False),
        ("Safety is not compromised to meet deadlines.", "لا يُتهاون في السلامة من أجل الالتزام بالمواعيد.", L, False),
    ]) +
    sec("Support", "الدعم", "Help available when things are difficult.", "المساندة المتاحة في الأوقات الصعبة.", [
        ("My manager notices when I am under too much pressure.", "يلاحظ مديري عندما أكون تحت ضغط كبير.", L, False),
        ("I know where to get help if work affects my health.", "أعرف أين أجد المساعدة إذا أثّر العمل على صحتي.", L, False),
        ("{org} genuinely cares about the wellbeing of its staff.", "يهتم {org} فعلاً برفاه موظفيه.", L, False),
    ]) +
    [("", "", "", "", "What is the biggest source of pressure in your work right now?", "ما أكبر مصدر للضغط في عملك حالياً؟", C, False),
     ("", "", "", "", "What one change would most improve your wellbeing at work?", "ما التغيير الواحد الذي سيحسّن رفاهك في العمل أكثر من غيره؟", C, False)],
))

# 5 ─────────────────────────────────────────────────────────────────────────────
TEMPLATES.append(dict(
    file="05-manager-effectiveness",
    name=("Manager Effectiveness (upward feedback)", "فعالية المدير (تقييم الموظفين لمديرهم)"),
    purpose=("Confidential feedback from staff about their direct manager, for development plans, not for performance ratings.",
             "تغذية راجعة سرية من الموظفين عن مديرهم المباشر، لخطط التطوير لا لتقييم الأداء."),
    when=("Once a year. Results are grouped by department, so set up departments that match each manager's team; a team's results appear once 5 or more of its members answer.",
          "مرة في السنة. تُجمَّع النتائج حسب الإدارة، لذا اجعل الإدارات مطابقة لفريق كل مدير؛ وتظهر نتائج الفريق بعد إجابة ٥ من أعضائه فأكثر."),
    minutes="5–7",
    rows=
    sec("Clarity", "الوضوح", "Setting direction and expectations.", "تحديد التوجه والتوقعات.", [
        ("My manager sets clear goals for our team.", "يضع مديري أهدافاً واضحة لفريقنا.", L, False),
        ("My manager explains the reasons behind decisions.", "يشرح مديري أسباب القرارات.", L, False),
    ]) +
    sec("Coaching and Feedback", "التوجيه والملاحظات", "Helping people improve.", "مساعدة الموظفين على التحسن.", [
        ("My manager gives me regular, specific feedback.", "يقدّم لي مديري ملاحظات منتظمة ومحددة.", L, False),
        ("My manager helps me develop new skills.", "يساعدني مديري على تطوير مهارات جديدة.", L, False),
        ("My manager has discussed my career goals with me in the last six months.", "ناقش معي مديري أهدافي المهنية خلال الأشهر الستة الماضية.", L, False),
    ]) +
    sec("Fairness and Respect", "العدالة والاحترام", "Treating everyone fairly.", "معاملة الجميع بإنصاف.", [
        ("My manager treats all team members fairly.", "يعامل مديري جميع أعضاء الفريق بإنصاف.", L, False),
        ("My manager shows favouritism.", "يُظهر مديري محاباة لبعض الموظفين.", L, True),
        ("My manager treats me with respect.", "يعاملني مديري باحترام.", L, False),
    ]) +
    sec("Communication", "التواصل", "Listening and keeping people informed.", "الإصغاء وإطلاع الموظفين.", [
        ("My manager listens to my ideas.", "يصغي مديري إلى أفكاري.", L, False),
        ("My manager shares information the team needs in good time.", "يشارك مديري المعلومات التي يحتاجها الفريق في الوقت المناسب.", L, False),
    ]) +
    sec("Support and Recognition", "الدعم والتقدير", "Backing the team and recognising effort.", "مساندة الفريق وتقدير الجهد.", [
        ("My manager supports me when I face difficulties at work.", "يساندني مديري عندما أواجه صعوبات في العمل.", L, False),
        ("My manager recognises good work when it happens.", "يقدّر مديري العمل الجيد في وقته.", L, False),
        ("My manager removes obstacles that slow the team down.", "يزيل مديري العقبات التي تبطئ عمل الفريق.", L, False),
    ]) +
    sec("Recommendation", "التوصية", "Would you recommend working for your manager?", "هل توصي بالعمل مع مديرك؟", [
        ("How likely are you to recommend working in your manager's team to a colleague?", "ما مدى احتمال أن توصي زميلاً بالعمل في فريق مديرك؟", N, False),
    ]) +
    [("", "", "", "", "What does your manager do that you would like them to keep doing?", "ما الذي يفعله مديرك وتود أن يستمر فيه؟", C, False),
     ("", "", "", "", "What one thing could your manager do differently to help you succeed?", "ما الشيء الواحد الذي يمكن لمديرك فعله بشكل مختلف ليساعدك على النجاح؟", C, False)],
))
