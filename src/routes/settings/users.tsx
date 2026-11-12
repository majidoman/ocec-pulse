import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageFrame } from "@/components/page-frame";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCensus } from "@/lib/census";
import { inviteStaff, listAudit, listStaff, revokeStaffInvite, updateStaff } from "@/lib/pulse/api";
import type { AuditRow, StaffInviteRow, StaffRow } from "@/lib/pulse/results-types";
import { usePulse } from "@/lib/pulse/session";
import { ROLE_LABEL } from "@/lib/settings-store";
import { useT } from "@/lib/store";
import type { StaffRole } from "@/lib/types";

export const Route = createFileRoute("/settings/users")({ component: UsersPage });

const ROLE_HELP: Record<StaffRole, { en: string; ar: string }> = {
  super: { en: "Everything, including deleting data and managing admins.", ar: "كل شيء، بما فيه حذف البيانات وإدارة المديرين." },
  pc: { en: "Runs the census: settings, invitations, all results.", ar: "يدير التعداد: الإعدادات والدعوات وكل النتائج." },
  exec: { en: "Reads all results and comments. Cannot change anything.", ar: "يقرأ كل النتائج والتعليقات دون تعديل." },
  head: { en: "Reads house totals and their own department only.", ar: "يقرأ مجاميع البيت وإدارته فقط." },
  viewer: { en: "Reads results without comments.", ar: "يقرأ النتائج دون التعليقات." },
};

