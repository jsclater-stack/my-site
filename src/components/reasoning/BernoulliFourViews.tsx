export function BernoulliFourViews({
  theta,
  onSuccess,
  onFailure,
}: {
  theta: number;
  onSuccess: number;
  onFailure: number;
}) {
  const expectedValue = theta * onSuccess + (1 - theta) * onFailure;

  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <div className="rounded-lg border border-line p-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted">Table</p>
        <table className="mt-2 w-full text-sm">
          <tbody>
            <tr>
              <td>X = 1</td>
              <td className="text-right">{theta.toFixed(2)}</td>
            </tr>
            <tr>
              <td>X = 0</td>
              <td className="text-right">{(1 - theta).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-line p-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted">Math</p>
        <p className="mt-2 font-mono text-sm">
          E[payoff] = {theta.toFixed(2)} × {onSuccess} + {(1 - theta).toFixed(2)} × {onFailure}
        </p>
        <p className="mt-1 font-mono text-sm">= {expectedValue.toFixed(2)}</p>
      </div>
    </div>
  );
}
