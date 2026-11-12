/**
 * Results engine: turns stored answers into the aggregates every insights
 * screen reads. Server-only.
 *
 * Anonymity floor (k): any group with fewer than k respondents is hidden. When
 * exactly one group in a cut is hidden, the smallest visible group in that cut
 * is hidden too, so the missing group cannot be worked out by subtraction.
 */
import { getSql } from "@/lib/db";
import type { PulseConfig } from "./config";
import { canReadComments, totalHeadcount } from "./config";
import type { StaffContext } from "./core.server";
import type { CommentRow, CutRow, DepartmentResult, EnpsScore, Results } from "./results-types";

interface ResponseRow {
  id: string;
  department_id: string | null;
  tenure: string | null;
  level: string | null;
  contract: string | null;
}

interface AnswerRow {
  response_id: string;
  question_id: string;
  value: number;
}

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);
const round1 = (n: number) => Math.round(n * 10) / 10;

function enpsOf(values: number[]): EnpsScore | null {
  if (!values.length) return null;
  const promoters = values.filter((v) => v >= 9).length;
  const detractors = values.filter((v) => v <= 6).length;
  const passives = values.length - promoters - detractors;
  return {
    score: Math.round(((promoters - detractors) / values.length) * 100),
    promoters: pct(promoters, values.length),
    passives: pct(passives, values.length),
    detractors: pct(detractors, values.length),
    n: values.length,
  };
}

function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 3) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i += 1) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  if (!sxx || !syy) return null;
  return sxy / Math.sqrt(sxx * syy);
}

/**
 * Decide which groups of a cut may be shown. `counts` maps group id -> respondents.
 * Returns the set of ids that are safe to publish.
 */
export function visibleGroups(counts: Map<string, number>, k: number): Set<string> {
  const visible = new Set<string>();
  let hidden = 0;
  for (const [id, n] of counts) {
    if (n >= k) visible.add(id);
    else if (n > 0) hidden += 1;
  }
  if (hidden === 1 && visible.size > 0) {
    // Complementary suppression: hide the smallest visible group as well.
    let smallest: string | null = null;
    for (const id of visible) {
      if (smallest === null || (counts.get(id) ?? 0) < (counts.get(smallest) ?? 0)) smallest = id;
    }
    if (smallest !== null) visible.delete(smallest);
  }
  return visible;
}

export async function responseCount(): Promise<number> {
  const sql = await getSql();
  const rows = await sql<{ n: number }>`select count(*) as n from pulse_responses`;
  return Number(rows[0]?.n ?? 0);
}

