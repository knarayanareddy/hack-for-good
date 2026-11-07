import { staff } from "@/lib/evolution/http";
import { cardSeries } from "@/lib/evolution/service";

export const dynamic = "force-dynamic";

/** evolution.read: { cardId, statement, status, points, withheld, note }. Estimates, lo and hi are fractions in [0,1]. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return staff((me) => cardSeries(me, id));
}
