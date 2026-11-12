import { useSettings } from "./settings-store";
import { usePulse } from "./pulse/session";
import { formatIsoDate, totalHeadcount } from "./pulse/config";
import type { Dimension, Question } from "./types";

export { formatIsoDate };

/** Single response-rate definition for the whole product. */
export function responseRate(completed: number, headcount: number) {
  if (!headcount) return 0;
  return Math.min(100, Math.round((completed / headcount) * 100));
}

/**
 * Configuration plus the live response count.
 *
 * `completed` and `headcount` are only known to signed-in staff; an anonymous
 * visitor gets `rate` (once the anonymity floor is reached) and nothing else.
 */
export function useCensus() {
  const general = useSettings((s) => s.general);
  const calendar = useSettings((s) => s.calendar);
  const anonymity = useSettings((s) => s.anonymity);
  const branding = useSettings((s) => s.branding);
  const benchmarks = useSettings((s) => s.benchmarks);
  const dimensionsAll = useSettings((s) => s.dimensions);
  const questionsAll = useSettings((s) => s.questions);
  const departmentsAll = useSettings((s) => s.departments);
  const instrumentStatus = useSettings((s) => s.instrumentStatus);
  const reminderCfg = useSettings((s) => s.reminderCfg);
  const email = useSettings((s) => s.email);
  const source = useSettings((s) => s.source);
  const results = usePulse((s) => s.results);
  const stats = usePulse((s) => s.stats);
  const me = usePulse((s) => s.me);

  const departments = departmentsAll.filter((d) => !d.archived);
  const isStaff = source === "admin";
  const headcount = isStaff ? totalHeadcount({ departments: departmentsAll }) : 0;
  const completed = isStaff ? (results?.total ?? 0) : 0;
  const rate: number | null = isStaff ? responseRate(completed, headcount) : (stats?.rate ?? null);

  const dimensions = [...dimensionsAll].filter((d) => d.visible && !d.archived).sort((a, b) => a.order - b.order);
  const likertDimensions = dimensions.filter((d) => d.kind === "likert");
  const questions = [...questionsAll].filter((q) => q.visible).sort((a, b) => a.order - b.order);

  return {
    orgName: general.orgName,
    cycleName: general.cycleName,
    status: general.status,
    allowOpenLink: general.allowOpenLink,
    timezone: general.timezone,
    supportEmail: general.supportEmail,
    supportPhone: general.supportPhone,
    headcount,
    completed,
    rate,
    isStaff,
    kFloor: anonymity.kFloor,
    privacyNotice: anonymity.privacyNotice,
    fieldOpen: calendar.fieldOpen,
    fieldClose: calendar.fieldClose,
    calendarNote: calendar.note,
    dimensions,
    likertDimensions,
    questions,
    departments,
    instrumentStatus,
    currentRole: me?.role ?? null,
    branding,
    benchmarks,
    reminderCfg,
    email,
    anonymity,
  };
}

export function questionsFor(dim: Dimension, bank: Question[]) {
  return bank.filter((q) => q.dimension === dim.id).sort((a, b) => a.order - b.order);
}
