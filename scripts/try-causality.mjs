#!/usr/bin/env node
/**
 * npm run try-causality [-- <url>]
 *
 * Challenge 4 practice swing. Builds fresh datasets from all four hidden
 * structures (fork, pipe, collider, direct), POSTs each to YOUR
 * /api/causality/decide, and grades it the way the battery does:
 * structure, causal and advice exact; stratifiedEffect within 0.05 on
 * forks. Then it reads /causality and checks the page shows your last
 * answer. Unlimited; the battery is 3 runs / 24 hours.
 *
 *   npm run try-causality                                  # local dev server
 *   npm run try-causality -- https://your-site.vercel.app  # deployed site
 */

const siteUrl = (process.argv[2] ?? "http://localhost:3000").replace(/\/+$/, "");
const PER_STRUCTURE = 4;
const REAL = 0.35;

// ── Seeded randomness so a failure can be re-run ──────────────────────────
let seed = Number(process.env.SEED ?? Date.now() % 1e9);
const startSeed = seed;
function rand() {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const bern = (p) => (rand() < p ? 1 : 0);
const normal = () => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
const between = (a, b) => a + (b - a) * rand();
const sign = () => (rand() < 0.5 ? -1 : 1);
const r3 = (v) => Math.round(v * 1000) / 1000;

// ── The four hidden structures ────────────────────────────────────────────
function makeFork() {
  const base = between(10, 40);
  const zOnY = sign() * between(2, 5);
  const xOnY = rand() < 0.5 ? 0 : sign() * between(1, 2.5);
  const flip = rand() < 0.5;
  const rows = [];
  for (let i = 0; i < 240; i++) {
    const z = bern(0.5);
    const x = bern((z === 1) !== flip ? 0.8 : 0.2);
    rows.push({ x, z, y: r3(base + zOnY * z + xOnY * x + 0.6 * normal()) });
  }
  return {
    rows,
    facts: { zTiming: "before-x", zInfluencesX: true },
    story: {
      narrative:
        "A SaaS vendor asks whether the premium plan causes customers to consume more support. Company size predates the plan decision, and large companies choose premium far more often.",
      xLabel: "plan", x0: "standard", x1: "premium",
      zLabel: "companySize", z0: "large", z1: "small",
      yLabel: "support hours",
    },
  };
}

function makePipe() {
  const base = between(10, 40);
  const zOnY = sign() * between(2.5, 5);
  const rows = [];
  for (let i = 0; i < 240; i++) {
    const x = bern(0.5);
    const z = bern(x === 1 ? 0.85 : 0.15);
    rows.push({ x, z, y: r3(base + zOnY * z + 0.6 * normal()) });
  }
  return {
    rows,
    facts: { zTiming: "after-x", zInfluencesX: false },
    story: {
      narrative:
        "A retailer asks whether a loyalty email raises spend. Whether the customer opened the app that week happens after the email, and app visits drive spend.",
      xLabel: "email", x0: "not sent", x1: "sent",
      zLabel: "appVisit", z0: "no", z1: "yes",
      yLabel: "weekly spend",
    },
  };
}

function makeCollider() {
  const base = between(10, 40);
  const rows = [];
  for (let i = 0; i < 240; i++) {
    const x = bern(0.5);
    const noise = normal();
    const y = base + 1.5 * noise;
    const z = 2 * x + 2 * noise + 0.4 * normal() > 1 ? 1 : 0;
    rows.push({ x, z, y: r3(y) });
  }
  return {
    rows,
    facts: { zTiming: "after-x", zInfluencesX: false },
    story: {
      narrative:
        "A bank asks whether a new onboarding call lowers early churn risk. Being flagged for review happens after the call, and both the call and high risk trigger a flag.",
      xLabel: "onboardingCall", x0: "no call", x1: "call",
      zLabel: "flagged", z0: "no", z1: "yes",
      yLabel: "risk score",
    },
  };
}

function makeDirect() {
  const base = between(10, 40);
  const xOnY = sign() * between(1.2, 3);
  const zOnY = rand() < 0.5 ? 0 : sign() * between(1, 3);
  const rows = [];
  for (let i = 0; i < 240; i++) {
    const x = bern(0.5);
    const z = bern(0.5);
    rows.push({ x, z, y: r3(base + xOnY * x + zOnY * z + 0.6 * normal()) });
  }
  return {
    rows,
    facts: rand() < 0.5
      ? { zTiming: "before-x", zInfluencesX: false }
      : { zTiming: "after-x", zInfluencesX: false },
    story: {
      narrative:
        "A coffee chain asks whether a new grinder speeds up service. Store region has nothing to do with which stores got the grinder.",
      xLabel: "grinder", x0: "old", x1: "new",
      zLabel: "region", z0: "north", z1: "south",
      yLabel: "seconds saved",
    },
  };
}

// ── The grader's arithmetic, on the exact rows sent ───────────────────────
function gap(rows) {
  const t = rows.filter((r) => r.x === 1).map((r) => r.y);
  const c = rows.filter((r) => r.x === 0).map((r) => r.y);
  if (!t.length || !c.length) return null;
  const m = (a) => a.reduce((s, v) => s + v, 0) / a.length;
  return m(t) - m(c);
}
function effects(rows) {
  const naive = gap(rows);
  let total = 0, weight = 0;
  for (const z of [0, 1]) {
    const level = rows.filter((r) => r.z === z);
    const g = gap(level);
    if (g === null) continue;
    total += g * level.length;
    weight += level.length;
  }
  return { naive, stratified: total / weight };
}
function truthFor(structure, rows) {
  const { naive, stratified } = effects(rows);
  const real = (e) => Math.abs(e) >= REAL;
  const causal = {
    fork: real(stratified),
    pipe: true,
    collider: false,
    direct: true,
  }[structure];
  return {
    structure,
    causal,
    advice: structure === "fork" ? "stratify" : "do-not-stratify",
    stratifiedEffect: stratified,
    naive,
  };
}

function asNumber(v) {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}

function grade(answer, truth) {
  if (!answer || typeof answer !== "object") return "response is not a JSON object";
  for (const field of ["structure", "causal", "advice", "stratifiedEffect", "reasoning"]) {
    if (answer[field] === undefined) return `missing field \`${field}\``;
  }
  if (answer.structure !== truth.structure) {
    return `structure is "${answer.structure}", correct is "${truth.structure}"`;
  }
  if (answer.causal !== truth.causal) return `causal is ${answer.causal}, correct is ${truth.causal}`;
  const okAdvice =
    answer.advice === truth.advice || (truth.structure === "fork" && answer.advice === "randomize");
  if (!okAdvice) return `advice is "${answer.advice}", correct is "${truth.advice}"`;
  if (truth.structure === "fork") {
    const s = asNumber(answer.stratifiedEffect);
    if (s === null) return "stratifiedEffect is not a number";
    if (Math.abs(s - truth.stratifiedEffect) > 0.05) {
      return `stratifiedEffect ${s} is outside ±0.05 of ${truth.stratifiedEffect.toFixed(4)}`;
    }
  }
  return null;
}

// ── Run ───────────────────────────────────────────────────────────────────
const makers = { fork: makeFork, pipe: makePipe, collider: makeCollider, direct: makeDirect };
const plan = Object.keys(makers).flatMap((s) => Array(PER_STRUCTURE).fill(s));
for (let i = plan.length - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1));
  [plan[i], plan[j]] = [plan[j], plan[i]];
}

