import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { LangToggle } from "@/components/lang-toggle";
import { Mark } from "@/components/mark";
import { TextField } from "@/components/settings-field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { authClient } from "@/lib/auth/client";
import { claimOwner, completeSetup, getSetupState, type SetupState } from "@/lib/pulse/api";
import { usePulse } from "@/lib/pulse/session";
import { useSettings } from "@/lib/settings-store";
import { useT } from "@/lib/store";
import type { Department } from "@/lib/types";

export const Route = createFileRoute("/setup")({ component: SetupPage });

const STEPS = [
  { en: "Owner account", ar: "حساب المالك" },
  { en: "Organisation", ar: "الجهة" },
  { en: "Departments", ar: "الإدارات" },
  { en: "Survey dates", ar: "تواريخ الاستبيان" },
  { en: "Finish", ar: "الإنهاء" },
];

/**
 * First-run wizard for an installed copy. Step 1 creates the owner (protected by SETUP_CODE when set);
 * steps 2–4 edit the same settings as the Settings pages (saved as you type); step 5 marks setup complete.
 */
function SetupPage() {
  const { loc } = useT();
  const [state, setState] = useState<SetupState | null>(null);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const s = await getSetupState();
        setState(s);
        if (s.completed) {
          window.location.replace("/insights");
          return;
        }
        if (!s.needsOwner) {
          const me = await usePulse.getState().loadMe();
          if (me?.role === "super") {
            await usePulse.getState().loadAdmin();
            setStep(1);
          } else {
            setStep(-1);
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load");
      }
    })();
  }, []);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 py-6">
      <header className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-ink">
          <Mark className="size-8" />
          <span className="text-sm font-semibold">{loc({ en: "Setup", ar: "الإعداد" })}</span>
        </div>
        <LangToggle />
      </header>

      {step >= 0 ? (
        <ol className="mb-6 grid grid-cols-5 gap-1 text-[11px]" aria-label={loc({ en: "Setup steps", ar: "خطوات الإعداد" })}>
          {STEPS.map((s, i) => (
            <li key={s.en} className={`rounded-md px-1 py-1.5 text-center ${i === step ? "bg-ink text-paper" : i < step ? "bg-sand-2 text-ink" : "text-subtle"}`} aria-current={i === step ? "step" : undefined}>
              {i + 1}. {loc(s)}
            </li>
          ))}
        </ol>
      ) : null}

      {error ? <p className="text-sm text-score-crit">{error}</p> : null}
      {!state && !error ? <div className="h-40 animate-pulse rounded-2xl bg-sand-2" aria-busy="true" /> : null}

      {state && step === -1 ? (
        <Card>
          <p className="text-sm text-ink">
            {loc({
              en: "Setup has started and an owner exists. Sign in as the owner to continue.",
              ar: "بدأ الإعداد ويوجد مالك. سجّل الدخول بحساب المالك للمتابعة.",
            })}
          </p>
          <a href="/login?next=/setup" className="mt-3 inline-flex h-11 items-center rounded-md bg-ink px-5 text-sm font-medium text-paper">
            {loc({ en: "Sign in", ar: "تسجيل الدخول" })}
          </a>
        </Card>
      ) : null}

      {state && step === 0 ? <AccountStep requiresCode={state.requiresCode} onDone={() => setStep(1)} /> : null}
      {step === 1 ? <OrganisationStep /> : null}
      {step === 2 ? <DepartmentsStep /> : null}
      {step === 3 ? <DatesStep /> : null}
      {step === 4 ? <FinishStep /> : null}

      {step >= 1 && step <= 3 ? (
        <div className="mt-6 flex gap-2">
          <Button variant="outline" className="w-28" onClick={() => setStep(step - 1 < 1 ? 1 : step - 1)} disabled={step === 1}>
            {loc({ en: "Back", ar: "رجوع" })}
          </Button>
          <Button
            className="flex-1"
            onClick={async () => {
              await useSettings.getState().flush();
              const st = useSettings.getState();
              if (st.saveState === "error") {
                toast.error(st.saveError ?? "Could not save");
                return;
              }
              setStep(step + 1);
              window.scrollTo({ top: 0 });
            }}
          >
            {loc({ en: "Save and continue", ar: "حفظ ومتابعة" })}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function AccountStep({ requiresCode, onDone }: { requiresCode: boolean; onDone: () => void }) {
  const { loc } = useT();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 10) return setError(loc({ en: "Use at least 10 characters for the password.", ar: "استخدم عشرة أحرف على الأقل لكلمة المرور." }));
    if (password !== confirm) return setError(loc({ en: "The two passwords do not match.", ar: "كلمتا المرور غير متطابقتين." }));
    if (requiresCode && !code.trim()) return setError(loc({ en: "Enter the setup code.", ar: "أدخل رمز الإعداد." }));
    setBusy(true);
    try {
      const up = await authClient.signUp.email({ email: email.trim(), password, name: name.trim() || email.trim() });
      if (up.error) {
        // Account may already exist (e.g. a retry): sign in instead.
        const inRes = await authClient.signIn.email({ email: email.trim(), password });
        if (inRes.error) {
          setError(up.error.message ?? loc({ en: "Could not create the account.", ar: "تعذّر إنشاء الحساب." }));
          return;
        }
      }
      await claimOwner({ data: { code: code.trim() || undefined } });
      const me = await usePulse.getState().loadMe();
      if (me?.role !== "super") throw new Error(loc({ en: "Could not make this account the owner.", ar: "تعذّر جعل هذا الحساب مالكاً." }));
      await usePulse.getState().loadAdmin();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : loc({ en: "Something went wrong.", ar: "حدث خطأ." }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <h1 className="font-display text-2xl text-ink">{loc({ en: "Create the owner account", ar: "أنشئ حساب المالك" })}</h1>
      <p className="mt-1 text-sm text-muted">
        {loc({
          en: "This person has full control and invites everyone else. Use a work email you will keep.",
          ar: "لهذا الشخص صلاحية كاملة وهو من يدعو الآخرين. استخدم بريد عمل دائم.",
        })}
      </p>
      <form className="mt-5 grid gap-4" onSubmit={(e) => void submit(e)}>
        {requiresCode ? (
          <div className="grid gap-1.5">
            <Label htmlFor="code">{loc({ en: "Setup code", ar: "رمز الإعداد" })}</Label>
            <Input id="code" dir="ltr" autoComplete="off" value={code} onChange={(e) => setCode(e.target.value)} />
            <p className="text-xs text-subtle">
              {loc({ en: "From the SETUP_CODE line in the installation's .env file.", ar: "من السطر SETUP_CODE في ملف .env الخاص بالتثبيت." })}
            </p>
          </div>
        ) : null}
        <div className="grid gap-1.5">
          <Label htmlFor="name">{loc({ en: "Your name", ar: "اسمك" })}</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="email">{loc({ en: "Work email", ar: "بريد العمل" })}</Label>
          <Input id="email" type="email" dir="ltr" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="password">{loc({ en: "Password (at least 10 characters)", ar: "كلمة المرور (عشرة أحرف على الأقل)" })}</Label>
          <Input id="password" type="password" dir="ltr" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="confirm">{loc({ en: "Repeat the password", ar: "أعد كتابة كلمة المرور" })}</Label>
          <Input id="confirm" type="password" dir="ltr" required value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
        </div>
        {error ? <p className="text-sm text-score-crit" role="alert">{error}</p> : null}
        <Button type="submit" disabled={busy}>
          {busy ? loc({ en: "Creating…", ar: "جارٍ الإنشاء…" }) : loc({ en: "Create owner account", ar: "إنشاء حساب المالك" })}
        </Button>
      </form>
    </Card>
  );
}

function OrganisationStep() {
  const { loc } = useT();
  const g = useSettings((s) => s.general);
  const b = useSettings((s) => s.branding);
  const patch = useSettings((s) => s.patchGeneral);
  const patchBranding = useSettings((s) => s.patchBranding);
  return (
    <Card className="grid gap-4 md:grid-cols-2">
      <h1 className="font-display text-2xl text-ink md:col-span-2">{loc({ en: "Your organisation", ar: "بيانات الجهة" })}</h1>
      <TextField label="Organisation name (EN)" value={g.orgName.en} onChange={(v) => patch({ orgName: { ...g.orgName, en: v } })} />
      <TextField label="اسم الجهة (AR)" value={g.orgName.ar} onChange={(v) => patch({ orgName: { ...g.orgName, ar: v } })} />
      <TextField
        label="Short name (EN)"
        value={g.orgShort.en}
        hint={loc({ en: "Used inside questions, e.g. OCEC.", ar: "يُستخدم داخل الأسئلة، مثل OCEC." })}
        onChange={(v) => patch({ orgShort: { ...g.orgShort, en: v } })}
      />
      <TextField label="الاسم المختصر (AR)" value={g.orgShort.ar} onChange={(v) => patch({ orgShort: { ...g.orgShort, ar: v } })} />
      <TextField label="Survey name (EN)" value={g.cycleName.en} hint="e.g. Staff Survey 2026" onChange={(v) => patch({ cycleName: { ...g.cycleName, en: v } })} />
      <TextField label="اسم الاستبيان (AR)" value={g.cycleName.ar} hint="مثل: استبيان الموظفين 2026" onChange={(v) => patch({ cycleName: { ...g.cycleName, ar: v } })} />
      <TextField label="Product name (EN, optional)" value={b.appName.en} onChange={(v) => patchBranding({ appName: { ...b.appName, en: v } })} />
      <TextField label="اسم المنتج (AR، اختياري)" value={b.appName.ar} onChange={(v) => patchBranding({ appName: { ...b.appName, ar: v } })} />
      <TextField
        label={loc({ en: "Support email shown to staff", ar: "بريد الدعم الظاهر للموظفين" })}
        value={g.supportEmail}
        onChange={(v) => patch({ supportEmail: v })}
      />
      <TextField label={loc({ en: "Time zone", ar: "المنطقة الزمنية" })} value={g.timezone} onChange={(v) => patch({ timezone: v })} />
    </Card>
  );
}

function slug(s: string, taken: Set<string>): string {
  const base = s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "dept";
  let id = base;
  for (let i = 2; taken.has(id); i += 1) id = `${base}-${i}`;
  return id;
}

function DepartmentsStep() {
  const { loc } = useT();
  const departments = useSettings((s) => s.departments);
  const setDepartments = useSettings((s) => s.setDepartments);
  const active = departments.filter((d) => !d.archived);
  const total = active.reduce((n, d) => n + (Number(d.headcount) || 0), 0);
  const update = (id: string, p: Partial<Department>) => setDepartments(departments.map((d) => (d.id === id ? { ...d, ...p } : d)));
  return (
    <Card>
      <h1 className="font-display text-2xl text-ink">{loc({ en: "Departments and headcount", ar: "الإدارات وعدد الموظفين" })}</h1>
      <p className="mt-1 text-sm text-muted">
        {loc({
          en: "Staff choose their department in the survey, and response rates use these numbers. Edit the list to match the organisation.",
          ar: "يختار الموظف إدارته في الاستبيان، وتُحسب نسب الاستجابة من هذه الأعداد. عدّل القائمة لتطابق الجهة.",
        })}
      </p>
      <div className="mt-4 grid gap-2">
        {active.map((d) => (
          <div key={d.id} className="grid grid-cols-[1fr_1fr_5rem_auto] items-center gap-2">
            <Input aria-label="Name (EN)" value={d.name.en} onChange={(e) => update(d.id, { name: { ...d.name, en: e.target.value } })} />
            <Input aria-label="الاسم (AR)" dir="rtl" value={d.name.ar} onChange={(e) => update(d.id, { name: { ...d.name, ar: e.target.value } })} />
            <Input
              aria-label={loc({ en: "Headcount", ar: "العدد" })}
              type="number"
              min={0}
              value={d.headcount}
              onChange={(e) => update(d.id, { headcount: Math.max(0, Number(e.target.value) || 0) })}
            />
            <Button variant="ghost" aria-label={loc({ en: "Remove", ar: "حذف" })} onClick={() => setDepartments(departments.filter((x) => x.id !== d.id))}>
              ✕
            </Button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          onClick={() => {
            const taken = new Set(departments.map((d) => d.id));
            setDepartments([...departments, { id: slug(`dept-${departments.length + 1}`, taken), name: { en: "", ar: "" }, headcount: 0 }]);
          }}
        >
          {loc({ en: "Add department", ar: "إضافة إدارة" })}
        </Button>
        <Button variant="ghost" onClick={() => setDepartments([])}>
          {loc({ en: "Clear the list", ar: "مسح القائمة" })}
        </Button>
        <span className="ms-auto text-sm text-ink">
          {loc({ en: "Total staff:", ar: "إجمالي الموظفين:" })} <strong className="tabular-nums">{total}</strong>
        </span>
      </div>
    </Card>
  );
}

function DatesStep() {
  const { loc } = useT();
  const cal = useSettings((s) => s.calendar);
  const g = useSettings((s) => s.general);
  const patchCalendar = useSettings((s) => s.patchCalendar);
  const patch = useSettings((s) => s.patchGeneral);
  const bad = cal.fieldOpen && cal.fieldClose && cal.fieldClose < cal.fieldOpen;
  function setDates(open: string, close: string) {
    patchCalendar({ fieldOpen: open, fieldClose: close });
    const valid = !!open && !!close && close >= open;
    if (valid && g.status === "draft") patch({ status: "open" });
    if ((!open || !close) && g.status === "open") patch({ status: "draft" });
  }
  return (
    <Card className="grid gap-4 md:grid-cols-2">
      <h1 className="font-display text-2xl text-ink md:col-span-2">{loc({ en: "When does the survey run?", ar: "متى يُجرى الاستبيان؟" })}</h1>
      <TextField label={loc({ en: "Start date", ar: "تاريخ البدء" })} type="date" value={cal.fieldOpen} onChange={(v) => setDates(v, cal.fieldClose)} />
      <TextField label={loc({ en: "End date", ar: "تاريخ الانتهاء" })} type="date" value={cal.fieldClose} onChange={(v) => setDates(cal.fieldOpen, v)} />
      {bad ? (
        <p className="text-sm text-score-crit md:col-span-2" role="alert">
          {loc({ en: "The end date is before the start date.", ar: "تاريخ الانتهاء قبل تاريخ البدء." })}
        </p>
      ) : null}
      <label className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm md:col-span-2">
        <span>
          {loc({ en: "Allow the shared link and QR code", ar: "السماح بالرابط العام ورمز QR" })}
          <span className="block text-xs text-subtle">
            {loc({ en: "For staff without a work email. Can be changed later.", ar: "لمن لا يملك بريد عمل. يمكن تغييره لاحقاً." })}
          </span>
        </span>
        <Switch checked={g.allowOpenLink} onCheckedChange={(v) => patch({ allowOpenLink: v })} />
      </label>
      <p className="text-xs text-subtle md:col-span-2">
        {loc({
          en: "You can leave the dates empty and set them later in Settings → General. Staff can answer only between the two dates.",
          ar: "يمكن ترك التاريخين فارغين وضبطهما لاحقاً من الإعدادات ← عام. لا يجيب الموظفون إلا بين التاريخين.",
        })}
      </p>
    </Card>
  );
}

function FinishStep() {
  const { loc } = useT();
  const [busy, setBusy] = useState(false);
  const items = [
    { href: "/settings/email", en: "Set up the mailbox and send yourself a test email", ar: "اضبط صندوق البريد وأرسل رسالة تجريبية لنفسك" },
    { href: "/settings/users", en: "Invite HR, executives and department heads", ar: "ادعُ الموارد البشرية والقيادات ورؤساء الأقسام" },
    { href: "/settings/builder", en: "Review the questions", ar: "راجع الأسئلة" },
    { href: "/insights/invitations", en: "Upload the staff email list", ar: "ارفع قائمة بريد الموظفين" },
    { href: "/survey", en: "Take the survey yourself on a phone", ar: "جرّب الاستبيان بنفسك من الجوال" },
  ];
  return (
    <Card>
      <h1 className="font-display text-2xl text-ink">{loc({ en: "The basics are saved", ar: "حُفظت الإعدادات الأساسية" })}</h1>
      <p className="mt-1 text-sm text-muted">{loc({ en: "Next steps (any order):", ar: "الخطوات التالية (بأي ترتيب):" })}</p>
      <ol className="mt-3 grid gap-2 text-sm">
        {items.map((it, i) => (
          <li key={it.href} className="rounded-xl bg-sand-2 px-3 py-2">
            {i + 1}. {loc(it)}
          </li>
        ))}
      </ol>
      <Button
        className="mt-5 w-full"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await useSettings.getState().flush();
            await completeSetup();
            window.location.href = "/insights";
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not finish");
            setBusy(false);
          }
        }}
      >
        {loc({ en: "Finish and open the dashboard", ar: "إنهاء وفتح لوحة النتائج" })}
      </Button>
    </Card>
  );
}
