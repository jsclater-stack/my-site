import { GapChart } from "@/components/causality/GapChart";
import { loadLatest } from "@/lib/causality-store";

export const dynamic = "force-dynamic";
export const metadata = { title: "Causality Audit" };

const STRUCTURE_WORDS = {
  fork: "Fork: the third variable is a common cause",
  pipe: "Pipe: the third variable carries the effect",
  collider: "Collider: the third variable is a common result",
  direct: "Direct effect: the third variable is a bystander",
} as const;

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

export default async function CausalityPage() {
  const latest = await loadLatest();
  const answer = latest?.answer;
  const context = latest?.probe.context ?? {};
  const structure = answer?.structure ?? null;
  const effect = asNumber(answer?.stratifiedEffect);

  const x = context.xLabel ?? "the choice";
  const y = context.yLabel ?? "the outcome";
  const z = context.zLabel ?? "the third variable";
  const change =
    context.x0 && context.x1 ? `Switching ${x} from ${context.x0} to ${context.x1}` : `Changing ${x}`;

  const title = !answer
    ? "Causality Audit"
    : answer.causal
      ? `${change} really does change ${y}`
      : `${change} would not change ${y}`;

  return (
    <main className="mx-auto max-w-3xl px-6 py-14">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">Lane 4</p>
      <h1 className="mt-3 text-4xl font-bold">{title}</h1>
      <p className="mt-5 max-w-prose text-lg text-muted">
        {context.narrative ??
          "No dataset audited yet. POST a causality-audit probe to /api/causality/decide and this page will show the verdict."}
      </p>

      <section className="mt-10 rounded-xl border border-line bg-surface p-6">
        <h2 className="text-xl font-bold">The verdict</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-widest text-muted">Causal?</dt>
            <dd className="mt-1 text-2xl font-bold">
              <span data-causality="verdict">{answer ? (answer.causal ? "causal" : "not causal") : "—"}</span>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-widest text-muted">Structure</dt>
            <dd className="mt-1 text-2xl font-bold">
              <span data-causality="structure">{structure ?? "—"}</span>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-widest text-muted">Stratified effect</dt>
            <dd className="mt-1 text-2xl font-bold">
              <span data-causality="stratified-effect">{effect === null ? "—" : effect.toFixed(2)}</span>
            </dd>
          </div>
        </dl>
        {answer ? (
          <p className="mt-4 text-sm">
            <span className="font-semibold">Advice:</span>{" "}
            {answer.advice === "stratify"
              ? `split the data by ${z} and compare within each level.`
              : `do not split the data by ${z}; trust the overall comparison.`}
          </p>
        ) : null}
        {answer?.reasoning ? <p className="mt-2 text-sm text-muted">{answer.reasoning}</p> : null}
      </section>

      {latest?.summary && structure ? (
        <section className="mt-6 rounded-xl border border-line bg-surface p-6">
          <h2 className="text-xl font-bold">The two comparisons</h2>
          <p className="mt-2 text-sm text-muted">
            Gap in {y} between {context.x1 ?? "x = 1"} and {context.x0 ?? "x = 0"}, overall and inside
            each level of {z}. The highlighted bar is the one the verdict trusts.
          </p>
          <GapChart summary={latest.summary} structure={structure} zLabel={z} />
        </section>
      ) : null}

      {structure ? (
        <section className="mt-6 rounded-xl border border-line bg-surface p-6">
          <h2 className="text-xl font-bold">{STRUCTURE_WORDS[structure]}</h2>
          <p className="mt-2 text-sm text-muted">
            X = {x}, Z = {z}, Y = {y}.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            data-causality="dag"
            src={`/images/causality/${structure}.png`}
            alt={`Directed acyclic graph of a ${structure}`}
            className="mt-4 w-full max-w-md rounded-lg border border-line bg-paper p-3"
          />
        </section>
      ) : null}
    </main>
  );
}