console.log(`\nChallenge 4 practice against ${siteUrl}  (SEED=${startSeed})\n`);
const misses = { fork: 0, pipe: 0, collider: 0, direct: 0 };
let correct = 0;
let lastAnswer = null;

for (let i = 0; i < plan.length; i++) {
  const structure = plan[i];
  const { rows, facts, story } = makers[structure]();
  const truth = truthFor(structure, rows);
  const probe = {
    probeId: `try-${i + 1}`,
    type: "causality-audit",
    context: { ...story, domainFacts: facts },
    candidateDAGs: [],
    dataset: rows,
  };

  let answer = null;
  let problem = null;
  const started = Date.now();
  try {
    const res = await fetch(`${siteUrl}/api/causality/decide`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(probe),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) problem = `HTTP ${res.status} from /api/causality/decide`;
    else answer = await res.json();
  } catch (err) {
    problem = `could not reach /api/causality/decide (${err.name === "TimeoutError" ? "over 10 s" : err.message})`;
  }
  if (!problem) problem = grade(answer, truth);
  const ms = Date.now() - started;

  if (problem) {
    misses[structure]++;
    console.log(`  ✗ ${probe.probeId.padEnd(7)} ${structure.padEnd(8)} ${problem}`);
    console.log(`      naive ${truth.naive.toFixed(2)}, stratified ${truth.stratifiedEffect.toFixed(2)}, facts ${JSON.stringify(facts)}`);
  } else {
    correct++;
    console.log(`  ✓ ${probe.probeId.padEnd(7)} ${structure.padEnd(8)} causal=${answer.causal} advice=${answer.advice}  (${ms} ms)`);
  }
  if (answer) lastAnswer = answer;
}

