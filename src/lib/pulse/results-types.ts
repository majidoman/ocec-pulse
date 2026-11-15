/** Shapes returned by the results server functions. Shared by client and server. */
import type { StaffRole } from "../types";

export interface MixScore {
  favorable: number;
  neutral: number;
  unfavorable: number;
}

export interface EnpsScore {
  score: number;
  promoters: number;
  passives: number;
  detractors: number;
  n: number;
}

export interface DepartmentResult {
  id: string;
  headcount: number;
  /** Respondents who chose this department. `null` when hidden by the anonymity floor. */
  n: number | null;
  rate: number | null;
  index: number | null;
  enps: number | null;
  /** Favourable % by dimension id. `null` when hidden. */
  dims: Record<string, number> | null;
  /** True when at least one person answered but the group is below the floor (or hidden to protect another group). */
  suppressed: boolean;
}

export interface CutRow {
  id: string;
  n: number | null;
  score: number | null;
  suppressed: boolean;
}

export interface CommentRow {
  question: string;
  body: string;
  /** Present only when that department has enough comments and respondents. */
  department: string | null;
}

export interface Results {
  /** Anonymity floor used for this calculation. */
  k: number;
  total: number;
  headcount: number;
  rate: number;
  /** False until `total` reaches the floor: nothing below is filled in. */
  enough: boolean;
  engagement: ({ index: number } & MixScore) | null;
  enps: EnpsScore | null;
  dimensions: Record<string, { score: number; n: number }>;
  items: { id: string; dimension: string; favorable: number; n: number }[];
  departments: DepartmentResult[];
  /** Respondents who did not choose a department. `null` when hidden. */
  unspecified: number | null;
  cuts: { level: CutRow[]; tenure: CutRow[]; contract: CutRow[] };
  /** Pearson r between each dimension and eNPS. `null` until there are enough respondents. */
  drivers: { dimension: string; r: number }[] | null;
  comments: CommentRow[] | null;
  /** When set, the viewer is a department head and sees only this department. */
  scopeDepartment: string | null;
  role: StaffRole;
  generatedAt: string;
}

export interface PublicStats {
  status: string;
  /** House response rate, shown only once the floor is reached. */
  rate: number | null;
}

export interface Me {
  userId: string;
  email: string | null;
  name: string | null;
  role: StaffRole | null;
  departmentId: string | null;
  /** True when no administrator exists yet, so this signed-in user may claim ownership. */
  canClaim: boolean;
}

export interface StaffRow {
  userId: string;
  email: string | null;
  name: string | null;
  role: StaffRole;
  departmentId: string | null;
  active: boolean;
  lastSeenAt: string | null;
}

export interface StaffInviteRow {
  code: string;
  email: string;
  name: string | null;
  role: StaffRole;
  departmentId: string | null;
  createdAt: string;
  accepted: boolean;
}

export interface InviteeStats {
  total: number;
  invited: number;
  opened: number;
  completed: number;
  failed: number;
  pending: number;
  byDepartment: { id: string; total: number; completed: number | null }[];
}

export interface CampaignRow {
  id: string;
  name: string;
  kind: string;
  audience: string;
  recipients: number;
  sent: number;
  failed: number;
  createdAt: string;
}

export interface AuditRow {
  id: number;
  at: string;
  actor: string;
  en: string;
  ar: string;
}

/** The last completed staff-list upload, shown on the Invitations page. */
export interface RosterUploadSummary {
  at: string;
  by: string;
  source: string;
  rows: number;
  added: number;
  skipped: number;
  invalid: number;
  noDepartment: number;
  unmatched: number;
}
