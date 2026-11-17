import { createClient } from "@supabase/supabase-js";

export type Structure = "fork" | "pipe" | "collider" | "direct";

export type DomainFacts = {
  zTiming: "before-x" | "after-x" | string;
  zInfluencesX: boolean;
};

export type CausalityContext = {
  narrative?: string;
  xLabel?: string;
  x0?: string;
  x1?: string;
  zLabel?: string;
  z0?: string;
  z1?: string;
  yLabel?: string;
  domainFacts?: Partial<DomainFacts>;
};

export type CausalityProbe = {
  probeId?: string;
  context: CausalityContext;
};

export type CausalityAnswer = {
  structure: Structure;
  causal: boolean;
  advice: "stratify" | "do-not-stratify";
  stratifiedEffect: number;
  reasoning: string;
};

export type LevelGap = {
  z: string;
  label: string;
  n: number;
  gap: number | null;
};

export type CausalitySummary = {
  n: number;
  naiveEffect: number;
  stratifiedEffect: number;
  levels: LevelGap[];
};

export type LatestCausality = {
  probe: CausalityProbe;
  answer: CausalityAnswer;
  summary: CausalitySummary;
} | null;

// Fallback when Supabase isn't configured. Kept on globalThis so the API
// route and the page share it inside one server process.
const shared = globalThis as unknown as { __causalityLatest?: LatestCausality };

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
  probe: CausalityProbe,
  answer: CausalityAnswer,
  summary: CausalitySummary
): Promise<void> {
  shared.__causalityLatest = { probe, answer, summary };

  const client = supabase();
  if (!client) return;

  const { error } = await client.from("causality_latest").upsert({
    id: 1,
    probe,
    answer,
    summary,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error(`Could not persist the latest causality audit: ${error.message}`);
  }
}

export async function loadLatest(): Promise<LatestCausality> {
  const client = supabase();
  if (!client) return shared.__causalityLatest ?? null;

  const { data, error } = await client
    .from("causality_latest")
    .select("probe, answer, summary")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data) return shared.__causalityLatest ?? null;
  return {
    probe: data.probe as CausalityProbe,
    answer: data.answer as CausalityAnswer,
    summary: data.summary as CausalitySummary,
  };
}
