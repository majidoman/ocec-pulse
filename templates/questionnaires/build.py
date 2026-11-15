"""Builds the questionnaire workbooks (Instructions · Survey · Questions) for Pulse's Excel import."""
import json, os, sys
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.worksheet.datavalidation import DataValidation

sys.path.insert(0, os.path.dirname(__file__))
from templates import TEMPLATES  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "..", "public", "templates", "library")
os.makedirs(OUT, exist_ok=True)

INK, ACCENT, SAND, SAND2, LINE = "142A32", "2C6A6A", "F6F2EA", "ECE5D8", "D9D1C3"
HEAD = [
    ("ID (optional) / الرمز (اختياري)", 12, False),
    ("Section (EN) / القسم (إنجليزي)", 24, False),
    ("Section (AR) / القسم (عربي)", 24, True),
    ("Section description (EN) / وصف القسم (إنجليزي)", 32, False),
    ("Section description (AR) / وصف القسم (عربي)", 32, True),
    ("Question (EN) / السؤال (إنجليزي)", 58, False),
    ("Question (AR) / السؤال (عربي)", 58, True),
    ("Type / النوع", 18, False),
    ("Required / مطلوب", 12, False),
    ("Reverse-worded / معكوس", 14, False),
]
TYPE = {"L": "Agree 1–5", "N": "Recommend 0–10", "C": "Comment"}
thin = Side(style="thin", color=LINE)
border = Border(bottom=thin)
font = "Calibri"


def rtl(cell, wrap=True):
    cell.alignment = Alignment(horizontal="right", vertical="top", wrap_text=wrap, readingOrder=2)


def ltr(cell, wrap=True):
    cell.alignment = Alignment(horizontal="left", vertical="top", wrap_text=wrap, readingOrder=1)


def instructions(wb, t=None):
    ws = wb.active
    ws.title = "Instructions"
    ws.sheet_view.showGridLines = False
    ws.column_dimensions["A"].width = 62
    ws.column_dimensions["B"].width = 62
    title = t["name"] if t else ("Pulse questionnaire template", "قالب أسئلة نبض")
    ws["A1"], ws["B1"] = title
    for c in ("A1", "B1"):
        ws[c].font = Font(name=font, size=16, bold=True, color=INK)
    ltr(ws["A1"]); rtl(ws["B1"])
    r = 3
    if t:
        rows = [("Purpose", "الغرض", t["purpose"]), ("When to use", "متى يُستخدم", t["when"]), ("Time to answer", "مدة الإجابة", (f"About {t['minutes']} minutes", f"حوالي {t['minutes']} دقائق"))]
        for en_l, ar_l, (en, ar) in rows:
            ws.cell(r, 1, f"{en_l}: {en}"); ws.cell(r, 2, f"{ar_l}: {ar}")
            ltr(ws.cell(r, 1)); rtl(ws.cell(r, 2)); r += 1
        r += 1
    steps = [
        ("How to use this file", "طريقة استخدام الملف"),
        ("1. Edit the questions on the \"Questions\" sheet. Keep the first row (the column names) as it is.", "١. عدّل الأسئلة في ورقة \"Questions\"، واترك الصف الأول (أسماء الأعمدة) كما هو."),
        ("2. Write every section and question in English and Arabic.", "٢. اكتب كل قسم وكل سؤال بالإنجليزية والعربية."),
        ("3. Type: \"Agree 1–5\" (Strongly disagree … Strongly agree), \"Recommend 0–10\" (eNPS) or \"Comment\" (free text). Pick from the list in the cell.", "٣. النوع: \"Agree 1–5\" (موافقة من أعارض بشدة إلى أوافق بشدة)، أو \"Recommend 0–10\" (مؤشر التوصية)، أو \"Comment\" (تعليق حر). اختر من القائمة داخل الخلية."),
        ("4. Questions with the same section name are shown together, in the order the section first appears.", "٤. الأسئلة التي تحمل اسم القسم نفسه تظهر معاً، بترتيب أول ظهور للقسم."),
        ("5. Put the Recommend 0–10 question in a section of its own. Only one is allowed.", "٥. ضع سؤال التوصية ٠–١٠ في قسم مستقل، ويُسمح بسؤال واحد فقط."),
        ("6. Comment questions all appear on the last page; leave their section empty.", "٦. أسئلة التعليق تظهر كلها في الصفحة الأخيرة؛ اترك عمود القسم فارغاً لها."),
        ("7. Reverse-worded = Yes for negative statements (e.g. \"I often feel exhausted\"), so agreeing counts as unfavourable.", "٧. معكوس = نعم للعبارات السلبية (مثل \"أشعر غالباً بالإنهاك\")، فتُحتسب الموافقة عليها نتيجة غير إيجابية."),
        ("8. {org} is replaced by the organisation's short name. The ID column can stay empty.", "٨. يُستبدل {org} بالاسم المختصر للجهة. يمكن ترك عمود الرمز فارغاً."),
        ("9. Limits: 20 sections, 120 questions, 5 comment questions, 300 characters per question.", "٩. الحدود: ٢٠ قسماً، ١٢٠ سؤالاً، ٥ أسئلة تعليق، ٣٠٠ حرف للسؤال."),
        ("10. Survey name: change it on the \"Survey\" sheet (optional).", "١٠. اسم الاستبيان: غيّره في ورقة \"Survey\" (اختياري)."),
        ("", ""),
        ("How to upload", "طريقة الرفع"),
        ("Settings → Survey builder → Import questions from Excel → Choose Excel file. The system checks the file and shows any problems with their row numbers before anything changes.", "الإعدادات ← منشئ الاستبيان ← استيراد الأسئلة من إكسل ← اختر ملف إكسل. يفحص النظام الملف ويعرض أي أخطاء بأرقام صفوفها قبل أي تغيير."),
        ("Import is possible only before anyone has answered and while the questions are unlocked. The previous questions are kept so you can go back.", "يمكن الاستيراد فقط قبل وصول أي إجابة وعندما تكون الأسئلة غير مقفلة، وتُحفظ الأسئلة السابقة للرجوع إليها."),
        ("Good practice: keep 3–4 questions per section, use simple sentences with one idea each, and avoid questions that could identify a person.", "ممارسة جيدة: ٣–٤ أسئلة لكل قسم، وجمل بسيطة تحمل فكرة واحدة، وتجنّب الأسئلة التي قد تكشف هوية شخص."),
    ]
    for en, ar in steps:
        ws.cell(r, 1, en); ws.cell(r, 2, ar)
        ltr(ws.cell(r, 1)); rtl(ws.cell(r, 2))
        if en in ("How to use this file", "How to upload"):
            for c in (1, 2):
                ws.cell(r, c).font = Font(name=font, size=12, bold=True, color=ACCENT)
        r += 1


