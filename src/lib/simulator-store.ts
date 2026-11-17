import { createClient } from "@supabase/supabase-js";

export type SimulatorGame = {
  probeId?: string;
  type: string;
  scenario?: string;
  upPct: number;
  downPct: number;
  horizonYears: number;
  buyIn: number;
  candidateFractions: number[];
};

export type StakeSummary = {
  fraction: number;
  medianFinalBalance: number;
  probLoss: number;
};

export type SimulatorAnswer = {
  recommendedFraction: number;
  medianFinalBalance: number;
  probLoss: number;
  reasoning: string;
};

export type LatestSimulator = {
  game: SimulatorGame;
  answer: SimulatorAnswer;
  candidates: StakeSummary[];
} | null;

let memory: LatestSimulator = null;

function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function saveLatest(
  game: SimulatorGame,
  answer: SimulatorAnswer,
  candidates: StakeSummary[]
): Promise<void> {
  memory = { game, answer, candidates };

  const client = supabase();
  if (!client) return;

  const { error } = await client.from("simulator_latest").upsert({
    id: 1,
    game,
    answer,
    candidates,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error(`Could not persist the latest simulator run: ${error.message}`);
  }
}

export async function loadLatest(): Promise<LatestSimulator> {
  const client = supabase();
  if (!client) return memory;

  const { data, error } = await client
    .from("simulator_latest")
    .select("game, answer, candidates")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data) return memory;
  return {
    game: data.game as SimulatorGame,
    answer: data.answer as SimulatorAnswer,
    candidates: data.candidates as StakeSummary[],
  };
}
