export type Lang = "en" | "ar";

export type DimensionId = string;
export type DepartmentId = string;

export type TenureId = "lt1" | "1to3" | "3to7" | "7plus";
export type LevelId = "frontline" | "supervisor" | "manager" | "leadership";
export type ContractId = "permanent" | "contract";

export type QuestionType = "likert" | "enps" | "choice" | "multi" | "short" | "long" | "text";

export type CensusStatus = "draft" | "open" | "closed" | "archived";
export type InstrumentStatus = "draft" | "frozen";
export type StaffRole = "super" | "pc" | "exec" | "head" | "viewer";

export interface Localized {
  en: string;
  ar: string;
}

export interface Dimension {
  id: DimensionId;
  name: Localized;
  short: Localized;
  blurb: Localized;
  visible: boolean;
  archived: boolean;
  order: number;
  kind: "likert" | "enps";
}

export interface Question {
  id: string;
  dimension: DimensionId | "open" | "demo";
  type: QuestionType;
  text: Localized;
  required: boolean;
  reverse?: boolean;
  visible: boolean;
  order: number;
  help?: Localized;
  choices?: Localized[];
}

export interface Department {
  id: DepartmentId;
  name: Localized;
  headcount: number;
  archived?: boolean;
}

export interface SurveyDraft {
  answers: Record<string, number | string>;
  department?: DepartmentId;
  tenure?: TenureId;
  level?: LevelId;
  contract?: ContractId;
  step: number;
  startedAt: string;
}

export interface InvitationCampaign {
  id: string;
  name: Localized;
  status: "draft" | "scheduled" | "sent";
  lang: "en" | "ar" | "both";
  departments: DepartmentId[] | "all";
  sentAt?: string;
  invited: number;
  opened: number;
  started: number;
  completed: number;
  subjectEn: string;
  subjectAr: string;
  bodyEn: string;
  bodyAr: string;
}

export interface ReminderRule {
  id: string;
  label: Localized;
  dayOffset: number;
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  sent: number;
  bodyEn: string;
  bodyAr: string;
  culinaryBoost?: boolean;
}

export interface ActionPlan {
  id: string;
  title: Localized;
  owner: Localized;
  horizon: Localized;
  why: Localized;
  steps: Localized[];
  departments: DepartmentId[];
  status: "proposed" | "in-motion" | "done";
}

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  departmentId?: DepartmentId;
  active: boolean;
  lastLogin?: string;
  invitedAt: string;
}

export interface RosterRow {
  id: string;
  departmentId: DepartmentId;
  email: string;
  tenure?: TenureId;
  level?: LevelId;
  contract?: ContractId;
}

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  action: Localized;
}

export interface BenchmarkSource {
  id: string;
  name: Localized;
  year: string;
  n?: string;
  /** Where the figure comes from (publisher, report, licence). Required before it is shown. */
  licence: string;
  /** House-level engagement score for this comparator, 0-100. */
  score: number | null;
  /** Optional favourable % by dimension id. */
  dimensions?: Record<string, number>;
}

export interface ChangelogEntry {
  id: string;
  at: string;
  summary: Localized;
}
