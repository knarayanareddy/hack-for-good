import { bodyOf, staff } from "@/lib/evolution/http";
import { closeRound } from "@/lib/evolution/service";

export const dynamic = "force-dynamic";

/** evolution.link (moderator): release a round once, through the release gate, into the ledger. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await bodyOf(req)) as { round?: unknown };
  return staff((me) => closeRound(me, id, body.round));
}
