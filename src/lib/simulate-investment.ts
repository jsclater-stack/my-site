import type { SimulatorGame, StakeSummary } from "@/lib/simulator-store";

export const INVESTORS = 20_000;

function medianOf(sorted: Float64Array): number {
  const n = sorted.length;
  if (n === 0) return 0;
  const mid = Math.floor(n / 2);
  if (n % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

export function simulateStake(game: SimulatorGame, fraction: number, n = INVESTORS): StakeSummary {
  const upMul = 1 + fraction * (game.upPct / 100);
  const downMul = 1 - fraction * (game.downPct / 100);
  const years = game.horizonYears;
  const buyIn = game.buyIn;
  const finals = new Float64Array(n);
  let losses = 0;

  for (let i = 0; i < n; i++) {
    let wealth = buyIn;
    for (let y = 0; y < years; y++) {
      wealth *= Math.random() < 0.5 ? upMul : downMul;
    }
    finals[i] = wealth;
    if (wealth < buyIn) losses += 1;
  }

  finals.sort();
  return {
    fraction,
    medianFinalBalance: medianOf(finals),
    probLoss: losses / n,
  };
}

export function recommendStake(game: SimulatorGame): {
  candidates: StakeSummary[];
  best: StakeSummary;
} {
  const candidates = game.candidateFractions.map((fraction) => simulateStake(game, fraction));
  let best = candidates[0];
  for (const row of candidates) {
    if (row.medianFinalBalance > best.medianFinalBalance) best = row;
  }
  return { candidates, best };
}

export function reasoningFor(game: SimulatorGame, best: StakeSummary, nCandidates: number): string {
  const pct = Math.round(best.fraction * 100);
  const median = Math.round(best.medianFinalBalance).toLocaleString("en-US");
  const loss = Math.round(best.probLoss * 100);
  return `Of the ${nCandidates} stakes simulated, staking ${pct}% each year left the typical investor with the most: about $${median} after ${game.horizonYears} years, from a $${game.buyIn.toLocaleString("en-US")} buy-in. ${loss}% of simulated investors still ended below the buy-in.`;
}