export async function computeResults(config: PulseConfig, viewer: Pick<StaffContext, "role" | "departmentId">): Promise<Results> {
  const sql = await getSql();
  const k = Math.max(2, Number(config.anonymity.kFloor) || 5);
  const headcount = totalHeadcount(config);
  const responses = await sql<ResponseRow>`select id, department_id, tenure, level, contract from pulse_responses`;
  const total = responses.length;
  const scopeDepartment = viewer.role === "head" ? (viewer.departmentId ?? "__none__") : null;

  const empty: Results = {
    k,
    total,
    headcount,
    rate: pct(total, headcount),
    enough: false,
    engagement: null,
    enps: null,
    dimensions: {},
    items: [],
    departments: config.departments
      .filter((d) => !d.archived)
      .map((d) => ({ id: d.id, headcount: d.headcount, n: null, rate: null, index: null, enps: null, dims: null, suppressed: false })),
    unspecified: null,
    cuts: { level: [], tenure: [], contract: [] },
    drivers: null,
    comments: null,
    scopeDepartment,
    role: viewer.role,
    generatedAt: new Date().toISOString(),
  };
  if (total < k) return empty;

  const answers = await sql<AnswerRow>`select response_id, question_id, value from pulse_answers`;
  const questions = config.questions.filter((q) => q.visible);
  const likert = questions.filter((q) => q.type === "likert");
  const likertIds = new Set(likert.map((q) => q.id));
  const reverse = new Set(likert.filter((q) => q.reverse).map((q) => q.id));
  const enpsIds = new Set(questions.filter((q) => q.type === "enps").map((q) => q.id));
  const dimOf = new Map(likert.map((q) => [q.id, q.dimension as string]));
  const likertDims = config.dimensions.filter((d) => d.visible && !d.archived && d.kind === "likert").map((d) => d.id);

  // Per-response answer maps.
  const byResponse = new Map<string, Map<string, number>>();
  for (const a of answers) {
    let m = byResponse.get(a.response_id);
    if (!m) {
      m = new Map();
      byResponse.set(a.response_id, m);
    }
    m.set(a.question_id, Number(a.value));
  }

  const isFav = (qid: string, v: number) => (reverse.has(qid) ? v <= 2 : v >= 4);
  const isUnfav = (qid: string, v: number) => (reverse.has(qid) ? v >= 4 : v <= 2);

  /** Aggregate a set of responses. */
  function aggregate(ids: string[]) {
    const item = new Map<string, { fav: number; n: number }>();
    let fav = 0;
    let unfav = 0;
    let all = 0;
    const enpsValues: number[] = [];
    for (const id of ids) {
      const m = byResponse.get(id);
      if (!m) continue;
      for (const [qid, v] of m) {
        if (likertIds.has(qid)) {
          const row = item.get(qid) ?? { fav: 0, n: 0 };
          row.n += 1;
          all += 1;
          if (isFav(qid, v)) {
            row.fav += 1;
            fav += 1;
          } else if (isUnfav(qid, v)) {
            unfav += 1;
          }
          item.set(qid, row);
        } else if (enpsIds.has(qid)) {
          enpsValues.push(v);
        }
      }
    }
    const dims: Record<string, { fav: number; n: number }> = {};
    for (const [qid, row] of item) {
      const d = dimOf.get(qid);
      if (!d) continue;
      dims[d] = dims[d] ?? { fav: 0, n: 0 };
      dims[d].fav += row.fav;
      dims[d].n += row.n;
    }
    const itemScores = [...item.entries()].map(([id, row]) => ({ id, fav: pct(row.fav, row.n), n: row.n }));
    const index = itemScores.length ? round1(itemScores.reduce((s, r) => s + (r.n ? (item.get(r.id)!.fav / r.n) * 100 : 0), 0) / itemScores.length) : 0;
    return {
      index,
      favorable: pct(fav, all),
      unfavorable: pct(unfav, all),
      neutral: all ? 100 - pct(fav, all) - pct(unfav, all) : 0,
      dims,
      itemScores,
      enps: enpsOf(enpsValues),
    };
  }

  const allIds = responses.map((r) => r.id);
  const house = aggregate(allIds);

  // ── Departments ────────────────────────────────────────────────────────────
  const deptIds = config.departments.filter((d) => !d.archived).map((d) => d.id);
  const deptMembers = new Map<string, string[]>(deptIds.map((id) => [id, []]));
  const unspecifiedIds: string[] = [];
  for (const r of responses) {
    const list = r.department_id ? deptMembers.get(r.department_id) : undefined;
    if (list) list.push(r.id);
    else unspecifiedIds.push(r.id);
  }
  const deptCounts = new Map<string, number>(deptIds.map((id) => [id, deptMembers.get(id)!.length]));
  deptCounts.set("__unspecified__", unspecifiedIds.length);
  const deptVisible = visibleGroups(deptCounts, k);

  const departments: DepartmentResult[] = config.departments
    .filter((d) => !d.archived)
    .map((d) => {
      const ids = deptMembers.get(d.id) ?? [];
      const shown = deptVisible.has(d.id) && (scopeDepartment === null || scopeDepartment === d.id);
      if (!shown) {
        return {
          id: d.id,
          headcount: scopeDepartment === null || scopeDepartment === d.id ? d.headcount : 0,
          n: null,
          rate: null,
          index: null,
          enps: null,
          dims: null,
          suppressed: scopeDepartment === null || scopeDepartment === d.id ? ids.length > 0 : false,
        };
      }
      const agg = aggregate(ids);
      const dims: Record<string, number> = {};
      for (const id of likertDims) dims[id] = agg.dims[id] ? pct(agg.dims[id].fav, agg.dims[id].n) : 0;
      return {
        id: d.id,
        headcount: d.headcount,
        n: ids.length,
        rate: d.headcount ? Math.min(100, pct(ids.length, d.headcount)) : null,
        index: agg.index,
        enps: agg.enps && agg.enps.n >= k ? agg.enps.score : null,
        dims,
        suppressed: false,
      };
    });

  // ── Demographic cuts ───────────────────────────────────────────────────────
  function cut(field: "level" | "tenure" | "contract", scopeIds: Set<string> | null): CutRow[] {
    const groups = new Map<string, string[]>();
    for (const r of responses) {
      if (scopeIds && !scopeIds.has(r.id)) continue;
      const key = r[field] ?? "__unspecified__";
      const list = groups.get(key) ?? [];
      list.push(r.id);
      groups.set(key, list);
    }
    const counts = new Map<string, number>([...groups.entries()].map(([id, ids]) => [id, ids.length]));
    const visible = visibleGroups(counts, k);
    return [...groups.entries()]
      .filter(([id]) => id !== "__unspecified__")
      .map(([id, ids]) =>
        visible.has(id)
          ? { id, n: ids.length, score: aggregate(ids).index, suppressed: false }
          : { id, n: null, score: null, suppressed: true },
      );
  }

  // A department head sees house-level headline figures plus their own department only.
  const scopeIds = scopeDepartment !== null ? new Set(deptMembers.get(scopeDepartment) ?? []) : null;
  const scopeEnough = scopeIds === null || (scopeIds.size >= k && deptVisible.has(scopeDepartment!));

  // ── Drivers (correlation with eNPS) ────────────────────────────────────────
  let drivers: Results["drivers"] = null;
  const driverMin = Math.max(k, 10);
  if (total >= driverMin && enpsIds.size) {
    const enpsId = [...enpsIds][0];
    drivers = [];
    for (const dim of likertDims) {
      const qids = likert.filter((q) => q.dimension === dim).map((q) => q.id);
      const xs: number[] = [];
      const ys: number[] = [];
      for (const id of allIds) {
        const m = byResponse.get(id);
        if (!m) continue;
        const y = m.get(enpsId);
        if (typeof y !== "number") continue;
        const vals = qids
          .map((q) => {
            const v = m.get(q);
            if (typeof v !== "number") return null;
            return reverse.has(q) ? 6 - v : v;
          })
          .filter((v): v is number => v !== null);
        if (!vals.length) continue;
        xs.push(vals.reduce((a, b) => a + b, 0) / vals.length);
        ys.push(y);
      }
      const r = xs.length >= driverMin ? pearson(xs, ys) : null;
      if (r !== null) drivers.push({ dimension: dim, r: Math.round(r * 100) / 100 });
    }
    drivers.sort((a, b) => b.r - a.r);
    if (!drivers.length) drivers = null;
  }

  // ── Comments ───────────────────────────────────────────────────────────────
  let comments: CommentRow[] | null = null;
  if (canReadComments(viewer.role)) {
    const rows = await sql<{ question_id: string; department_id: string | null; body: string }>`
      select question_id, department_id, body from pulse_comments
    `;
    const perDept = new Map<string, number>();
    for (const c of rows) if (c.department_id) perDept.set(c.department_id, (perDept.get(c.department_id) ?? 0) + 1);
    const tagOk = (dept: string | null) =>
      dept !== null && deptVisible.has(dept) && (perDept.get(dept) ?? 0) >= k;
    if (scopeDepartment !== null) {
      comments = scopeEnough && tagOk(scopeDepartment)
        ? rows.filter((c) => c.department_id === scopeDepartment).map((c) => ({ question: c.question_id, body: c.body, department: scopeDepartment }))
        : [];
    } else {
      comments = rows.map((c) => ({
        question: c.question_id,
        body: c.body,
        department: tagOk(c.department_id) ? c.department_id : null,
      }));
    }
    // Stable shuffle so order never reveals submission sequence.
    comments.sort((a, b) => (a.body.length % 7) - (b.body.length % 7) || a.body.localeCompare(b.body));
  }

  const dimensions: Results["dimensions"] = {};
  for (const id of likertDims) {
    const d = house.dims[id];
    if (d) dimensions[id] = { score: pct(d.fav, d.n), n: d.n };
  }

  const isScoped = scopeDepartment !== null;
  return {
    k,
    total,
    headcount,
    rate: pct(total, headcount),
    enough: true,
    engagement: { index: house.index, favorable: house.favorable, neutral: house.neutral, unfavorable: house.unfavorable },
    enps: house.enps,
    dimensions,
    items: house.itemScores
      .map((r) => ({ id: r.id, dimension: dimOf.get(r.id) ?? "", favorable: r.fav, n: r.n }))
      .sort((a, b) => b.favorable - a.favorable),
    departments,
    unspecified: !isScoped && deptVisible.has("__unspecified__") ? unspecifiedIds.length : null,
    cuts: isScoped
      ? scopeEnough
        ? { level: cut("level", scopeIds), tenure: cut("tenure", scopeIds), contract: cut("contract", scopeIds) }
        : { level: [], tenure: [], contract: [] }
      : { level: cut("level", null), tenure: cut("tenure", null), contract: cut("contract", null) },
    drivers,
    comments,
    scopeDepartment,
    role: viewer.role,
    generatedAt: new Date().toISOString(),
  };
}
