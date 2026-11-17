import type { StakeSummary } from "@/lib/simulator-store";

export function StakeChart({
  candidates,
  recommendedFraction,
}: {
  candidates: StakeSummary[];
  recommendedFraction: number;
}) {
  const maxMedian = Math.max(...candidates.map((c) => c.medianFinalBalance), 1);

  return (
    <div className="mt-4 space-y-3">
      {candidates.map((row) => {
        const chosen = row.fraction === recommendedFraction;
        const width = Math.max(4, (row.medianFinalBalance / maxMedian) * 100);
        return (
          <div key={row.fraction} className="grid grid-cols-[4.5rem_1fr_7rem] items-center gap-3 text-sm">
            <span className={chosen ? "font-semibold text-accent" : "text-muted"}>
              {(row.fraction * 100).toFixed(0)}%
            </span>
            <div className="h-6 rounded bg-paper">
              <div
                className={`h-6 rounded ${chosen ? "bg-accent" : "bg-line"}`}
                style={{ width: `${width}%` }}
              />
            </div>
            <span className="text-right tabular-nums">
              ${Math.round(row.medianFinalBalance).toLocaleString("en-US")}
            </span>
          </div>
        );
      })}
    </div>
  );
}
