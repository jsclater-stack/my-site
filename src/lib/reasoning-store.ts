import { createClient } from "@supabase/supabase-js";

export type ProblemType = "syllogism" | "plausibility" | "bernoulli";

export interface LatestEntry {
  problem: Record<string, unknown>;
  answer: Record<string, unknown>;
}

export type Latest = Record<ProblemType, LatestEntry | null>;

const memory: Latest = {
  syllogism: null,
  plausibility: null,
  bernoulli: null,
};

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
  type: ProblemType,
  problem: LatestEntry["problem"],
  answer: LatestEntry["answer"]
): Promise<void> {
  memory[type] = { problem, answer };

  const client = supabase();
  if (!client) return;

  const { error } = await client
    .from("reasoning_latest")
    .upsert({ type, problem, answer, updated_at: new Date().toISOString() });
  if (error) {
    console.error(`Could not persist the latest ${type}: ${error.message}`);
  }
}

export async function loadLatest(): Promise<Latest> {
  const latest: Latest = { ...memory };
  const client = supabase();
  if (!client) return latest;

  const { data, error } = await client
    .from("reasoning_latest")
    .select("type, problem, answer");
  if (error || !data) return latest;

  for (const row of data) {
    if (row.type === "syllogism" || row.type === "plausibility" || row.type === "bernoulli") {
      latest[row.type as ProblemType] = { problem: row.problem, answer: row.answer };
    }
  }
  return latest;
}