def survey_sheet(wb, name, t=None):
    ws = wb.create_sheet("Survey")
    ws.column_dimensions["A"].width = 30
    ws.column_dimensions["B"].width = 50
    rows = [("Survey name (EN) / اسم الاستبيان (إنجليزي)", name[0]), ("Survey name (AR) / اسم الاستبيان (عربي)", name[1])]
    for i, (k, v) in enumerate(rows, 1):
        ws.cell(i, 1, k).font = Font(name=font, bold=True, color=INK)
        ws.cell(i, 2, v)
    rtl(ws.cell(2, 2), wrap=False)
    ws.cell(4, 1, "Leave both empty to keep the current survey name. / اتركهما فارغين للإبقاء على الاسم الحالي.").font = Font(name=font, italic=True, color="6B6B6B")


def questions_sheet(wb, rows):
    ws = wb.create_sheet("Questions")
    ws.freeze_panes = "A2"
    ws.sheet_view.zoomScale = 100
    for i, (title, width, _) in enumerate(HEAD, 1):
        c = ws.cell(1, i, title)
        c.font = Font(name=font, bold=True, color="FFFFFF")
        c.fill = PatternFill("solid", fgColor=INK)
        c.alignment = Alignment(wrap_text=True, vertical="center", horizontal="center")
        ws.column_dimensions[c.column_letter].width = width
    ws.row_dimensions[1].height = 36
    last_sec, shade = None, False
    for r, row in enumerate(rows, 2):
        (qid, sec_en, sec_ar, d_en, d_ar, q_en, q_ar, typ, req, rev) = row
        if sec_en != last_sec:
            shade, last_sec = not shade, sec_en
        values = [qid, sec_en, sec_ar, d_en, d_ar, q_en, q_ar, TYPE[typ], req, rev]
        for i, v in enumerate(values, 1):
            c = ws.cell(r, i, v)
            c.font = Font(name=font, color=INK)
            c.border = border
            if shade:
                c.fill = PatternFill("solid", fgColor=SAND)
            (rtl if HEAD[i - 1][2] else ltr)(c)
    end = max(len(rows) + 1, 2) + 200  # room to add questions with the dropdowns still working
    dv_type = DataValidation(type="list", formula1='"Agree 1–5,Recommend 0–10,Comment"', allow_blank=True, showErrorMessage=True,
                             errorTitle="Type", error="Choose Agree 1–5, Recommend 0–10 or Comment.")
    dv_yes = DataValidation(type="list", formula1='"Yes,No"', allow_blank=True)
    ws.add_data_validation(dv_type); ws.add_data_validation(dv_yes)
    dv_type.add(f"H2:H{end}"); dv_yes.add(f"I2:J{end}")
    ws.auto_filter.ref = f"A1:J{len(rows) + 1}"


