export function TwoWayTable({
  baseRate,
  hitRate,
  falseAlarmRate,
}: {
  baseRate: number;
  hitRate: number;
  falseAlarmRate: number;
}) {
  const N = 10000;
  const trueFlags = N * baseRate * hitRate;
  const falseFlags = N * (1 - baseRate) * falseAlarmRate;
  const trueNegatives = N * (1 - baseRate) * (1 - falseAlarmRate);
  const falseNegatives = N * baseRate * (1 - hitRate);

  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border border-line p-2 text-left"></th>
            <th className="border border-line p-2 text-center">Flagged</th>
            <th className="border border-line p-2 text-center">Not flagged</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-line p-2 font-semibold">Has condition</td>
            <td className="border border-line p-2 text-center">{Math.round(trueFlags)}</td>
            <td className="border border-line p-2 text-center">{Math.round(falseNegatives)}</td>
          </tr>
          <tr>
            <td className="border border-line p-2 font-semibold">No condition</td>
            <td className="border border-line p-2 text-center">{Math.round(falseFlags)}</td>
            <td className="border border-line p-2 text-center">{Math.round(trueNegatives)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
