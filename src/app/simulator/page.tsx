import { StakeChart } from "@/components/simulator/StakeChart";
import { loadLatest } from "@/lib/simulator-store";

export const dynamic = "force-dynamic";
export const metadata = { title: "Decision Simulator" };

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

export default async function SimulatorPage() {
  const latest = await loadLatest();
  const fraction = asNumber(latest?.answer.recommendedFraction);
  const median = asNumber(latest?.answer.medianFinalBalance);
  const probLoss = asNumber(latest?.answer.probLoss);
  const game = latest?.game;
  const title =
    fraction === null
      ? "Decision Simulator"
      : `Stake ${(fraction * 100).toFixed(0)}% each year`;

  return (
    <main className="mx-auto max-w-3xl px-6 py-14">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">Lane 3</p>
      <h1 className="mt-3 text-4xl font-bold">{title}</h1>
      <p className="mt-5 max-w-prose text-lg text-muted">
        {game?.scenario ??
          "No game scored yet. POST an investment game to /api/simulator/decide and this page will show the recommendation."}
      </p>

      <section className="mt-10 rounded-xl border border-line bg-surface p-6">
        <h2 className="text-xl font-bold">Recommended stake</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-widest text-muted">Fraction</dt>
            <dd className="mt-1 text-2xl font-bold">
              <span data-simulator="recommended-fraction">{fraction === null ? "—" : fraction.toFixed(2)}</span>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-widest text-muted">Median finish</dt>
            <dd className="mt-1 text-2xl font-bold">
              $<span data-simulator="median-final">{median === null ? "—" : Math.round(median)}</span>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-widest text-muted">P(loss)</dt>
            <dd className="mt-1 text-2xl font-bold">
              <span data-simulator="prob-loss">{probLoss === null ? "—" : probLoss.toFixed(3)}</span>
            </dd>
          </div>
        </dl>
        {latest?.answer.reasoning ? (
          <p className="mt-4 text-sm text-muted">{latest.answer.reasoning}</p>
        ) : null}
      </section>

      {latest?.candidates?.length ? (
        <section className="mt-6 rounded-xl border border-line bg-surface p-6">
          <h2 className="text-xl font-bold">Median final balance by stake</h2>
          <p className="mt-2 text-sm text-muted">
            Each bar is 20,000 simulated investors. The highlighted row is the typical-investor winner.
          </p>
          <StakeChart
            candidates={latest.candidates}
            recommendedFraction={fraction ?? latest.candidates[0].fraction}
          />
        </section>
      ) : null}

      <section className="mt-6 rounded-xl border border-line bg-surface p-6">
        <h2 className="text-xl font-bold">The model</h2>
        <p className="mt-2 text-sm text-muted">
          Stake fraction <em>f</em> is a decision (the rectangle). Each year a coin flip moves wealth,
          so the typical path — not the average one — is what we maximize.
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          data-simulator="dag"
          src="/images/dag.png"
          alt="Directed acyclic graph of the coin-flip investment game"
          className="mt-4 w-full rounded-lg border border-line bg-paper p-3"
        />
      </section>
    </main>
  );
}