def build(path, name, rows, t=None):
    wb = Workbook()
    instructions(wb, t)
    survey_sheet(wb, name, t)
    questions_sheet(wb, rows)
    wb.active = 2
    wb.save(path)


def to_rows(trows):
    out = []
    for (s_en, s_ar, d_en, d_ar, q_en, q_ar, typ, rev) in trows:
        required = "No" if typ == "C" else "Yes"
        out.append(("", s_en, s_ar, d_en, d_ar, q_en, q_ar, typ, required, "Yes" if rev else "No"))
    return out


# 00 — the current survey, exported from the system (current-survey.json)
cur = json.load(open(os.path.join(HERE, "current-survey.json")))
dims = {d["id"]: d for d in cur["dimensions"]}
rows = []
for q in sorted(cur["questions"], key=lambda q: q["order"]):
    t = {"likert": "L", "enps": "N", "text": "C"}[q["type"]]
    d = dims.get(q["dimension"])
    if t == "C" or not d:
        rows.append((q["id"], "", "", "", "", q["text"]["en"], q["text"]["ar"], t, "Yes" if q["required"] else "No", "No"))
    else:
        rows.append((q["id"], d["name"]["en"], d["name"]["ar"], d["blurb"]["en"], d["blurb"]["ar"], q["text"]["en"], q["text"]["ar"], t,
                     "Yes" if q["required"] else "No", "Yes" if q.get("reverse") else "No"))
library = [dict(
    file="00-current-employee-survey",
    name=(cur["name"]["en"], cur["name"]["ar"]),
    purpose=("The full employee survey that ships with the system: 12 topics with 47 agree questions, plus eNPS and 3 comment questions.",
             "الاستبيان الشامل المرفق بالنظام: ١٢ محوراً و٤٧ سؤال موافقة، إضافة إلى مؤشر التوصية و٣ أسئلة تعليق."),
    when=("Once a year.", "مرة في السنة."), minutes="12–15", rows=None, built=rows)]
library += TEMPLATES
# 06–10 — employee satisfaction surveys supplied by Bawsala (satisfaction-surveys.json)
for t in json.load(open(os.path.join(HERE, "satisfaction-surveys.json"))):
    t["name"] = tuple(t["name"]); t["purpose"] = tuple(t["purpose"]); t["when"] = tuple(t["when"])
    t["rows"] = [tuple(r) for r in t["rows"]]
    library.append(t)

manifest = []
for t in library:
    rows = t.get("built") or to_rows(t["rows"])
    build(os.path.join(OUT, f"{t['file']}.xlsx"), t["name"], rows, t)
    kinds = [r[7] for r in rows]
    manifest.append({
        "file": f"{t['file']}.xlsx",
        "name": {"en": t["name"][0], "ar": t["name"][1]},
        "purpose": {"en": t["purpose"][0], "ar": t["purpose"][1]},
        "minutes": t["minutes"],
        "questions": len(rows),
        "sections": len({r[1] for r in rows if r[7] != "C" and r[1]}),
    })
json.dump(manifest, open(os.path.join(OUT, "index.json"), "w"), ensure_ascii=False, indent=1)
# Blank template
build(os.path.join(OUT, "..", "pulse-questions-template.xlsx"), ("", ""), [], None)
print("\n".join(sorted(os.listdir(OUT))))
