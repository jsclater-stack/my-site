import type { CausalitySummary, Structure } from "@/lib/causality-store";

type Bar = { label: string; gap: number | null; note: string; highlight: boolean };

/**
 * Diverging bars around zero: the overall gap (ignoring the third variable)
 * next to the gap inside each of its levels. The highlighted bar is the
 * comparison the verdict trusts.
 */
export function GapChart({
  summary,
  structure,
  zLabel,
}: {
  summary: CausalitySummary;
  structure: Structure;
  zLabel: string;
}) {
  const trustOverall = structure !== "fork";
  const bars: Bar[] = [
    {
      label: "Overall",
      gap: summary.naiveEffect,
      note: `ignoring ${zLabel}`,
      highlight: trustOverall,
    },
    ...summary.levels.map((level) => ({
      label: `${zLabel} = ${level.label}`,
      gap: level.gap,
      note: `${level.n} rows`,
      highlight: false,
    })),
    {
      label: "Within levels",
      gap: summary.stratifiedEffect,
      note: "weighted by size",
      highlight: !trustOverall,
    },
  ];

  const maxAbs = Math.max(0.5, ...bars.map((b) => Math.abs(b.gap ?? 0)));
  const threshold = (0.35 / maxAbs) * 50;

  return (
    <div className="mt-4">
      <div className="space-y-3">
        {bars.map((bar) => {
          const g = bar.gap ?? 0;
          const width = (Math.abs(g) / maxAbs) * 50;
          return (
            <div
              key={bar.label}
              className="grid grid-cols-[9.5rem_1fr_4.5rem] items-center gap-3 text-sm"
            >
              <span className={bar.highlight ? "font-semibold text-accent" : "text-muted"}>
                {bar.label}
                <span className="block text-xs font-normal text-muted">{bar.note}</span>
              </span>
              <div className="relative h-6 rounded bg-paper">
                <div
                  className="absolute inset-y-0 border-x border-dashed border-line"
                  style={{ left: `${50 - threshold}%`, right: `${50 - threshold}%` }}
                  aria-hidden
                />
                <div className="absolute inset-y-0 left-1/2 w-px bg-muted" aria-hidden />
                <div
                  className={`absolute inset-y-1 rounded ${bar.highlight ? "bg-accent" : "bg-line"}`}
                  style={g >= 0 ? { left: "50%", width: `${width}%` } : { right: "50%", width: `${width}%` }}
                />
              </div>
              <span className="text-right tabular-nums">
                {bar.gap === null ? "—" : `${g > 0 ? "+" : ""}${g.toFixed(2)}`}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted">
        Bars inside the dashed band (±0.35) are too small to count as a real effect.
      </p>
    </div>
  );
}
