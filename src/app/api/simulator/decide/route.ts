import { NextResponse } from "next/server";
import { recommendStake, reasoningFor } from "@/lib/simulate-investment";
import { saveLatest, type SimulatorGame } from "@/lib/simulator-store";

export const maxDuration = 10;

export async function POST(req: Request) {
  const game = (await req.json().catch(() => null)) as SimulatorGame | null;
  if (
    !game ||
    game.type !== "investment-game" ||
    !Array.isArray(game.candidateFractions) ||
    game.candidateFractions.length === 0
  ) {
    return NextResponse.json(
      { error: "expected an investment-game with candidateFractions" },
      { status: 400 }
    );
  }

  const { candidates, best } = recommendStake(game);
  const answer = {
    recommendedFraction: best.fraction,
    medianFinalBalance: best.medianFinalBalance,
    probLoss: best.probLoss,
    reasoning: reasoningFor(game, best, candidates.length),
  };

  await saveLatest(game, answer, candidates);
  return NextResponse.json(answer);
}
