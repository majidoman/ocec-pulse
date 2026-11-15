import json, sys, re
src, out = sys.argv[1], sys.argv[2]
d = json.load(open(src))
AR_FIX = {
    "أثق في رؤية القيادة العليا للمؤسسة.": "أثق في رؤية القيادة العليا في {org}.",
    "أفتخر بالعمل في المؤسسة (OCEC).": "أفتخر بالعمل في {org}.",
    "أفتخر بالقيادة في المؤسسة.": "أفتخر بالقيادة في {org}.",
    "أفتخر بفرص النمو المتاحة في المؤسسة.": "أفتخر بفرص النمو المتاحة في {org}.",
    "أفتخر ببيئة العمل الداعمة للرفاه في المؤسسة.": "أفتخر ببيئة العمل الداعمة للرفاه في {org}.",
    "أفتخر بثقافة التقدير والتعاون في المؤسسة.": "أفتخر بثقافة التقدير والتعاون في {org}.",
    "ما مدى احتمالية أن توصي بالمؤسسة (OCEC) كمكان جيد للعمل؟ (0-10)": "ما مدى احتمال أن توصي بالعمل في {org} كمكان عمل جيد؟",
}
TYPE = {"Agree 1-5": "L", "eNPS 0-10": "N", "Comment": "C"}
META = {
 "01": (("A broad annual measure of satisfaction across leadership, managers, fairness, growth, wellbeing and belonging.", "قياس سنوي شامل للرضا يغطي القيادة والمديرين والعدالة والنمو والرفاه والانتماء."), ("Once a year.", "مرة في السنة.")),
 "02": (("The full survey with a deeper focus on leadership credibility and trust.", "الاستبيان الشامل مع تركيز أعمق على مصداقية القيادة والثقة بها."), ("Once a year, or after leadership changes.", "مرة في السنة، أو بعد تغييرات في القيادة.")),
 "03": (("The full survey with a deeper focus on learning, career paths and development.", "الاستبيان الشامل مع تركيز أعمق على التعلم والمسارات المهنية والتطوير."), ("Before planning the training budget.", "قبل التخطيط لميزانية التدريب.")),
 "04": (("The full survey with a deeper focus on wellbeing, workload and the work environment.", "الاستبيان الشامل مع تركيز أعمق على الرفاه وعبء العمل وبيئة العمل."), ("After peak periods, or once a year.", "بعد فترات الذروة، أو مرة في السنة.")),
 "05": (("The full survey with a deeper focus on recognition, collaboration and inclusion.", "الاستبيان الشامل مع تركيز أعمق على التقدير والتعاون والشمولية."), ("Once a year.", "مرة في السنة.")),
}
slugs = {"01": "overall-satisfaction", "02": "leadership-trust", "03": "career-growth", "04": "wellbeing-environment", "05": "recognition-inclusion"}
res = []
changes = 0
for sv in d:
    rows = []
    for sec in sv["sections"]:
        for q in sec["questions"]:
            t = TYPE[q["type"]]
            en, ar = q["en"].strip(), q["ar"].strip()
            if "OCEC" in en or "(0-10)" in en:
                en = re.sub(r"\s*\(0-10\)", "", en).replace("OCEC", "{org}"); changes += 1
            if ar in AR_FIX:
                ar = AR_FIX[ar]
            assert "OCEC" not in en + ar and "0-10" not in en + ar, (en, ar)
            if t == "C":
                rows.append(("", "", "", "", en, ar, t, False))
            else:
                rows.append((sec["en"].strip(), sec["ar"].strip(), "", "", en, ar, t, False))
    purpose, when = META[sv["id"]]
    res.append(dict(file=f"{int(sv['id'])+5:02d}-{slugs[sv['id']]}", name=(sv["name_en"], sv["name_ar"]), purpose=purpose, when=when, minutes="12–15", rows=rows))
json.dump(res, open(out, "w"), ensure_ascii=False, indent=1)
print("converted", len(res), "surveys;", changes, "English texts changed")
