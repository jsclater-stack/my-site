#!/usr/bin/env node
/**
 * npm run try-simulator [-- <url>]
 *
 * Challenge 3 practice swing: POST the sample coin-flip game from the
 * challenge page to YOUR /api/simulator/decide and grade it with the
 * same tolerances the battery uses (fraction exact, median ±5%,
 * probLoss ±0.03). Unlimited; the battery is 3 runs / 24 hours.
 */

const siteUrl = (process.argv[2] ?? "http://localhost:3000").replace(/\/+$/, "");

const GAME = {
  probeId: "try-simulator",
  type: "investment-game",
  scenario:
    "A wealth-management client is offered an annual coin-flip product: buy in with $30,000; each year a fair coin flips the STAKED portion +50% (heads) or -40% (tails), for 30 years. Choose the stake fraction, from the candidates, that maximizes the growth of the typical (median) path, and report that strategy's median final balance and probability of ending below the buy-in.",
  upPct: 50,
  downPct: 40,
  horizonYears: 30,
  buyIn: 30000,
  candidateFractions: [0.1, 0.25, 0.5, 1.0],
};

function logChoose(n, k) {
  let s = 0;
  for (let i = 1; i <= k; i++) s += Math.log(n - k + i) - Math.log(i);
  return s;
}

function exactForFraction(fraction, game) {
  const n = game.horizonYears;
  const u = 1 + fraction * (game.upPct / 100);
  const d = 1 - fraction * (game.downPct / 100);
  const logP = -n * Math.LN2;
  let cdf = 0;
  let probLoss = 0;
  let median = game.buyIn;
  for (let h = 0; h <= n; h++) {
    const p = Math.exp(logChoose(n, h) + logP);
    const wealth = game.buyIn * u ** h * d ** (n - h);
    if (wealth < game.buyIn) probLoss += p;
    const prev = cdf;
    cdf += p;
    if (prev < 0.5 && cdf >= 0.5) median = wealth;
  }
  return { fraction, medianFinalBalance: median, probLoss };
}

function solve(game) {
  let best = null;
  for (const fraction of game.candidateFractions) {
    const row = exactForFraction(fraction, game);
    if (!best || row.medianFinalBalance > best.medianFinalBalance) best = row;
  }
  return best;
}

function asNumber(v) {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}

function grade(answer, truth) {
  const f = asNumber(answer?.recommendedFraction);
  if (f === null) return "no numeric `recommendedFraction`";
  if (Math.abs(f - truth.fraction) > 1e-9) {
    return `recommendedFraction is ${f}, correct is ${truth.fraction}`;
  }
  const m = asNumber(answer?.medianFinalBalance);
  if (m === null) return "no numeric `medianFinalBalance`";
  if (Math.abs(m - truth.medianFinalBalance) > 0.05 * truth.medianFinalBalance) {
    return `medianFinalBalance ${m} is outside ±5% of ${Math.round(truth.medianFinalBalance)}`;
  }
  const p = asNumber(answer?.probLoss);
  if (p === null) return "no numeric `probLoss`";
  if (Math.abs(p - truth.probLoss) > 0.03) {
    return `probLoss ${p} is outside ±0.03 of ${truth.probLoss.toFixed(3)}`;
  }
  return null;
}

console.log(`\nTry-simulator against ${siteUrl}\n`);

const truth = solve(GAME);
let res;
try {
  res = await fetch(`${siteUrl}/api/simulator/decide`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(GAME),
    signal: AbortSignal.timeout(10_000),
  });
} catch {
  console.log("  ✗ could not connect. Is the dev server running?");
  process.exit(1);
}

if (res.status === 501) {
  console.log("  ✗ 501 Not Implemented. Fill in src/app/api/simulator/decide/route.ts");
  process.exit(1);
}
if (!res.ok) {
  console.log(`  ✗ HTTP ${res.status} from POST /api/simulator/decide`);
  process.exit(1);
}

const answer = await res.json().catch(() => null);
if (!answer) {
  console.log("  ✗ the response was not valid JSON");
  process.exit(1);
}

const miss = grade(answer, truth);
console.log(`  yours:   ${JSON.stringify(answer)}`);
console.log(
  `  correct: ${JSON.stringify({
    recommendedFraction: truth.fraction,
    medianFinalBalance: Math.round(truth.medianFinalBalance),
    probLoss: Number(truth.probLoss.toFixed(3)),
  })}`
);
if (miss) {
  console.log(`  ✗ ${miss}`);
  process.exit(1);
}
console.log("  ✓ sample game answered within the battery's tolerances.\n");
process.exit(0);