function UsersPage() {
  const { t, loc, lang } = useT();
  const { departments } = useCensus();
  const me = usePulse((s) => s.me);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [invites, setInvites] = useState<StaffInviteRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<StaffRole>("viewer");
  const [dept, setDept] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, a] = await Promise.all([listStaff(), listAudit()]);
      setStaff(s.staff);
      setInvites(s.invites);
      setAudit(a);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load users");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const deptName = (id: string | null) => (id ? loc(departments.find((d) => d.id === id)?.name ?? { en: id, ar: id }) : "");

  async function invite(sendEmail: boolean) {
    if (!email.includes("@")) return toast.error(loc({ en: "Enter an email address.", ar: "أدخل عنوان بريد." }));
    setBusy(true);
    try {
      const res = await inviteStaff({ data: { email, name: name || undefined, role, departmentId: role === "head" ? dept : undefined, sendEmail } });
      setLink(res.link);
      if (sendEmail && !res.emailed) toast.message(loc({ en: `Link created, but the email was not sent: ${res.emailError ?? ""}`, ar: `أُنشئ الرابط لكن لم يُرسل البريد: ${res.emailError ?? ""}` }));
      else toast.success(sendEmail ? loc({ en: "Invitation emailed", ar: "أُرسلت الدعوة بالبريد" }) : loc({ en: "Invitation link created", ar: "أُنشئ رابط الدعوة" }));
      setEmail("");
      setName("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not invite");
    } finally {
      setBusy(false);
    }
  }

  async function change(userId: string, p: { active?: boolean; role?: StaffRole }) {
    try {
      await updateStaff({ data: { userId, ...p } });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update");
    }
  }

  return (
    <PageFrame title={t("setUsers")} hint={t("neverNamed")}>
      <Card className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-ink">{loc({ en: "Invite someone", ar: "دعوة شخص" })}</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <Input placeholder={lang === "ar" ? "الاسم" : "Name"} value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="name@example.com" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} />
          <select className="h-11 rounded-md border border-border bg-paper px-3 text-sm" value={role} onChange={(e) => setRole(e.target.value as StaffRole)}>
            {(Object.keys(ROLE_LABEL) as StaffRole[])
              .filter((r) => r !== "super" || me?.role === "super")
              .map((r) => (
                <option key={r} value={r}>
                  {loc(ROLE_LABEL[r])}
                </option>
              ))}
          </select>
          {role === "head" ? (
            <select className="h-11 rounded-md border border-border bg-paper px-3 text-sm" value={dept} onChange={(e) => setDept(e.target.value)}>
              <option value="">{t("dept")}</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {loc(d.name)}
                </option>
              ))}
            </select>
          ) : null}
        </div>
        <p className="text-xs text-muted">{loc(ROLE_HELP[role])}</p>
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy} onClick={() => void invite(false)}>
            {loc({ en: "Create invitation link", ar: "إنشاء رابط الدعوة" })}
          </Button>
          <Button disabled={busy} variant="outline" onClick={() => void invite(true)}>
            {loc({ en: "Create and email it", ar: "إنشاء وإرسال بالبريد" })}
          </Button>
        </div>
        {link ? (
          <div className="rounded-xl bg-sand-2 px-4 py-3">
            <p className="text-xs text-subtle">
              {loc({
                en: "Send this link to the person yourself. It works once and gives access to whoever opens it while signed in, so share it privately.",
                ar: "أرسل هذا الرابط للشخص بنفسك. يعمل مرة واحدة ويمنح الصلاحية لمن يفتحه وهو مسجّل الدخول، فشاركه بشكل خاص.",
              })}
            </p>
            <p className="mt-1 break-all font-mono text-xs text-ink" dir="ltr">{link}</p>
            <Button
              className="mt-2"
              size="sm"
              variant="outline"
              onClick={() => void navigator.clipboard?.writeText(link).then(() => toast.success(loc({ en: "Copied", ar: "تم النسخ" })))}
            >
              {loc({ en: "Copy link", ar: "نسخ الرابط" })}
            </Button>
          </div>
        ) : null}
      </Card>

      <div className="flex flex-col gap-2">
        {staff.map((u) => (
          <Card key={u.userId} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-ink">
                {u.name ?? u.email ?? u.userId}
                {u.userId === me?.userId ? <span className="ms-2 text-xs text-subtle">{loc({ en: "(you)", ar: "(أنت)" })}</span> : null}
                {!u.active ? <span className="ms-2 text-xs text-score-crit">{loc({ en: "deactivated", ar: "موقوف" })}</span> : null}
              </p>
              <p className="text-xs text-muted" dir="ltr">
                {u.email ?? "—"}
                {u.departmentId ? ` · ${deptName(u.departmentId)}` : ""}
              </p>
              <p className="text-xs text-subtle">
                {loc({ en: "Last active", ar: "آخر نشاط" })}: {u.lastSeenAt ? new Date(u.lastSeenAt).toLocaleString() : "—"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="h-9 rounded-md border border-border bg-paper px-2 text-sm"
                value={u.role}
                disabled={u.userId === me?.userId || (u.role === "super" && me?.role !== "super")}
                onChange={(e) => void change(u.userId, { role: e.target.value as StaffRole })}
              >
                {(Object.keys(ROLE_LABEL) as StaffRole[])
                  .filter((r) => r !== "super" || me?.role === "super" || u.role === "super")
                  .map((r) => (
                    <option key={r} value={r}>
                      {loc(ROLE_LABEL[r])}
                    </option>
                  ))}
              </select>
              <Button size="sm" variant="ghost" disabled={u.userId === me?.userId} onClick={() => void change(u.userId, { active: !u.active })}>
                {u.active ? t("deactivate") : t("activate")}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {invites.filter((i) => !i.accepted).length ? (
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-ink">{loc({ en: "Invitations not yet used", ar: "دعوات لم تُستخدم بعد" })}</h2>
          <ul className="flex flex-col gap-2 text-sm">
            {invites
              .filter((i) => !i.accepted)
              .map((i) => (
                <li key={i.code} className="flex flex-col gap-2 border-b border-border pb-2 last:border-0 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-muted" dir="ltr">
                    {i.email} · {loc(ROLE_LABEL[i.role])}
                    {i.departmentId ? ` · ${deptName(i.departmentId)}` : ""}
                  </span>
                  <span className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void navigator.clipboard?.writeText(`${origin}/join?code=${encodeURIComponent(i.code)}`).then(() => toast.success(loc({ en: "Copied", ar: "تم النسخ" })))}
                    >
                      {loc({ en: "Copy link", ar: "نسخ الرابط" })}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        await revokeStaffInvite({ data: { code: i.code } });
                        await load();
                      }}
                    >
                      {loc({ en: "Cancel", ar: "إلغاء" })}
                    </Button>
                  </span>
                </li>
              ))}
          </ul>
        </Card>
      ) : null}

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-ink">{t("auditTitle")}</h2>
        <ul className="flex flex-col gap-2 text-sm">
          {audit.map((a) => (
            <li key={a.id} className="flex flex-col justify-between gap-1 border-b border-border pb-2 text-muted last:border-0 sm:flex-row sm:gap-3">
              <span>{lang === "ar" ? a.ar : a.en}</span>
              <span className="shrink-0 text-xs text-subtle" dir="ltr">
                {a.actor} · {new Date(a.at).toLocaleString()}
              </span>
            </li>
          ))}
          {!audit.length ? <li className="text-muted">—</li> : null}
        </ul>
      </Card>
    </PageFrame>
  );
}
