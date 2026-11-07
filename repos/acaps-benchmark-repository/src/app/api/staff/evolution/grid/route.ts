import { staff } from "@/lib/evolution/http";
import { evolutionGrid } from "@/lib/evolution/service";

export const dynamic = "force-dynamic";

/** evolution.read: region x theme counts of radar risks and cards. No expert or answer data. */
export async function GET() {
  return staff((me) => evolutionGrid(me));
}
