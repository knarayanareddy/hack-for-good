import { bodyOf, staff } from "@/lib/evolution/http";
import { createLink, listLinks } from "@/lib/evolution/service";

export const dynamic = "force-dynamic";

export async function GET() {
  return staff((me) => listLinks(me));
}

/** evolution.link (moderator): { fromCardId, toCardId, mechanism, rival }. The rival explanation is required. */
export async function POST(req: Request) {
  const body = await bodyOf(req);
  return staff((me) => createLink(me, body));
}
