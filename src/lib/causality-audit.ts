import type {
  CausalityAnswer,
  CausalityContext,
  CausalitySummary,
  DomainFacts,
  LevelGap,
  Structure,
} from "@/lib/causality-store";

/** An effect this big (either direction) counts as real. */
export const REAL = 0.35;

export type Row = { x: 0 | 1; z: string; y: number };

const isReal = (effect: number) => Math.abs(effect) >= REAL;
const round4 = (v: number) => Math.round(v * 10000) / 10000;

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function asTreatment(v: unknown): 0 | 1 | null {
  if (v === 1 || v === "1" || v === true || v === "true") return 1;
  if (v === 0 || v === "0" || v === false || v === "false") return 0;
  return null;
}

/** Keep only well-formed rows; x becomes 0/1, z becomes a level key. */
export function cleanRows(raw: unknown): Row[] {
  if (!Array.isArray(raw)) return [];
  const rows: Row[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const rec = r as Record<string, unknown>;
    const x = asTreatment(rec.x);
    const y = Number(rec.y);
    if (x === null || !Number.isFinite(y) || rec.z === undefined || rec.z === null) continue;
    rows.push({ x, z: String(rec.z), y });
  }
  return rows;
}

/** Gap in mean outcome between x=1 and x=0. */
function gap(rows: Row[]): number | null {
  const treated = mean(rows.filter((r) => r.x === 1).map((r) => r.y));
  const control = mean(rows.filter((r) => r.x === 0).map((r) => r.y));
  if (treated === null || control === null) return null;
  return treated - control;
}

/** Comparison 1 — the naive effect: ignore the third variable. */
export function naiveEffect(rows: Row[]): number {
  return gap(rows) ?? 0;
}

/** The gap inside each level of the third variable. */
export function levelGaps(rows: Row[], context: CausalityContext): LevelGap[] {
  const levels = [...new Set(rows.map((r) => r.z))].sort();
  return levels.map((z) => {
    const inLevel = rows.filter((r) => r.z === z);
    const label =
      z === "0" ? context.z0 ?? "0" : z === "1" ? context.z1 ?? "1" : z;
    return { z, label, n: inLevel.length, gap: gap(inLevel) };
  });
}

/** Comparison 2 — the stratified effect: compare within each level, weight by size. */
export function stratifiedEffect(levels: LevelGap[]): number {
  let total = 0;
  let weight = 0;
  for (const level of levels) {
    if (level.gap === null) continue;
    total += level.gap * level.n;
    weight += level.n;
  }
  return weight === 0 ? 0 : total / weight;
}

export function readFacts(context: CausalityContext): DomainFacts {
  const f = context.domainFacts ?? {};
  const timing = String(f.zTiming ?? "").toLowerCase();
  const influences = f.zInfluencesX as unknown;
  return {
    zTiming: timing.startsWith("after") ? "after-x" : timing.startsWith("before") ? "before-x" : timing,
    zInfluencesX: influences === true || influences === "true",
  };
}

/**
 * ── The rule: name the structure ─────────────────────────────────────────
 * The business facts say WHERE the third variable sits; the two
 * comparisons say what it is doing.
 */
export function classifyStructure(facts: DomainFacts, naive: number, stratified: number): Structure {
  // Set before X and steered X: a common cause of X and Y.
  if (facts.zTiming === "before-x" && facts.zInfluencesX) return "fork";
  // Set after X: either X's effect flows through it (pipe), or
  // comparing within it manufactures a gap that isn't there (collider).
  if (facts.zTiming === "after-x") {
    if (isReal(naive) && !isReal(stratified)) return "pipe";
    if (!isReal(naive) && isReal(stratified)) return "collider";
  }
  // Both comparisons agree: the third variable is just a bystander.
  if (isReal(naive) && isReal(stratified) && Math.abs(naive - stratified) < REAL) return "direct";
  if (facts.zTiming === "after-x") {
    return Math.abs(naive) >= Math.abs(stratified) ? "pipe" : "collider";
  }
  return "direct";
}

/** The verdict and the advice follow from the structure. */
export function verdictFor(structure: Structure, naive: number, stratified: number) {
  switch (structure) {
    case "fork":
      return { causal: isReal(stratified), advice: "stratify" as const };
    case "pipe":
      return { causal: isReal(naive), advice: "do-not-stratify" as const };
    case "collider":
      return { causal: false, advice: "do-not-stratify" as const };
    case "direct":
      return { causal: isReal(naive), advice: "do-not-stratify" as const };
  }
}

function reasoningFor(
  structure: Structure,
  causal: boolean,
  naive: number,
  stratified: number,
  context: CausalityContext
): string {
  const x = context.xLabel ?? "X";
  const z = context.zLabel ?? "the third variable";
  const head = `Naive effect ${naive.toFixed(2)}, stratified effect ${stratified.toFixed(2)}.`;
  const why: Record<Structure, string> = {
    fork: `The third variable (${z}) was set before ${x} and steered it, so it is a common cause. Comparing within each of its levels blocks that back-door path; the stratified effect is the honest one.`,
    pipe: `The third variable (${z}) comes after ${x} and carries its effect to the outcome. Comparing within its levels would block the very path we want to measure, so the overall comparison is the honest one.`,
    collider: `The third variable (${z}) comes after ${x} and is pushed by both ${x} and the outcome. Comparing within its levels opens a false path and invents a gap; the overall comparison shows no real effect.`,
    direct: `The third variable (${z}) did not steer ${x} and does not sit between ${x} and the outcome; both comparisons agree, so there is nothing to adjust for.`,
  };
  return `${head} ${why[structure]} Verdict: ${causal ? "causal" : "not causal"}.`;
}

export function auditDataset(rows: Row[], context: CausalityContext): {
  answer: CausalityAnswer;
  summary: CausalitySummary;
} {
  const naive = naiveEffect(rows);
  const levels = levelGaps(rows, context);
  const stratified = stratifiedEffect(levels);
  const structure = classifyStructure(readFacts(context), naive, stratified);
  const { causal, advice } = verdictFor(structure, naive, stratified);

  return {
    answer: {
      structure,
      causal,
      advice,
      stratifiedEffect: round4(stratified),
      reasoning: reasoningFor(structure, causal, naive, stratified, context),
    },
    summary: {
      n: rows.length,
      naiveEffect: round4(naive),
      stratifiedEffect: round4(stratified),
      levels: levels.map((l) => ({ ...l, gap: l.gap === null ? null : round4(l.gap) })),
    },
  };
}
