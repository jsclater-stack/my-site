import { BernoulliFourViews } from "@/components/reasoning/BernoulliFourViews";
import { TwoWayTable } from "@/components/reasoning/TwoWayTable";
import { loadLatest } from "@/lib/reasoning-store";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reasoning & Uncertainty" };

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

export default async function ReasoningPage() {
  const latest = await loadLatest();
  const syllogism = latest.syllogism;
  const plausibility = latest.plausibility;
  const bernoulli = latest.bernoulli;

  const verdict = typeof syllogism?.answer.verdict === "string" ? syllogism.answer.verdict : "—";
  const fallacy = typeof syllogism?.answer.fallacy === "string" ? syllogism.answer.fallacy : null;
  const posterior = asNumber(plausibility?.answer.posterior);
  const expectedValue = asNumber(bernoulli?.answer.expectedValue);

  const baseRate = asNumber(plausibility?.problem.baseRate);
  const hitRate = asNumber(plausibility?.problem.hitRate);
  const falseAlarmRate = asNumber(plausibility?.problem.falseAlarmRate);
  const theta = asNumber(bernoulli?.problem.theta);
  const payoffs = bernoulli?.problem.payoffs as { onSuccess?: unknown; onFailure?: unknown } | undefined;
  const onSuccess = asNumber(payoffs?.onSuccess);
  const onFailure = asNumber(payoffs?.onFailure);

  return (
    <main className="mx-auto max-w-3xl px-6 py-14">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">Lane 2</p>
      <h1 className="mt-3 text-4xl font-bold">Reasoning &amp; Uncertainty</h1>
      <p className="mt-5 max-w-prose text-lg text-muted">
        Live answers from <code className="rounded bg-surface px-1">/api/reasoning/decide</code>.
        Each card shows the latest problem of that type the service has scored.
      </p>

      <section className="mt-10 rounded-xl border border-line bg-surface p-6">
        <h2 className="text-xl font-bold">Syllogism audit</h2>
        <p className="mt-2 text-sm text-muted">
          {typeof syllogism?.problem.conclusion === "object" &&
          syllogism.problem.conclusion &&
          "statement" in syllogism.problem.conclusion
            ? String((syllogism.problem.conclusion as { statement?: string }).statement)
            : "No syllogism scored yet."}
        </p>
        <p className="mt-4 text-sm">
          Verdict:{" "}
          <span data-reasoning="verdict" className="font-semibold">
            {verdict}
          </span>
        </p>
        {fallacy ? <p className="mt-1 text-sm text-muted">Fallacy: {fallacy}</p> : null}
      </section>

      <section className="mt-6 rounded-xl border border-line bg-surface p-6">
        <h2 className="text-xl font-bold">Base-rate update</h2>
        <p className="mt-2 text-sm text-muted">
          {typeof plausibility?.problem.scenario === "string"
            ? plausibility.problem.scenario
            : "No plausibility problem scored yet."}
        </p>
        <p className="mt-4 text-sm">
          Posterior:{" "}
          <span data-reasoning="posterior" className="font-semibold">
            {posterior === null ? "—" : posterior.toFixed(6)}
          </span>
        </p>
        {baseRate !== null && hitRate !== null && falseAlarmRate !== null ? (
          <TwoWayTable baseRate={baseRate} hitRate={hitRate} falseAlarmRate={falseAlarmRate} />
        ) : null}
      </section>

      <section className="mt-6 rounded-xl border border-line bg-surface p-6">
        <h2 className="text-xl font-bold">Bernoulli business</h2>
        <p className="mt-2 text-sm text-muted">
          {typeof bernoulli?.problem.scenario === "string"
            ? bernoulli.problem.scenario
            : "No Bernoulli problem scored yet."}
        </p>
        <p className="mt-4 text-sm">
          Expected payoff:{" "}
          <span data-reasoning="expected-value" className="font-semibold">
            {expectedValue === null ? "—" : expectedValue.toFixed(2)}
          </span>
        </p>
        {theta !== null && onSuccess !== null && onFailure !== null ? (
          <BernoulliFourViews theta={theta} onSuccess={onSuccess} onFailure={onFailure} />
        ) : null}
      </section>
    </main>
  );
}
