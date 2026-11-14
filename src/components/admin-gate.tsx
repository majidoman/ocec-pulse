import { useEffect, useRef, useState, type ReactNode } from "react";
import { AppName } from "@/components/app-name";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Mark } from "@/components/mark";
import { Button } from "@/components/ui/button";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { claimOwner, runReminders } from "@/lib/pulse/api";
import { canEditSettings } from "@/lib/pulse/config";
import { usePulse } from "@/lib/pulse/session";
import { useSettings } from "@/lib/settings-store";
import { useT } from "@/lib/store";

let reminderPingDone = false;

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-6 px-6 py-10">
      <Link to="/" className="flex items-center gap-2.5 text-ink">
        <Mark className="size-9" />
        <span className="text-sm font-semibold">
          <AppName />
        </span>
      </Link>
      {children}
    </div>
  );
}

function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center" aria-busy="true">
      <div className="h-8 w-8 animate-pulse rounded-full bg-sand-2" />
    </div>
  );
}

/**
 * Guards the insights room and settings. Signed-out visitors go to sign-in;
 * signed-in people without a role see why. Every data call behind this gate is
 * also checked on the server, so this component is a convenience, not the lock.
 */
export function AdminGate({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) {
  const { loc } = useT();
  const { user, isPending } = useCurrentUserState();
  const location = useLocation();
  const navigate = useNavigate();
  const me = usePulse((s) => s.me);
  const meState = usePulse((s) => s.meState);
  const source = useSettings((s) => s.source);
  const [claiming, setClaiming] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const userId = user?.id ?? null;

  useEffect(() => {
    if (isPending || !userId) return;
    const session = usePulse.getState();
    const fresh = session.me?.userId === userId && session.meState === "ready";
    void (async () => {
      const who = fresh ? session.me : await session.loadMe();
      if (who?.role && useSettings.getState().source !== "admin") {
        try {
          await usePulse.getState().loadAdmin();
        } catch (err) {
          setAdminError(err instanceof Error ? err.message : "Could not load the census.");
        }
      }
      if (who?.role && canEditSettings(who.role) && !reminderPingDone) {
        reminderPingDone = true;
        // Opportunistic: send any reminders that are due whenever an admin opens the room.
        void runReminders({ data: {} }).catch(() => undefined);
      }
    })();
  }, [isPending, userId]);

  const mustSignIn = !isPending && (!user || meState === "signed_out");
  // The page the visitor asked for, captured once so the redirect itself cannot overwrite it.
  const wanted = useRef(location.pathname);
  useEffect(() => {
    if (mustSignIn) void navigate({ to: "/login", search: { next: wanted.current }, replace: true });
  }, [mustSignIn, navigate]);

  if (isPending || mustSignIn) return <Splash />;
  if (meState === "idle" || meState === "loading") return <Splash />;
  if (meState === "error" || !me) {
    return (
      <Shell>
        <p className="font-display text-2xl text-ink">{loc({ en: "Could not check your access", ar: "تعذّر التحقق من صلاحيتك" })}</p>
        <Button onClick={() => void usePulse.getState().loadMe()}>{loc({ en: "Try again", ar: "حاول مجدداً" })}</Button>
      </Shell>
    );
  }
  if (!me.role) {
    if (me.canClaim) {
      return (
        <Shell>
          <p className="font-display text-3xl text-ink">{loc({ en: "Set up this census", ar: "إعداد هذا التعداد" })}</p>
          <p className="text-sm leading-relaxed text-muted">
            {loc({
              en: "No administrator exists yet. The first person to claim ownership becomes the super admin and can invite everyone else. Do this now, before sharing the address with anyone.",
              ar: "لا يوجد مدير بعد. أول من يتولّى الملكية يصبح المدير العام ويدعو الآخرين. افعل ذلك الآن قبل مشاركة العنوان مع أي أحد.",
            })}
          </p>
          <p className="text-sm text-ink">{me.email ?? me.name ?? ""}</p>
          <Button
            disabled={claiming}
            onClick={async () => {
              setClaiming(true);
              try {
                await claimOwner();
                const who = await usePulse.getState().loadMe();
                if (who?.role) await usePulse.getState().loadAdmin();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Could not claim ownership");
              } finally {
                setClaiming(false);
              }
            }}
          >
            {loc({ en: "Claim ownership", ar: "تولّي الملكية" })}
          </Button>
          <UserButton />
        </Shell>
      );
    }
    return (
      <Shell>
        <p className="font-display text-3xl text-ink">{loc({ en: "No access yet", ar: "لا صلاحية بعد" })}</p>
        <p className="text-sm leading-relaxed text-muted">
          {loc({
            en: "You are signed in, but this account has not been given access to the census results. Ask People & Culture for an invitation link, then open it while signed in.",
            ar: "أنت مسجّل الدخول، لكن هذا الحساب لم يُمنح صلاحية الاطلاع على نتائج التعداد. اطلب رابط دعوة من الأفراد والثقافة وافتحه وأنت مسجّل الدخول.",
          })}
        </p>
        <p className="text-sm text-ink">{me.email ?? ""}</p>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="outline">
            <Link to="/">{loc({ en: "Back to the census", ar: "العودة إلى التعداد" })}</Link>
          </Button>
          <UserButton />
        </div>
      </Shell>
    );
  }
  if (adminError) {
    return (
      <Shell>
        <p className="font-display text-2xl text-ink">{loc({ en: "Could not load the census", ar: "تعذّر تحميل التعداد" })}</p>
        <p className="text-sm text-muted">{adminError}</p>
        <Button onClick={() => window.location.reload()}>{loc({ en: "Reload", ar: "إعادة التحميل" })}</Button>
      </Shell>
    );
  }
  if (source !== "admin") return <Splash />;
  if (adminOnly && !canEditSettings(me.role)) {
    return (
      <Shell>
        <p className="font-display text-3xl text-ink">{loc({ en: "Settings are for administrators", ar: "الإعدادات للمديرين" })}</p>
        <p className="text-sm leading-relaxed text-muted">
          {loc({
            en: "Your role can read results but cannot change the census.",
            ar: "دورك يسمح بقراءة النتائج دون تعديل التعداد.",
          })}
        </p>
        <Button asChild>
          <Link to="/insights">{loc({ en: "Open the insights room", ar: "فتح غرفة الرؤى" })}</Link>
        </Button>
      </Shell>
    );
  }
  return <>{children}</>;
}
