import { NextResponse } from "next/server";
import { auditDataset, cleanRows } from "@/lib/causality-audit";
import { saveLatest, type CausalityContext } from "@/lib/causality-store";

export const maxDuration = 10;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { probeId?: string; context?: CausalityContext; dataset?: unknown }
    | null;

  const rows = cleanRows(body?.dataset);
  if (!body || !body.context || rows.length === 0) {
    return NextResponse.json(
      { error: "expected a causality-audit probe with a context and a dataset of {x, z, y} rows" },
      { status: 400 }
    );
  }

  const { answer, summary } = auditDataset(rows, body.context);
  await saveLatest({ probeId: body.probeId, context: body.context }, answer, summary);
  return NextResponse.json(answer);
}
