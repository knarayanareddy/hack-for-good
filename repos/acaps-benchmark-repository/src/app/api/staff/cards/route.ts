import { staff } from "@/lib/evolution/http";
import { listCards } from "@/lib/evolution/service";

export const dynamic = "force-dynamic";

/** Staff: the questions ("cards") that can be charted or linked. */
export async function GET() {
  return staff((me) => listCards(me));
}
