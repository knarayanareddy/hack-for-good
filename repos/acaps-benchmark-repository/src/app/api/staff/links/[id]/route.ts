import { staff } from "@/lib/evolution/http";
import { removeLink } from "@/lib/evolution/service";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return staff((me) => removeLink(me, id));
}