// ── Page check: /causality must show the last answer ──────────────────────
let pageOk = false;
let pageProblem = "no answer to compare";
if (lastAnswer) {
  try {
    const res = await fetch(`${siteUrl}/causality`, { signal: AbortSignal.timeout(10_000), cache: "no-store" });
    const html = await res.text();
    const read = (name) => {
      const m = html.match(new RegExp(`data-causality="${name}"[^>]*>([^<]*)<`));
      return m ? m[1].trim() : null;
    };
    const verdict = read("verdict");
    const structure = read("structure");
    const effect = asNumber(read("stratified-effect"));
    const img = html.match(/<img[^>]*data-causality="dag"[^>]*>/)?.[0] ?? html.match(/<img[^>]*src="([^"]+)"[^>]*data-causality="dag"/)?.[0];
    const src = img?.match(/src="([^"]+)"/)?.[1];
    const wantVerdict = lastAnswer.causal ? "causal" : "not causal";
    if (verdict !== wantVerdict) pageProblem = `verdict tag shows "${verdict}", API said "${wantVerdict}"`;
    else if (structure !== lastAnswer.structure) pageProblem = `structure tag shows "${structure}", API said "${lastAnswer.structure}"`;
    else if (effect === null || Math.abs(effect - lastAnswer.stratifiedEffect) > 0.01) pageProblem = `stratified-effect tag shows "${read("stratified-effect")}", API said ${lastAnswer.stratifiedEffect}`;
    else if (!src) pageProblem = "no <img data-causality=\"dag\"> with a src";
    else {
      const imgRes = await fetch(new URL(src.replace(/&amp;/g, "&"), siteUrl), { signal: AbortSignal.timeout(10_000) });
      const type = imgRes.headers.get("content-type") ?? "";
      if (!imgRes.ok || !type.startsWith("image/")) pageProblem = `DAG image ${src} did not load (HTTP ${imgRes.status}, ${type})`;
      else pageOk = true;
    }
  } catch (err) {
    pageProblem = `could not read /causality (${err.message})`;
  }
}

console.log("");
console.log(`  ${pageOk ? "✓" : "✗"} /causality page shows the last answer${pageOk ? "" : `: ${pageProblem}`}`);
const worst = Math.max(...Object.values(misses));
const pass = correct >= Math.ceil(plan.length * (20 / 24)) && worst <= 1 && pageOk;
console.log(`\n  ${correct}/${plan.length} correct; misses by structure ${JSON.stringify(misses)}`);
console.log(pass ? "  Looks battery-ready.\n" : "  Not ready yet: fix the ✗ lines above.\n");
process.exit(pass ? 0 : 1);
